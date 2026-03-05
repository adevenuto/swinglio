import UserAvatar from "@/components/UserAvatar";
import { Color, Font, Radius, Shadow, Space } from "@/constants/design-tokens";
import {
  Player,
  usePlayerSearch,
  usePlayerScores,
} from "@/hooks/use-player-search";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  List,
  Searchbar,
  Text,
} from "react-native-paper";

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
      <View style={styles.screen}>
        <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.lg }}>
          <Searchbar
            placeholder="Search players..."
            onChangeText={search}
            value={query}
            loading={isSearching}
            mode="bar"
            style={styles.searchbar}
            inputStyle={{ fontFamily: Font.regular, color: Color.neutral900 }}
          />
        </View>

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          style={{ marginTop: Space.sm, paddingHorizontal: Space.lg }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <List.Item
              title={
                [item.first_name, item.last_name].filter(Boolean).join(" ") ||
                "Unknown"
              }
              titleStyle={{ fontFamily: Font.semiBold, color: Color.neutral900 }}
              description={item.email || undefined}
              descriptionStyle={{ fontFamily: Font.regular, color: Color.neutral500 }}
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
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No players found</Text>
              </View>
            ) : null
          }
        />
      </View>
    );
  }

  // Player selected — show scores
  return (
    <View style={styles.screen}>
      <View style={{ paddingHorizontal: Space.lg, paddingTop: Space.lg }}>
        <View style={styles.playerCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>
              {playerName || "Unknown Player"}
            </Text>
            {selectedPlayer.email && (
              <Text style={styles.playerEmail}>
                {selectedPlayer.email}
              </Text>
            )}
          </View>
          <Button mode="outlined" onPress={handleChangePlayer} compact labelStyle={{ fontFamily: Font.medium }}>
            Change
          </Button>
        </View>
      </View>

      <View style={{ paddingHorizontal: Space.lg }}>
        <Text style={styles.scoresTitle}>
          Scores ({scores.length})
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="small" />
        </View>
      ) : scores.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scores found</Text>
        </View>
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(item) => item.id.toString()}
          style={{ paddingHorizontal: Space.lg }}
          renderItem={({ item }) => (
            <List.Item
              title={item.score != null ? `Score: ${item.score}` : "No score"}
              titleStyle={{ fontFamily: Font.semiBold, color: Color.neutral900 }}
              description={
                item.created_at
                  ? new Date(item.created_at).toLocaleDateString()
                  : undefined
              }
              descriptionStyle={{ fontFamily: Font.regular, color: Color.neutral500 }}
              left={(props) => <List.Icon {...props} icon="golf-tee" />}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  searchbar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.full,
  },
  playerCard: {
    padding: Space.lg,
    marginBottom: Space.lg,
    borderWidth: 1,
    borderColor: Color.primaryBorder,
    borderRadius: Radius.md,
    backgroundColor: Color.primaryLight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playerName: {
    fontFamily: Font.semiBold,
    fontSize: 17,
    color: Color.primary,
  },
  playerEmail: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.primaryBorder,
  },
  scoresTitle: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral900,
    marginBottom: Space.sm,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Space.xxl,
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral400,
  },
});
