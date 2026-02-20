import UserAvatar from "@/components/UserAvatar";
import {
  Player,
  usePlayerSearch,
  usePlayerScores,
} from "@/hooks/use-player-search";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  List,
  Searchbar,
  Text,
} from "react-native-paper";
import "../global.css";

export default function PlayerScoresScreen() {
  const router = useRouter();
  const { query, results, isSearching, search, clearSearch } =
    usePlayerSearch();

  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const { scores, isLoading, fetchScores } = usePlayerScores(
    selectedPlayer?.id ?? null
  );

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    clearSearch();
  };

  const handleChangePlayer = () => {
    setSelectedPlayer(null);
  };

  useEffect(() => {
    if (selectedPlayer) {
      fetchScores();
    }
  }, [selectedPlayer, fetchScores]);

  const playerName = [selectedPlayer?.first_name, selectedPlayer?.last_name]
    .filter(Boolean)
    .join(" ");

  // Player not yet selected — show search
  if (!selectedPlayer) {
    return (
      <View className="flex-1 px-4 pt-4 bg-white">
        <Searchbar
          placeholder="Search players..."
          onChangeText={search}
          value={query}
          loading={isSearching}
          mode="bar"
          style={{
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: "#d4d4d4",
            borderRadius: 8,
          }}
          inputStyle={{ color: "#1a1a1a" }}
        />

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          className="mt-2"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <List.Item
              title={
                [item.first_name, item.last_name].filter(Boolean).join(" ") ||
                "Unknown"
              }
              titleStyle={{ color: "#1a1a1a", fontWeight: "600" }}
              description={item.email || undefined}
              descriptionStyle={{ color: "#555" }}
              onPress={() => handleSelectPlayer(item)}
              left={() => (
                <View style={{ justifyContent: "center", marginLeft: 8 }}>
                  <UserAvatar avatarUrl={item.avatar_url} firstName={item.first_name} size={40} />
                </View>
              )}
            />
          )}
          ListEmptyComponent={
            query.length >= 2 && !isSearching ? (
              <View className="items-center py-8">
                <Text variant="bodyMedium">No players found</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // Player selected — show scores
  return (
    <View className="flex-1 px-4 pt-4 bg-white">
      <View className="p-4 mb-4 border border-green-200 rounded-lg bg-green-50">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text
              variant="titleMedium"
              style={{ color: "#14532d", fontWeight: "600" }}
            >
              {playerName || "Unknown Player"}
            </Text>
            {selectedPlayer.email && (
              <Text variant="bodySmall" style={{ color: "#15803d" }}>
                {selectedPlayer.email}
              </Text>
            )}
          </View>
          <Button mode="outlined" onPress={handleChangePlayer} compact>
            Change
          </Button>
        </View>
      </View>

      <Text variant="titleSmall" style={{ marginBottom: 8, color: "#111827" }}>
        Scores ({scores.length})
      </Text>

      {isLoading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" />
        </View>
      ) : scores.length === 0 ? (
        <View className="items-center py-8">
          <Text variant="bodyMedium" style={{ color: "#999" }}>
            No scores found
          </Text>
        </View>
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <List.Item
              title={item.score != null ? `Score: ${item.score}` : "No score"}
              titleStyle={{ color: "#1a1a1a", fontWeight: "600" }}
              description={
                item.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : undefined
              }
              descriptionStyle={{ color: "#555" }}
              left={(props) => <List.Icon {...props} icon="golf-tee" />}
            />
          )}
        />
      )}
    </View>
  );
}
