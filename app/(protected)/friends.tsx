import UserAvatar from "@/components/UserAvatar";
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
  View,
} from "react-native";
import { PILL_TAB_BAR_OFFSET } from "@/components/PillTabBar";
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
        contentContainerStyle={{ paddingBottom: PILL_TAB_BAR_OFFSET }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <View className="items-center px-8 pt-12">
          <View className="w-full max-w-md">
            <Text className="mb-4 text-3xl font-bold text-center">
              Friends
            </Text>

            {/* Search bar */}
            <Searchbar
              placeholder="Search by name or email..."
              onChangeText={search}
              value={query}
              loading={isSearching}
              mode="bar"
              style={{
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: "#d4d4d4",
                borderRadius: 8,
                marginBottom: 16,
              }}
              inputStyle={{ color: "#1a1a1a" }}
            />

            {/* Search results */}
            {showSearchResults && (
              <View style={{ marginBottom: 16 }}>
                {filteredResults.length === 0 && !isSearching ? (
                  <View className="items-center py-4">
                    <Text
                      variant="bodyMedium"
                      style={{ color: "#999" }}
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
                        style={{
                          borderWidth: 1,
                          borderColor: "#d4d4d4",
                          backgroundColor: "#fff",
                          borderRadius: 8,
                          padding: 12,
                          marginBottom: 8,
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <UserAvatar
                          avatarUrl={player.avatar_url}
                          firstName={player.first_name}
                          size={40}
                        />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text
                            variant="bodyLarge"
                            style={{
                              color: "#1a1a1a",
                              fontWeight: "600",
                              textTransform: "capitalize",
                            }}
                          >
                            {name}
                          </Text>
                          {player.email && (
                            <Text
                              variant="bodySmall"
                              style={{ color: "#555" }}
                            >
                              {player.email}
                            </Text>
                          )}
                        </View>
                        <View
                          style={{
                            justifyContent: "center",
                            alignItems: "center",
                            minWidth: 90,
                          }}
                        >
                          {relationship === "accepted" && (
                            <Text
                              variant="bodyMedium"
                              style={{
                                color: "#16a34a",
                                fontWeight: "600",
                              }}
                            >
                              Friends
                            </Text>
                          )}
                          {relationship === "pending_sent" && (
                            <Text
                              variant="bodySmall"
                              style={{ color: "#999" }}
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
              <View style={{ marginBottom: 16 }}>
                <Text
                  variant="titleSmall"
                  style={{ color: "#111827", marginBottom: 8 }}
                >
                  Friend Requests ({pendingReceived.length})
                </Text>
                {pendingReceived.map((fr) => (
                  <View
                    key={fr.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#d4d4d4",
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <UserAvatar
                      avatarUrl={fr.profile.avatar_url}
                      firstName={fr.profile.first_name}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        variant="bodyLarge"
                        style={{
                          color: "#1a1a1a",
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {getName(fr)}
                      </Text>
                      {fr.profile.email && (
                        <Text variant="bodySmall" style={{ color: "#555" }}>
                          {fr.profile.email}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
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
                        <Text style={{ color: "#dc2626", fontWeight: "600" }}>
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
              <View style={{ marginBottom: 16 }}>
                <Text
                  variant="titleSmall"
                  style={{ color: "#111827", marginBottom: 8 }}
                >
                  Friends ({friends.length})
                </Text>
                {friends.map((fr) => (
                  <View
                    key={fr.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#d4d4d4",
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <UserAvatar
                      avatarUrl={fr.profile.avatar_url}
                      firstName={fr.profile.first_name}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        variant="bodyLarge"
                        style={{
                          color: "#1a1a1a",
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {getName(fr)}
                      </Text>
                      {fr.profile.email && (
                        <Text variant="bodySmall" style={{ color: "#555" }}>
                          {fr.profile.email}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      hitSlop={16}
                      onPress={() => handleRemoveFriend(fr)}
                    >
                      <Text style={{ color: "#dc2626", fontSize: 13 }}>
                        Disconnect
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Sent requests */}
            {pendingSent.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  variant="titleSmall"
                  style={{ color: "#111827", marginBottom: 8 }}
                >
                  Sent Requests ({pendingSent.length})
                </Text>
                {pendingSent.map((fr) => (
                  <View
                    key={fr.id}
                    style={{
                      borderWidth: 1,
                      borderColor: "#d4d4d4",
                      backgroundColor: "#fff",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <UserAvatar
                      avatarUrl={fr.profile.avatar_url}
                      firstName={fr.profile.first_name}
                      size={40}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        variant="bodyLarge"
                        style={{
                          color: "#1a1a1a",
                          fontWeight: "600",
                          textTransform: "capitalize",
                        }}
                      >
                        {getName(fr)}
                      </Text>
                      {fr.profile.email && (
                        <Text variant="bodySmall" style={{ color: "#555" }}>
                          {fr.profile.email}
                        </Text>
                      )}
                    </View>
                    <Text
                      variant="bodySmall"
                      style={{ color: "#999" }}
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
                  style={{ color: "#999", textAlign: "center" }}
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
