import { useAuth } from "@/contexts/auth-context";
import { League } from "@/hooks/use-leagues";
import { useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

type Props = {
  leagues: League[];
  isLoading: boolean;
};

function getRoleBadge(league: League, userId: string | undefined) {
  if (league.owner_id === userId) return "Owner";
  if (league._userRole === "coordinator") return "Coordinator";
  return "Member";
}

const badgeStyles = {
  Owner: { backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
  Coordinator: { backgroundColor: "#dbeafe", color: "#1e40af", borderColor: "#93c5fd" },
  Member: { backgroundColor: "#f3f4f6", color: "#374151", borderColor: "#d1d5db" },
} as const;

export default function LeagueList({ leagues, isLoading }: Props) {
  const { user } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (leagues.length === 0) {
    return (
      <View className="items-center py-8">
        <Text variant="bodyMedium" style={{ color: "#999" }}>
          No leagues yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 16 }}>
      <Text variant="titleSmall" style={{ marginBottom: 8, color: "#111827" }}>
        Your Leagues
      </Text>
      {leagues.map((league) => {
        const badge = getRoleBadge(league, user?.id);
        const style = badgeStyles[badge];
        return (
          <TouchableOpacity
            key={league.id}
            onPress={() =>
              router.push({ pathname: "/league-detail", params: { id: league.id } })
            }
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: "#d4d4d4",
              backgroundColor: "#ffffff",
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text
                variant="titleMedium"
                style={{ fontWeight: "700", color: "#1a1a1a", flex: 1 }}
              >
                {league.courses?.name ?? "Unknown Course"}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: style.borderColor,
                  backgroundColor: style.backgroundColor,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: style.color }}>
                  {badge}
                </Text>
              </View>
            </View>
            <Text variant="bodyMedium" style={{ color: "#555", marginTop: 4 }}>
              {league.teebox_data?.name ?? "No teebox"} tees
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
