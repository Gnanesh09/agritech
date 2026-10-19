import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/ui/AppText";
import { apiRequest } from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ documentName?: string; cropName?: string; score?: number }>;
};

type SessionResponse = { sessionId?: string; message?: string };
type MessageResponse = {
  answer?: string;
  sources?: ChatMessage["sources"];
  message?: string;
};

const SESSION_PATH = "/user/ai/sessions";
const ACCENT = "#FF6A00";
const SUGGESTIONS = [
  {
    icon: "leaf-outline" as const,
    title: "My tomato leaves are curling",
    detail: "Check likely causes",
    prompt:
      "My tomato leaves are curling. Check my latest rack temperature and humidity if available, compare them with the crop documentation, and suggest what I should inspect first.",
  },
  {
    icon: "thermometer-outline" as const,
    title: "Are my growing conditions right?",
    detail: "Review temperature and humidity",
    prompt:
      "Review my current crop cycles and latest sensor readings. Are the growing conditions suitable, and what information is missing?",
  },
  {
    icon: "calendar-outline" as const,
    title: "When can I harvest?",
    detail: "Check my active crop cycles",
    prompt:
      "Review my active crop cycles and expected harvest dates. Which crops may be ready soon?",
  },
];

function AIOrb({ small = false }: { small?: boolean }) {
  const size = small ? 22 : 150;
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <LinearGradient
        colors={["#FFF2B4", "#FFB52F", "#FF6B00", "#A51A00", "#280300"]}
        locations={[0, 0.26, 0.58, 0.82, 1]}
        start={{ x: 0.12, y: 0.08 }}
        end={{ x: 0.9, y: 0.95 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: ACCENT,
          shadowOpacity: small ? 0.28 : 0.55,
          shadowRadius: small ? 6 : 30,
          elevation: small ? 3 : 15,
          overflow: "hidden",
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.78)",
            "rgba(255,255,255,0.06)",
            "rgba(0,0,0,0.72)",
          ]}
          start={{ x: 0.1, y: 0.05 }}
          end={{ x: 0.95, y: 0.95 }}
          style={{ flex: 1, borderRadius: size / 2 }}
        />
      </LinearGradient>
    </View>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string; language?: string }
  | { type: "quote"; text: string };

function tableCells(line: string): string[] {
  // Protect escaped pipes before splitting columns; avoids regex lookbehind on Hermes.
  let value = line.trim().replace(/\\\|/g, "\u0000");
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim().replace(/\u0000/g, "|"));
}

function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return (
    cells.length >= 2 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  );
}

function isBlockStart(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  return (
    /^\s{0,3}#{1,6}\s+/.test(line) ||
    /^\s*```/.test(line) ||
    /^\s*>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    (index + 1 < lines.length &&
      line.includes("|") &&
      isTableSeparator(lines[index + 1] ?? ""))
  );
}

function parseMarkdown(input: string): MarkdownBlock[] {
  const lines = input.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = line.match(/^\s*```\s*([\w-]*)\s*$/);
    if (fence) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i] ?? "")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({
        type: "code",
        text: codeLines.join("\n"),
        language: fence[1],
      });
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2] ?? "",
      });
      i += 1;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? "")) {
        quoteLines.push((lines[i] ?? "").replace(/^\s*>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ").trim() });
      continue;
    }

    if (
      i + 1 < lines.length &&
      line.includes("|") &&
      isTableSeparator(lines[i + 1] ?? "")
    ) {
      const headers = tableCells(line);
      i += 2;
      const rows: string[][] = [];
      while (
        i < lines.length &&
        (lines[i] ?? "").trim() &&
        (lines[i] ?? "").includes("|")
      ) {
        const row = tableCells(lines[i] ?? "");
        rows.push(headers.map((_, index) => row[index] ?? "—"));
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    const listMatch = line.match(/^\s*([-*+]\s+|\d+[.)]\s+)(.*)$/);
    if (listMatch) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length) {
        const itemMatch = (lines[i] ?? "").match(
          /^\s*([-*+]\s+|\d+[.)]\s+)(.*)$/,
        );
        if (!itemMatch || /^\s*\d/.test(lines[i] ?? "") !== ordered) break;
        items.push(itemMatch[2] ?? "");
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !(paragraphLines.length > 0 && isBlockStart(lines, i))
    ) {
      paragraphLines.push((lines[i] ?? "").trim());
      i += 1;
    }
    if (!paragraphLines.length) {
      paragraphLines.push(line.trim());
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function renderInlineMarkdown(
  input: string,
  keyPrefix: string,
): React.ReactNode[] {
  const cleaned = input.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  const tokenPattern =
    /(\*\*[\s\S]+?\*\*|__[\s\S]+?__|~~[\s\S]+?~~|`[^`]+`|\*[^*\n]+?\*|_[^_\n]+?_)/g;
  return cleaned
    .split(tokenPattern)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      const key = `${keyPrefix}-${index}`;
      if (
        (part.startsWith("**") && part.endsWith("**")) ||
        (part.startsWith("__") && part.endsWith("__"))
      ) {
        return (
          <AppText key={key} weight="semibold">
            {part.slice(2, -2)}
          </AppText>
        );
      }
      if (part.startsWith("~~") && part.endsWith("~~")) {
        return (
          <AppText key={key} className="line-through text-white/65">
            {part.slice(2, -2)}
          </AppText>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <AppText key={key} className="rounded bg-white/10 text-orange-200">
            {part.slice(1, -1)}
          </AppText>
        );
      }
      if (
        (part.startsWith("*") && part.endsWith("*")) ||
        (part.startsWith("_") && part.endsWith("_"))
      ) {
        return (
          <AppText key={key} className="italic">
            {part.slice(1, -1)}
          </AppText>
        );
      }
      return part;
    });
}

function MarkdownContent({ content }: { content: string }) {
  const blocks = parseMarkdown(content);
  return (
    <View className="gap-2.5">
      {blocks.map((block, blockIndex) => {
        const key = `md-${blockIndex}`;
        if (block.type === "heading") {
          const className =
            block.level <= 2
              ? "mt-1 text-[15px] leading-[21px] text-white"
              : "mt-1 text-[13px] leading-[19px] text-white";
          return (
            <AppText key={key} className={className} weight="semibold">
              {renderInlineMarkdown(block.text, key)}
            </AppText>
          );
        }
        if (block.type === "paragraph") {
          return (
            <AppText
              key={key}
              className="text-[13px] leading-[20px] text-white/95"
            >
              {renderInlineMarkdown(block.text, key)}
            </AppText>
          );
        }
        if (block.type === "quote") {
          return (
            <View
              key={key}
              className="border-l-2 border-[#FF8A32] bg-white/[0.04] px-3 py-2"
            >
              <AppText className="text-[13px] leading-[20px] text-white/80">
                {renderInlineMarkdown(block.text, key)}
              </AppText>
            </View>
          );
        }
        if (block.type === "code") {
          return (
            <View
              key={key}
              className="rounded-xl border border-white/10 bg-black/70 p-3"
            >
              {block.language ? (
                <AppText className="mb-2 text-[10px] uppercase tracking-wider text-orange-300">
                  {block.language}
                </AppText>
              ) : null}
              <AppText className="font-mono text-[11px] leading-[17px] text-white/85">
                {block.text}
              </AppText>
            </View>
          );
        }
        if (block.type === "list") {
          return (
            <View key={key} className="gap-1.5">
              {block.items.map((item, itemIndex) => (
                <View
                  key={`${key}-${itemIndex}`}
                  className="flex-row items-start gap-2"
                >
                  <AppText
                    className="w-4 text-[13px] leading-[20px] text-orange-300"
                    weight="semibold"
                  >
                    {block.ordered ? `${itemIndex + 1}.` : "•"}
                  </AppText>
                  <AppText className="flex-1 text-[13px] leading-[20px] text-white/95">
                    {renderInlineMarkdown(item, `${key}-${itemIndex}`)}
                  </AppText>
                </View>
              ))}
            </View>
          );
        }
        if (block.type === "table") {
          if (!block.rows.length) return null;
          return (
            <View key={key} className="gap-2">
              {block.rows.map((row, rowIndex) => (
                <View
                  key={`${key}-row-${rowIndex}`}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.045] p-3"
                >
                  <AppText
                    className="mb-2 text-[13px] leading-[19px] text-orange-200"
                    weight="semibold"
                  >
                    {renderInlineMarkdown(
                      row[0] || `Item ${rowIndex + 1}`,
                      `${key}-${rowIndex}-title`,
                    )}
                  </AppText>
                  {block.headers.slice(1).map((header, cellIndex) => (
                    <View
                      key={`${key}-${rowIndex}-cell-${cellIndex}`}
                      className="mt-1 flex-row items-start"
                    >
                      <AppText
                        className="w-[96px] pr-2 text-[10px] leading-[16px] text-white/45"
                        weight="medium"
                      >
                        {header.replace(/\*\*/g, "")}
                      </AppText>
                      <View className="flex-1">
                        <AppText className="text-[11px] leading-[17px] text-white/90">
                          {renderInlineMarkdown(
                            row[cellIndex + 1] ?? "—",
                            `${key}-${rowIndex}-${cellIndex}`,
                          )}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        }
        return null;
      })}
    </View>
  );
}

export default function AIChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sendingRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryContent, setRetryContent] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),
      80,
    );
    return () => clearTimeout(timer);
  }, [messages, sending, error]);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionIdRef.current) return sessionIdRef.current;

    const result = (await apiRequest(SESSION_PATH, {
      method: "POST",
      body: JSON.stringify({}),
    })) as SessionResponse;

    if (typeof result?.sessionId !== "string" || result.sessionId.length < 16) {
      throw new Error(
        "The AI session endpoint returned no session ID. Check that ai.routes is mounted at /api/user/ai.",
      );
    }

    sessionIdRef.current = result.sessionId;
    return result.sessionId;
  }, []);

  const requestAnswer = useCallback(
    async (content: string) => {
      const activeSessionId = await ensureSession();
      const result = (await apiRequest(
        `${SESSION_PATH}/${encodeURIComponent(activeSessionId)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ message: content }),
        },
      )) as MessageResponse;

      if (typeof result?.answer !== "string" || !result.answer.trim()) {
        throw new Error(
          result?.message ||
            "The AI server responded without an answer. Check the backend response and agent logs.",
        );
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: "assistant",
        content: result.answer.trim(),
        sources: result.sources ?? [],
      };
      setMessages((current) => [...current, assistantMessage]);
      setRetryContent("");
    },
    [ensureSession],
  );

  const sendMessage = useCallback(
    async (rawContent?: string) => {
      const content = (rawContent ?? draft).trim();
      if (!content || sendingRef.current) return;

      sendingRef.current = true;
      setSending(true);
      setDraft("");
      setError("");
      setRetryContent("");

      setMessages((current) => [
        ...current,
        {
          id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          role: "user",
          content,
        },
      ]);

      try {
        await requestAnswer(content);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to contact the AI server.";
        setError(message);
        setRetryContent(content);
      } finally {
        sendingRef.current = false;
        setSending(false);
      }
    },
    [draft, requestAnswer],
  );

  const retryLastMessage = useCallback(async () => {
    if (!retryContent || sendingRef.current) return;
    const content = retryContent;
    sendingRef.current = true;
    setSending(true);
    setError("");
    try {
      await requestAnswer(content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Retry failed. Please try again.",
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [retryContent, requestAnswer]);

  const closeChat = useCallback(async () => {
    const oldSessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    setMessages([]);
    setDraft("");
    setError("");
    setRetryContent("");
    Keyboard.dismiss();

    if (oldSessionId) {
      void apiRequest(`${SESSION_PATH}/${encodeURIComponent(oldSessionId)}`, {
        method: "DELETE",
      }).catch((err) => {
        // The backend session TTL is a fallback if the close request cannot reach it.
        console.warn(
          "Unable to explicitly delete AI session; server TTL will clean it up.",
          err,
        );
      });
    }

    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  // Avoid a huge Android gap above the navigation bar. Cap the safe-area inset
  // on Android; keep the full home-indicator inset on iOS.
  const bottomPadding = keyboardVisible
    ? 2
    : Platform.OS === "android"
      ? Math.min(Math.max(insets.bottom, 6), 12)
      : Math.max(insets.bottom, 10);
  const hasMessages = messages.length > 0;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <LinearGradient
        pointerEvents="none"
        colors={["#F66B00", "#B92700", "#3B0800", "#050000", "#000000"]}
        locations={[0, 0.2, 0.43, 0.66, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1" edges={["left", "right"]}>
        <KeyboardAvoidingView
          className="flex-1"
          // Keep the composer above the keyboard on both platforms.
          // Android Expo Go may overlay the keyboard instead of resizing the app,
          // so don't rely on windowSoftInputMode alone.
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
          enabled
        >
          <View
            className="min-h-[48px] flex-row items-center justify-between px-4 pb-2"
            style={{ paddingTop: Math.max(insets.top, 10) + 4 }}
          >
            <Pressable
              onPress={() => void closeChat()}
              className="flex-row items-center gap-2"
              accessibilityRole="button"
              accessibilityLabel="Close chat and delete temporary conversation memory"
            >
              <View className="h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20">
                <Ionicons name="leaf-outline" size={18} color="#FFC16C" />
              </View>
              <View>
                <AppText className="text-[14px] text-white" weight="semibold">
                  Agri AI
                </AppText>
                <AppText className="text-[10px] text-white/55">
                  Crop growing assistant
                </AppText>
              </View>
            </Pressable>

            {hasMessages ? (
              <Pressable
                onPress={() => void closeChat()}
                className="flex-row items-center rounded-full border border-white/15 bg-white/10 px-3 py-2"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={14} color="white" />
                <AppText className="ml-1 text-[11px] text-white">
                  Close chat
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {!hasMessages ? (
            keyboardVisible ? (
              <View className="flex-1 items-center justify-center px-6">
                <AIOrb small />
                <AppText className="mt-3 text-center text-[13px] text-white/60">
                  Ask Agri AI about your crops
                </AppText>
              </View>
            ) : (
              <ScrollView
                className="flex-1"
                contentContainerStyle={{
                  flexGrow: 1,
                  justifyContent: "center",
                  paddingHorizontal: 22,
                  paddingTop: 10,
                  paddingBottom: 18,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="items-center pb-7">
                  <AIOrb />
                  <AppText className="mt-5 text-[11px] text-white/45">
                    Ready to help your crops grow
                  </AppText>
                  <AppText
                    className="mt-5 max-w-[300px] text-center text-[27px] leading-[33px] text-white"
                    weight="medium"
                  >
                    What’s happening in your grow rack?
                  </AppText>
                  <AppText className="mt-3 max-w-[310px] text-center text-[13px] leading-5 text-white/60">
                    Ask about a crop, spot a possible issue, or review your
                    rack’s sensor readings and growing conditions.
                  </AppText>
                </View>

                <View className="gap-2">
                  {SUGGESTIONS.map((item) => (
                    <Pressable
                      key={item.title}
                      disabled={sending}
                      onPress={() => void sendMessage(item.prompt)}
                      className="flex-row items-center rounded-[18px] border border-white/10 bg-black/45 px-4 py-3.5 active:opacity-75"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-[13px] bg-[#FF6A00]/15">
                        <Ionicons name={item.icon} size={19} color="#FF963D" />
                      </View>
                      <View className="flex-1 pr-2">
                        <AppText
                          className="text-[13px] leading-[18px] text-white"
                          weight="medium"
                        >
                          {item.title}
                        </AppText>
                        <AppText className="mt-0.5 text-[11px] text-white/45">
                          {item.detail}
                        </AppText>
                      </View>
                      <Ionicons
                        name="arrow-up-forward"
                        size={16}
                        color="#A9A9A9"
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )
          ) : (
            <ScrollView
              ref={scrollRef}
              className="flex-1"
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 16,
                gap: 14,
              }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode={
                Platform.OS === "ios" ? "interactive" : "on-drag"
              }
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                scrollRef.current?.scrollToEnd({ animated: true })
              }
              automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            >
              {messages.map((message) => (
                <View
                  key={message.id}
                  className={`flex-row ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" ? (
                    <View className="mr-2.5 mt-1">
                      <AIOrb small />
                    </View>
                  ) : null}
                  <View
                    className={`max-w-[84%] rounded-[18px] px-3.5 py-3 ${
                      message.role === "user"
                        ? "rounded-tr-[5px] bg-[#F46A00]"
                        : "rounded-tl-[5px] border border-white/[0.06] bg-black/70"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <MarkdownContent content={message.content} />
                    ) : (
                      <AppText className="text-[13px] leading-[19px] text-white">
                        {message.content}
                      </AppText>
                    )}
                    {message.role === "assistant" &&
                    message.sources &&
                    message.sources.length > 0 ? (
                      <View className="mt-3 border-t border-white/10 pt-2">
                        <AppText
                          className="text-[10px] text-white/45"
                          weight="medium"
                        >
                          Sources
                        </AppText>
                        {message.sources.slice(0, 4).map((source, index) => (
                          <AppText
                            key={`${source.documentName ?? "source"}-${index}`}
                            className="mt-1 text-[10px] text-orange-200/80"
                          >
                            {source.documentName ??
                              source.cropName ??
                              "Crop documentation"}
                          </AppText>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}

              {sending ? (
                <View className="flex-row items-center">
                  <View className="mr-2.5">
                    <AIOrb small />
                  </View>
                  <View className="flex-row items-center gap-2 rounded-2xl border border-white/[0.06] bg-black/65 px-3.5 py-3">
                    <ActivityIndicator size="small" color={ACCENT} />
                    <AppText className="text-[11px] text-white/55">
                      Checking crop data…
                    </AppText>
                  </View>
                </View>
              ) : null}

              {error ? (
                <View className="self-start max-w-[92%] rounded-[16px] border border-red-400/20 bg-[#300B08]/95 px-3.5 py-3">
                  <AppText className="text-[12px] leading-[18px] text-red-100">
                    {error}
                  </AppText>
                  <View className="mt-2 flex-row items-center gap-4">
                    {retryContent ? (
                      <Pressable
                        onPress={() => void retryLastMessage()}
                        disabled={sending}
                      >
                        <AppText
                          className="text-[12px] text-orange-300"
                          weight="semibold"
                        >
                          Try again
                        </AppText>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => setError("")}>
                      <AppText className="text-[12px] text-white/55">
                        Dismiss
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          )}

          <View className="px-3 pt-1" style={{ paddingBottom: bottomPadding }}>
            <View className="min-h-[54px] flex-row items-end rounded-[27px] border border-white/10 bg-[#100907]/95 px-2.5 py-1.5">
              <Pressable
                onPress={() => inputRef.current?.focus()}
                className="h-9 w-8 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Focus message field"
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#A8A8A8"
                />
              </Pressable>
              <TextInput
                ref={inputRef}
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask about your crops…"
                placeholderTextColor="rgba(255,255,255,0.42)"
                multiline
                maxLength={8000}
                blurOnSubmit={false}
                returnKeyType="default"
                textAlignVertical="top"
                scrollEnabled
                className="max-h-[104px] min-h-[38px] flex-1 px-2 py-2 text-[14px] leading-5 text-white"
                onFocus={() => {
                  setKeyboardVisible(true);
                  requestAnimationFrame(() =>
                    scrollRef.current?.scrollToEnd({ animated: true }),
                  );
                }}
                onSubmitEditing={() => {
                  if (draft.trim()) void sendMessage();
                }}
                accessibilityLabel="Message the Agri AI assistant"
              />
              <Pressable
                onPress={() => {
                  if (draft.trim() && !sending) void sendMessage();
                  else if (!draft.trim()) inputRef.current?.focus();
                }}
                disabled={sending || !draft.trim()}
                className={`mb-0.5 h-9 w-9 items-center justify-center rounded-full ${draft.trim() && !sending ? "bg-[#FF6A00]" : "bg-white/10"}`}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={draft.trim() ? "white" : "#777777"}
                  />
                )}
              </Pressable>
            </View>
            {!hasMessages ? (
              <AppText className="mt-2 text-center text-[10px] text-white/35">
                Answers use your indexed crop guides and available rack data.
              </AppText>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
