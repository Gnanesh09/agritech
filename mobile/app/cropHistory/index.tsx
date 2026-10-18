import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "@/components/ui/AppText";
import { apiRequest } from "@/lib/api";

const BG = "#000000";
const PANEL = "#10120D";
const BORDER = "#292D25";
const MUTED = "#8B9187";
const LIME = "#C8FF67";

type CropStatus = "GROWING" | "READY" | "HARVESTED" | "CANCELLED";
type CropHistoryItem = {
  id: string;
  cropName: string;
  status: CropStatus;
  sowingDate: string;
  expectedHarvestDate: string;
  harvestedAt: string | null;
  cancelledAt: string | null;
  estimatedGrowthDays: number;
  actualGrowingDays: number | null;
  daysFromExpectedHarvest: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  location?: {
    rackName: string;
    rackStatus: string;
    rowName: string;
    trayName: string;
    traySlot: number;
  } | null;
};

type HistoryResponse = {
  history: CropHistoryItem[];
  summary: {
    total: number;
    growing: number;
    ready: number;
    harvested: number;
    cancelled: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
};

type CropFilter = "ALL" | CropStatus;

const FILTERS: Array<{ label: string; value: CropFilter }> = [
  { label: "All", value: "ALL" },
  { label: "Growing", value: "GROWING" },
  { label: "Ready", value: "READY" },
  { label: "Harvested", value: "HARVESTED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const EMPTY_SUMMARY: HistoryResponse["summary"] = {
  total: 0,
  growing: 0,
  ready: 0,
  harvested: 0,
  cancelled: 0,
};

const EMPTY_PAGINATION: HistoryResponse["pagination"] = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
  hasMore: false,
};

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusStyle(status: CropStatus) {
  switch (status) {
    case "HARVESTED":
      return { color: LIME, backgroundColor: "#202B18" };
    case "READY":
      return { color: "#F4CB7A", backgroundColor: "#302819" };
    case "CANCELLED":
      return { color: "#FF938A", backgroundColor: "#301B19" };
    default:
      return { color: "#9CD8FF", backgroundColor: "#17252C" };
  }
}

function statusLabel(status: CropStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load crop history.";
}

function Detail({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View className="min-w-[44%] flex-1">
      <AppText className="text-[11px] text-[#8B9187]">{label}</AppText>
      <AppText
        weight="semibold"
        className={`mt-1 text-[13px] ${accent ? "text-[#C8FF67]" : "text-white"}`}
      >
        {value}
      </AppText>
    </View>
  );
}

export default function CropHistoryScreen() {
  const [history, setHistory] = useState<CropHistoryItem[]>([]);
  const [summary, setSummary] =
    useState<HistoryResponse["summary"]>(EMPTY_SUMMARY);
  const [pagination, setPagination] =
    useState<HistoryResponse["pagination"]>(EMPTY_PAGINATION);
  const [filter, setFilter] = useState<CropFilter>("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (page: number, append = false, isRefresh = false) => {
      if (page === 1) {
        if (!isRefresh) setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError("");

      try {
        const params = new URLSearchParams({ page: String(page), limit: "20" });
        if (filter !== "ALL") params.set("status", filter);
        if (query) params.set("q", query);

        const response = (await apiRequest(
          `/user/crop-cycles/history?${params.toString()}`,
        )) as HistoryResponse;
        const rows = Array.isArray(response?.history) ? response.history : [];

        setHistory((current) => (append ? [...current, ...rows] : rows));
        setSummary(response?.summary ?? EMPTY_SUMMARY);
        setPagination(
          response?.pagination ?? {
            page,
            limit: 20,
            total: rows.length,
            totalPages: 1,
            hasMore: false,
          },
        );
      } catch (err) {
        setError(errorMessage(err));
        if (!append) setHistory([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [filter, query],
  );

  useFocusEffect(
    useCallback(() => {
      void load(1);
    }, [load]),
  );

  const refresh = () => {
    setRefreshing(true);
    void load(1, false, true);
  };

  const applySearch = () => setQuery(searchInput.trim());

  const stats = [
    { label: "Total cycles", value: summary.total },
    { label: "Growing", value: summary.growing },
    { label: "Ready to harvest", value: summary.ready },
    { label: "Harvested", value: summary.harvested },
  ];

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: BG }}
      edges={["top"]}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 36,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={LIME}
            colors={[LIME]}
          />
        }
      >
        <View className="mb-6 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="mr-3 h-10 w-10 items-center justify-center rounded-full border"
            style={{ borderColor: BORDER, backgroundColor: PANEL }}
          >
            <AppText className="text-[26px] leading-[28px] text-white">
              ‹
            </AppText>
          </Pressable>
          <View className="flex-1">
            <AppText
              weight="bold"
              className="text-[27px] tracking-[-0.6px] text-white"
            >
              Crop history
            </AppText>
            <AppText className="mt-1 text-[12px] text-[#8B9187]">
              A record of every planting cycle.
            </AppText>
          </View>
          <Pressable
            onPress={refresh}
            accessibilityRole="button"
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: BORDER, backgroundColor: PANEL }}
          >
            <AppText weight="semibold" className="text-[12px] text-[#C8FF67]">
              Refresh
            </AppText>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-3">
          {stats.map((item) => (
            <View
              key={item.label}
              className="min-w-[46%] flex-1 rounded-2xl border px-4 py-3.5"
              style={{ borderColor: BORDER, backgroundColor: PANEL }}
            >
              <AppText className="text-[11px] text-[#8B9187]">
                {item.label}
              </AppText>
              <AppText weight="bold" className="mt-1.5 text-[23px] text-white">
                {item.value}
              </AppText>
            </View>
          ))}
        </View>

        <View className="mt-6">
          <AppText weight="semibold" className="mb-2.5 text-[14px] text-white">
            Find a crop
          </AppText>
          <View className="flex-row gap-2">
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              onSubmitEditing={applySearch}
              placeholder="Search crop name"
              placeholderTextColor="#72796F"
              returnKeyType="search"
              accessibilityLabel="Search crop history"
              className="h-[48px] flex-1 rounded-xl border px-4 text-[14px] text-white"
              style={{ borderColor: BORDER, backgroundColor: PANEL }}
            />
            <Pressable
              onPress={applySearch}
              accessibilityRole="button"
              className="h-[48px] items-center justify-center rounded-xl px-5"
              style={{ backgroundColor: LIME }}
            >
              <AppText weight="bold" className="text-[13px] text-black">
                Search
              </AppText>
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          className="mt-5"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 4 }}
        >
          {FILTERS.map((item) => {
            const selected = filter === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => setFilter(item.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className="rounded-full border px-4 py-2.5"
                style={{
                  borderColor: selected ? LIME : BORDER,
                  backgroundColor: selected ? LIME : PANEL,
                }}
              >
                <AppText
                  weight="semibold"
                  className={`text-[12px] ${selected ? "text-black" : "text-[#DCE2D9]"}`}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="mb-3 mt-7 flex-row items-center justify-between">
          <AppText weight="semibold" className="text-[16px] text-white">
            Planting cycles
          </AppText>
          <AppText className="text-[11px] text-[#8B9187]">
            {pagination.total} {pagination.total === 1 ? "record" : "records"}
          </AppText>
        </View>

        {error ? (
          <View
            className="rounded-2xl border p-4"
            style={{ borderColor: "#64332F", backgroundColor: "#211311" }}
          >
            <AppText className="text-[13px] text-[#FF9C94]">{error}</AppText>
            <Pressable onPress={() => void load(1)} className="mt-3 self-start">
              <AppText weight="semibold" className="text-[12px] text-[#C8FF67]">
                Try again
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-14">
            <ActivityIndicator color={LIME} size="small" />
            <AppText className="mt-3 text-[12px] text-[#8B9187]">
              Loading your records…
            </AppText>
          </View>
        ) : history.length === 0 ? (
          <View
            className="items-center rounded-2xl border px-6 py-10"
            style={{ borderColor: BORDER, backgroundColor: PANEL }}
          >
            <View
              className="mb-4 h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: "#202B18" }}
            >
              <AppText className="text-[23px] text-[#C8FF67]">⌁</AppText>
            </View>
            <AppText weight="semibold" className="text-[15px] text-white">
              No crop records found
            </AppText>
            <AppText className="mt-2 text-center text-[12px] leading-5 text-[#8B9187]">
              Your planting cycles will appear here, including harvested and
              cancelled crops.
            </AppText>
            {(query || filter !== "ALL") && (
              <Pressable
                onPress={() => {
                  setSearchInput("");
                  setQuery("");
                  setFilter("ALL");
                }}
                className="mt-4 rounded-xl px-4 py-2.5"
                style={{ backgroundColor: LIME }}
              >
                <AppText weight="bold" className="text-[12px] text-black">
                  Clear filters
                </AppText>
              </Pressable>
            )}
          </View>
        ) : (
          history.map((crop) => {
            const badge = statusStyle(crop.status);
            const location = [
              crop.location?.rackName,
              crop.location?.rowName,
              crop.location?.trayName,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <View
                key={crop.id}
                className="mb-3 rounded-2xl border p-4"
                style={{ borderColor: BORDER, backgroundColor: PANEL }}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <AppText weight="bold" className="text-[16px] text-white">
                      {crop.cropName}
                    </AppText>
                    <AppText
                      numberOfLines={1}
                      className="mt-1.5 text-[11px] text-[#8B9187]"
                    >
                      {location || "Location not available"}
                    </AppText>
                  </View>
                  <View
                    className="rounded-full px-3 py-1.5"
                    style={{ backgroundColor: badge.backgroundColor }}
                  >
                    <AppText
                      weight="semibold"
                      style={{ color: badge.color }}
                      className="text-[10px]"
                    >
                      {statusLabel(crop.status)}
                    </AppText>
                  </View>
                </View>

                <View
                  className="my-4 h-px"
                  style={{ backgroundColor: BORDER }}
                />

                <View className="flex-row flex-wrap gap-y-4">
                  <Detail label="Sown" value={dateLabel(crop.sowingDate)} />
                  <Detail
                    label="Expected harvest"
                    value={dateLabel(crop.expectedHarvestDate)}
                  />
                  <Detail
                    label={
                      crop.status === "CANCELLED"
                        ? "Cancelled on"
                        : "Harvested on"
                    }
                    value={
                      crop.status === "CANCELLED"
                        ? dateLabel(crop.cancelledAt)
                        : dateLabel(crop.harvestedAt)
                    }
                    accent={crop.status === "HARVESTED" && !!crop.harvestedAt}
                  />
                  <Detail
                    label="Grow duration"
                    value={
                      crop.actualGrowingDays != null
                        ? `${crop.actualGrowingDays} days actual`
                        : `${crop.estimatedGrowthDays} days estimated`
                    }
                  />
                </View>

                {crop.daysFromExpectedHarvest != null &&
                crop.status === "HARVESTED" ? (
                  <View
                    className="mt-4 rounded-xl px-3 py-2.5"
                    style={{ backgroundColor: "#0A0D08" }}
                  >
                    <AppText className="text-[11px] text-[#8B9187]">
                      Harvest timing
                    </AppText>
                    <AppText
                      weight="semibold"
                      className="mt-1 text-[12px] text-white"
                    >
                      {crop.daysFromExpectedHarvest === 0
                        ? "Harvested on the expected day"
                        : crop.daysFromExpectedHarvest < 0
                          ? `Harvested ${Math.abs(crop.daysFromExpectedHarvest)} day(s) early`
                          : `Harvested ${crop.daysFromExpectedHarvest} day(s) late`}
                    </AppText>
                  </View>
                ) : null}

                {crop.notes ? (
                  <View
                    className="mt-4 rounded-xl p-3"
                    style={{ backgroundColor: "#0A0D08" }}
                  >
                    <AppText className="text-[10px] uppercase tracking-[0.6px] text-[#8B9187]">
                      Notes
                    </AppText>
                    <AppText className="mt-1.5 text-[12px] leading-5 text-[#E8ECE5]">
                      {crop.notes}
                    </AppText>
                  </View>
                ) : null}

                <AppText className="mt-4 text-[10px] text-[#666E63]">
                  Added {dateLabel(crop.createdAt)}
                </AppText>
              </View>
            );
          })
        )}

        {!loading && pagination.hasMore ? (
          <Pressable
            onPress={() => void load(pagination.page + 1, true)}
            disabled={loadingMore}
            accessibilityRole="button"
            className="mt-1 min-h-[48px] items-center justify-center rounded-xl border"
            style={{ borderColor: BORDER, backgroundColor: PANEL }}
          >
            {loadingMore ? (
              <ActivityIndicator color={LIME} />
            ) : (
              <AppText weight="semibold" className="text-[13px] text-[#C8FF67]">
                Load more records
              </AppText>
            )}
          </Pressable>
        ) : null}

        {!loading && history.length > 0 ? (
          <AppText className="mt-4 text-center text-[10px] text-[#666E63]">
            Showing {history.length} of {pagination.total} records
          </AppText>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
