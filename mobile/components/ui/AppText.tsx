import React from "react";
import { Text, TextProps, StyleProp, TextStyle } from "react-native";

type AppTextProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold" | "extrabold";
  className?: string;
};

const FONT_FAMILIES = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  extrabold: "DMSans_800ExtraBold",
} as const;

export default function AppText({
  weight = "regular",
  className,
  style,
  ...props
}: AppTextProps) {
  const fontStyle: StyleProp<TextStyle> = [
    { fontFamily: FONT_FAMILIES[weight] },
    style,
  ];

  return <Text {...props} className={className} style={fontStyle} />;
}
