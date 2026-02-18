import { useLeagues } from "@/hooks/use-leagues";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { View } from "react-native";
import { ActivityIndicator, List, Text } from "react-native-paper";

export default function LeagueList() {
  const { leagues, isLoading, refresh } = useLeagues();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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
    <View className="mt-4">
      <Text variant="titleSmall" style={{ marginBottom: 8, color: "#111827" }}>
        Your Leagues
      </Text>
      {leagues.map((league) => (
        <List.Item
          key={league.id}
          title={league.courses?.name ?? "Unknown Course"}
          titleStyle={{ color: "#1a1a1a", fontWeight: "600" }}
          description={league.teebox_data?.name ?? "No teebox"}
          descriptionStyle={{ color: "#555" }}
          onPress={() =>
            router.push({ pathname: "/league-detail", params: { id: league.id } })
          }
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
        />
      ))}
    </View>
  );
}
