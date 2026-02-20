import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Image, View } from "react-native";

type Props = {
  avatarUrl: string | null | undefined;
  firstName: string | null | undefined;
  size: number;
};

export default function UserAvatar({ avatarUrl, size }: Props) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#e5e5e5",
        }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <MaterialCommunityIcons
        name="account-circle"
        size={size}
        color="#d4d4d4"
      />
    </View>
  );
}
