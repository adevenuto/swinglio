import ScreenHeader from "@/components/ScreenHeader";
import UserAvatar from "@/components/UserAvatar";
import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import {
  FriendWithProfile,
  useFriends,
} from "@/hooks/use-friends";
import { usePlayerSearch } from "@/hooks/use-player-search";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Button, Searchbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

export default function FriendsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const {
    friends,
    pendingReceived,
    pendingSent,
    isLoading,
    refresh: refreshFriends,
    sendInvite,
    acceptInvite,
    declineOrRemove,
  } = useFriends(user?.id ?? "");

  const {
    query,
    results: searchResults,
    isSearching,
    search,
    clearSearch,
  } = usePlayerSearch();

  useFocusEffect(
    useCallback(() => {
      refreshFriends();
    }, [refreshFriends]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFriends();
    clearSearch();
    setRefreshing(false);
  }, [refreshFriends, clearSearch]);

  // Determine relationship status with a search result
  const getRelationship = (
    playerId: string,
  ): "accepted" | "pending_sent" | "pending_received" | "none" => {
    if (friends.some((f) => f.profile.id === playerId)) return "accepted";
    if (pendingSent.some((f) => f.profile.id === playerId))
      return "pending_sent";
    if (pendingReceived.some((f) => f.profile.id === playerId))
      return "pending_received";
    return "none";
  };

  const getFriendRowForPlayer = (playerId: string) => {
    return (
      [...friends, ...pendingSent, ...pendingReceived].find(
        (f) => f.profile.id === playerId,
      ) ?? null
    );
  };

  const handleSendInvite = async (recipientId: string) => {
    const { error } = await sendInvite(recipientId);
    if (error) {
      Alert.alert("Error", error);
    }
  };

  const handleAccept = async (friendRow: FriendWithProfile) => {
    const { error } = await acceptInvite(friendRow.id);
    if (error) {
      Alert.alert("Error", "Failed to accept invite.");
    }
  };

  const handleDecline = (friendRow: FriendWithProfile) => {
    Alert.alert(
      "Decline Invite",
      `Decline friend request from ${getName(friendRow)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            const { error } = await declineOrRemove(friendRow.id);
            if (error) Alert.alert("Error", "Failed to decline invite.");
          },
        },
      ],
    );
  };

  const handleRemoveFriend = (friendRow: FriendWithProfile) => {
    Alert.alert(
      "Disconnect Friend",
      `Disconnect from ${getName(friendRow)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            const { error } = await declineOrRemove(friendRow.id);
            if (error) Alert.alert("Error", "Failed to disconnect friend.");
          },
        },
      ],
    );
  };

  const handleCancelInvite = (friendRow: FriendWithProfile) => {
    Alert.alert(
      "Cancel Request",
      `Cancel friend request to ${getName(friendRow)}?`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            const { error } = await declineOrRemove(friendRow.id);
            if (error) Alert.alert("Error", "Failed to cancel request.");
          },
        },
      ],
    );
  };

  const getName = (f: FriendWithProfile) =>
    [f.profile.first_name, f.profile.last_name].filter(Boolean).join(" ") ||
    f.profile.email ||
    "Unknown";

  const getPlayerName = (p: {
    first_name: string | null;
    last_name: string | null;
    display_name?: string | null;
    email: string | null;
  }) =>
    p.display_name ||
    [p.first_name, p.last_name].filter(Boolean).join(" ") ||
    p.email ||
    "Unknown";

  // Filter search results to exclude self
  const filteredResults = searchResults.filter((p) => p.id !== user?.id);

  const showSearchResults = query.length >= 2;
  const hasNoFriendsData =
    !isLoading &&
    friends.length === 0 &&
    pendingReceived.length === 0 &&
    pendingSent.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        <ScreenHeader title="Friends" />
        <View className="items-center px-8">
          <View className="w-full max-w-md">

            {/* Search bar */}
            <Searchbar
              placeholder="Search by name or email..."
              onChangeText={search}
              value={query}
              loading={isSearching}
              mode="bar"
              style={styles.searchbar}
              inputStyle={{ color: Color.neutral900 }}
            />

            {/* Search results */}
            {showSearchResults && (
              <View style={{ marginBottom: Space.lg }}>
                {filteredResults.length === 0 && !isSearching ? (
                  <View className="items-center py-4">
                    <Text
                      variant="bodyMedium"
                      style={{ color: Color.neutral400 }}
                    >
                      No players found
                    </Text>
                  </View>
                ) : (
                  filteredResults.map((player) => {
                    const relationship = getRelationship(player.id);
                    const friendRow = getFriendRowForPlayer(player.id);
                    const name = getPlayerName(player);

                    return (
                      <View
                        key={player.id}
                        style={styles.card}
                      >
                        <UserAvatar
                          avatarUrl={player.avatar_url}
                          firstName={player.first_name}
                          size={40}
                        />
                        <View style={{ flex: 1, marginLeft: Space.md }}>
                          <Text
                            variant="bodyLarge"
                            style={styles.playerName}
                          >
                            {name}
                          </Text>
                          {player.email && (
                            <Text
                              variant="bodySmall"
                              style={{ color: Color.neutral500 }}
                            >
                              {player.email}
                            </Text>
                          )}
                        </View>
                        <View style={styles.actionColumn}>
                          {relationship === "accepted" && (
                            <Text
                              variant="bodyMedium"
                              style={{
                                color: Color.primary,
                                fontWeight: "600",
                              }}
                            >
                              Friends
                            </Text>
                          )}
                          {relationship === "pending_sent" && (
                            <Text
                              variant="bodySmall"
                              style={{ color: Color.neutral400 }}
                            >
                              Invite Sent
                            </Text>
                          )}
                          {relationship === "pending_received" &&
                            friendRow && (
                              <Button
                                mode="outlined"
                                compact
                                onPress={() => handleAccept(friendRow)}
                              >
                                Accept
                              </Button>
                            )}
                          {relationship === "none" && (
                            <Button
                              mode="outlined"
                              compact
                              onPress={() => handleSendInvite(player.id)}
                            >
                              Send Invite
                            </Button>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* Pending received invites */}
            {pendingReceived.length > 0 && (
              <View style={{ marginBottom: Space.lg }}>
                <Text style={styles.sectionLabel}>
                  Friend Requests ({pendingReceived.length})
                </Text>
                {pendingReceived.map((fr) => (
                  <View
                    key={fr.id}
                    style={styles.card}
                  >
                    <UserAvatar
                      avatarUrl={fr.profile.avatar_url}
                      firstName={fr.profile.first_name}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: Space.md }}>
                      <Text
                        variant="bodyLarge"
                        style={styles.playerName}
                      >
                        {getName(fr)}
                      </Text>
                      {fr.profile.email && (
                        <Text variant="bodySmall" style={{ color: Color.neutral500 }}>
                          {fr.profile.email}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", gap: Space.sm }}>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleAccept(fr)}
                      >
                        Accept
                      </Button>
                      <Pressable
                        hitSlop={12}
                        onPress={() => handleDecline(fr)}
                        style={{ justifyContent: "center" }}
                      >
                        <Text style={{ color: Color.danger, fontWeight: "600" }}>
                          Decline
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Friends list */}
            {friends.length > 0 && (
              <View style={{ marginBottom: Space.lg }}>
                <Text style={styles.sectionLabel}>
                  Friends ({friends.length})
                </Text>
                {friends.map((fr) => (
                  <View
                    key={fr.id}
                    style={styles.card}
                  >
                    <UserAvatar
                      avatarUrl={fr.profile.avatar_url}
                      firstName={fr.profile.first_name}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: Space.md }}>
                      <Text
                        variant="bodyLarge"
                        style={styles.playerName}
                      >
                        {getName(fr)}
                      </Text>
                      {fr.profile.email && (
                        <Text variant="bodySmall" style={{ color: Color.neutral500 }}>
                          {fr.profile.email}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      hitSlop={16}
                      onPress={() => handleRemoveFriend(fr)}
                    >
                      <Text style={{ color: Color.danger, fontSize: 13 }}>
                        Disconnect
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Sent requests */}
            {pendingSent.length > 0 && (
              <View style={{ marginBottom: Space.lg }}>
                <Text style={styles.sectionLabel}>
                  Sent Requests ({pendingSent.length})
                </Text>
                {pendingSent.map((fr) => (
                  <View
                    key={fr.id}
                    style={styles.card}
                  >
                    <UserAvatar
                      avatarUrl={fr.profile.avatar_url}
                      firstName={fr.profile.first_name}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: Space.md }}>
                      <Text
                        variant="bodyLarge"
                        style={styles.playerName}
                      >
                        {getName(fr)}
                      </Text>
                      {fr.profile.email && (
                        <Text variant="bodySmall" style={{ color: Color.neutral500 }}>
                          {fr.profile.email}
                        </Text>
                      )}
                    </View>
                    <Text
                      variant="bodySmall"
                      style={{ color: Color.neutral400 }}
                    >
                      Invite Sent
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {hasNoFriendsData && !showSearchResults && (
              <View className="items-center py-8">
                <Text
                  variant="bodyMedium"
                  style={{ color: Color.neutral400, textAlign: "center" }}
                >
                  Search for players above to add friends
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm,
    textTransform: "uppercase",
  },
  searchbar: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.full,
    marginBottom: Space.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    padding: Space.md,
    marginBottom: Space.sm,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.sm,
  },
  playerName: {
    color: Color.neutral900,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  actionColumn: {
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },
});
