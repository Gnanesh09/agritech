import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import express from "express";
import type { AddressInfo } from "node:net";
import type { AuthRequest } from "../middleware/auth.middleware";
import { chat, getAvailability } from "./agronomist.controller";

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  (req as AuthRequest).userId = "test-user";
  next();
});
app.get("/status", (req, res) => getAvailability(req as AuthRequest, res));
app.post("/chat", (req, res) => void chat(req as AuthRequest, res));

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let originalApiKey: string | undefined;

beforeAll(async () => {
  originalApiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (originalApiKey !== undefined) {
    process.env.GEMINI_API_KEY = originalApiKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

describe("Agronomist API handlers", () => {
  it("reports missing Gemini configuration without exposing credentials", async () => {
    const response = await fetch(`${baseUrl}/status`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ available: false });
  });

  it("rejects malformed chat histories with a structured error", async () => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: " " }] }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      message: "Send up to 20 alternating user/assistant messages, ending with a non-empty user message of at most 4,000 characters.",
    });
  });

  it("does not call Gemini when the server key is missing", async () => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "What temperature is suitable?" }] }),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      message: "The AI Agronomist is not configured yet. Please contact your administrator.",
    });
  });
});
