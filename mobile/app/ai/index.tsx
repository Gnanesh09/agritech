import React, { useCallback, useEffect, useRef, useState } from "react";

import { cssInterop } from "nativewind";

import {
  ActivityIndicator,
  Animated,
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

// Enable NativeWind classes on third-party/native wrapper components.

cssInterop(LinearGradient, { className: "style" });

cssInterop(SafeAreaView, { className: "style" });

cssInterop(Animated.View, { className: "style" });

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

/** Agri AI theme tokens for the interface and animated glow. */

const AGRI_AI_THEME = {
  colors: {
    primaryOrange: "#FF6A00",

    neonOrange: "#FF4D00",

    neonPurple: "#A855F7",

    deepPurple: "#7C3AED",

    amber: "#FF914D",

    highlight: "#F3D8FF",

    background: "#08040A",

    backgroundTop: "#251027",

    backgroundMid: "#100812",

    codeText: "#FFD2A8",
  },

  glow: {
    // Soft edge aura — transparent gradients, not a solid screen border.

    auraTop: 0.14,

    auraSide: 0.12,

    auraBottom: 0.1,

    auraFade: 0.045,

    // Clockwise moving neon gradient: dim edge → orange → warm bright core → fade.

    sweepEdge: 0.08,

    sweepMiddle: 0.24,

    sweepHighlight: 0.42,

    sweepTail: 0.18,

    // Motion and blur.

    rotationDurationMs: 3600,

    sweepLength: 140,

    shadowOpacity: 0.36,

    shadowRadius: 14,
  },
};

const ACCENT = AGRI_AI_THEME.colors.primaryOrange;

const orbShadow = {
  shadowColor: ACCENT,

  shadowOpacity: 0.45,

  shadowRadius: 18,

  elevation: 8,
} as const;

const orbCompactShadow = {
  shadowColor: ACCENT,

  shadowOpacity: 0.28,

  shadowRadius: 8,

  elevation: 3,
} as const;

/** Convert a hex color to RGBA. */

function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");

  const value = Number.parseInt(hex, 16);

  const red = (value >> 16) & 255;

  const green = (value >> 8) & 255;

  const blue = value & 255;

  return `rgba(${red},${green},${blue},${alpha})`;
}

const AURA_TOP_COLORS = [
  withAlpha(AGRI_AI_THEME.colors.neonOrange, AGRI_AI_THEME.glow.auraTop),

  withAlpha(AGRI_AI_THEME.colors.neonPurple, AGRI_AI_THEME.glow.auraFade * 1.8),

  "transparent",
] as const;

const AURA_SIDE_COLORS = [
  withAlpha(AGRI_AI_THEME.colors.neonPurple, AGRI_AI_THEME.glow.auraSide),

  withAlpha(AGRI_AI_THEME.colors.amber, AGRI_AI_THEME.glow.auraFade * 1.2),

  "transparent",
];

const AURA_BOTTOM_COLORS = [
  withAlpha(AGRI_AI_THEME.colors.deepPurple, AGRI_AI_THEME.glow.auraBottom),

  withAlpha(AGRI_AI_THEME.colors.neonOrange, AGRI_AI_THEME.glow.auraFade * 1.5),

  "transparent",
];

const SWEEP_GRADIENT_COLORS = [
  "transparent",

  withAlpha(AGRI_AI_THEME.colors.neonOrange, AGRI_AI_THEME.glow.sweepEdge),

  withAlpha(AGRI_AI_THEME.colors.neonPurple, AGRI_AI_THEME.glow.sweepMiddle),

  withAlpha(AGRI_AI_THEME.colors.highlight, AGRI_AI_THEME.glow.sweepHighlight),

  withAlpha(AGRI_AI_THEME.colors.amber, AGRI_AI_THEME.glow.sweepTail),

  "transparent",
];

const SWEEP_GRADIENT_LOCATIONS = [0, 0.18, 0.38, 0.5, 0.67, 1];

const SUGGESTIONS = [
  {
    icon: "leaf-outline" as const,

    title: "My tomato leaves are curling",

    prompt:
      "My tomato leaves are curling. Check my latest rack temperature and humidity if available, compare them with the crop documentation, and suggest what I should inspect first.",
  },

  {
    icon: "thermometer-outline" as const,

    title: "Are my growing conditions right?",

    prompt:
      "Review my current crop cycles and latest sensor readings. Are the growing conditions suitable, and what information is missing?",
  },

  {
    icon: "calendar-outline" as const,

    title: "When can I harvest?",

    prompt:
      "Review my active crop cycles and expected harvest dates. Which crops may be ready soon?",
  },
];

function TypingIndicator() {
  const values = useRef([
    new Animated.Value(0.35),

    new Animated.Value(0.35),

    new Animated.Value(0.35),
  ]).current;

  useEffect(() => {
    const animations = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 130),

          Animated.timing(value, {
            toValue: 1,

            duration: 300,

            useNativeDriver: true,
          }),

          Animated.timing(value, {
            toValue: 0.35,

            duration: 300,

            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());

    return () => animations.forEach((animation) => animation.stop());
  }, [values]);

  return (
    <View
      className="min-h-[28px] flex-row items-center self-start"

      accessibilityLabel="Agri AI is thinking"
    >
      {values.map((value, index) => (
        <Animated.View
          key={index}

          className="mr-[5px] h-[6px] w-[6px] rounded-full bg-[#FF6A00]"

          style={{ opacity: value, transform: [{ scale: value }] }}
        />
      ))}

      <AppText className="ml-2 text-[12px] text-white/55">Thinking</AppText>
    </View>
  );
}

function InlineMarkdown({ text }: { text: string }) {
  const tokenPattern =
    /(\*\*[^*]+\*\*|__[^_]+__|\x60[^\x60]+\x60|\*[^*]+\*|_[^_]+_)/g;

  const parts = text.split(tokenPattern).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        const bold =
          (part.startsWith("**") && part.endsWith("**")) ||
          (part.startsWith("__") && part.endsWith("__"));

        const code = part.startsWith("`") && part.endsWith("`");

        const italic =
          !bold &&
          ((part.startsWith("*") && part.endsWith("*")) ||
            (part.startsWith("_") && part.endsWith("_")));

        const value =
          bold || code || italic
            ? part.slice(
                bold || code ? 2 - (code ? 1 : 0) : 1,

                -(bold || code ? 2 - (code ? 1 : 0) : 1),
              )
            : part;

        return (
          <AppText
            key={index}

            weight={bold ? "semibold" : undefined}

            className={
              code ? "font-mono text-[#FFD2A8]" : italic ? "italic" : ""
            }
          >
            {value}
          </AppText>
        );
      })}
    </>
  );
}

type MarkdownBlock =
  | { type: "text"; text: string }
  | { type: "heading"; text: string; level: number }
  | { type: "list"; text: string; marker: string }
  | { type: "code"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function splitTableRow(line: string): string[] {
  let value = line.trim();

  if (value.startsWith("|")) value = value.slice(1);

  if (value.endsWith("|")) value = value.slice(0, -1);

  const cells: string[] = [];

  let cell = "";

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];

    if (char === "\\\\" && value[i + 1] === "|") {
      cell += "|";

      i += 1;
    } else if (char === "|") {
      cells.push(cell.trim());

      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());

  return cells;
}

function isTableDivider(line: string): boolean {
  const cells = splitTableRow(line);

  return (
    cells.length >= 2 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  );
}

function parseAssistantMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");

  const blocks: MarkdownBlock[] = [];

  let i = 0;

  let inCode = false;

  let codeLines: string[] = [];

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^\s*```/.test(line)) {
      if (inCode) {
        blocks.push({ type: "code", text: codeLines.join("\n") });

        codeLines = [];

        inCode = false;
      } else {
        inCode = true;
      }

      i += 1;

      continue;
    }

    if (inCode) {
      codeLines.push(line);

      i += 1;

      continue;
    }

    if (!line.trim() || /^\s*(---+|___+|\*{3,})\s*$/.test(line)) {
      i += 1;

      continue;
    }

    // Parse GFM tables before paragraphs so pipe characters never leak into the UI.

    if (
      i + 1 < lines.length &&
      line.includes("|") &&
      isTableDivider(lines[i + 1] ?? "")
    ) {
      const headers = splitTableRow(line);

      i += 2;

      const rows: string[][] = [];

      while (
        i < lines.length &&
        (lines[i] ?? "").trim() &&
        (lines[i] ?? "").includes("|")
      ) {
        const cells = splitTableRow(lines[i] ?? "");

        rows.push(headers.map((_, index) => cells[index] ?? "—"));

        i += 1;
      }

      blocks.push({ type: "table", headers, rows });

      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);

    if (heading) {
      blocks.push({
        type: "heading",

        text: heading[2] ?? "",

        level: heading[1].length,
      });

      i += 1;

      continue;
    }

    const list = line.match(/^\s*(?:([-*+])\s+|(\d+)[.)]\s+)(.+)$/);

    if (list) {
      blocks.push({
        type: "list",

        marker: list[2] ? `${list[2]}.` : "•",

        text: list[3] ?? "",
      });

      i += 1;

      continue;
    }

    blocks.push({ type: "text", text: line.trim() });

    i += 1;
  }

  if (inCode && codeLines.length)
    blocks.push({ type: "code", text: codeLines.join("\n") });

  return blocks;
}

function AssistantText({ content }: { content: string }) {
  const blocks = parseAssistantMarkdown(content);

  return (
    <View className="gap-[9px]">
      {blocks.map((block, index) => {
        if (block.type === "table") {
          if (!block.rows.length) return null;

          const cropColumn = block.headers.findIndex((header) =>
            /crop|plant|name|item/i.test(header),
          );

          const titleColumn = cropColumn >= 0 ? cropColumn : 0;

          return (
            <View key={`table-${index}`} className="my-[2px] gap-[9px]">
              {block.rows.map((row, rowIndex) => (
                <View
                  key={`table-${index}-row-${rowIndex}`}

                  className="gap-[7px] rounded-[13px] border border-white/[0.11] bg-white/[0.045] px-3 py-[11px]"
                >
                  <AppText
                    className="text-[14px] leading-[20px] text-white"

                    weight="semibold"
                  >
                    <InlineMarkdown
                      text={row[titleColumn] || `Item ${rowIndex + 1}`}
                    />
                  </AppText>

                  {block.headers.map((header, cellIndex) => {
                    if (cellIndex === titleColumn) return null;

                    return (
                      <View
                        key={`table-${index}-${rowIndex}-${cellIndex}`}

                        className="flex-row items-start gap-[10px]"
                      >
                        <AppText className="w-[104px] shrink-0 text-[11px] leading-[16px] text-white/45">
                          {header.replace(/\*\*/g, "")}
                        </AppText>

                        <View className="min-w-0 flex-1">
                          <AppText className="text-[12px] leading-[18px] text-white/90">
                            <InlineMarkdown text={row[cellIndex] || "—"} />
                          </AppText>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        }

        if (block.type === "heading") {
          return (
            <AppText
              key={index}

              className={
                block.level <= 2
                  ? "mt-1 text-[17px] leading-[24px] text-white"
                  : "mt-1 text-[15px] leading-[22px] text-white"
              }

              weight="semibold"
            >
              <InlineMarkdown text={block.text} />
            </AppText>
          );
        }

        if (block.type === "code") {
          return (
            <View
              key={index}

              className="rounded-xl border border-white/[0.10] bg-[#171717] px-3 py-2.5"
            >
              <AppText className="font-mono text-[12px] leading-[19px] text-white/90">
                {block.text}
              </AppText>
            </View>
          );
        }

        if (block.type === "list") {
          return (
            <View key={index} className="flex-row items-start gap-[5px]">
              <AppText className="min-w-[17px] text-[15px] leading-[23px] text-orange-200">
                {block.marker}
              </AppText>

              <View className="min-w-0 flex-1">
                <AppText className="text-[15px] leading-[23px] text-white/95">
                  <InlineMarkdown text={block.text} />
                </AppText>
              </View>
            </View>
          );
        }

        return (
          <AppText
            key={index}

            className="text-[15px] leading-[23px] text-white/95"
          >
            <InlineMarkdown
              text={block.text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")}
            />
          </AppText>
        );
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

  const [inputHeight, setInputHeight] = useState(42);

  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });

  const borderSweep = useRef(new Animated.Value(0)).current;

  const hasMessages = messages.length > 0;

  // A soft orange/neon highlight travels clockwise while the AI thinks.

  useEffect(() => {
    if (!sending) {
      borderSweep.stopAnimation();

      borderSweep.setValue(0);

      return;
    }

    const animation = Animated.loop(
      Animated.timing(borderSweep, {
        toValue: 1,

        duration: AGRI_AI_THEME.glow.rotationDurationMs,

        useNativeDriver: true,
      }),
    );

    animation.start();

    return () => animation.stop();
  }, [sending, borderSweep]);

  const sweepLength = AGRI_AI_THEME.glow.sweepLength;

  const sweepX = Math.max(0, screenSize.width - sweepLength - 8);

  const sweepY = Math.max(0, screenSize.height - sweepLength - 8);

  const topSweepX = borderSweep.interpolate({
    inputRange: [0, 0.25, 1],

    outputRange: [4, sweepX, sweepX],
  });

  const rightSweepY = borderSweep.interpolate({
    inputRange: [0, 0.25, 0.5, 1],

    outputRange: [4, 4, sweepY, sweepY],
  });

  // Keep the bottom sweep on the same full-width track as the top.

  // The display/window clips the edges naturally; do not draw an artificial inset curve.

  const bottomSweepX = borderSweep.interpolate({
    inputRange: [0, 0.5, 0.75, 1],

    outputRange: [sweepX, sweepX, 4, 4],
  });

  const leftSweepY = borderSweep.interpolate({
    inputRange: [0, 0.75, 1],

    outputRange: [sweepY, sweepY, 4],
  });

  const topSweepOpacity = borderSweep.interpolate({
    inputRange: [0, 0.025, 0.2, 0.25, 1],

    outputRange: [0.15, 1, 1, 0.1, 0.1],

    extrapolate: "clamp",
  });

  const rightSweepOpacity = borderSweep.interpolate({
    inputRange: [0, 0.25, 0.275, 0.45, 0.5, 1],

    outputRange: [0.1, 0.1, 1, 1, 0.1, 0.1],

    extrapolate: "clamp",
  });

  const bottomSweepOpacity = borderSweep.interpolate({
    inputRange: [0, 0.5, 0.525, 0.7, 0.75, 1],

    outputRange: [0.1, 0.1, 1, 1, 0.1, 0.1],

    extrapolate: "clamp",
  });

  const leftSweepOpacity = borderSweep.interpolate({
    inputRange: [0, 0.75, 0.775, 0.975, 1],

    outputRange: [0.1, 0.1, 1, 1, 0.1],

    extrapolate: "clamp",
  });

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true }),
      );
    });

    const hide = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: false }),
      );
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    const id = setTimeout(
      () => scrollRef.current?.scrollToEnd({ animated: true }),

      100,
    );

    return () => clearTimeout(id);
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

      setMessages((current) => [
        ...current,

        {
          id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

          role: "assistant",

          content: result.answer!.trim(),

          sources: result.sources ?? [],
        },
      ]);

      setRetryContent("");
    },

    [ensureSession],
  );

  const sendMessage = useCallback(
    async (rawContent?: string) => {
      const content = (rawContent ?? draft).trim();

      if (!content || sendingRef.current) return;

      sendingRef.current = true;

      // Match ChatGPT: dismiss the IME as soon as Send is pressed.

      Keyboard.dismiss();

      setSending(true);

      setDraft("");

      setInputHeight(42);

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
        setError(
          err instanceof Error
            ? err.message
            : "Unable to contact the AI server.",
        );

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

    sendingRef.current = true;

    setSending(true);

    setError("");

    try {
      await requestAnswer(retryContent);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Retry failed. Please try again.",
      );
    } finally {
      sendingRef.current = false;

      setSending(false);
    }
  }, [retryContent, requestAnswer]);

  const goBack = useCallback(() => {
    Keyboard.dismiss();

    const oldSessionId = sessionIdRef.current;

    sessionIdRef.current = null;

    if (oldSessionId) {
      void apiRequest(`${SESSION_PATH}/${encodeURIComponent(oldSessionId)}`, {
        method: "DELETE",
      }).catch((err) => {
        console.warn(
          "Unable to explicitly delete AI session; server TTL will clean it up.",

          err,
        );
      });
    }

    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }, []);

  const clearChat = useCallback(() => {
    if (sendingRef.current) return;

    const oldSessionId = sessionIdRef.current;

    sessionIdRef.current = null;

    setMessages([]);

    setDraft("");

    setInputHeight(42);

    setError("");

    setRetryContent("");

    if (oldSessionId) {
      void apiRequest(`${SESSION_PATH}/${encodeURIComponent(oldSessionId)}`, {
        method: "DELETE",
      }).catch((err) => {
        console.warn(
          "Unable to explicitly delete AI session; server TTL will clean it up.",

          err,
        );
      });
    }
  }, []);

  const submitDraft = () => {
    if (draft.trim() && !sending) void sendMessage();
  };

  return (
    <View
      className="flex-1 bg-[#08040A]"
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setScreenSize({ width, height });
      }}
    >
      <StatusBar style="light" />

      <LinearGradient
        pointerEvents="none"

        colors={[
          AGRI_AI_THEME.colors.backgroundTop,

          AGRI_AI_THEME.colors.backgroundMid,

          "#050505",

          AGRI_AI_THEME.colors.background,
        ]}

        locations={[0, 0.3, 0.65, 1]}

        className="absolute inset-0"
      />

      {sending && (
        <View pointerEvents="none" className="absolute inset-0 overflow-hidden">
          {/* Soft edge light only: no enclosing frame, so the screen never looks boxed in. */}

          <LinearGradient
            colors={AURA_TOP_COLORS}

            locations={[0, 0.45, 1]}

            start={{ x: 0.5, y: 0 }}

            end={{ x: 0.5, y: 1 }}

            className="absolute top-0 left-0 right-0 h-[86px]"
          />

          <LinearGradient
            colors={AURA_SIDE_COLORS}

            locations={[0, 0.42, 1]}

            start={{ x: 1, y: 0.5 }}

            end={{ x: 0, y: 0.5 }}

            className="absolute top-0 right-0 w-[54px]"

            style={{ bottom: 0 }}
          />

          <LinearGradient
            colors={AURA_BOTTOM_COLORS}

            locations={[0, 0.42, 1]}

            start={{ x: 0.5, y: 1 }}

            end={{ x: 0.5, y: 0 }}

            className="absolute left-0 right-0 overflow-hidden"

            // Extend the soft glow through the bottom safe-area region for a seamless edge.

            style={{ height: 94, bottom: 0 }}
          />

          <LinearGradient
            colors={AURA_SIDE_COLORS}

            locations={[0, 0.42, 1]}

            start={{ x: 0, y: 0.5 }}

            end={{ x: 1, y: 0.5 }}

            className="absolute top-0 left-0 w-[54px]"

            style={{ bottom: 0 }}
          />

          {screenSize.width > 0 && screenSize.height > 0 && (
            <>
              <Animated.View
                className="absolute top-0 left-0 w-[132px] h-[5px] rounded-full overflow-visible"

                style={[
                  {
                    shadowColor: AGRI_AI_THEME.colors.neonPurple,

                    shadowOpacity: AGRI_AI_THEME.glow.shadowOpacity,

                    shadowRadius: AGRI_AI_THEME.glow.shadowRadius,

                    elevation: 0,
                  },

                  {
                    opacity: topSweepOpacity,

                    transform: [{ translateX: topSweepX }],
                  },
                ]}
              >
                <LinearGradient
                  colors={SWEEP_GRADIENT_COLORS}

                  locations={SWEEP_GRADIENT_LOCATIONS}

                  start={{ x: 0, y: 0.5 }}

                  end={{ x: 1, y: 0.5 }}

                  className="absolute inset-0"
                />
              </Animated.View>

              <Animated.View
                className="absolute top-0 right-0 w-[5px] h-[132px] rounded-full overflow-visible"

                style={[
                  {
                    shadowColor: AGRI_AI_THEME.colors.neonPurple,

                    shadowOpacity: AGRI_AI_THEME.glow.shadowOpacity,

                    shadowRadius: AGRI_AI_THEME.glow.shadowRadius,

                    elevation: 0,
                  },

                  {
                    opacity: rightSweepOpacity,

                    transform: [{ translateY: rightSweepY }],
                  },
                ]}
              >
                <LinearGradient
                  colors={SWEEP_GRADIENT_COLORS}

                  locations={SWEEP_GRADIENT_LOCATIONS}

                  start={{ x: 0.5, y: 0 }}

                  end={{ x: 0.5, y: 1 }}

                  className="absolute inset-0"
                />
              </Animated.View>

              <Animated.View
                className="absolute left-0 w-[132px] h-[5px] rounded-full overflow-visible"

                style={[
                  {
                    bottom: 0,

                    shadowColor: AGRI_AI_THEME.colors.neonPurple,

                    shadowOpacity: AGRI_AI_THEME.glow.shadowOpacity,

                    shadowRadius: AGRI_AI_THEME.glow.shadowRadius,

                    elevation: 0,
                  },

                  {
                    opacity: bottomSweepOpacity,

                    transform: [{ translateX: bottomSweepX }],
                  },
                ]}
              >
                <LinearGradient
                  colors={SWEEP_GRADIENT_COLORS}

                  locations={SWEEP_GRADIENT_LOCATIONS}

                  start={{ x: 1, y: 0.5 }}

                  end={{ x: 0, y: 0.5 }}

                  className="absolute inset-0"
                />
              </Animated.View>

              <Animated.View
                className="absolute top-0 left-0 w-[5px] h-[132px] rounded-full overflow-visible"

                style={[
                  {
                    shadowColor: AGRI_AI_THEME.colors.neonPurple,

                    shadowOpacity: AGRI_AI_THEME.glow.shadowOpacity,

                    shadowRadius: AGRI_AI_THEME.glow.shadowRadius,

                    elevation: 0,
                  },

                  {
                    opacity: leftSweepOpacity,

                    transform: [{ translateY: leftSweepY }],
                  },
                ]}
              >
                <LinearGradient
                  colors={SWEEP_GRADIENT_COLORS}

                  locations={SWEEP_GRADIENT_LOCATIONS}

                  start={{ x: 0.5, y: 1 }}

                  end={{ x: 0.5, y: 0 }}

                  className="absolute inset-0"
                />
              </Animated.View>
            </>
          )}
        </View>
      )}

      <LinearGradient
        pointerEvents="none"

        colors={[
          "transparent",

          "rgba(124, 58, 237, 0.06)",

          "rgba(255, 106, 0, 0.10)",

          "#100812",

          "#08040A",
        ]}

        locations={[0, 0.25, 0.5, 0.78, 1]}

        start={{ x: 0.5, y: 0 }}

        end={{ x: 0.5, y: 1 }}

        style={{
          position: "absolute",

          left: 0,

          right: 0,

          bottom: 0,

          height: Math.max(insets.bottom + 150, 170),

          zIndex: 0,
        }}
      />

      {/* Match the working ChatRoom layout: header, flexing message list, then composer.
          Android window resize moves the whole flex column with the keyboard. */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <SafeAreaView className="flex-1" edges={["top", "left", "right"]}>
          <View className="flex-1">
            <View className="min-h-[58px] flex-row items-center border-b border-white/[0.08] px-3.5">
              <Pressable
                onPress={goBack}

                className="h-10 w-10 items-center justify-center rounded-full"

                accessibilityRole="button"

                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={21} color="#F5F5F5" />
              </Pressable>

              <View className="flex-1 gap-0.5 pl-[7px]">
                <AppText className="text-[16px] text-white" weight="semibold">
                  Agri AI
                </AppText>

                <AppText className="text-[11px] text-white/45">
                  Crop growing assistant
                </AppText>
              </View>

              <Pressable
                onPress={clearChat}

                disabled={!hasMessages || sending}

                className={`h-10 w-10 items-center justify-center rounded-full ${!hasMessages || sending ? "opacity-70" : ""}`}

                accessibilityRole="button"

                accessibilityLabel="Clear chat and start a new conversation"
              >
                <Ionicons
                  name="trash-outline"

                  size={18}

                  color={hasMessages && !sending ? "#E7E7E7" : "#666666"}
                />
              </Pressable>
            </View>

            {!hasMessages ? (
              <ScrollView
                className="flex-1"

                contentContainerClassName={`grow items-center px-5 py-[26px] ${keyboardVisible ? "justify-start pt-[14px]" : "justify-center"}`}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"

                showsVerticalScrollIndicator={false}
              >
                <View
                  className={
                    keyboardVisible
                      ? "h-[38px] w-[38px] overflow-hidden rounded-[19px] p-0.5"
                      : "h-[72px] w-[72px] overflow-hidden rounded-[36px] p-0.5"
                  }

                  style={keyboardVisible ? orbCompactShadow : orbShadow}
                >
                  <LinearGradient
                    colors={["#FFF2B4", "#FFB52F", "#FF6B00", "#A51A00"]}

                    className="flex-1 rounded-[35px]"
                  />
                </View>

                <AppText
                  className={
                    keyboardVisible
                      ? "mt-2 text-[10px] text-white/45"
                      : "mt-5 text-[11px] text-white/45"
                  }
                >
                  YOUR GROWING ASSISTANT
                </AppText>

                <AppText
                  className={
                    keyboardVisible
                      ? "mt-2 max-w-[320px] text-center text-[21px] leading-[27px] text-white"
                      : "mt-3 max-w-[320px] text-center text-[27px] leading-[34px] text-white"
                  }

                  weight="medium"
                >
                  What’s happening in your grow rack?
                </AppText>

                {!keyboardVisible && (
                  <AppText className="mt-3 max-w-[320px] text-center text-[14px] leading-[21px] text-white/55">
                    Ask about a crop, troubleshoot a problem, or understand your
                    growing conditions.
                  </AppText>
                )}

                {keyboardVisible ? (
                  <AppText className="mt-2 text-center text-[11px] text-white/40">
                    Type a question below to get started.
                  </AppText>
                ) : (
                  <View className="mt-7 w-full max-w-[440px] gap-[9px]">
                    {SUGGESTIONS.map((item) => (
                      <Pressable
                        key={item.title}

                        disabled={sending}

                        onPress={() => void sendMessage(item.prompt)}

                        className="min-h-[58px] flex-row items-center gap-[11px] rounded-[17px] border border-white/[0.09] bg-white/[0.035] px-3 py-[10px] active:opacity-70"
                      >
                        <View className="h-[37px] w-[37px] items-center justify-center rounded-[12px] bg-[#FF6A00]/[0.12]">
                          <Ionicons
                            name={item.icon}
                            size={19}
                            color="#FF974D"
                          />
                        </View>

                        <AppText className="flex-1 text-[13px] leading-[19px] text-white/90">
                          {item.title}
                        </AppText>

                        <Ionicons
                          name="arrow-up-forward"

                          size={15}

                          color="#8A8A8A"
                        />
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : (
              <ScrollView
                ref={scrollRef}

                onLayout={() => {
                  if (keyboardVisible) {
                    requestAnimationFrame(() =>
                      scrollRef.current?.scrollToEnd({ animated: false }),
                    );
                  }
                }}

                className="flex-1"

                contentContainerClassName="gap-[22px] px-[17px] pt-5"
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"

                keyboardDismissMode={
                  Platform.OS === "ios" ? "interactive" : "on-drag"
                }

                showsVerticalScrollIndicator={false}

                onContentSizeChange={() =>
                  scrollRef.current?.scrollToEnd({ animated: true })
                }
              >
                {messages.map((message) =>
                  message.role === "user" ? (
                    <View key={message.id} className="w-full items-end">
                      <View className="max-w-[94%] rounded-[22px] rounded-tr-[7px] bg-[#303030] px-[15px] py-[11px]">
                        <AppText className="text-[15px] leading-[22px] text-white">
                          {message.content}
                        </AppText>
                      </View>
                    </View>
                  ) : (
                    <View
                      key={message.id}
                      className="w-full self-stretch pr-0.5"
                    >
                      <AssistantText content={message.content} />

                      {!!message.sources?.length && (
                        <View className="mt-[13px] border-t border-white/[0.13] pt-[9px]">
                          <AppText
                            className="text-[11px] text-white/45"

                            weight="medium"
                          >
                            Sources
                          </AppText>

                          {message.sources.slice(0, 4).map((source, index) => (
                            <AppText
                              key={`${source.documentName ?? "source"}-${index}`}

                              className="mt-1 text-[11px] text-orange-200/80"
                            >
                              {source.documentName ??
                                source.cropName ??
                                "Crop documentation"}
                            </AppText>
                          ))}
                        </View>
                      )}
                    </View>
                  ),
                )}

                {sending && <TypingIndicator />}

                {!!error && (
                  <View className="self-stretch rounded-[14px] border border-red-400/25 bg-[#460A0A]/70 p-3">
                    <AppText className="text-[12px] leading-[18px] text-red-100">
                      {error}
                    </AppText>

                    <View className="mt-[10px] flex-row gap-[18px]">
                      {!!retryContent && (
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
                      )}

                      <Pressable onPress={() => setError("")}>
                        <AppText className="text-[12px] text-white/55">
                          Dismiss
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            <View
              className="shrink-0 bg-transparent px-3 pt-[9px]"
              style={{ paddingBottom: keyboardVisible ? 4 : insets.bottom }}
            >
              <View className="min-h-[52px] max-h-[150px] w-full max-w-[760px] flex-row items-end self-center rounded-[27px] border border-white/[0.15] bg-[#1B1B1B] py-[6px] pl-[17px] pr-[6px]">
                <TextInput
                  ref={inputRef}

                  value={draft}

                  onChangeText={setDraft}

                  placeholder="Message Agri AI"

                  placeholderTextColor="rgba(255,255,255,0.42)"

                  multiline

                  maxLength={8000}

                  blurOnSubmit={false}

                  returnKeyType="default"

                  textAlignVertical="top"

                  scrollEnabled

                  onContentSizeChange={(event) => {
                    const nextHeight = Math.min(
                      122,

                      Math.max(42, event.nativeEvent.contentSize.height + 2),
                    );

                    setInputHeight(nextHeight);

                    if (hasMessages)
                      requestAnimationFrame(() =>
                        scrollRef.current?.scrollToEnd({ animated: true }),
                      );
                  }}

                  className="min-h-[42px] max-h-[122px] flex-1 pr-[9px] pt-[9px] pb-2 text-[15px] leading-[21px] text-white"

                  style={{ height: inputHeight }}

                  accessibilityLabel="Message Agri AI"
                />

                <Pressable
                  onPress={submitDraft}

                  disabled={sending || !draft.trim()}

                  className={`mb-px h-[38px] w-[38px] items-center justify-center rounded-full ${!draft.trim() || sending ? "bg-[#343434]" : "bg-[#FF6A00]"}`}

                  accessibilityRole="button"

                  accessibilityLabel="Send message"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="arrow-up"

                      size={21}

                      color={draft.trim() ? "#FFFFFF" : "#777777"}
                    />
                  )}
                </Pressable>
              </View>

              {!hasMessages && !keyboardVisible && (
                <AppText className="mt-2 text-center text-[10px] text-white/30">
                  Answers use your indexed crop guides and available rack data.
                </AppText>
              )}
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}
