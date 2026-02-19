import ActiveRoundCard from "@/components/ActiveRoundCard";
import LeagueList from "@/components/LeagueList";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { useLeagues } from "@/hooks/use-leagues";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { activeRounds, refresh: refreshRounds } = useActiveRounds(
    user?.id ?? "",
  );
  const { leagues, isLoading: leaguesLoading, refresh: refreshLeagues } = useLeagues(
    user?.id ?? "",
  );

  useFocusEffect(
    useCallback(() => {
      refreshRounds();
      refreshLeagues();
    }, [refreshRounds, refreshLeagues]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), refreshRounds(), refreshLeagues()]);
    setRefreshing(false);
  }, [refreshUser, refreshRounds, refreshLeagues]);

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
        <View className="items-center px-8 pt-12">
          <View className="w-full max-w-md">
            <Text className="mb-4 text-3xl font-bold text-center">
              Dashboard
            </Text>
            <Text className="mb-8 text-lg text-center text-gray-600">
              Welcome back, {user?.email?.split("@")[0]}!
            </Text>

            <Button
              mode="outlined"
              onPress={() => router.push("/create-league")}
              style={{ marginTop: 16 }}
            >
              Create League
            </Button>

            {/* <Button
              mode="outlined"
              onPress={() => router.push("/player-scores")}
              style={{ marginTop: 12 }}
            >
              Player Scores
            </Button> */}

            <ActiveRoundCard rounds={activeRounds} />

            <LeagueList leagues={leagues} isLoading={leaguesLoading} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
