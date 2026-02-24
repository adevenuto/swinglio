import { Color, Radius, Shadow, Space } from "@/constants/design-tokens";
import {
  BunkerEntry,
  calculateGIR,
  createDefaultHoleStats,
  FairwayResult,
  HoleStats,
  PenaltyEntry,
} from "@/types/scoring";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  Chip,
  IconButton,
  List,
  Text,
  TouchableRipple,
} from "react-native-paper";

// === Types ===

export type HoleEntryPanelRef = {
  saveCurrentHole: () => void;
};

type HoleEntryPanelProps = {
  holeNumber: number;
  par: string;
  yardage: string;
  currentScore: string;
  currentStats: HoleStats | undefined;
  onSave: (data: { score: string; stats: HoleStats }) => void;
  disabled?: boolean;
};

// === Helpers ===
const FAIRWAY_OPTIONS: { label: string; value: FairwayResult }[] = [
  { label: "Left", value: "left" },
  { label: "Hit", value: "hit" },
  { label: "Right", value: "right" },
];

const PUTT_OPTIONS = [0, 1, 2, 3, 4];

const BUNKER_TYPES: { label: string; type: BunkerEntry["type"] }[] = [
  { label: "Greenside", type: "greenside" },
  { label: "Fairway", type: "fairway" },
];

const PENALTY_TYPES: { label: string; type: PenaltyEntry["type"] }[] = [
  { label: "Water", type: "water" },
  { label: "OB", type: "ob" },
  { label: "Unplayable", type: "unplayable" },
];

function countByType<T extends { type: string }>(
  arr: T[],
  type: string,
): number {
  return arr.filter((e) => e.type === type).length;
}

function setCountForType<T extends { type: string }>(
  arr: T[],
  type: string,
  count: number,
  factory: (type: string) => T,
): T[] {
  const others = arr.filter((e) => e.type !== type);
  const additions = Array.from({ length: count }, () => factory(type));
  return [...others, ...additions];
}

function getScoreLabel(diff: number): string {
  if (diff <= -3) return "Eagle or better";
  if (diff === -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double";
  return "Triple+";
}

function getScoreColor(diff: number): string {
  if (diff < 0) return Color.primary;
  if (diff === 0) return Color.neutral900;
  return Color.danger;
}

// === Component ===

const HoleEntryPanel = forwardRef<HoleEntryPanelRef, HoleEntryPanelProps>(
  (
    {
      holeNumber,
      par,
      yardage,
      currentScore,
      currentStats,
      onSave,
      disabled = false,
    },
    ref,
  ) => {
    const parNum = parseInt(par, 10) || 4;
    const isPar3 = parNum === 3;

    // --- Local editing state ---
    const [score, setScore] = useState<number>(parNum);
    const [fairway, setFairway] = useState<FairwayResult>(null);
    const [putts, setPutts] = useState<number | null>(null);
    const [bunkers, setBunkers] = useState<BunkerEntry[]>([]);
    const [penalties, setPenalties] = useState<PenaltyEntry[]>([]);
    const [advancedExpanded, setAdvancedExpanded] = React.useState(false);

    // Re-initialize when holeNumber changes
    useEffect(() => {
      if (currentScore && currentScore !== "") {
        setScore(parseInt(currentScore, 10) || parNum);
      } else {
        setScore(parNum);
      }
      const stats = currentStats ?? createDefaultHoleStats();
      setFairway(stats.fairway);
      setPutts(stats.putts);
      setBunkers([...stats.bunkers]);
      setPenalties([...stats.penalties]);
    }, [holeNumber, currentScore, currentStats, parNum]);

    // GIR auto-calculation
    const gir = calculateGIR(score, putts, parNum);

    // Score-to-par feedback
    const scoreDiff = score - parNum;
    const scoreColor = getScoreColor(scoreDiff);
    const scoreLabel = getScoreLabel(scoreDiff);

    // Build save payload
    const buildPayload = useCallback(
      () => ({
        score: String(score),
        stats: {
          fairway,
          putts,
          gir: calculateGIR(score, putts, parNum),
          bunkers,
          penalties,
        },
      }),
      [score, fairway, putts, parNum, bunkers, penalties],
    );

    // Expose save to parent
    useImperativeHandle(
      ref,
      () => ({
        saveCurrentHole: () => {
          onSave(buildPayload());
        },
      }),
      [onSave, buildPayload],
    );

    // Stepper helpers
    const incrementScore = () => setScore((s) => Math.min(s + 1, 15));
    const decrementScore = () => setScore((s) => Math.max(s - 1, 1));

    const handleBunkerChange = (type: BunkerEntry["type"], delta: number) => {
      setBunkers((prev) => {
        const current = countByType(prev, type);
        const next = Math.max(0, current + delta);
        return setCountForType(prev, type, next, (t) => ({
          type: t as BunkerEntry["type"],
        }));
      });
    };

    const handlePenaltyChange = (type: PenaltyEntry["type"], delta: number) => {
      setPenalties((prev) => {
        const current = countByType(prev, type);
        const next = Math.max(0, current + delta);
        return setCountForType(prev, type, next, (t) => ({
          type: t as PenaltyEntry["type"],
        }));
      });
    };

    return (
      <View style={[styles.card, disabled && styles.cardDisabled]}>
        {/* Hole header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>HOLE {holeNumber}</Text>
          <Text style={styles.headerSubtext}>
            PAR {par} · {yardage} YD
          </Text>
        </View>

        {/* Score stepper */}
        <View style={styles.scoreRow}>
          <Pressable
            onPress={decrementScore}
            disabled={disabled}
            style={({ pressed }) => [
              styles.decrementButton,
              pressed && styles.decrementPressed,
            ]}
          >
            <TouchableRipple rippleColor="rgba(0, 0, 0, .32)">
              <View style={[styles.stepper]}>
                <IconButton size={32} icon="minus" />
              </View>
            </TouchableRipple>
          </Pressable>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {score}
            </Text>
            <Text style={[styles.scoreLabel, { color: scoreColor }]}>
              {scoreLabel}
            </Text>
          </View>
          <Pressable
            onPress={incrementScore}
            disabled={disabled}
            style={({ pressed }) => [
              styles.incrementButton,
              pressed && styles.incrementPressed,
            ]}
          >
            <View style={[styles.stepper]}>
              <IconButton size={32} icon="plus" />
            </View>
          </Pressable>
        </View>

        {/* Putts + Fairway wrapper (fixed height prevents shift on par 3s) */}
        <View style={styles.puttsAndFairwayWrapper}>
          {/* Putts + GIR */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>PUTTS</Text>
              {gir !== null && (
                <View
                  style={[
                    styles.girBadge,
                    gir ? styles.girTrue : styles.girFalse,
                  ]}
                >
                  <Text
                    style={[
                      styles.girText,
                      gir ? styles.girTextTrue : styles.girTextFalse,
                    ]}
                  >
                    {gir ? "GIR" : "No GIR"}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.chipRow}>
              {PUTT_OPTIONS.map((n) => {
                const label = n === 4 ? "4+" : String(n);
                const selected = putts === n;
                return (
                  <Chip
                    key={n}
                    mode="outlined"
                    selected={selected}
                    disabled={disabled}
                    onPress={() => setPutts(selected ? null : n)}
                    style={[styles.chip, selected && styles.chipSelected]}
                    textStyle={[
                      styles.chipText,
                      selected && styles.chipTextSelected,
                    ]}
                    showSelectedCheck={false}
                  >
                    {label}
                  </Chip>
                );
              })}
            </View>
          </View>

          {/* Fairway (hidden for par 3s) */}
          {!isPar3 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>FAIRWAY</Text>
              <View style={styles.chipRow}>
                {FAIRWAY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    mode="outlined"
                    selected={fairway === opt.value}
                    disabled={disabled}
                    onPress={() =>
                      setFairway(fairway === opt.value ? null : opt.value)
                    }
                    style={[
                      styles.chip,
                      fairway === opt.value && styles.chipSelected,
                    ]}
                    textStyle={[
                      styles.chipText,
                      fairway === opt.value && styles.chipTextSelected,
                    ]}
                    showSelectedCheck={false}
                  >
                    {opt.label}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Advanced Accordion */}
        <List.Accordion
          title="Advanced"
          expanded={advancedExpanded}
          onPress={() => setAdvancedExpanded(!advancedExpanded)}
        >
          {/* Bunkers */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BUNKERS</Text>
            {BUNKER_TYPES.map((bt) => (
              <CountStepperRow
                key={bt.type}
                label={bt.label}
                count={countByType(bunkers, bt.type)}
                disabled={disabled}
                onIncrement={() => handleBunkerChange(bt.type, 1)}
                onDecrement={() => handleBunkerChange(bt.type, -1)}
              />
            ))}
          </View>

          {/* Penalties */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PENALTIES</Text>
            {PENALTY_TYPES.map((pt) => (
              <CountStepperRow
                key={pt.type}
                label={pt.label}
                count={countByType(penalties, pt.type)}
                disabled={disabled}
                onIncrement={() => handlePenaltyChange(pt.type, 1)}
                onDecrement={() => handlePenaltyChange(pt.type, -1)}
              />
            ))}
          </View>
        </List.Accordion>
      </View>
    );
  },
);

HoleEntryPanel.displayName = "HoleEntryPanel";

export default HoleEntryPanel;

// === CountStepperRow sub-component ===

function CountStepperRow({
  label,
  count,
  disabled,
  onIncrement,
  onDecrement,
}: {
  label: string;
  count: number;
  disabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperRowLabel}>{label}</Text>
      <View style={styles.miniStepperGroup}>
        <Pressable
          onPress={onDecrement}
          disabled={disabled}
          style={({ pressed }) => [
            styles.miniStepper,
            pressed && styles.stepperPressed,
          ]}
        >
          <TouchableRipple rippleColor="rgba(0, 0, 0, .32)">
            <View style={[styles.stepper, styles.stepperSmall]}>
              <IconButton size={20} icon="minus" />
            </View>
          </TouchableRipple>
        </Pressable>
        <Text
          style={[styles.stepperCount, count === 0 && styles.stepperCountZero]}
        >
          {count}
        </Text>
        <Pressable
          onPress={onIncrement}
          disabled={disabled}
          style={({ pressed }) => [
            styles.miniStepper,
            pressed && styles.stepperPressed,
          ]}
        >
          <TouchableRipple rippleColor="rgba(0, 0, 0, .32)">
            <View style={[styles.stepper, styles.stepperSmall]}>
              <IconButton size={20} icon="plus" />
            </View>
          </TouchableRipple>
        </Pressable>
      </View>
    </View>
  );
}

// === Styles ===

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Color.neutral300,
    borderRadius: Radius.md,
    backgroundColor: Color.white,
    padding: Space.lg,
    ...Shadow.sm,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  header: {
    alignItems: "center",
    marginBottom: Space.lg,
  },
  headerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 1.5,
  },
  headerSubtext: {
    fontSize: 15,
    fontWeight: "600",
    color: Color.neutral900,
    marginTop: 2,
  },
  // Score stepper
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.xxl,
    marginBottom: Space.lg,
  },
  decrementButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: Color.neutral300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.white,
  },
  decrementPressed: {
    backgroundColor: Color.neutral100,
  },
  stepperText: {
    fontSize: 18,
    fontWeight: "600",
    color: Color.neutral900,
  },
  stepper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderColor: Color.neutral900,
    borderWidth: 1,
    borderStyle: "solid",
    padding: 5,
    borderRadius: "50%",
    width: 54,
    height: 54,
  },
  stepperSmall: {
    width: 30,
    height: 30,
  },
  incrementButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.primary,
  },
  incrementPressed: {
    backgroundColor: "#15803d",
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Color.neutral100,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 52,
    fontWeight: "700",
    textAlign: "center",
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  // Putts + Fairway wrapper
  puttsAndFairwayWrapper: {
    minHeight: 140,
  },
  // Sections
  section: {
    marginVertical: Space.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Space.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm,
  },
  // Chips
  chipRow: {
    flexDirection: "row",
    gap: Space.sm,
  },
  chip: {
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
  },
  chipSelected: {
    backgroundColor: Color.primary,
    borderColor: Color.primary,
  },
  chipText: {
    color: Color.neutral900,
  },
  chipTextSelected: {
    color: Color.white,
  },
  // GIR badge
  girBadge: {
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  girTrue: {
    backgroundColor: Color.primary,
  },
  girFalse: {
    backgroundColor: Color.neutral200,
  },
  girText: {
    fontSize: 11,
    fontWeight: "600",
  },
  girTextTrue: {
    color: Color.white,
  },
  girTextFalse: {
    color: Color.neutral500,
  },
  // Count stepper rows (bunkers, penalties)
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Space.sm,
  },
  stepperRowLabel: {
    fontSize: 14,
    color: Color.neutral900,
  },
  miniStepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.lg,
  },
  miniStepper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Color.neutral300,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.white,
  },
  stepperPressed: {
    backgroundColor: Color.neutral100,
  },
  stepperCount: {
    fontSize: 16,
    fontWeight: "600",
    color: Color.neutral900,
    minWidth: 20,
    textAlign: "center",
  },
  stepperCountZero: {
    color: Color.neutral400,
  },
});
