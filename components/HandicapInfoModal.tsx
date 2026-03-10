import { Color, Font, Radius, Shadow, Space, Type } from "@/constants/design-tokens";
import { DIFFERENTIAL_TABLE, formatHandicapIndex } from "@/lib/handicap";
import { HandicapResult } from "@/types/handicap";
import { MaterialCommunityIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";

type Props = {
  visible: boolean;
  onClose: () => void;
  handicapResult: HandicapResult | null;
};

// Subset of DIFFERENTIAL_TABLE rows to show in the modal
const TABLE_ROWS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export default function HandicapInfoModal({ visible, onClose, handicapResult }: Props) {
  const hIndex = handicapResult?.handicapIndex ?? null;
  const eligibleCount = handicapResult?.eligibleCount ?? 0;
  const methodDescription = handicapResult?.methodDescription ?? "";
  const needMore = hIndex == null && eligibleCount < 3 ? 3 - eligibleCount : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* ── Green Hero Header ── */}
        <View style={styles.hero}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed ? { opacity: 0.7 } : undefined,
            ]}
            hitSlop={12}
          >
            <Feather name="x" size={22} color={Color.white} />
          </Pressable>

          <MaterialCommunityIcons
            name="golf-tee"
            size={32}
            color={Color.white}
            style={styles.heroIcon}
          />
          <Text style={styles.heroLabel}>Handicap Index</Text>
          <Text style={styles.heroValue}>{formatHandicapIndex(hIndex)}</Text>
        </View>

        {/* ── Scrollable Content ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* WHS Compliant Badge */}
          <View style={styles.whsBadge}>
            <FontAwesome5 name="check-circle" size={14} color={Color.primary} />
            <Text style={styles.whsBadgeText}>WHS Compliant</Text>
          </View>

          {/* How It Works */}
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsCard}>
            <StepRow
              number="1"
              title="Play at least 3 attested rounds"
              description="Your playing partners confirm your score after each round."
            />
            <View style={styles.stepDivider} />
            <StepRow
              number="2"
              title="Each round produces a Score Differential"
              description="(Adjusted Score - Course Rating) x 113 / Slope Rating"
            />
            <View style={styles.stepDivider} />
            <StepRow
              number="3"
              title="Average your lowest differentials"
              description="From your most recent 20 rounds, the lowest are averaged to get your index."
            />
          </View>

          {/* Rounds & Differentials Used */}
          <Text style={styles.sectionTitle}>Rounds & Differentials Used</Text>
          <View style={styles.tableCard}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Rounds</Text>
              <Text style={styles.tableHeaderText}>Differentials Used</Text>
            </View>
            {TABLE_ROWS.map((count) => {
              const entry = DIFFERENTIAL_TABLE[count];
              const adjStr =
                entry.adjustment !== 0
                  ? ` (${entry.adjustment > 0 ? "+" : ""}${entry.adjustment.toFixed(1)} adj.)`
                  : "";
              return (
                <View
                  key={count}
                  style={[
                    styles.tableRow,
                    count === Math.min(eligibleCount, 20) && eligibleCount >= 3
                      ? styles.tableRowHighlight
                      : undefined,
                  ]}
                >
                  <Text style={styles.tableCell}>{count}</Text>
                  <Text style={styles.tableCell}>
                    Lowest {entry.used}{adjStr}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Your Status */}
          <Text style={styles.sectionTitle}>Your Status</Text>
          <View style={styles.statusCard}>
            {hIndex != null ? (
              <>
                <View style={styles.statusRow}>
                  <FontAwesome5 name="check-circle" size={16} color={Color.primary} />
                  <Text style={styles.statusText}>
                    Handicap Index: <Text style={styles.statusBold}>{formatHandicapIndex(hIndex)}</Text>
                  </Text>
                </View>
                <Text style={styles.statusDetail}>
                  {methodDescription} ({eligibleCount} eligible round{eligibleCount !== 1 ? "s" : ""})
                </Text>
              </>
            ) : (
              <>
                <View style={styles.statusRow}>
                  <FontAwesome5 name="circle" size={16} color={Color.neutral400} />
                  <Text style={styles.statusText}>
                    {eligibleCount === 0
                      ? "No eligible rounds yet"
                      : `${eligibleCount} of 3 rounds completed`}
                  </Text>
                </View>
                {needMore > 0 && (
                  <Text style={styles.statusDetail}>
                    Play {needMore} more attested round{needMore > 1 ? "s" : ""} to calculate your index.
                  </Text>
                )}
              </>
            )}
          </View>

          {/* What Counts */}
          <Text style={styles.sectionTitle}>What Counts</Text>
          <View style={styles.listCard}>
            <BulletItem text="Only attested rounds are eligible" />
            <BulletItem text="Course must have a rating and slope" />
            <BulletItem text="18-hole and 9-hole rounds qualify" />
            <BulletItem text="Withdrawn rounds are excluded" />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Sub-components ──

function StepRow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{description}</Text>
      </View>
    </View>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <FontAwesome5 name="check-circle" size={13} color={Color.primary} style={styles.bulletIcon} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.white,
  },

  // ── Hero ──
  hero: {
    backgroundColor: Color.primary,
    paddingTop: Space.xxxl,
    paddingBottom: Space.xl,
    paddingHorizontal: Space.xl,
    alignItems: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Space.lg,
    right: Space.lg,
    zIndex: 1,
  },
  heroIcon: {
    marginBottom: Space.sm,
  },
  heroLabel: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.7)",
    textTransform: "uppercase",
    marginBottom: Space.xs,
  },
  heroValue: {
    fontFamily: Font.bold,
    fontSize: 44,
    lineHeight: 52,
    color: Color.white,
  },

  // ── Scroll ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Space.lg,
    paddingBottom: Space.xxxl,
  },

  // ── WHS Badge ──
  whsBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Color.primaryLight,
    borderRadius: Radius.lg,
    paddingVertical: Space.xs,
    paddingHorizontal: Space.md,
    marginBottom: Space.xl,
    gap: Space.xs,
  },
  whsBadgeText: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.primary,
  },

  // ── Section Titles ──
  sectionTitle: {
    ...Type.h3,
    marginBottom: Space.md,
  },

  // ── Steps Card ──
  stepsCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.xl,
    ...Shadow.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Color.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Space.md,
    marginTop: 2,
  },
  stepNumberText: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Color.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral900,
    marginBottom: Space.xs,
  },
  stepDesc: {
    ...Type.bodySm,
  },
  stepDivider: {
    height: 1,
    backgroundColor: Color.neutral100,
    marginVertical: Space.md,
  },

  // ── Differential Table ──
  tableCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    overflow: "hidden",
    marginBottom: Space.xl,
    ...Shadow.sm,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: Color.neutral50,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
  },
  tableHeaderText: {
    ...Type.caption,
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral100,
  },
  tableRowHighlight: {
    backgroundColor: Color.primaryLight,
  },
  tableCell: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral700,
  },

  // ── Status Card ──
  statusCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.xl,
    ...Shadow.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    marginBottom: Space.xs,
  },
  statusText: {
    ...Type.body,
  },
  statusBold: {
    fontFamily: Font.bold,
    color: Color.primary,
  },
  statusDetail: {
    ...Type.bodySm,
    marginLeft: 24,
  },

  // ── What Counts ──
  listCard: {
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    marginBottom: Space.xl,
    gap: Space.md,
    ...Shadow.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },
  bulletIcon: {
    marginTop: 3,
  },
  bulletText: {
    ...Type.body,
    flex: 1,
  },
});
