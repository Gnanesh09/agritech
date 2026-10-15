import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { addToCart, useSelectedListing } from "../../../lib/marketplace-store";
import { MARKETPLACE_COLORS as C } from "../../../theme/marketplace-colors";

const money = (value: number) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

const formatHarvestDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

export default function MarketplaceProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const listing = useSelectedListing();
  const product = listing?.id === routeId ? listing : null;

  const [quantity, setQuantity] = useState(
    Math.max(1, Number(product?.minOrderQuantity ?? 1)),
  );

  const total = useMemo(
    () => Number(product?.price ?? 0) * quantity,
    [product?.price, quantity],
  );

  if (!product) {
    return (
      <View
        className="flex-1 bg-[#0C0D0B] px-5"
        style={{ paddingTop: insets.top + 12 }}
      >
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-[#30352D] bg-[#171916]"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color={C.ink} />
        </Pressable>

        <View className="flex-1 items-center justify-center gap-3 px-5">
          <View className="h-16 w-16 items-center justify-center rounded-3xl border border-[#30352D] bg-[#202A19]">
            <Ionicons name="leaf-outline" size={30} color="#C8FF67" />
          </View>
          <Text className="text-center text-xl font-bold text-[#F6F7F4]">
            Product unavailable
          </Text>
          <Text className="max-w-[280px] text-center text-sm leading-6 text-[#A2A79E]">
            Go back to the marketplace and open this product again.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)/market" as any)}
            className="mt-2 rounded-2xl bg-[#C8FF67] px-5 py-3.5"
          >
            <Text className="font-bold text-[#0C0D0B]">
              Back to marketplace
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const minQuantity = Math.max(1, Number(product.minOrderQuantity ?? 1));
  const availableQuantity = Math.max(
    0,
    Number(product.quantityAvailable ?? 9999),
  );
  const maxQuantity = Math.max(
    minQuantity,
    Math.min(
      Number(product.maxOrderQuantity ?? availableQuantity ?? 9999),
      availableQuantity || 9999,
    ),
  );
  const discount = Math.max(
    0,
    Math.round(Number(product.discountPercent ?? 0)),
  );
  const harvestDate = formatHarvestDate(product.expectedHarvestDate);
  const heroHeight = Math.min(360, Math.max(260, height * 0.36));

  const add = () => {
    addToCart(product, quantity);
    Alert.alert(
      "Added to cart",
      `${product.cropName} has been added to your cart.`,
      [
        { text: "Continue browsing", onPress: () => router.back() },
        {
          text: "View cart",
          onPress: () => router.push("/market/cart" as any),
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-[#0C0D0B]">
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 128 }}
      >
        {/* Product image and floating navigation */}
        <View
          className="relative w-full overflow-hidden bg-[#141A15]"
          style={{ height: heroHeight }}
        >
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-[#141E18]">
              <View className="h-24 w-24 items-center justify-center rounded-[32px] border border-[#2E4938] bg-[#1A2B20]">
                <Ionicons name="leaf-outline" size={52} color={C.green} />
              </View>
              <Text className="mt-4 text-xs font-medium text-[#A2A79E]">
                Fresh local produce
              </Text>
            </View>
          )}

          {/* Gentle tint keeps controls readable over bright product photos. */}
          <View
            pointerEvents="none"
            className="absolute inset-0 bg-[#080907]/15"
          />

          <View
            className="absolute left-4 right-4 flex-row items-center justify-between"
            style={{ top: insets.top + 10 }}
          >
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#080907]/80"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Feather name="arrow-left" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={() => router.push("/market/cart" as any)}
              className="h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-[#080907]/80"
              accessibilityRole="button"
              accessibilityLabel="Open cart"
            >
              <Feather name="shopping-bag" size={19} color="#FFFFFF" />
            </Pressable>
          </View>

          {product.harvestType === "UPCOMING" && (
            <View className="absolute bottom-12 left-4 flex-row items-center gap-1.5 rounded-xl border border-[#718F38] bg-[#202A19] px-3 py-2">
              <Feather name="calendar" size={12} color="#C8FF67" />
              <Text className="text-[10px] font-extrabold tracking-[0.8px] text-[#C8FF67]">
                UPCOMING HARVEST
              </Text>
            </View>
          )}
        </View>

        {/* Main product summary */}
        <View className="z-10 mx-3.5 -mt-8 rounded-[24px] border border-[#30352D] bg-[#171916] p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text
                className="text-[22px] font-extrabold leading-7 text-[#F6F7F4]"
                numberOfLines={2}
              >
                {product.cropName}
              </Text>
              <Text className="mt-1.5 text-xs leading-5 text-[#A2A79E]">
                Pack of 1 · {product.packSizeValue} {product.packSizeUnit}
              </Text>
            </View>

            <View className="items-end gap-1">
              <View className="rounded-xl  bg-[#08a329] px-3 py-2">
                <Text className="text-base text-2xl font-extrabold text-[#ffffff]">
                  {money(product.price)}
                </Text>
              </View>
              {discount > 0 && (
                <Text className="text-[10px] font-bold text-[#C8FF67]">
                  {discount}% off
                </Text>
              )}
            </View>
          </View>

          {discount > 0 &&
            Number(product.originalPrice) > Number(product.price) && (
              <View className="mt-2 flex-row items-center gap-2">
                <Text className="text-xs text-[#8A9189] line-through">
                  {money(Number(product.originalPrice))}
                </Text>
                <Text className="text-[11px] font-semibold text-[#C8FF67]">
                  You save{" "}
                  {money(Number(product.originalPrice) - Number(product.price))}
                </Text>
              </View>
            )}

          {/* Seller information */}
          <View className="mt-4 flex-row items-center gap-3 border-t border-[#30352D] pt-4">
            <View className="h-11 w-11 items-center justify-center rounded-2xl border border-[#2E4938] bg-[#202A19]">
              <Ionicons name="leaf" size={19} color={C.green} />
            </View>

            <View className="min-w-0 flex-1">
              <Text
                className="text-sm font-bold text-[#F6F7F4]"
                numberOfLines={1}
              >
                {product.seller?.username ?? "Local grower"}
              </Text>
              <Text className="mt-1 text-[11px] text-[#A2A79E]">
                Independent local grower
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5 rounded-full border border-[#30352D] bg-[#202A19] px-2.5 py-2">
              <Feather name="map-pin" size={12} color="#C8FF67" />
              <Text className="text-[11px] font-bold text-[#C8FF67]">
                {product.distanceKm == null
                  ? "Nearby"
                  : `${Number(product.distanceKm).toFixed(1)} km`}
              </Text>
            </View>
          </View>
        </View>

        {/* Product information */}
        <View className="px-4 pb-3 pt-7">
          <Text className="text-lg font-bold text-[#F6F7F4]">
            Product details
          </Text>
          {!!product.description && (
            <Text className="mt-2 text-[13px] leading-[21px] text-[#A2A79E]">
              {product.description}
            </Text>
          )}

          <View className="mt-4 flex-row gap-2">
            <View className="min-w-0 flex-1 rounded-2xl border border-[#30352D] bg-[#171916] px-3 py-3.5">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-xl bg-[#202A19]">
                <Feather name="package" size={17} color="#C8FF67" />
              </View>
              <Text className="text-[11px] text-[#A2A79E]">Pack size</Text>
              <Text
                className="mt-1 text-[13px] font-bold text-[#F6F7F4]"
                numberOfLines={2}
              >
                {product.packSizeValue} {product.packSizeUnit}
              </Text>
            </View>

            <View className="min-w-0 flex-1 rounded-2xl border border-[#30352D] bg-[#171916] px-3 py-3.5">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-xl bg-[#202A19]">
                <Feather name="layers" size={17} color="#C8FF67" />
              </View>
              <Text className="text-[11px] text-[#A2A79E]">Available</Text>
              <Text
                className="mt-1 text-[13px] font-bold text-[#F6F7F4]"
                numberOfLines={2}
              >
                {product.quantityAvailable} packs
              </Text>
            </View>

            <View className="min-w-0 flex-1 rounded-2xl border border-[#30352D] bg-[#171916] px-3 py-3.5">
              <View className="mb-3 h-9 w-9 items-center justify-center rounded-xl bg-[#202A19]">
                <Feather name="truck" size={17} color="#C8FF67" />
              </View>
              <Text className="text-[11px] text-[#A2A79E]">Fulfilment</Text>
              <Text
                className="mt-1 text-[13px] font-bold text-[#F6F7F4]"
                numberOfLines={2}
              >
                {product.sellerDelivery ? "Delivery" : "Pickup"}
              </Text>
            </View>
          </View>

          {/* Harvest status */}
          <View className="mt-3.5 flex-row items-center gap-3 rounded-2xl border border-[#30352D] bg-[#171916] p-3.5">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#202A19]">
              <Ionicons name="leaf-outline" size={20} color="#C8FF67" />
            </View>

            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-[#F6F7F4]">
                {product.harvestType === "UPCOMING"
                  ? "Upcoming harvest"
                  : "Freshly listed harvest"}
              </Text>
              <Text className="mt-1 text-xs leading-[18px] text-[#A2A79E]">
                {product.harvestType === "UPCOMING" && harvestDate
                  ? `Expected to be ready ${harvestDate}`
                  : "Local produce listed by a nearby grower."}
              </Text>
            </View>

            <View className="h-2 w-2 rounded-full bg-[#C8FF67]" />
          </View>
        </View>
      </ScrollView>

      {/* Sticky purchase bar */}
      <View
        className="flex-row items-center gap-3 border-t border-[#30352D] bg-[#0C0D0B] px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
      >
        <View className="h-[50px] flex-row items-center rounded-2xl border border-[#30352D] bg-[#171916]">
          <Pressable
            onPress={() =>
              setQuantity((value) => Math.max(minQuantity, value - 1))
            }
            disabled={quantity <= minQuantity}
            className="h-[48px] w-9 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <Feather
              name="minus"
              size={15}
              color={quantity <= minQuantity ? "#555B53" : C.ink}
            />
          </Pressable>

          <Text className="min-w-[22px] text-center text-sm font-extrabold text-[#F6F7F4]">
            {quantity}
          </Text>

          <Pressable
            onPress={() =>
              setQuantity((value) => Math.min(maxQuantity, value + 1))
            }
            disabled={quantity >= maxQuantity}
            className="h-[48px] w-9 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <Feather
              name="plus"
              size={15}
              color={quantity >= maxQuantity ? "#555B53" : C.ink}
            />
          </Pressable>
        </View>

        <Pressable
          onPress={add}
          className="min-h-[50px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#C8FF67] px-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <Feather name="shopping-bag" size={16} color="#0C0D0B" />
          <Text className="text-[13px] font-extrabold text-[#0C0D0B]">
            Add to cart · {money(total)}
          </Text>
          <Feather name="arrow-right" size={16} color="#0C0D0B" />
        </Pressable>
      </View>
    </View>
  );
}
