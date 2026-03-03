import Scorecard, { ScorecardPlayer } from "@/components/Scorecard";
import UserAvatar from "@/components/UserAvatar";
import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useAttestations } from "@/hooks/use-attestations";
import { ResultsData } from "@/lib/scoring-utils";
import { supabase } from "@/lib/supabase";
import { ScoreDetails } from "@/types/scoring";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import SimpleLineIcons from "@expo/vector-icons/SimpleLineIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type RoundData = {
  id: number;
  creator_id: string;
  course_id: number;
  status: string;
  created_at: string;
  results_data: ResultsData | null;
  teebox_data: {
    order: number;
    name: string;
    color?: string;
    holes: Record<string, { par: string; length: string }>;
  };
  courses: { name: string };
};

type PlayerScore = {
  id: number;
  golfer_id: string;
  score_details: ScoreDetails;
  player_status: string;
  self_attested: boolean;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatScoreToPar(score: number): string {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : String(score);
}

export default function RoundSummaryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { roundId } = useLocalSearchParams<{ roundId: string }>();

  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {
    attestations,
    isLoading: attestLoading,
    refresh: refreshAttestations,
    attest,
  } = useAttestations(roundId);

  const fetchRound = useCallback(async () => {
    setIsLoading(true);

    const { data: roundData } = await supabase
      .from("rounds")
      .select(
        "id, creator_id, course_id, status, created_at, results_data, teebox_data, courses(name)",
      )
      .eq("id", roundId)
      .single();

    if (roundData) {
      setRound(roundData as unknown as RoundData);
    }

    const { data: scoreData } = await supabase
      .from("scores")
      .select(
        "id, golfer_id, score_details, player_status, self_attested, profiles(first_name, last_name, display_name, avatar_url)",
      )
      .eq("round_id", roundId);

    if (scoreData) setPlayers(scoreData as unknown as PlayerScore[]);

    setIsLoading(false);
  }, [roundId]);

  useEffect(() => {
    fetchRound();
  }, [fetchRound]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchRound(), refreshAttestations()]);
    setRefreshing(false);
  }, [fetchRound, refreshAttestations]);

  const resultsData = round?.results_data;
  const isParticipant = players.some((p) => p.golfer_id === user?.id);
  const hasAttested = attestations.some((a) => a.attester_id === user?.id);
  const attestCount = attestations.length;
  const myScore = players.find((p) => p.golfer_id === user?.id);
  const myPlayerStatus = myScore?.player_status;
  const myWithdrew = myPlayerStatus === "withdrew";
  const myIncomplete = myPlayerStatus === "incomplete";
  const eligiblePlayers = players.filter(
    (p) => p.player_status !== "withdrew" && p.player_status !== "incomplete",
  );
  const eligiblePlayerCount = eligiblePlayers.length;
  const isEffectivelySolo = eligiblePlayerCount <= 1;
  const mySelfAttested = myScore?.self_attested ?? false;

  // Auto-confirm self-attestation for effectively-solo rounds
  useEffect(() => {
    if (
      isEffectivelySolo &&
      myScore &&
      !mySelfAttested &&
      myPlayerStatus === "completed"
    ) {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === myScore.id ? { ...p, self_attested: true } : p,
        ),
      );
      void (async () => {
        await supabase
          .from("scores")
          .update({ self_attested: true })
          .eq("id", myScore.id);
      })();
    }
  }, [isEffectivelySolo, myScore, mySelfAttested, myPlayerStatus]);

  const scorecardPlayers: ScorecardPlayer[] = useMemo(
    () =>
      players
        .map((p) => ({
          id: p.id,
          golfer_id: p.golfer_id,
          first_name: p.profiles?.display_name || p.profiles?.first_name || "?",
          score_details: p.score_details,
        }))
        .sort((a, b) => {
          if (a.golfer_id === user?.id) return -1;
          if (b.golfer_id === user?.id) return 1;
          return 0;
        }),
    [players, user?.id],
  );

  const handleAttest = useCallback(async () => {
    if (!user?.id) return;
    await attest(user.id);
  }, [user?.id, attest]);

  const myResult = useMemo(
    () => resultsData?.players.find((p) => p.golfer_id === user?.id),
    [resultsData, user?.id],
  );

  const handleContinueRound = useCallback(async () => {
    if (!user?.id || !roundId || !myScore) return;

    await supabase
      .from("scores")
      .update({ player_status: "active", score: null })
      .eq("id", myScore.id);

    await supabase
      .from("rounds")
      .update({ status: "active", results_data: null })
      .eq("id", round?.id);

    await supabase
      .from("round_attestations")
      .delete()
      .eq("round_id", roundId);

    router.replace({ pathname: "/gameplay", params: { roundId } });
  }, [user?.id, roundId, myScore, round?.id, router]);

  if (isLoading) {
    return (
      <View style={s.centeredContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!round) {
    return (
      <View style={s.centeredContainer}>
        <Text style={{ ...Type.body }}>Round not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: Color.neutral50, paddingTop: 20 }}
    >
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backButton}>
          <MaterialIcons
            name="chevron-left"
            size={28}
            color={Color.neutral900}
          />
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <Text style={s.headerTitle}>Round Summary</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Color.info}
            colors={[Color.info]}
          />
        }
      >
        {/* Course info card */}
        <View style={s.courseCard}>
          <Text style={s.courseName}>{round.courses?.name || "Unknown"}</Text>
          {(round.teebox_data as any)?.name && (
            <Text style={s.teeboxName}>
              {(round.teebox_data as any).name} tees
            </Text>
          )}
          <Text style={s.dateText}>
            {resultsData?.completed_at
              ? formatDate(resultsData.completed_at)
              : formatDate(round.created_at)}
          </Text>
        </View>

        {/* Scorecard */}
        <View style={{ paddingHorizontal: Space.lg, marginTop: Space.lg }}>
          <Text style={s.sectionLabel}>SCORECARD</Text>
          <Scorecard
            teeboxData={round.teebox_data}
            players={scorecardPlayers}
            currentUserId={user?.id}
          />
        </View>

        {/* Results card */}
        {resultsData && resultsData.players.length > 0 && (
          <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
            <Text style={s.sectionLabel}>RESULTS</Text>
            <View style={s.resultsCard}>
              {resultsData.players.map((pr) => {
                const playerData = players.find(
                  (p) => p.golfer_id === pr.golfer_id,
                );
                const isWd = pr.player_status === "withdrew";
                const partialHoles = pr.holes_completed < pr.hole_count;
                return (
                  <View key={pr.golfer_id} style={s.resultRow}>
                    <UserAvatar
                      avatarUrl={playerData?.profiles?.avatar_url}
                      firstName={playerData?.profiles?.first_name}
                      size={40}
                    />
                    <View style={s.resultInfo}>
                      <View style={s.resultTopRow}>
                        <Text style={s.resultName}>{pr.display_name}</Text>
                        {isWd && (
                          <View style={s.wdBadge}>
                            <MaterialIcons
                              name="block"
                              size={15}
                              color={Color.danger}
                            />
                            <Text style={s.wdBadgeText}>WD</Text>
                          </View>
                        )}
                        {pr.player_status === "incomplete" && (
                          <View style={s.incompleteBadge}>
                            <MaterialIcons name="warning" size={15} color={Color.warning} />
                            <Text style={s.incompleteBadgeText}>
                              Incomplete
                            </Text>
                          </View>
                        )}
                        {pr.player_status === "completed" && (
                          <View style={s.completedBadge}>
                            <SimpleLineIcons name="badge" size={15} color={Color.primary} />
                            <Text style={s.completedBadgeText}>Completed</Text>
                          </View>
                        )}
                      </View>
                      <View style={s.resultBottomRow}>
                        <Text style={s.resultSub}>
                          {partialHoles
                            ? `${pr.holes_completed} of ${pr.hole_count} holes`
                            : `Front ${pr.front_nine} / Back ${pr.back_nine}`}
                        </Text>
                        <View style={s.scoreContainer}>
                          <Text style={s.scoreTotal}>{pr.total_score}</Text>
                          <Text
                            style={[
                              s.scoreToPar,
                              {
                                color:
                                  pr.score_to_par > 0
                                    ? Color.danger
                                    : pr.score_to_par < 0
                                      ? Color.primary
                                      : Color.neutral500,
                              },
                            ]}
                          >
                            ({formatScoreToPar(pr.score_to_par)})
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Continue Round — for incomplete players */}
        {myIncomplete && isParticipant && (
          <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
            <Text style={s.sectionLabel}>RESUME</Text>
            <View style={s.attestCard}>
              <Text style={s.attestCount}>
                You scored {myResult?.holes_completed ?? 0} of{" "}
                {myResult?.hole_count ?? 0} holes.
              </Text>
              <Button
                mode="contained"
                buttonColor={Color.primary}
                textColor={Color.white}
                style={s.attestButton}
                onPress={handleContinueRound}
                icon="play"
                labelStyle={{ fontFamily: Font.bold }}
              >
                Continue Round
              </Button>
            </View>
          </View>
        )}

        {/* Peer attestation — only for multi-player eligible rounds */}
        {!isEffectivelySolo && isParticipant && !myWithdrew && !myIncomplete && (
          <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
            <Text style={s.sectionLabel}>ATTESTATION</Text>
            <View style={s.attestCard}>
              <Text style={s.attestCount}>
                {attestCount} of {eligiblePlayerCount} players attested
              </Text>

              {hasAttested ? (
                <View style={s.attestedRow}>
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color={Color.primary}
                  />
                  <Text style={s.attestedText}>Attested</Text>
                </View>
              ) : (
                <Button
                  mode="contained"
                  buttonColor={Color.primary}
                  textColor={Color.white}
                  style={s.attestButton}
                  onPress={handleAttest}
                  icon="check-bold"
                  labelStyle={{ fontFamily: Font.bold }}
                >
                  Attest Scores
                </Button>
              )}
            </View>
          </View>
        )}

        {/* Self-confirmed indicator — for effectively-solo rounds */}
        {isEffectivelySolo && isParticipant && !myWithdrew && !myIncomplete && (
          <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
            <Text style={s.sectionLabel}>SCORE CONFIRMATION</Text>
            <View style={s.attestCard}>
              <View style={s.attestedRow}>
                <MaterialIcons
                  name="check-circle"
                  size={24}
                  color={Color.primary}
                />
                <Text style={s.attestedText}>Scores Confirmed</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: Space.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Color.neutral50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingTop: Space.sm,
    paddingBottom: Space.lg,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  backText: {
    fontFamily: Font.regular,
    fontSize: 17,
    color: Color.neutral900,
  },
  headerTitle: {
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral900,
  },
  courseCard: {
    marginHorizontal: Space.lg,
    padding: Space.xl,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    alignItems: "center",
    ...Shadow.sm,
  },
  courseName: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
    textTransform: "capitalize",
    textAlign: "center",
  },
  teeboxName: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral500,
    marginTop: Space.xs,
    textTransform: "capitalize",
  },
  dateText: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral400,
    marginTop: Space.xs,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  resultsCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    overflow: "hidden",
    ...Shadow.sm,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
  },
  resultInfo: {
    flex: 1,
    marginLeft: Space.md,
  },
  resultTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Space.xs,
  },
  resultName: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.neutral900,
    textTransform: "capitalize",
  },
  resultSub: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    textTransform: "capitalize",
  },
  scoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  scoreTotal: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.neutral900,
  },
  scoreToPar: {
    fontFamily: Font.semiBold,
    fontSize: 14,
  },
  attestCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    ...Shadow.sm,
  },
  attestCount: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginBottom: Space.md,
  },
  attestedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  attestedText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.primary,
  },
  attestButton: {
    borderRadius: Radius.lg,
  },
  wdBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Color.dangerLight,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  wdBadgeText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Color.danger,
  },
  incompleteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Color.warningLight,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  incompleteBadgeText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Color.warning,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Color.primaryLight,
    paddingHorizontal: Space.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  completedBadgeText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Color.primary,
  },
});
