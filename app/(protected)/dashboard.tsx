import ActiveRoundCard from "@/components/ActiveRoundCard";
import ScreenHeader from "@/components/ScreenHeader";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useRecentRounds } from "@/hooks/use-recent-rounds";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { activeRounds, refresh: refreshRounds } = useActiveRounds(
    user?.id ?? "",
  );
  const { recentRounds, refresh: refreshRecent } = useRecentRounds(
    user?.id ?? "",
  );

  useFocusEffect(
    useCallback(() => {
      refreshRounds();
      refreshRecent();
    }, [refreshRounds, refreshRecent]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refreshRounds(), refreshRecent()]);
    setRefreshing(false);
  }, [refreshUser, refreshRounds, refreshRecent]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <ScreenHeader title="Dashboard" />
        <View className="items-center px-8">
          <View className="w-full max-w-md">

            {activeRounds.length === 0 && (
              <Button
                mode="outlined"
                onPress={() => router.push("/start-round")}
                style={{ marginBottom: 16 }}
              >
                Start A Round
              </Button>
            )}

            <ActiveRoundCard rounds={activeRounds} />

            {/* Recent Rounds */}
            <View style={{ marginTop: 24 }}>
              <Text
                variant="titleSmall"
                style={{ marginBottom: 8, color: "#111827" }}
              >
                Recent Activity
              </Text>

              {recentRounds.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  {/* <MaterialIcons
                    name="golf-course"
                    size={48}
                    color="#d4d4d4"
                  /> */}
                  <Text
                    style={{
                      color: "#999",
                      marginTop: 12,
                      fontSize: 15,
                      textAlign: "center",
                    }}
                  >
                    No rounds played yet {"\u2014"} time to hit the links!
                  </Text>
                </View>
              ) : (
                recentRounds.map((round) => (
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
                      <Text variant="bodySmall" style={{ color: "#999" }}>
                        {formatDate(round.created_at)}
                      </Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: "#555",
                        marginTop: 4,
                        textTransform: "capitalize",
                      }}
                    >
                      {(round.teebox_data as any)?.name
                        ? `${(round.teebox_data as any).name} tees`
                        : ""}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
