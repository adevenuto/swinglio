import HoleEntryPanel, { HoleEntryPanelRef } from "@/components/HoleEntryPanel";
import HoleNavigation from "@/components/HoleNavigation";
import Scorecard, { ScorecardRef } from "@/components/Scorecard";
import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import {
  GameplayProvider,
  getCurrentHole,
  useGameplay,
} from "@/contexts/gameplay-context";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { runOnJS } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GameplayScreen() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  return (
    <GameplayProvider roundId={roundId!}>
      <GameplayScreenContent />
    </GameplayProvider>
  );
}

function GameplayScreenContent() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    round,
    players,
    activeHole,
    isLoading,
    isQuitting,
    myScore,
    myFinished,
    holeCount,
    activeHoleKey,
    activeHoleData,
    teeboxHoleData,
    scorecardPlayers,
    fetchRound,
    saveHole,
    setActiveHole,
    handleQuitRound,
  } = useGameplay();

  const scorecardRef = useRef<ScorecardRef>(null);
  const holeEntryRef = useRef<HoleEntryPanelRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Fetch user avatar
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user?.id]);

  // Redirect to round-summary if round is completed
  useEffect(() => {
    if (round?.status === "completed" || round?.status === "incomplete") {
      router.replace({
        pathname: "/round-summary",
        params: { roundId: String(round.id) },
      });
    }
  }, [round?.status, round?.id, router]);

  // Set activeHole to first empty hole on initial load
  useEffect(() => {
    if (!isLoading && players.length > 0 && user?.id && !initialLoadDone) {
      const firstEmpty = getCurrentHole(players, user.id);
      const startHole = firstEmpty ?? 1;
      setActiveHole(startHole);
      setTimeout(() => scorecardRef.current?.scrollToHole(startHole), 100);
      setInitialLoadDone(true);
    }
  }, [isLoading, players, user?.id, initialLoadDone, setActiveHole]);

  // Navigate to a different hole
  const handleNavigate = useCallback(
    (holeNumber: number) => {
      setActiveHole(holeNumber);
      scorecardRef.current?.scrollToHole(holeNumber);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
    [setActiveHole],
  );

  // Tapping a hole number on the scorecard — save current, then jump
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      holeEntryRef.current?.saveCurrentHole();
      setActiveHole(holeNumber);
      scorecardRef.current?.scrollToHole(holeNumber);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
    [setActiveHole],
  );

  // Swipe gestures for HoleEntryPanel
  const swipeToNext = useCallback(() => {
    if (activeHole < holeCount) {
      holeEntryRef.current?.saveCurrentHole();
      const next = activeHole + 1;
      setActiveHole(next);
      scorecardRef.current?.scrollToHole(next);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activeHole, holeCount, setActiveHole]);

  const swipeToPrev = useCallback(() => {
    if (activeHole > 1) {
      holeEntryRef.current?.saveCurrentHole();
      const prev = activeHole - 1;
      setActiveHole(prev);
      scorecardRef.current?.scrollToHole(prev);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activeHole, setActiveHole]);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onEnd((event) => {
      if (event.velocityX < -500) {
        runOnJS(swipeToNext)();
      } else if (event.velocityX > 500) {
        runOnJS(swipeToPrev)();
      }
    });

  // Flush current hole then show quit/finish modal
  const onFinishRound = useCallback(() => {
    holeEntryRef.current?.saveCurrentHole();
    handleQuitRound();
  }, [handleQuitRound]);

  // Save current hole (used by HoleNavigation)
  const saveCurrentHole = useCallback(() => {
    holeEntryRef.current?.saveCurrentHole();
  }, []);

  if (isLoading) {
    return (
      <View style={gameStyles.centeredContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!round) {
    return (
      <View style={gameStyles.centeredContainer}>
        <Text style={{ ...Type.body }}>Round not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: Color.neutral50, paddingTop: 20 }}
    >
      {/* Nav header */}
      <View style={gameStyles.navHeader}>
        <Pressable
          onPress={() => {
            holeEntryRef.current?.saveCurrentHole();
            router.back();
          }}
          style={gameStyles.navBack}
        >
          <MaterialIcons
            name="chevron-left"
            size={28}
            color={Color.neutral900}
          />
          <Text style={gameStyles.navBackText}>Dashboard</Text>
        </Pressable>
      </View>

      {/* Course info card */}
      <View style={gameStyles.courseCardWrapper}>
        <View style={gameStyles.courseCard}>
          <Text style={gameStyles.courseCardTitle}>
            {round.courses?.name || "Unknown"}
          </Text>
          {(round.teebox_data as any)?.name && (
            <Text style={gameStyles.courseCardSubtitle}>
              {(round.teebox_data as any).name} tees
            </Text>
          )}
          {teeboxHoleData && (
            <View style={gameStyles.holeBadgeContainer}>
              <View style={gameStyles.holeBadge}>
                <Text style={gameStyles.holeBadgeTitle}>HOLE {activeHole}</Text>
                <Text style={gameStyles.holeBadgeSubtitle}>
                  Par {teeboxHoleData.par} · {teeboxHoleData.length} yd
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Scorecard + HoleEntryPanel */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchRound();
              setRefreshing(false);
            }}
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        {myFinished && round?.status !== "completed" && (
          <View style={gameStyles.finishedContainer}>
            <MaterialIcons
              name="check-circle"
              size={48}
              color={Color.primary}
            />
            <Text style={gameStyles.finishedTitle}>
              You've completed your round!
            </Text>
            <Text style={gameStyles.finishedSubtitle}>
              Waiting for other players to finish.
            </Text>
          </View>
        )}

        {myScore && teeboxHoleData && !myFinished && (
          <GestureDetector gesture={swipeGesture}>
            <View
              style={{ paddingHorizontal: Space.lg, paddingBottom: Space.lg }}
            >
              <HoleEntryPanel
                ref={holeEntryRef}
                holeNumber={activeHole}
                par={teeboxHoleData.par}
                yardage={teeboxHoleData.length}
                currentScore={activeHoleData?.score ?? ""}
                currentStats={activeHoleData?.stats}
                onSave={saveHole}
              />
            </View>
          </GestureDetector>
        )}

        <View style={{ paddingHorizontal: Space.lg, paddingBottom: Space.lg }}>
          <Text style={gameStyles.scorecardLabel}>SCORECARD</Text>
          <Scorecard
            ref={scorecardRef}
            teeboxData={round.teebox_data}
            players={scorecardPlayers}
            onHolePress={handleHolePress}
            currentUserId={user?.id}
            currentHole={activeHole}
          />
        </View>

        {!myFinished && (
          <Button
            mode="text"
            onPress={onFinishRound}
            loading={isQuitting}
            textColor={Color.neutral500}
            style={{ marginTop: Space.xl }}
            labelStyle={{ fontFamily: Font.medium }}
          >
            Quit Round
          </Button>
        )}
      </ScrollView>

      {myScore && teeboxHoleData && !myFinished && (
        <SafeAreaView edges={["bottom"]} style={gameStyles.bottomBar}>
          <HoleNavigation
            holeNumber={activeHole}
            holeCount={holeCount}
            onSave={saveCurrentHole}
            onNavigate={handleNavigate}
            onFinish={onFinishRound}
          />
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const gameStyles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Color.neutral50,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
  },
  navBack: {
    flexDirection: "row",
    alignItems: "center",
  },
  navBackText: {
    fontFamily: Font.regular,
    fontSize: 17,
    color: Color.neutral900,
  },
  bottomBar: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
    backgroundColor: Color.white,
  },
  courseCardWrapper: {
    paddingHorizontal: Space.lg,
    marginBottom: Space.xxxl,
  },
  courseCard: {
    paddingTop: Space.xl,
    paddingHorizontal: Space.lg,
    paddingBottom: Space.xxl,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    alignItems: "center",
    ...Shadow.sm,
  },
  courseCardTitle: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
    textTransform: "capitalize",
    textAlign: "center",
  },
  courseCardSubtitle: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
    marginTop: Space.xs,
    textTransform: "capitalize",
    textAlign: "center",
  },
  holeBadgeContainer: {
    position: "absolute",
    bottom: -26,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  holeBadge: {
    backgroundColor: Color.white,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.xl,
    alignItems: "center",
    ...Shadow.md,
  },
  holeBadgeTitle: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.neutral900,
    letterSpacing: 1.5,
  },
  holeBadgeSubtitle: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
  scorecardLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  finishedContainer: {
    alignItems: "center",
    paddingVertical: Space.xxl,
    paddingHorizontal: Space.lg,
  },
  finishedTitle: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.neutral900,
    marginTop: Space.md,
    textAlign: "center",
  },
  finishedSubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: Space.xs,
    textAlign: "center",
  },
});
