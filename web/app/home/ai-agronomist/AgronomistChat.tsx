"use client";

import {
  AlertCircle,
  Bot,
  Check,
  CircleHelp,
  LoaderCircle,
  MessageSquarePlus,
  Plus,
  Send,
  Sprout,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../lib/axios";

type MessageRole = "user" | "assistant";
type ContextStatus = "available" | "empty" | "unavailable";
type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  contextStatus?: ContextStatus;
};
type Conversation = {
  id: string;
  messages: ChatMessage[];
  error: string | null;
  updatedAt: string;
};

const suggestedQuestions = [
  "Why are my microgreens leaves turning yellow?",
  "What temperature is suitable for radish microgreens?",
  "How should I manage humidity?",
  "Is my current growing environment suitable?",
];

const newConversation = (id = crypto.randomUUID()): Conversation => ({
  id,
  messages: [],
  error: null,
  updatedAt: new Date().toISOString(),
});

function conversationTitle(conversation: Conversation) {
  return conversation.messages.find((message) => message.role === "user")?.content
    ?? "New conversation";
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return "We couldn't reach the AI Agronomist. Check your connection and try again.";
}

export default function AgronomistChat() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    newConversation("welcome"),
  ]);
  const [activeId, setActiveId] = useState("welcome");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [availability, setAvailability] = useState<"checking" | "ready" | "unconfigured" | "unavailable">("checking");
  const sendingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? conversations[0],
    [activeId, conversations],
  );

  useEffect(() => {
    let active = true;
    api.get<{ available: boolean }>("/user/agronomist/status")
      .then(({ data }) => {
        if (active) setAvailability(data.available ? "ready" : "unconfigured");
      })
      .catch(() => {
        if (active) setAvailability("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages, activeId, sending]);

  const updateConversation = useCallback(
    (id: string, update: (conversation: Conversation) => Conversation) => {
      setConversations((current) =>
        current.map((conversation) => conversation.id === id ? update(conversation) : conversation),
      );
    },
    [],
  );

  const requestReply = useCallback(async (conversationId: string, messages: ChatMessage[]) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    updateConversation(conversationId, (conversation) => ({ ...conversation, error: null }));

    try {
      const { data } = await api.post<{
        reply: string;
        contextStatus: ContextStatus;
        createdAt: string;
      }>("/user/agronomist/chat", {
        messages: messages.slice(-20).map(({ role, content }) => ({ role, content })),
      });
      const response: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        createdAt: data.createdAt,
        contextStatus: data.contextStatus,
      };
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, response],
        error: null,
        updatedAt: response.createdAt,
      }));
    } catch (error) {
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        error: errorMessage(error),
      }));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [updateConversation]);

  const sendMessage = useCallback((value = draft) => {
    const content = value.trim();
    if (!content || sendingRef.current || !activeConversation || activeConversation.error) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const messages = [...activeConversation.messages, message];
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      messages,
      error: null,
      updatedAt: message.createdAt,
    }));
    setDraft("");
    void requestReply(activeConversation.id, messages);
  }, [activeConversation, draft, requestReply, updateConversation]);

  const retryMessage = useCallback(() => {
    if (!activeConversation || sendingRef.current) return;
    void requestReply(activeConversation.id, activeConversation.messages);
  }, [activeConversation, requestReply]);

  function startConversation() {
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setDraft("");
  }

  function clearConversation() {
    if (!activeConversation || sendingRef.current) return;
    if (!window.confirm("Clear all messages in this conversation? This cannot be undone.")) return;
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      messages: [],
      error: null,
      updatedAt: new Date().toISOString(),
    }));
    setDraft("");
  }

  const isEmpty = activeConversation?.messages.length === 0;
  const statusText = availability === "ready"
    ? "Ready"
    : availability === "checking"
      ? "Checking"
      : availability === "unconfigured"
        ? "Setup needed"
        : "Unavailable";

  return (
    <main className="dashboard-root min-h-screen bg-[#f6f7f1] px-3 pb-28 pt-5 text-[#2d4030] sm:px-6 sm:pt-7 lg:px-9 lg:pb-10">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e6eedc] text-[#5b7a4c]">
              <Sprout size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#82917b]">SmartAgri workspace</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#294532] sm:text-3xl">AI Agronomist</h1>
              <p className="mt-1 text-xs text-[#7b8875]">Microgreens and controlled-environment growing guidance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dfe5d8] bg-white px-3 py-2 text-[11px] font-medium text-[#52664b]" aria-live="polite">
              <span className={`h-2 w-2 rounded-full ${availability === "ready" ? "bg-[#65a85e]" : availability === "checking" ? "animate-pulse bg-amber-400" : "bg-amber-500"}`} />
              {statusText}
            </span>
            <button type="button" onClick={startConversation} className="inline-flex items-center gap-2 rounded-full bg-[#3f704b] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#345f3f]">
              <Plus size={15} aria-hidden="true" />
              <span className="hidden sm:inline">New conversation</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        <section className="grid min-h-[min(740px,calc(100dvh-13rem))] overflow-hidden rounded-3xl border border-[#e4e9de] bg-white shadow-[0_8px_35px_rgba(43,66,44,0.06)] lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[#edf0e8] bg-[#fbfcf9] p-4 lg:flex lg:flex-col">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#82917b]">Conversations</p>
              <MessageSquarePlus size={16} className="text-[#829b70]" aria-hidden="true" />
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => setActiveId(conversation.id)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition ${activeId === conversation.id ? "bg-[#eaf0e1] font-semibold text-[#405f3d]" : "text-[#687565] hover:bg-[#f1f4ec]"}`}
                >
                  <span className="block truncate">{conversationTitle(conversation)}</span>
                  {conversation.messages.length > 0 ? <span className="mt-1 block text-[10px] font-normal text-[#899284]">{conversation.messages.length} messages</span> : null}
                </button>
              ))}
            </div>
            <p className="mt-4 border-t border-[#edf0e8] pt-3 text-[10px] leading-4 text-[#899284]">
              Conversations stay in memory while this page is open. They are not permanently saved.
            </p>
          </aside>

          <div className="flex min-h-[min(740px,calc(100dvh-13rem))] min-w-0 flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-[#edf0e8] px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf3e6] text-[#5b7a4c]">
                  <Bot size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#354c38]">SmartAgri Agronomist</p>
                  <p className="truncate text-[10px] text-[#899284]">Practical, evidence-conscious growing advice</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="sr-only" htmlFor="mobile-conversations">Choose conversation</label>
                <select
                  id="mobile-conversations"
                  value={activeConversation?.id}
                  onChange={(event) => setActiveId(event.target.value)}
                  className="max-w-[120px] rounded-full border border-[#e1e7db] bg-white px-3 py-2 text-[10px] text-[#52664b] lg:hidden"
                >
                  {conversations.map((conversation) => (
                    <option key={conversation.id} value={conversation.id}>{conversationTitle(conversation)}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={clearConversation}
                  disabled={isEmpty || sending}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#82917b] transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7" aria-live="polite" aria-relevant="additions text">
              {isEmpty ? (
                <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center">
                  <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf3e6] text-[#648253]">
                    <Sprout size={25} aria-hidden="true" />
                  </span>
                  <h2 className="text-xl font-semibold tracking-tight text-[#354c38] sm:text-2xl">Hi, I&apos;m your SmartAgri Agronomist.</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#7b8875]">
                    Ask about crop health or growing conditions. Share what you see, and I&apos;ll help you work through likely causes and next steps.
                  </p>
                  <p className="mt-7 mb-3 text-[11px] font-semibold text-[#72806d]">Try asking</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        type="button"
                        disabled={sending}
                        onClick={() => sendMessage(question)}
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-[#e7e9df] bg-[#fcfdfb] px-3.5 py-3 text-left text-xs leading-5 text-[#52664b] transition hover:border-[#cbd8c2] hover:bg-[#f7faf4] disabled:opacity-60"
                      >
                        <CircleHelp size={15} className="shrink-0 text-[#779367]" aria-hidden="true" />
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-6">
                  {activeConversation?.messages.map((message) => (
                    <article key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "user" ? "bg-[#3f704b] text-white" : "bg-[#edf3e6] text-[#5b7a4c]"}`}>
                        {message.role === "user" ? <span className="text-[10px] font-semibold" aria-label="You">You</span> : <Bot size={16} aria-label="AI Agronomist" />}
                      </span>
                      <div className={`min-w-0 max-w-[88%] sm:max-w-[82%] ${message.role === "user" ? "text-right" : ""}`}>
                        <div className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6 ${message.role === "user" ? "rounded-tr-md bg-[#eaf0e1] text-[#344b36]" : "rounded-tl-md border border-[#edf0e8] bg-[#fbfcf9] text-[#465443]"}`}>
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        <div className={`mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#9aa294] ${message.role === "user" ? "justify-end" : ""}`}>
                          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                          {message.role === "assistant" && message.contextStatus === "unavailable" ? <span>Farm data could not be loaded for this reply.</span> : null}
                          {message.role === "assistant" && message.contextStatus === "empty" ? <span>No farm or sensor records are linked to your account yet.</span> : null}
                        </div>
                      </div>
                    </article>
                  ))}
                  {sending ? (
                    <div className="flex items-start gap-3" role="status" aria-label="Agronomist is responding">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3e6] text-[#5b7a4c]"><Bot size={16} aria-hidden="true" /></span>
                      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-[#edf0e8] bg-[#fbfcf9] px-4 py-3 text-xs text-[#72806d]">
                        <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                        Thinking through your growing conditions…
                      </div>
                    </div>
                  ) : null}
                  <div ref={bottomRef} />
                </div>
              )}
              {activeConversation?.error ? (
                <div className="mx-auto mt-5 flex max-w-3xl items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4" role="alert">
                  <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-5 text-amber-900">{activeConversation.error}</p>
                    <button type="button" onClick={retryMessage} disabled={sending} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline underline-offset-2 disabled:opacity-60">
                      <Check size={13} aria-hidden="true" />
                      Retry this question
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
              className="border-t border-[#edf0e8] bg-white px-3 py-3 sm:px-6 sm:py-4"
            >
              <div className="mx-auto max-w-3xl">
                <div className="flex items-end gap-2 rounded-2xl border border-[#dfe5d8] bg-[#fbfcf9] p-2 transition focus-within:border-[#9eb58f] focus-within:ring-2 focus-within:ring-[#eaf0e1]">
                  <label className="sr-only" htmlFor="agronomist-message">Ask the AI Agronomist</label>
                  <textarea
                    id="agronomist-message"
                    rows={1}
                    maxLength={4_000}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    disabled={sending || Boolean(activeConversation?.error)}
                    placeholder="Ask about your crops or growing conditions…"
                    className="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm leading-5 text-[#354c38] outline-none placeholder:text-[#9aa294] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending || Boolean(activeConversation?.error)}
                    aria-label="Send message"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3f704b] text-white transition hover:bg-[#345f3f] disabled:cursor-not-allowed disabled:bg-[#dfe5d8] disabled:text-[#8a9582]"
                  >
                    {sending ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[10px] text-[#9aa294]">
                  <span>Enter to send · Shift + Enter for a new line</span>
                  <span>{draft.length}/4,000</span>
                </div>
                <p className="mt-2 text-center text-[10px] leading-4 text-[#9aa294]">
                  Guidance is AI-generated and may be imperfect. Verify serious crop-health concerns with a local expert.
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
