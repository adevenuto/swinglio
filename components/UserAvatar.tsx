import { Color, Font } from "@/constants/design-tokens";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  avatarUrl: string | null | undefined;
  firstName: string | null | undefined;
  lastName?: string | null | undefined;
  size: number;
};

function getInitials(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  const f = firstName?.trim()?.[0]?.toUpperCase();
  const l = lastName?.trim()?.[0]?.toUpperCase();
  if (f && l) return `${f}${l}`;
  if (f) return f;
  return null;
}

export default function UserAvatar({ avatarUrl, firstName, lastName, size }: Props) {
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: Color.neutral100,
        }}
      />
    );
  }

  const initials = getInitials(firstName, lastName);

  if (initials) {
    const fontSize = Math.round(size * 0.38);
    return (
      <View
        style={[
          styles.initialsContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text
          style={[
            styles.initialsText,
            { fontSize, lineHeight: fontSize * 1.2 },
          ]}
        >
          {initials}
        </Text>
      </View>
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
        color={Color.neutral300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  initialsContainer: {
    backgroundColor: Color.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontFamily: Font.bold,
    color: Color.neutral700,
  },
});
