import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import { useSubscription } from "@/contexts/subscription-context";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

/**
 * Gate wrapper: renders children if user is Pro, otherwise shows fallback
 * or a default "Upgrade to Pro" card.
 */
export default function ProGate({ children, fallback }: Props) {
  const { isPro, presentPaywall } = useSubscription();

  if (isPro) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <Pressable
      onPress={presentPaywall}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
    >
      <Feather name="lock" size={18} color={Color.primary} />
      <View style={styles.textWrap}>
        <Text style={styles.title}>Pro Feature</Text>
        <Text style={styles.subtitle}>Upgrade to unlock</Text>
      </View>
      <Feather name="chevron-right" size={18} color={Color.neutral400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Color.neutral200,
    padding: Space.lg,
    gap: Space.md,
    ...Shadow.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral900,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
});
