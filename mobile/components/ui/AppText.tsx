import React from "react";
import { Text, TextProps } from "react-native";

type AppTextProps = TextProps & {
  weight?: "regular" | "medium" | "semibold" | "bold";
  className?: string;
};

const FONT_FAMILIES = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
  bold: "Poppins_700Bold",
};

export default function AppText({
  weight = "regular",
  className = "",
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      className={className}
      style={[{ fontFamily: FONT_FAMILIES[weight] }, style]}
    />
  );
}
