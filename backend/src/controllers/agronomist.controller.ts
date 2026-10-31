import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import {
  AgronomistServiceError,
  generateAgronomistReply,
  isGeminiConfigured,
  loadFarmContext,
} from "../services/agronomist.service";
import { parseChatMessages } from "../utils/agronomist-chat.validation";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 10;
const MAX_RATE_LIMIT_BUCKETS = 5_000;
const rateLimitBuckets = new Map<string, { startedAt: number; count: number }>();

function takeRateLimitSlot(userId: string, now: number) {
  const bucket = rateLimitBuckets.get(userId);
  if (!bucket || now - bucket.startedAt >= RATE_LIMIT_WINDOW_MS) {
    if (!bucket && rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS) {
      let oldestUserId: string | undefined;
      let oldestStartedAt = Number.POSITIVE_INFINITY;
      for (const [id, value] of rateLimitBuckets) {
        if (now - value.startedAt >= RATE_LIMIT_WINDOW_MS) {
          rateLimitBuckets.delete(id);
        } else if (value.startedAt < oldestStartedAt) {
          oldestUserId = id;
          oldestStartedAt = value.startedAt;
        }
      }
      if (rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS && oldestUserId) {
        rateLimitBuckets.delete(oldestUserId);
      }
    }
    rateLimitBuckets.set(userId, { startedAt: now, count: 1 });
    return 0;
  }

  if (bucket.count >= RATE_LIMIT_REQUESTS) {
    return Math.max(1, Math.ceil((bucket.startedAt + RATE_LIMIT_WINDOW_MS - now) / 1_000));
  }

  bucket.count += 1;
  return 0;
}

export function getAvailability(_req: AuthRequest, res: Response) {
  return res.status(200).json({ available: isGeminiConfigured() });
}

export async function chat(req: AuthRequest, res: Response) {
  if (!req.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const retryAfter = takeRateLimitSlot(req.userId, Date.now());
  if (retryAfter > 0) {
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "You have sent several questions recently. Please wait a minute and try again.",
    });
  }

  const messages = parseChatMessages(req.body);
  if (!messages) {
    return res.status(400).json({
      message: "Send up to 20 alternating user/assistant messages, ending with a non-empty user message of at most 4,000 characters.",
    });
  }

  if (!isGeminiConfigured()) {
    return res.status(503).json({
      message: "The AI Agronomist is not configured yet. Please contact your administrator.",
    });
  }

  let contextStatus: "available" | "empty" | "unavailable" = "unavailable";
  let farmContextDetails = "";
  try {
    const context = await loadFarmContext(req.userId);
    contextStatus = context.status;
    farmContextDetails = context.details;
  } catch {
    console.warn("Agronomist farm context could not be loaded");
  }

  try {
    const result = await generateAgronomistReply(messages, {
      status: contextStatus,
      details: farmContextDetails,
    });

    return res.status(200).json({
      reply: result.reply,
      model: result.model,
      contextStatus,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AgronomistServiceError) {
      if (error.retryAfterSeconds) {
        res.setHeader("Retry-After", String(error.retryAfterSeconds));
      }
      return res.status(error.statusCode).json({ message: error.publicMessage });
    }

    console.error("[AI Agronomist] Unexpected chat handler failure", {
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return res.status(502).json({
      message: "The AI Agronomist could not respond right now. Please try again.",
    });
  }
}
