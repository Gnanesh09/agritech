import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const C = {
  bg: "#090C07",
  card: "#171C13",
  green: "#B7F34B",
  ink: "#F2F4EC",
  line: "#414B31",
};
type Action = "MAP" | "LIST" | "SELL" | "LOCATION" | "CART";
type Props = {
  active: "MAP" | "LIST";
  onMaps: () => void;
  onList: () => void;
  onSell: () => void;
  onLocation: () => void;
  onCart: () => void;
};
const ITEMS: { key: Action; label: string }[] = [
  { key: "MAP", label: "Maps" },
  { key: "LIST", label: "List" },
  { key: "SELL", label: "Sell" },
  { key: "LOCATION", label: "location" },
  { key: "CART", label: "cart" },
];
export default function MarketplaceActionBar({
  active,
  onMaps,
  onList,
  onSell,
  onLocation,
  onCart,
}: Props) {
  const handlers: Record<Action, () => void> = {
    MAP: onMaps,
    LIST: onList,
    SELL: onSell,
    LOCATION: onLocation,
    CART: onCart,
  };
  return (
    <View style={styles.row}>
      {ITEMS.map((item) => {
        const selected = item.key === active;
        return (
          <Pressable
            key={item.key}
            onPress={handlers[item.key]}
            style={styles.action}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={[styles.iconBox, selected && styles.iconBoxSelected]}>
              {item.key === "MAP" && (
                <Feather
                  name="map"
                  size={22}
                  color={selected ? C.bg : C.green}
                />
              )}
              {item.key === "LIST" && (
                <Feather
                  name="list"
                  size={22}
                  color={selected ? C.bg : C.green}
                />
              )}
              {item.key === "SELL" && (
                <MaterialCommunityIcons
                  name="hand-coin-outline"
                  size={24}
                  color={selected ? C.bg : C.green}
                />
              )}
              {item.key === "LOCATION" && (
                <Feather
                  name="navigation"
                  size={22}
                  color={selected ? C.bg : C.green}
                />
              )}
              {item.key === "CART" && (
                <Ionicons
                  name="bag-handle-outline"
                  size={23}
                  color={selected ? C.bg : C.green}
                />
              )}
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  action: { flex: 1, minWidth: 0, alignItems: "center", gap: 5 },
  iconBox: {
    height: 60,
    width: "100%",
    maxWidth: 60,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBoxSelected: { backgroundColor: C.green, borderColor: C.green },
  label: {
    color: C.ink,
    fontSize: 9,
    lineHeight: 12,
    textAlign: "center",
    textTransform: "lowercase",
  },
});
