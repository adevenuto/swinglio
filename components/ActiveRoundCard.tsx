import { ActiveRound } from "@/hooks/use-active-rounds";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";

type Props = { rounds: ActiveRound[] };

export default function ActiveRoundCard({ rounds }: Props) {
  const router = useRouter();

  if (rounds.length === 0) return null;

  return (
    <View style={{ marginTop: 16 }}>
      <Text variant="titleSmall" style={{ marginBottom: 8, color: "#111827" }}>
        Active Rounds
      </Text>
      {rounds.map((round) => (
        <TouchableOpacity
          key={round.id}
          onPress={() =>
            router.push({
              pathname: "/gameplay",
              params: { roundId: round.id },
            })
          }
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: "#86efac",
            backgroundColor: "#f0fdf4",
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Text
            variant="titleMedium"
            style={{ fontWeight: "700", color: "#14532d" }}
          >
            {round.leagues?.courses?.name ?? "Unknown Course"}
          </Text>
          <Text variant="bodyMedium" style={{ color: "#15803d" }}>
            {round.leagues?.teebox_data?.name ?? "N/A"} tees
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: "#15803d", marginTop: 4 }}
          >
            Started {new Date(round.created_at).toLocaleDateString()}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
