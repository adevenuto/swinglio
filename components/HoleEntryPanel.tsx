import {
  Animation,
  Color,
  Radius,
  Shadow,
  Space,
} from "@/constants/design-tokens";
import {
  BunkerEntry,
  calculateGIR,
  createDefaultHoleStats,
  FairwayResult,
  HoleStats,
  PenaltyEntry,
} from "@/types/scoring";
import Feather from "@expo/vector-icons/Feather";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

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
    const [hasScoreEntry, setHasScoreEntry] = useState(
      currentScore !== "" && currentScore != null,
    );
    const [fairway, setFairway] = useState<FairwayResult>(null);
    const [puttsCount, setPuttsCount] = useState<number>(
      currentStats?.putts ?? 2,
    );
    const [hasPuttsEntry, setHasPuttsEntry] = useState(
      currentStats?.putts != null,
    );
    const [bunkers, setBunkers] = useState<BunkerEntry[]>([]);
    const [penalties, setPenalties] = useState<PenaltyEntry[]>([]);
    const [advancedExpanded, setAdvancedExpanded] = useState(false);

    // Track previous hole to detect transitions and direction
    const prevHoleRef = useRef(holeNumber);
    const isTransitioning = prevHoleRef.current !== holeNumber;

    // Slide animation
    const translateX = useSharedValue(0);

    useEffect(() => {
      if (prevHoleRef.current !== holeNumber) {
        const direction = holeNumber > prevHoleRef.current ? 1 : -1;
        prevHoleRef.current = holeNumber;

        // Snap to offset, then animate to center
        translateX.value = direction * Animation.slideOffset;
        translateX.value = withTiming(0, { duration: Animation.durationMs });
      }
    }, [holeNumber, translateX]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
      opacity: translateX.value === 0 ? 1 : Animation.slideMinOpacity,
    }));

    // Re-initialize when holeNumber changes
    useEffect(() => {
      if (currentScore && currentScore !== "") {
        setScore(parseInt(currentScore, 10) || parNum);
        setHasScoreEntry(true);
      } else {
        setScore(parNum);
        setHasScoreEntry(false);
      }
      const stats = currentStats ?? createDefaultHoleStats();
      setFairway(stats.fairway);
      setPuttsCount(stats.putts ?? 2);
      setHasPuttsEntry(stats.putts != null);
      setBunkers([...stats.bunkers]);
      setPenalties([...stats.penalties]);
    }, [holeNumber, currentScore, currentStats, parNum]);

    // Effective putts for GIR calculation
    const effectivePutts = hasPuttsEntry ? puttsCount : null;

    // GIR auto-calculation
    const gir = calculateGIR(score, effectivePutts, parNum);

    // Score-to-par feedback — use neutral diff during transition to prevent red flicker
    const displayScoreDiff = isTransitioning ? 0 : score - parNum;
    const scoreColor = getScoreColor(displayScoreDiff);
    const scoreLabel = getScoreLabel(displayScoreDiff);

    // Build save payload
    const buildPayload = useCallback(
      () => ({
        score: hasScoreEntry ? String(score) : "",
        stats: {
          fairway,
          putts: hasPuttsEntry ? puttsCount : null,
          gir: calculateGIR(score, hasPuttsEntry ? puttsCount : null, parNum),
          bunkers,
          penalties,
        },
      }),
      [
        score,
        hasScoreEntry,
        fairway,
        puttsCount,
        hasPuttsEntry,
        parNum,
        bunkers,
        penalties,
      ],
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

    // Score stepper helpers
    const incrementScore = () => {
      setScore((s) => Math.min(s + 1, 15));
      setHasScoreEntry(true);
    };
    const decrementScore = () => {
      setScore((s) => Math.max(s - 1, 1));
      setHasScoreEntry(true);
    };

    // Putts stepper helpers
    const incrementPutts = () => {
      setPuttsCount((c) => Math.min(c + 1, 10));
      setHasPuttsEntry(true);
    };
    const decrementPutts = () => {
      setPuttsCount((c) => Math.max(c - 1, 0));
      setHasPuttsEntry(true);
    };

    // Fairway toggle
    const toggleFairway = (value: FairwayResult) => {
      setFairway((prev) => (prev === value ? null : value));
    };

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
        <Animated.View style={animatedStyle}>
          {/* Top section: D-pad + Score/Putts steppers */}
          <View style={styles.topSection}>
            {/* Fairway D-pad */}
            <View
              style={[styles.dpadWrapper, isPar3 && { opacity: 0 }]}
              pointerEvents={isPar3 ? "none" : "auto"}
            >
              <View style={styles.dpadCircle}>
                {/* Up — Long */}
                <Pressable
                  onPress={() => toggleFairway("long")}
                  disabled={disabled}
                  style={styles.dpadChevron}
                >
                  <Feather
                    name="chevron-up"
                    size={30}
                    strokeWidth={2.7}
                    color={
                      fairway === "long" ? Color.primary : Color.neutral400
                    }
                  />
                </Pressable>

                {/* Middle row: Left, HIT, Right */}
                <View style={styles.dpadMiddleRow}>
                  <Pressable
                    onPress={() => toggleFairway("left")}
                    disabled={disabled}
                    style={styles.dpadChevron}
                  >
                    <Feather
                      name="chevron-left"
                      size={30}
                      strokeWidth={2.7}
                      color={
                        fairway === "left" ? Color.primary : Color.neutral400
                      }
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => toggleFairway("hit")}
                    disabled={disabled}
                    style={[
                      styles.dpadHitButton,
                      fairway === "hit" && styles.dpadHitButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dpadHitText,
                        fairway === "hit"
                          ? styles.dpadHitTextActive
                          : styles.dpadHitTextInactive,
                      ]}
                    >
                      HIT
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => toggleFairway("right")}
                    disabled={disabled}
                    style={styles.dpadChevron}
                  >
                    <Feather
                      name="chevron-right"
                      size={30}
                      strokeWidth={2.7}
                      color={
                        fairway === "right" ? Color.primary : Color.neutral400
                      }
                    />
                  </Pressable>
                </View>

                {/* Down — Short */}
                <Pressable
                  onPress={() => toggleFairway("short")}
                  disabled={disabled}
                  style={styles.dpadChevron}
                >
                  <Feather
                    name="chevron-down"
                    size={30}
                    strokeWidth={2.7}
                    color={
                      fairway === "short" ? Color.primary : Color.neutral400
                    }
                  />
                </Pressable>
              </View>
            </View>

            {/* Score + Putts steppers */}
            <View style={styles.steppersArea}>
              {/* Score stepper */}
              <View style={styles.stepperColumn}>
                <Text style={styles.stepperLabel}>Score</Text>
                <View style={styles.horizontalPill}>
                  <Pressable
                    onPress={incrementScore}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.pillButton,
                      pressed && styles.pillButtonPressed,
                    ]}
                  >
                    <View style={styles.pillButton}>
                      <Feather name="plus" size={20} color={Color.neutral900} />
                    </View>
                  </Pressable>
                  <Text style={[styles.pillNumber, { color: scoreColor }]}>
                    {score}
                  </Text>
                  <Pressable
                    onPress={decrementScore}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.pillButton,
                      pressed && styles.pillButtonPressed,
                    ]}
                  >
                    <View style={styles.pillButton}>
                      <Feather
                        name="minus"
                        size={20}
                        color={Color.neutral900}
                      />
                    </View>
                  </Pressable>
                </View>
                <Text style={[styles.pillSubLabel, { color: scoreColor }]}>
                  {scoreLabel}
                </Text>
              </View>

              {/* Putts stepper */}
              <View style={styles.stepperColumn}>
                <Text style={styles.stepperLabel}>Putts</Text>
                <View style={styles.horizontalPill}>
                  <Pressable
                    onPress={incrementPutts}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.pillButton,
                      pressed && styles.pillButtonPressed,
                    ]}
                  >
                    <View style={styles.pillButton}>
                      <Feather name="plus" size={20} color={Color.neutral900} />
                    </View>
                  </Pressable>
                  <Text style={styles.pillNumber}>{puttsCount}</Text>
                  <Pressable
                    onPress={decrementPutts}
                    disabled={disabled}
                    style={({ pressed }) => [
                      styles.pillButton,
                      pressed && styles.pillButtonPressed,
                    ]}
                  >
                    <View style={styles.pillButton}>
                      <Feather
                        name="minus"
                        size={20}
                        color={Color.neutral900}
                      />
                    </View>
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.girBadge,
                    gir !== null
                      ? gir
                        ? styles.girTrue
                        : styles.girFalse
                      : { opacity: 0 },
                  ]}
                >
                  <Text
                    style={[
                      styles.girText,
                      gir !== null
                        ? gir
                          ? styles.girTextTrue
                          : styles.girTextFalse
                        : { opacity: 0 },
                    ]}
                  >
                    {gir !== null ? (gir ? "GIR" : "No GIR") : "GIR"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Basic / Advanced Toggle */}
          <View style={styles.toggleContainer}>
            <Pressable
              onPress={() => setAdvancedExpanded(false)}
              style={[
                styles.toggleButton,
                !advancedExpanded && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  !advancedExpanded && styles.toggleTextActive,
                ]}
              >
                Basic
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAdvancedExpanded(true)}
              style={[
                styles.toggleButton,
                advancedExpanded && styles.toggleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  advancedExpanded && styles.toggleTextActive,
                ]}
              >
                Advanced
              </Text>
            </Pressable>
          </View>

          {/* Advanced content */}
          {advancedExpanded && (
            <View style={styles.advancedContent}>
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
            </View>
          )}
        </Animated.View>
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
          <Feather name="minus" size={16} color={Color.neutral900} />
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
          <Feather name="plus" size={16} color={Color.neutral900} />
        </Pressable>
      </View>
    </View>
  );
}

// === Styles ===

const DPAD_SIZE = 120;
const CHEVRON_SIZE = 36;
const HIT_SIZE = 48;

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

  // Top section
  topSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.lg,
    marginBottom: Space.lg,
  },

  // D-pad
  dpadWrapper: {
    alignItems: "center",
  },
  dpadCircle: {
    width: DPAD_SIZE,
    height: DPAD_SIZE,
    borderRadius: DPAD_SIZE / 2,
    backgroundColor: Color.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  dpadMiddleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dpadChevron: {
    width: CHEVRON_SIZE,
    height: CHEVRON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dpadHitButton: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    borderRadius: HIT_SIZE / 2,
    backgroundColor: Color.neutral300,
    alignItems: "center",
    justifyContent: "center",
  },
  dpadHitButtonActive: {
    backgroundColor: Color.primary,
  },
  dpadHitText: {
    fontSize: 12,
    fontWeight: "800",
  },
  dpadHitTextActive: {
    color: Color.white,
  },
  dpadHitTextInactive: {
    color: Color.neutral500,
  },
  // Steppers area (right side)
  steppersArea: {
    flex: 1,
    flexDirection: "row",
    gap: Space.sm,
  },
  stepperColumn: {
    flex: 1,
    alignItems: "center",
  },
  stepperLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm - 4,
  },
  horizontalPill: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-around",
    width: 58,
    minHeight: 120,
    margin: "auto",
    alignSelf: "stretch",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Color.neutral300,
    backgroundColor: Color.white,
    paddingVertical: Space.sm,
  },
  pillButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Color.neutral300,
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
  },
  pillButtonPressed: {
    backgroundColor: Color.neutral100,
  },
  pillNumber: {
    fontSize: 32,
    fontWeight: "700",
    color: Color.neutral900,
    minWidth: 40,
    textAlign: "center",
  },
  pillSubLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: Space.xs,
  },

  // GIR badge
  girBadge: {
    marginTop: Space.xs,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: "center",
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

  // Toggle
  toggleContainer: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Color.neutral300,
    overflow: "hidden",
    marginBottom: Space.md,
  },
  toggleButton: {
    height: 36,
    paddingHorizontal: Space.xl,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Color.white,
  },
  toggleButtonActive: {
    backgroundColor: Color.neutral900,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: Color.neutral900,
  },
  toggleTextActive: {
    color: Color.white,
  },

  // Advanced content
  advancedContent: {
    marginTop: Space.sm,
  },

  // Sections (bunkers, penalties)
  section: {
    marginVertical: Space.sm,
  },
  sectionLabel: {
    fontWeight: "700",
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm,
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
