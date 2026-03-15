import DistanceMapModal from "@/components/DistanceMapModal";
import GameplayHeader from "@/components/GameplayHeader";
import HoleEntryPanel from "@/components/HoleEntryPanel";
import HoleNavigation from "@/components/HoleNavigation";
import Scorecard, { ScorecardRef } from "@/components/Scorecard";
import {
  Color,
  Font,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import {
  GameplayProvider,
  getCurrentHole,
  useGameplay,
} from "@/contexts/gameplay-context";
import { usePlayerLocation } from "@/hooks/use-player-location";
import { distanceInYards } from "@/lib/geo";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    featuredImageUrl,
    myScore,
    myFinished,
    holeCount,
    activeHoleKey,
    activeHoleData,
    teeboxHoleData,
    scorecardPlayers,
    fetchRound,
    updateHole,
    flushPersist,
    setActiveHole,
    handleQuitRound,
    greenCenters,
    hasGreenCenters,
  } = useGameplay();

  // GPS distance to pin
  const { location, loading: gpsLoading } = usePlayerLocation(hasGreenCenters);
  const [showDistanceMap, setShowDistanceMap] = useState(false);

  const activeGreenCenter = greenCenters[`hole-${activeHole}`] ?? null;

  const distanceToPin = useMemo(() => {
    if (!location || !activeGreenCenter) return null;
    return distanceInYards(
      location.latitude,
      location.longitude,
      activeGreenCenter.lat,
      activeGreenCenter.lng,
    );
  }, [location, activeGreenCenter]);

  const scorecardRef = useRef<ScorecardRef>(null);
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
        params: {
          roundId: String(round.id),
          ...(round.status === "completed" ? { completed: "1" } : {}),
        },
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

  // Tapping a hole number on the scorecard — flush persist, then jump
  const handleHolePress = useCallback(
    (holeNumber: number) => {
      flushPersist();
      setActiveHole(holeNumber);
      scorecardRef.current?.scrollToHole(holeNumber);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    },
    [setActiveHole, flushPersist],
  );

  // Swipe gestures for HoleEntryPanel
  const swipeToNext = useCallback(() => {
    if (activeHole < holeCount) {
      flushPersist();
      const next = activeHole + 1;
      setActiveHole(next);
      scorecardRef.current?.scrollToHole(next);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activeHole, holeCount, setActiveHole, flushPersist]);

  const swipeToPrev = useCallback(() => {
    if (activeHole > 1) {
      flushPersist();
      const prev = activeHole - 1;
      setActiveHole(prev);
      scorecardRef.current?.scrollToHole(prev);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activeHole, setActiveHole, flushPersist]);

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
    flushPersist();
    handleQuitRound();
  }, [handleQuitRound, flushPersist]);

  // Flush persist (used by HoleNavigation)
  const saveCurrentHole = useCallback(() => {
    flushPersist();
  }, [flushPersist]);

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
      style={{ flex: 1, backgroundColor: Color.screenBg, paddingTop: 20 }}
    >
      {/* Nav header */}
      <View style={gameStyles.navHeader}>
        <Pressable
          onPress={() => {
            flushPersist();
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

      {/* Course header */}
      <View style={gameStyles.courseCardWrapper}>
        <GameplayHeader
          courseId={round.course_id}
          courseName={round.courses?.club_name || "Unknown"}
          courseNameSub={round.courses?.course_name && round.courses.course_name !== round.courses.club_name ? round.courses.course_name : null}
          featuredImageUrl={featuredImageUrl}
          holeCount={holeCount}
          activeHole={activeHole}
          par={teeboxHoleData?.par}
          yardage={teeboxHoleData?.length}
          teeboxName={(round.teebox_data as any)?.name}
          distanceToPin={distanceToPin}
          distanceLoading={hasGreenCenters && gpsLoading}
          onDistancePress={
            distanceToPin != null && activeGreenCenter
              ? () => setShowDistanceMap(true)
              : undefined
          }
        />
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
                holeNumber={activeHole}
                par={teeboxHoleData.par}
                yardage={teeboxHoleData.length}
                currentScore={activeHoleData?.score ?? ""}
                currentStats={activeHoleData?.stats}
                onSave={updateHole}
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

      {location && activeGreenCenter && distanceToPin != null && (
        <DistanceMapModal
          visible={showDistanceMap}
          onClose={() => setShowDistanceMap(false)}
          playerLat={location.latitude}
          playerLng={location.longitude}
          greenCenter={activeGreenCenter}
          holeNumber={activeHole}
          distanceYards={distanceToPin}
        />
      )}
    </SafeAreaView>
  );
}

const gameStyles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Color.screenBg,
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
    marginBottom: Space.md,
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
