import { describe, expect, it } from "bun:test";
import {
  MAX_CHAT_HISTORY,
  MAX_MESSAGE_LENGTH,
  parseChatMessages,
} from "./agronomist-chat.validation";

describe("parseChatMessages", () => {
  it("accepts a user message with alternating conversation history", () => {
    expect(
      parseChatMessages({
        messages: [
          { role: "user", content: "How are my radishes?" },
          { role: "assistant", content: "What stage are they at?" },
          { role: "user", content: "They are on day five." },
        ],
      }),
    ).toEqual([
      { role: "user", content: "How are my radishes?" },
      { role: "assistant", content: "What stage are they at?" },
      { role: "user", content: "They are on day five." },
    ]);
  });

  it("rejects empty, oversized, and non-user-ending histories", () => {
    expect(parseChatMessages({ messages: [] })).toBeNull();
    expect(
      parseChatMessages({
        messages: [{ role: "assistant", content: "An answer without a question." }],
      }),
    ).toBeNull();
    expect(
      parseChatMessages({
        messages: Array.from({ length: MAX_CHAT_HISTORY + 1 }, () => ({
          role: "user",
          content: "Question",
        })),
      }),
    ).toBeNull();
  });

  it("rejects blank and over-limit messages", () => {
    expect(parseChatMessages({ messages: [{ role: "user", content: "  " }] })).toBeNull();
    expect(
      parseChatMessages({
        messages: [{ role: "user", content: "x".repeat(MAX_MESSAGE_LENGTH + 1) }],
      }),
    ).toBeNull();
  });

  it("rejects consecutive messages with the same role", () => {
    expect(
      parseChatMessages({
        messages: [
          { role: "user", content: "First question" },
          { role: "user", content: "Second question" },
        ],
      }),
    ).toBeNull();
  });
});
