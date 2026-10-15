import React from "react";
import { Text, TextProps } from "react-native";

type AppTextProps = TextProps & {
  weight?: "regular" | "medium" | "bold";
  className?: string;
};

export default function AppText({
  weight = "regular",
  className = "",
  style,
  ...props
}: AppTextProps) {
  const fontFamily = {
    regular: "Rubik_400Regular",
    medium: "Rubik_500Medium",
    bold: "Rubik_700Bold",
  }[weight];

  return (
    <Text {...props} className={className} style={[{ fontFamily }, style]} />
  );
}
