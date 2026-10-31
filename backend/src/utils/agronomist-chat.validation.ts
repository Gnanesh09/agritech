export type AgronomistChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export const MAX_CHAT_HISTORY = 20;
export const MAX_MESSAGE_LENGTH = 4_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseChatMessages(body: unknown): AgronomistChatMessage[] | null {
  if (!isRecord(body) || !Array.isArray(body.messages)) {
    return null;
  }

  if (body.messages.length === 0 || body.messages.length > MAX_CHAT_HISTORY) {
    return null;
  }

  const messages: AgronomistChatMessage[] = [];

  for (const item of body.messages) {
    if (
      !isRecord(item) ||
      (item.role !== "user" && item.role !== "assistant") ||
      typeof item.content !== "string"
    ) {
      return null;
    }

    const content = item.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) {
      return null;
    }

    const role = item.role;
    if (messages.at(-1)?.role === role) {
      return null;
    }

    messages.push({ role, content });
  }

  return messages.at(-1)?.role === "user" ? messages : null;
}
