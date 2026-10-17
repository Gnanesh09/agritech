import React from "react";
import { Text, TextProps, StyleProp, TextStyle } from "react-native";

type AppTextProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold" | "extrabold";
  className?: string;
};

const FONT_FAMILIES = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
  extrabold: "Poppins_800ExtraBold",
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
