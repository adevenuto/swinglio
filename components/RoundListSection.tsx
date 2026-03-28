import RoundCard from "@/components/RoundCard";
import { Color, Font, Space, Type } from "@/constants/design-tokens";
import { RecentRound } from "@/hooks/use-recent-rounds";
import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type RoundListSectionProps = {
  title: string;
  rounds: RecentRound[];
  limit?: number;
  emptyText?: string;
  showLegend?: boolean;
  onSeeAll: () => void;
  onRoundPress: (roundId: number) => void;
};

export default function RoundListSection({
  title,
  rounds,
  limit = 3,
  emptyText,
  showLegend = false,
  onSeeAll,
  onRoundPress,
}: RoundListSectionProps) {
  const visible = rounds.slice(0, limit);
  const hasMore = rounds.length > limit;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>{title}</Text>

      {showLegend && (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Color.primary }]}
            />
            <Text style={styles.legendText}>under par</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Color.warning }]}
            />
            <Text style={styles.legendText}>over par</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: Color.neutral400 }]}
            />
            <Text style={styles.legendText}>even</Text>
          </View>
        </View>
      )}

      {visible.length === 0 && emptyText ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        visible.map((round) => (
          <RoundCard
            key={round.id}
            courseName={round.courses?.club_name || "Unknown Course"}
            courseNameSub={
              round.courses?.course_name &&
              round.courses.course_name !== round.courses.club_name
                ? `- ${round.courses.course_name}`
                : null
            }
            playerStatus={round.player_status}
            teeboxName={(round.teebox_data as any)?.name}
            date={round.display_date}
            playerScore={round.player_score}
            scoreToPar={round.score_to_par}
            holesCompleted={round.holes_completed}
            holeCount={round.hole_count}
            players={round.players}
            onPress={() => onRoundPress(round.id)}
          />
        ))
      )}

      {hasMore && (
        <Pressable
          onPress={onSeeAll}
          style={({ pressed }) => [
            styles.seeAllRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.seeAllText}>
            See all {rounds.length} rounds
          </Text>
          <Feather name="chevron-right" size={16} color={Color.primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Space.xl,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
    marginBottom: Space.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: Space.sm,
  },
  emptyText: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Color.neutral400,
    marginTop: Space.md,
    textAlign: "center",
  },
  seeAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Space.md,
    gap: Space.xs,
  },
  seeAllText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.primary,
  },
});
