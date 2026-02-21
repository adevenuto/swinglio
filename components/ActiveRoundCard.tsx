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
            borderColor: "#d4d4d4",
            backgroundColor: "#fff",
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text
              variant="titleMedium"
              style={{
                fontWeight: "700",
                color: "#1a1a1a",
                flex: 1,
                textTransform: "capitalize",
              }}
            >
              {round.courses?.name || "Unknown Course"}
            </Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: "#86efac",
                backgroundColor: "#f0fdf4",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#16a34a" }}>
                Active
              </Text>
            </View>
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: "#555", marginTop: 4, textTransform: "capitalize" }}
          >
            {round.courses?.name}
            {(round.teebox_data as any)?.name
              ? ` · ${(round.teebox_data as any).name} tees`
              : ""}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
