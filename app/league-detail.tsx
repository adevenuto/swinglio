import { useLeagueUsers } from "@/hooks/use-league-users";
import { League } from "@/hooks/use-leagues";
import { Player, usePlayerSearch } from "@/hooks/use-player-search";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  List,
  Searchbar,
  Text,
} from "react-native-paper";
import "../global.css";

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [league, setLeague] = useState<League | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const {
    members,
    isLoading: membersLoading,
    fetchMembers,
    addMember,
    removeMember,
  } = useLeagueUsers(id!);
  const { query, results, isSearching, search, clearSearch } =
    usePlayerSearch();

  const fetchLeague = useCallback(async () => {
    const { data, error } = await supabase
      .from("leagues")
      .select("*, courses(name)")
      .eq("id", id)
      .single();

    if (!error && data) {
      setLeague(data as League);
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchLeague();
    fetchMembers();
  }, [fetchLeague, fetchMembers]);

  // Refetch league data when returning from edit config modal
  useFocusEffect(
    useCallback(() => {
      if (league) fetchLeague();
    }, [fetchLeague, league]),
  );

  const handleDelete = () => {
    Alert.alert(
      "Delete League",
      "Are you sure you want to delete this league? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            const { error } = await supabase
              .from("leagues")
              .delete()
              .eq("id", id);
            setIsDeleting(false);

            if (!error) {
              router.back();
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!league) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <Text variant="bodyLarge">League not found</Text>
      </View>
    );
  }

  const config = league.game_config;
  const proxEnabled = config?.proxLowNet?.enabled;
  const skinsEnabled = config?.skins?.enabled;

  const memberGolferIds = new Set(members.map((m) => m.golfer_id));
  const filteredResults = results.filter((p) => !memberGolferIds.has(p.id));

  const handleAddPlayer = async (player: Player) => {
    await addMember(player.id);
    clearSearch();
    setShowAddPlayer(false);
  };

  const handleRemoveMember = (leagueUserId: number, name: string) => {
    Alert.alert("Remove Player", `Remove ${name} from this league?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeMember(leagueUserId),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Sticky Header */}
      <View className="px-4 pt-6 pb-4">
        <View className="p-4 border border-green-200 rounded-lg bg-green-50">
          <Text
            variant="titleLarge"
            style={{ fontWeight: "700", color: "#14532d", marginBottom: 2 }}
          >
            {league.courses?.name ?? "Unknown Course"}
          </Text>
          <Text variant="bodyMedium" style={{ color: "#15803d" }}>
            {league.teebox_data?.name ?? "N/A"} tees
          </Text>
          <Text variant="bodySmall" style={{ color: "#15803d", marginTop: 4 }}>
            Created {new Date(league.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="px-4">
          {/* Members */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text variant="titleSmall" style={{ color: "#111827" }}>
                Members ({members.length})
              </Text>
              <Button
                mode="outlined"
                compact
                onPress={() => {
                  setShowAddPlayer(!showAddPlayer);
                  if (showAddPlayer) clearSearch();
                }}
              >
                {showAddPlayer ? "Done" : "Add"}
              </Button>
            </View>

            {showAddPlayer && (
              <View className="mb-3">
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
                {filteredResults.map((player) => (
                  <List.Item
                    key={player.id}
                    title={
                      [player.first_name, player.last_name]
                        .filter(Boolean)
                        .join(" ") || "Unknown"
                    }
                    titleStyle={{ color: "#1a1a1a", fontWeight: "600" }}
                    description={player.email || undefined}
                    descriptionStyle={{ color: "#555" }}
                    onPress={() => handleAddPlayer(player)}
                    left={(props) => (
                      <List.Icon {...props} icon="account-plus" />
                    )}
                  />
                ))}
                {query.length >= 2 &&
                  !isSearching &&
                  filteredResults.length === 0 && (
                    <Text
                      variant="bodyMedium"
                      style={{
                        textAlign: "center",
                        paddingVertical: 12,
                        color: "#999",
                      }}
                    >
                      No players found
                    </Text>
                  )}
              </View>
            )}

            {membersLoading ? (
              <ActivityIndicator size="small" style={{ paddingVertical: 12 }} />
            ) : members.length === 0 ? (
              <Text
                variant="bodyMedium"
                style={{ color: "#999", paddingVertical: 8 }}
              >
                No members yet
              </Text>
            ) : (
              members.map((member) => {
                const name =
                  [member.profiles.first_name, member.profiles.last_name]
                    .filter(Boolean)
                    .join(" ") || "Unknown";
                return (
                  <List.Item
                    key={member.id}
                    title={name}
                    titleStyle={{ color: "#1a1a1a", fontWeight: "600" }}
                    description={member.profiles.email || undefined}
                    descriptionStyle={{ color: "#555" }}
                    left={(props) => <List.Icon {...props} icon="account" />}
                    right={(props) => (
                      <IconButton
                        {...props}
                        icon="close"
                        size={18}
                        onPress={() => handleRemoveMember(member.id, name)}
                      />
                    )}
                  />
                );
              })
            )}
          </View>

          <Divider style={{ marginBottom: 16 }} />

          {/* Game Settings */}
          {config && (
            <>
              <View className="flex-row items-center justify-between mb-3">
                <Text variant="titleSmall" style={{ color: "#111827" }}>
                  Game Settings
                </Text>
                <Button
                  mode="outlined"
                  compact
                  onPress={() =>
                    router.push({
                      pathname: "/edit-game-config",
                      params: { id },
                    })
                  }
                >
                  Edit
                </Button>
              </View>

              {/* Prox / Low Net Card */}
              <View
                className="p-4 mb-3 border rounded-lg"
                style={{ borderColor: proxEnabled ? "#d4d4d4" : "#e5e5e5" }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    variant="titleSmall"
                    style={{ color: proxEnabled ? "#111827" : "#999" }}
                  >
                    Prox / Low Net
                  </Text>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: proxEnabled ? "#16a34a" : "#999",
                      fontWeight: "600",
                    }}
                  >
                    {proxEnabled
                      ? `$${config.proxLowNet.entryFee} entry`
                      : "Disabled"}
                  </Text>
                </View>

                {proxEnabled && (
                  <>
                    <Divider style={{ marginBottom: 10 }} />

                    <Text
                      variant="labelSmall"
                      style={{ color: "#999", marginBottom: 6 }}
                    >
                      PAYOUTS
                    </Text>

                    <Row
                      label="Low Net 1st"
                      value={`${config.proxLowNet.payouts.lowNet1st}%`}
                    />
                    <Row
                      label="Low Net 2nd"
                      value={`${config.proxLowNet.payouts.lowNet2nd}%`}
                    />
                    <Row
                      label="Low Net 3rd"
                      value={`${config.proxLowNet.payouts.lowNet3rd}%`}
                    />
                    <Row
                      label="Low Gross"
                      value={`${config.proxLowNet.payouts.lowGross}%`}
                    />
                    <Row
                      label={`Proximity (${config.proxLowNet.proxHoleCount} holes)`}
                      value={`${config.proxLowNet.payouts.proxTotal}%`}
                    />
                  </>
                )}
              </View>

              {/* Skins Card */}
              <View
                className="p-4 mb-3 border rounded-lg"
                style={{ borderColor: skinsEnabled ? "#d4d4d4" : "#e5e5e5" }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    variant="titleSmall"
                    style={{ color: skinsEnabled ? "#111827" : "#999" }}
                  >
                    Skins
                  </Text>
                  <Text
                    variant="labelMedium"
                    style={{
                      color: skinsEnabled ? "#16a34a" : "#999",
                      fontWeight: "600",
                    }}
                  >
                    {skinsEnabled
                      ? `$${config.skins.entryFee} entry`
                      : "Disabled"}
                  </Text>
                </View>

                {skinsEnabled && (
                  <>
                    <Divider style={{ marginBottom: 10 }} />
                    <Row
                      label="Carry over"
                      value={config.skins.carryOver ? "Yes" : "No"}
                    />
                  </>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View
        className="flex-row gap-3 px-4 pt-4 pb-12"
        style={{ borderTopWidth: 1, borderTopColor: "#e5e5e5" }}
      >
        <View className="flex-1">
          <Button mode="outlined" onPress={() => router.back()}>
            Back
          </Button>
        </View>
        <View className="flex-1">
          <Button
            mode="outlined"
            onPress={handleDelete}
            loading={isDeleting}
            textColor="#dc2626"
            style={{ borderColor: "#dc2626" }}
          >
            Delete League
          </Button>
        </View>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between mb-1">
      <Text variant="bodyMedium" style={{ color: "#555" }}>
        {label}
      </Text>
      <Text
        variant="bodyMedium"
        style={{ color: "#1a1a1a", fontWeight: "600" }}
      >
        {value}
      </Text>
    </View>
  );
}
