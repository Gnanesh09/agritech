import crypto from "node:crypto";
import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import {
  runCropAgent,
  type StoredChatMessage,
} from "../services/ai/agent.service";
import { ingestPdfBuffer } from "../services/ai/ingestion.service";

type ChatSession = {
  id: string;
  userId: string;
  history: StoredChatMessage[];
  createdAt: number;
  updatedAt: number;
};

// Deliberately process-memory only. No chat transcript is written to Prisma,
// Pinecone, a file or another persistent store.
const chatSessions = new Map<string, ChatSession>();
const MAX_HISTORY_MESSAGES = 12; // Keep at most 6 exchanges in ephemeral memory.
const MAX_ACTIVE_SESSIONS_PER_USER = 5;
const MAX_MESSAGE_CHARS = 8_000;
const ttlMinutesFromEnv = Number(process.env.AI_SESSION_TTL_MINUTES ?? 15);
const SESSION_TTL_MS =
  Number.isFinite(ttlMinutesFromEnv) &&
  ttlMinutesFromEnv >= 5 &&
  ttlMinutesFromEnv <= 240
    ? ttlMinutesFromEnv * 60_000
    : 15 * 60_000;

function pruneExpiredSessions(now = Date.now()) {
  for (const [sessionId, session] of chatSessions.entries()) {
    if (now - session.updatedAt > SESSION_TTL_MS)
      chatSessions.delete(sessionId);
  }
}

const cleanupTimer = setInterval(() => pruneExpiredSessions(), 60_000);
cleanupTimer.unref?.();

function authenticatedUserId(req: AuthRequest, res: Response): string | null {
  if (!req.userId) {
    res.status(401).json({ message: "Authentication required" });
    return null;
  }
  return req.userId;
}

function getSessionId(value: unknown): string | null {
  return typeof value === "string" && value.length >= 16 && value.length <= 100
    ? value
    : null;
}

export function createChatSession(req: AuthRequest, res: Response) {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  pruneExpiredSessions();
  const activeSessionCount = Array.from(chatSessions.values()).filter(
    (session) => session.userId === userId,
  ).length;
  if (activeSessionCount >= MAX_ACTIVE_SESSIONS_PER_USER) {
    return res.status(429).json({
      message: `You can have at most ${MAX_ACTIVE_SESSIONS_PER_USER} active AI chats. Close an existing chat first.`,
    });
  }

  const now = Date.now();
  const sessionId = crypto.randomUUID();
  chatSessions.set(sessionId, {
    id: sessionId,
    userId,
    history: [],
    createdAt: now,
    updatedAt: now,
  });

  return res.status(201).json({
    sessionId,
    message:
      "Chat session started. Conversation memory is temporary and not saved to the database.",
    expiresInSeconds: Math.floor(SESSION_TTL_MS / 1_000),
  });
}

export async function sendChatMessage(req: AuthRequest, res: Response) {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  pruneExpiredSessions();
  const sessionId = getSessionId(req.params.sessionId);
  if (!sessionId)
    return res.status(400).json({ message: "Invalid chat session ID" });

  const session = chatSessions.get(sessionId);
  if (!session || session.userId !== userId) {
    return res.status(404).json({
      message: "Chat session not found or expired. Start a new chat.",
    });
  }

  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message) return res.status(400).json({ message: "message is required" });
  if (message.length > MAX_MESSAGE_CHARS) {
    return res.status(413).json({
      message: `message cannot exceed ${MAX_MESSAGE_CHARS} characters`,
    });
  }

  try {
    // Keep the model context bounded: recent messages only, and clip very long
    // assistant answers so a prior table/document dump cannot exhaust Groq TPM.
    const activeHistory = session.history
      .slice(-6)
      .map<StoredChatMessage>((entry) => ({
        role: entry.role,
        content: entry.content.slice(0, entry.role === "user" ? 700 : 1_200),
      }));
    const result = await runCropAgent({
      userId,
      history: activeHistory,
      message,
    });

    // Commit to ephemeral memory only after a successful model response.
    session.history = (
      [
        ...activeHistory,
        { role: "user", content: message },
        { role: "assistant", content: result.answer },
      ] satisfies StoredChatMessage[]
    ).slice(-MAX_HISTORY_MESSAGES);
    session.updatedAt = Date.now();

    return res.status(200).json({
      sessionId,
      answer: result.answer,
      sources: result.sources,
      messageCount: session.history.length,
      expiresInSeconds: Math.floor(SESSION_TTL_MS / 1_000),
    });
  } catch (error) {
    // Don't log the transcript or tool results; they may include user crop data.
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Crop AI request failed:", errorMessage);

    // Groq 429s include a useful suggested delay (for example, "try again in 3.4s").
    // Return that as an actionable API response instead of disguising it as a 502.
    if (
      /rate_limit_exceeded|rate limit reached|tokens per minute|too many requests/i.test(
        errorMessage,
      )
    ) {
      const match = errorMessage.match(/try again in\s+([\d.]+)s/i);
      const retryAfterSeconds = Math.max(2, Math.ceil(Number(match?.[1] ?? 4)));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        code: "AI_RATE_LIMITED",
        retryAfterSeconds,
        message: `Agri AI is temporarily busy. Please try again in about ${retryAfterSeconds} seconds.`,
      });
    }

    return res.status(502).json({
      code: "AI_REQUEST_FAILED",
      message:
        "The crop assistant could not complete this request. Please retry in a moment.",
    });
  }
}

export function endChatSession(req: AuthRequest, res: Response) {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  const sessionId = getSessionId(req.params.sessionId);
  if (!sessionId)
    return res.status(400).json({ message: "Invalid chat session ID" });

  const session = chatSessions.get(sessionId);
  if (!session) {
    return res.status(200).json({ closed: true, alreadyClosed: true });
  }
  if (session.userId !== userId) {
    return res.status(404).json({ message: "Chat session not found" });
  }

  // Deleting the entry drops both the transcript and the owner/session association.
  chatSessions.delete(sessionId);
  return res.status(200).json({ closed: true, memoryDeleted: true });
}

export async function ingestCropPdf(req: AuthRequest, res: Response) {
  const userId = authenticatedUserId(req, res);
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user)
      return res.status(401).json({ message: "Authenticated user not found" });
    if (!["ADMIN", "SUPER_ADMIN"].includes(String(user.role))) {
      return res.status(403).json({
        message: "Only an admin can ingest shared crop documentation",
      });
    }

    const file = req.file;
    if (!file)
      return res.status(400).json({
        message: "Upload one PDF using the multipart field named 'file'",
      });
    if (file.size > 20 * 1024 * 1024) {
      return res.status(413).json({ message: "PDF must be 20 MB or smaller" });
    }

    const title =
      typeof req.body?.title === "string" ? req.body.title.trim() : undefined;
    const cropName =
      typeof req.body?.cropName === "string"
        ? req.body.cropName.trim()
        : undefined;
    const documentId =
      typeof req.body?.documentId === "string"
        ? req.body.documentId.trim()
        : undefined;

    const result = await ingestPdfBuffer({
      buffer: file.buffer,
      filename: file.originalname,
      title,
      cropName,
      documentId,
    });

    return res.status(201).json({
      message: "Crop PDF extracted, embedded and indexed in Pinecone",
      document: result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown ingestion error";
    console.error("Crop PDF ingestion failed:", errorMessage);
    const isInputError = /PDF|extractable text|empty|invalid/i.test(
      errorMessage,
    );
    return res.status(isInputError ? 400 : 502).json({
      message: isInputError
        ? errorMessage
        : "Could not ingest the PDF. Verify the embedding and Pinecone configuration, then retry.",
    });
  }
}
