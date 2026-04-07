import AdaptiveText from "@/components/AdaptiveText";
import CourseIntelligenceModal from "@/components/CourseIntelligenceModal";
import GameplayHeader from "@/components/GameplayHeader";
import GradientButton from "@/components/GradientButton";
import ProGate from "@/components/ProGate";
import Scorecard, { ScorecardPlayer } from "@/components/Scorecard";
import StyledTooltip from "@/components/StyledTooltip";
import UserAvatar from "@/components/UserAvatar";
import WeatherBackground from "@/components/WeatherBackground";
import {
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
} from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useSubscription } from "@/contexts/subscription-context";
import { useAttestations } from "@/hooks/use-attestations";
import { formatDisplayDate } from "@/lib/date-utils";
import { ResultsData } from "@/lib/scoring-utils";
import { supabase } from "@/lib/supabase";
import { ScoreDetails } from "@/types/scoring";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

type RoundData = {
  id: number;
  creator_id: string;
  course_id: number;
  status: string;
  created_at: string;
  date_played: string | null;
  results_data: ResultsData | null;
  teebox_data: {
    order: number;
    name: string;
    color?: string;
    holes: Record<string, { par: string; length: string }>;
  };
  courses: { club_name: string; course_name: string };
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

function formatScoreToPar(score: number): string {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : String(score);
}

export default function RoundSummaryScreen() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const router = useRouter();
  const { roundId, completed } = useLocalSearchParams<{
    roundId: string;
    completed?: string;
  }>();

  const [round, setRound] = useState<RoundData | null>(null);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null);
  const [showCourseIntel, setShowCourseIntel] = useState(false);
  const toastFired = useRef(false);

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
        "id, creator_id, course_id, status, created_at, date_played, results_data, teebox_data, courses(club_name, course_name)",
      )
      .eq("id", roundId)
      .single();

    if (roundData) {
      setRound(roundData as unknown as RoundData);

      try {
        const { data: imgData } = await supabase
          .from("course_images")
          .select("image_url")
          .eq("course_id", roundData.course_id)
          .eq("is_featured", true)
          .maybeSingle();
        setFeaturedImageUrl(imgData?.image_url ?? null);
      } catch {
        /* table may not exist */
      }
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

  // Congratulatory toast when arriving from a just-completed round
  useEffect(() => {
    if (
      completed === "1" &&
      myResult &&
      myPlayerStatus === "completed" &&
      !toastFired.current
    ) {
      toastFired.current = true;
      toast.success(
        `Great round! You shot ${myResult.total_score} (${formatScoreToPar(myResult.score_to_par)})`,
      );
    }
  }, [completed, myResult, myPlayerStatus]);

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

    await supabase.from("round_attestations").delete().eq("round_id", roundId);

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
        <AdaptiveText style={{ ...Type.body }}>Round not found</AdaptiveText>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isPro ? "transparent" : Color.screenBg,
      }}
    >
      <WeatherBackground />
      <SafeAreaView edges={["top"]} style={{ flex: 1, paddingTop: 20 }}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backButton}>
            <AdaptiveText style={s.backChevron}>{"\u2039"}</AdaptiveText>
            <AdaptiveText style={s.backText}>Back</AdaptiveText>
          </Pressable>
          <AdaptiveText style={s.headerTitle}>Round Summary</AdaptiveText>
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
          <View style={{ paddingHorizontal: Space.lg }}>
            <GameplayHeader
              courseId={round.course_id}
              courseName={round.courses?.club_name || "Unknown"}
              courseNameSub={
                round.courses?.course_name &&
                round.courses.course_name !== round.courses.club_name
                  ? round.courses.course_name
                  : null
              }
              featuredImageUrl={featuredImageUrl}
              holeCount={
                round.teebox_data?.holes
                  ? Object.keys(round.teebox_data.holes).length
                  : undefined
              }
              subtitle={`${(round.teebox_data as any)?.name ? `${(round.teebox_data as any).name} Tees · ` : ""}${formatDisplayDate(round.date_played ?? round.created_at, true)}`}
            />
          </View>

          {/* Scorecard */}
          <View style={{ paddingHorizontal: Space.lg, marginTop: Space.lg }}>
            <AdaptiveText style={s.sectionLabel}>SCORECARD</AdaptiveText>
            <Scorecard
              teeboxData={round.teebox_data}
              players={scorecardPlayers}
              currentUserId={user?.id}
            />
          </View>

          {/* Results card */}
          {resultsData && resultsData.players.length > 0 && (
            <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
              <AdaptiveText style={s.sectionLabel}>RESULTS</AdaptiveText>
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
                            <StyledTooltip title="Withdrew">
                              <View>
                                <MaterialIcons
                                  name="block"
                                  size={30}
                                  color={Color.danger}
                                />
                              </View>
                            </StyledTooltip>
                          )}
                          {pr.player_status === "incomplete" && (
                            <StyledTooltip title="Incomplete">
                              <View>
                                <MaterialIcons
                                  name="warning"
                                  size={30}
                                  color={Color.warning}
                                />
                              </View>
                            </StyledTooltip>
                          )}
                          {pr.player_status === "completed" && (
                            <StyledTooltip title="Completed">
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 14,
                                  backgroundColor: Color.primary,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Feather
                                  name="check"
                                  size={16}
                                  color={Color.white}
                                />
                              </View>
                            </StyledTooltip>
                          )}
                        </View>
                        <View style={s.resultBottomRow}>
                          <Text style={s.resultSub}>
                            {partialHoles
                              ? `${pr.holes_completed} of ${pr.hole_count} holes`
                              : pr.hole_count <= 9
                                ? `${pr.hole_count} holes`
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

          {/* Course Intelligence */}
          <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
            <AdaptiveText style={s.sectionLabel}>COURSE INTELLIGENCE</AdaptiveText>
            <ProGate>
              <Pressable
                onPress={() => setShowCourseIntel(true)}
                style={({ pressed }) => [
                  s.courseIntelCard,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons name="insights" size={20} color={Color.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.courseIntelTitle}>View Course Insights</Text>
                  <Text style={s.courseIntelSub}>
                    Hole averages, trends, and trouble spots
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={Color.neutral400} />
              </Pressable>
            </ProGate>
          </View>

          {/* Continue Round — for incomplete players */}
          {myIncomplete && isParticipant && (
            <View style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}>
              <AdaptiveText style={s.sectionLabel}>RESUME</AdaptiveText>
              <View style={s.attestCard}>
                <Text style={s.attestCount}>
                  You scored {myResult?.holes_completed ?? 0} of{" "}
                  {myResult?.hole_count ?? 0} holes.
                </Text>
                <GradientButton
                  onPress={handleContinueRound}
                  label="Continue Round"
                />
              </View>
            </View>
          )}

          {/* Peer attestation — only for multi-player eligible rounds */}
          {!isEffectivelySolo &&
            isParticipant &&
            !myWithdrew &&
            !myIncomplete && (
              <View
                style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}
              >
                <AdaptiveText style={s.sectionLabel}>ATTESTATION</AdaptiveText>
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
                    <GradientButton
                      onPress={handleAttest}
                      label="Attest Scores"
                      colors={Color.secondaryGradient}
                    />
                  )}
                </View>
              </View>
            )}

          {/* Self-confirmed indicator — for effectively-solo rounds */}
          {isEffectivelySolo &&
            isParticipant &&
            !myWithdrew &&
            !myIncomplete && (
              <View
                style={{ paddingHorizontal: Space.lg, marginTop: Space.xl }}
              >
                <AdaptiveText style={s.sectionLabel}>
                  SCORE CONFIRMATION
                </AdaptiveText>
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
      {round && (
        <CourseIntelligenceModal
          visible={showCourseIntel}
          onClose={() => setShowCourseIntel(false)}
          courseId={round.course_id}
          courseName={round.courses?.club_name || "Unknown"}
        />
      )}
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Color.screenBg,
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
    width: 100,
  },
  backChevron: {
    fontFamily: Font.regular,
    fontSize: 32,
    color: Color.neutral900,
    lineHeight: 32,
    marginRight: Space.xs,
    includeFontPadding: false,
  },
  backText: {
    fontFamily: Font.bold,
    fontSize: 21,
    color: Color.neutral900,
    lineHeight: 24,
    includeFontPadding: false,
  },
  headerTitle: {
    fontFamily: Font.bold,
    fontSize: 17,
    color: Color.neutral900,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  resultsCard: {
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
    padding: 5,
  },
  courseIntelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Color.neutral200,
    ...Shadow.sm,
  },
  courseIntelTitle: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral900,
  },
  courseIntelSub: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
});
