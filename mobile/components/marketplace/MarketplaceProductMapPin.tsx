import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MARKETPLACE_COLORS as C } from "../../theme/marketplace-colors";

/**
 * Reusable Airbnb-style product pin for react-native-maps.
 *
 * IMAGE SAFETY:
 * - Missing image URL -> render the circular leaf placeholder.
 * - Image still loading -> keep the placeholder visible behind it.
 * - Invalid/broken URL -> hide the failed image and keep the placeholder.
 * The marker therefore never depends on an uploaded image to render correctly.
 *
 * DESIGN TUNING:
 * - PIN_WIDTH / PIN_HEIGHT: total marker capture area
 * - CARD_HEIGHT / THUMB_SIZE: pill and circular image size
 * - styles.pinCard / styles.price / styles.cropName: visual styling
 */
export type MarketplaceProductMapPinProps = {
  cropName: string;
  price: number;
  imageUrl?: string | null;
};

const PIN_WIDTH = 164;
const PIN_HEIGHT = 58;
const CARD_HEIGHT = 48;
const THUMB_SIZE = 36;

const money = (value: number) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

export default function MarketplaceProductMapPin({
  cropName,
  price,
  imageUrl,
}: MarketplaceProductMapPinProps) {
  // Start with the placeholder every time. Only reveal the photo after onLoad fires.
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const normalizedImageUrl =
    typeof imageUrl === "string" ? imageUrl.trim() : "";
  const canTryImage = /^https?:\/\//i.test(normalizedImageUrl);

  // A reused marker can receive a different product URL; reset the image state.
  useEffect(() => {
    setImageLoaded(false);
    setImageFailed(false);
  }, [normalizedImageUrl]);

  return (
    // Fixed capture frame helps prevent Android from cropping the right edge.
    <View collapsable={false} pointerEvents="none" style={styles.pinWrap}>
      {/* Rotated square creates the small pointer/tail at the product coordinate. */}
      <View style={styles.pinTail} />

      {/* Fixed-width price pill: both the text column and thumbnail fit inside it. */}
      <View collapsable={false} style={styles.pinCard}>
        {/* Product name and price. This column can shrink without pushing the photo out. */}
        <View style={styles.copy}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.price}>
            {money(price)}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cropName}>
            {cropName || "Fresh harvest"}
          </Text>
        </View>

        {/* Circular thumbnail shell always exists, regardless of image availability. */}
        <View style={styles.thumbnailShell}>
          {/* Placeholder stays visible while loading or when the image URL is missing/broken. */}
          {(!canTryImage || imageFailed || !imageLoaded) && (
            <View style={styles.thumbnailFallback}>
              <Ionicons name="leaf-outline" size={19} color={C.primary} />
            </View>
          )}

          {/* Remote image only covers the placeholder after it has successfully loaded. */}
          {canTryImage && !imageFailed && (
            <Image
              source={{ uri: normalizedImageUrl }}
              style={[styles.thumbnailImage, { opacity: imageLoaded ? 1 : 0 }]}
              resizeMode="cover"
              fadeDuration={0}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(false);
                setImageFailed(true);
              }}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// DESIGN TOKENS: adjust these styles without changing listing coordinates or navigation.
const styles = StyleSheet.create({
  pinWrap: {
    width: PIN_WIDTH,
    height: PIN_HEIGHT,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  pinCard: {
    width: PIN_WIDTH,
    height: CARD_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 5,
    borderRadius: CARD_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: C.white,
    elevation: 7,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  price: {
    color: C.primaryDark1,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
    includeFontPadding: false,
  },
  cropName: {
    marginTop: 2,
    color: "#50594A",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    includeFontPadding: false,
  },
  // The shell masks both image and placeholder into the same circular footprint.
  thumbnailShell: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    flexShrink: 0,
    borderRadius: THUMB_SIZE / 2,
    overflow: "hidden",
    backgroundColor: C.primaryDark1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailImage: {
    ...StyleSheet.absoluteFillObject,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "transparent",
  },
  thumbnailFallback: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: C.primaryDark1,
    alignItems: "center",
    justifyContent: "center",
  },
  pinTail: {
    position: "absolute",
    bottom: 3,
    left: PIN_WIDTH / 2 - 5,
    width: 10,
    height: 10,
    backgroundColor: C.white,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: C.primary,
    transform: [{ rotate: "45deg" }],
    zIndex: -1,
  },
});
