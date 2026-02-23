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
import { Button, Chip, Text } from "react-native-paper";

// === Types ===

export type HoleEntryPanelRef = {
  saveCurrentHole: () => void;
};

type HoleEntryPanelProps = {
  holeNumber: number;
  holeCount: number;
  par: string;
  yardage: string;
  currentScore: string;
  currentStats: HoleStats | undefined;
  onSave: (data: { score: string; stats: HoleStats }) => void;
  onNavigate: (holeNumber: number) => void;
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

// === Component ===

const HoleEntryPanel = forwardRef<HoleEntryPanelRef, HoleEntryPanelProps>(
  (
    {
      holeNumber,
      holeCount,
      par,
      yardage,
      currentScore,
      currentStats,
      onSave,
      onNavigate,
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

    // Navigation handlers
    const handleNext = () => {
      onSave(buildPayload());
      onNavigate(holeNumber + 1);
    };

    const handlePrev = () => {
      onSave(buildPayload());
      onNavigate(holeNumber - 1);
    };

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

    const handlePenaltyChange = (
      type: PenaltyEntry["type"],
      delta: number,
    ) => {
      setPenalties((prev) => {
        const current = countByType(prev, type);
        const next = Math.max(0, current + delta);
        return setCountForType(prev, type, next, (t) => ({
          type: t as PenaltyEntry["type"],
        }));
      });
    };

    return (
      <View style={styles.card}>
        {/* Hole header */}
        <View style={styles.header}>
          <Text style={styles.headerText}>
            Hole {holeNumber} · Par {par} · {yardage} yd
          </Text>
        </View>

        {/* Score stepper */}
        <View style={styles.scoreRow}>
          <Pressable
            onPress={decrementScore}
            style={({ pressed }) => [
              styles.stepperButton,
              pressed && styles.stepperPressed,
            ]}
          >
            <Text style={styles.stepperText}>−</Text>
          </Pressable>
          <Text style={styles.scoreValue}>{score}</Text>
          <Pressable
            onPress={incrementScore}
            style={({ pressed }) => [
              styles.stepperButton,
              pressed && styles.stepperPressed,
            ]}
          >
            <Text style={styles.stepperText}>+</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        {/* Fairway (hidden for par 3s) */}
        {!isPar3 && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Fairway</Text>
              <View style={styles.chipRow}>
                {FAIRWAY_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    mode="outlined"
                    selected={fairway === opt.value}
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
            <View style={styles.divider} />
          </>
        )}

        {/* Putts + GIR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Putts</Text>
            {gir !== null && (
              <View
                style={[styles.girBadge, gir ? styles.girTrue : styles.girFalse]}
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

        <View style={styles.divider} />

        {/* Bunkers */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bunkers</Text>
          {BUNKER_TYPES.map((bt) => (
            <CountStepperRow
              key={bt.type}
              label={bt.label}
              count={countByType(bunkers, bt.type)}
              onIncrement={() => handleBunkerChange(bt.type, 1)}
              onDecrement={() => handleBunkerChange(bt.type, -1)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        {/* Penalties */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Penalties</Text>
          {PENALTY_TYPES.map((pt) => (
            <CountStepperRow
              key={pt.type}
              label={pt.label}
              count={countByType(penalties, pt.type)}
              onIncrement={() => handlePenaltyChange(pt.type, 1)}
              onDecrement={() => handlePenaltyChange(pt.type, -1)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        {/* Navigation */}
        <View style={styles.navRow}>
          <Button
            mode="outlined"
            onPress={handlePrev}
            disabled={holeNumber <= 1}
            icon="chevron-left"
            style={styles.navButton}
          >
            Prev
          </Button>
          <Button
            mode="outlined"
            onPress={handleNext}
            disabled={holeNumber >= holeCount}
            contentStyle={{ flexDirection: "row-reverse" }}
            icon="chevron-right"
            style={styles.navButton}
          >
            Next
          </Button>
        </View>
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
  onIncrement,
  onDecrement,
}: {
  label: string;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperRowLabel}>{label}</Text>
      <View style={styles.miniStepperGroup}>
        <Pressable
          onPress={onDecrement}
          style={({ pressed }) => [
            styles.miniStepper,
            pressed && styles.stepperPressed,
          ]}
        >
          <Text style={styles.miniStepperText}>−</Text>
        </Pressable>
        <Text
          style={[styles.stepperCount, count === 0 && styles.stepperCountZero]}
        >
          {count}
        </Text>
        <Pressable
          onPress={onIncrement}
          style={({ pressed }) => [
            styles.miniStepper,
            pressed && styles.stepperPressed,
          ]}
        >
          <Text style={styles.miniStepperText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// === Styles ===

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  // Score stepper
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 16,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  stepperPressed: {
    backgroundColor: "#f5f5f5",
  },
  stepperText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  scoreValue: {
    fontSize: 40,
    fontWeight: "700",
    color: "#1a1a1a",
    minWidth: 60,
    textAlign: "center",
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: "#d4d4d4",
    marginVertical: 12,
  },
  // Sections
  section: {
    marginVertical: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  // Chips
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderColor: "#d4d4d4",
    backgroundColor: "#fff",
  },
  chipSelected: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  chipText: {
    color: "#1a1a1a",
  },
  chipTextSelected: {
    color: "#fff",
  },
  // GIR badge
  girBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  girTrue: {
    backgroundColor: "#16a34a",
  },
  girFalse: {
    backgroundColor: "#e5e5e5",
  },
  girText: {
    fontSize: 11,
    fontWeight: "600",
  },
  girTextTrue: {
    color: "#fff",
  },
  girTextFalse: {
    color: "#555",
  },
  // Count stepper rows (bunkers, penalties)
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  stepperRowLabel: {
    fontSize: 14,
    color: "#1a1a1a",
  },
  miniStepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  miniStepper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  miniStepperText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  stepperCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    minWidth: 20,
    textAlign: "center",
  },
  stepperCountZero: {
    color: "#999",
  },
  // Navigation
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  navButton: {
    borderColor: "#d4d4d4",
  },
});
