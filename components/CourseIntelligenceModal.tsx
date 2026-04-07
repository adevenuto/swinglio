import HoleAveragesChart from "@/components/stats/HoleAveragesChart";
import ParPerformance from "@/components/stats/ParPerformance";
import ScoringTrendChart from "@/components/stats/ScoringTrendChart";
import TroubleHolesCard from "@/components/stats/TroubleHolesCard";
import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import { useAuth } from "@/contexts/auth-context";
import { useCourseHistory } from "@/hooks/use-course-history";
import Feather from "@expo/vector-icons/Feather";
import React, { useEffect } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  courseId: number;
  courseName: string;
};

function formatToPar(val: number): string {
  if (val === 0) return "E";
  return val > 0 ? `+${val}` : `${val}`;
}

export default function CourseIntelligenceModal({
  visible,
  onClose,
  courseId,
  courseName,
}: Props) {
  const { user } = useAuth();
  const { history, isLoading, refresh } = useCourseHistory(
    user?.id ?? "",
    courseId,
  );

  // Refresh every time modal opens
  useEffect(() => {
    if (visible && user?.id) {
      refresh();
    }
  }, [visible, user?.id, refresh]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Course Intelligence</Text>
            <Text style={styles.courseName} numberOfLines={1}>
              {courseName}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="x" size={22} color={Color.neutral700} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Color.primary} />
          </View>
        ) : !history.hasHistory ? (
          <View style={styles.emptyContainer}>
            <Feather name="bar-chart-2" size={48} color={Color.neutral300} />
            <Text style={styles.emptyTitle}>No History Yet</Text>
            <Text style={styles.emptyBody}>
              Complete a round here to start tracking your course performance.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Overview pills */}
            <View style={styles.overviewRow}>
              <View style={styles.overviewPill}>
                <Text style={styles.overviewValue}>{history.totalRounds}</Text>
                <Text style={styles.overviewLabel}>
                  {history.totalRounds === 1 ? "Round" : "Rounds"}
                </Text>
              </View>
              {history.personalBest != null && (
                <View style={[styles.overviewPill, styles.bestPill]}>
                  <Text style={[styles.overviewValue, { color: Color.primary }]}>
                    {formatToPar(history.personalBest)}
                  </Text>
                  <Text style={styles.overviewLabel}>Best</Text>
                </View>
              )}
            </View>

            {/* Scoring Trend */}
            {history.scoringTrend.length > 1 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SCORING TREND</Text>
                <ScoringTrendChart data={history.scoringTrend} />
              </View>
            )}

            {/* Hole-by-Hole Averages */}
            {history.holeAverages.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>HOLE AVERAGES</Text>
                <HoleAveragesChart holeAverages={history.holeAverages} />
              </View>
            )}

            {/* Trouble Holes */}
            {history.troubleHoles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TROUBLE HOLES</Text>
                <TroubleHolesCard troubleHoles={history.troubleHoles} />
              </View>
            )}

            {/* Par Performance */}
            {(history.avgPar3 != null ||
              history.avgPar4 != null ||
              history.avgPar5 != null) && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PAR PERFORMANCE</Text>
                <ParPerformance
                  avgPar3={history.avgPar3}
                  avgPar4={history.avgPar4}
                  avgPar5={history.avgPar5}
                />
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Color.neutral50,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    backgroundColor: Color.white,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
  },
  headerText: {
    flex: 1,
    marginRight: Space.md,
  },
  title: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: Color.neutral900,
  },
  courseName: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Space.xxl,
  },
  emptyTitle: {
    fontFamily: Font.semiBold,
    fontSize: 18,
    color: Color.neutral700,
    marginTop: Space.lg,
  },
  emptyBody: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textAlign: "center",
    marginTop: Space.sm,
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.lg,
    paddingBottom: Space.xxxl,
  },
  overviewRow: {
    flexDirection: "row",
    gap: Space.md,
    marginBottom: Space.xl,
  },
  overviewPill: {
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Color.neutral200,
  },
  bestPill: {
    borderColor: Color.primaryBorder,
  },
  overviewValue: {
    fontFamily: Font.bold,
    fontSize: 22,
    color: Color.neutral900,
  },
  overviewLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Color.neutral500,
    marginTop: 2,
  },
  section: {
    marginBottom: Space.xl,
  },
  sectionLabel: {
    ...Type.caption,
    marginBottom: Space.sm,
  },
});
