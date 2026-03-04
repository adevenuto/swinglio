import {
  Animation,
  Color,
  Font,
  Radius,
  Shadow,
  Space,
  Type,
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
  useCallback,
  useEffect,
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
import DPad from "./DPad";
import Stepper, { CountStepperRow } from "./Stepper";

// === Types ===

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

function HoleEntryPanel({
  holeNumber,
  par,
  yardage,
  currentScore,
  currentStats,
  onSave,
  disabled = false,
}: HoleEntryPanelProps) {
    const parNum = parseInt(par, 10) || 4;
    const isPar3 = parNum === 3;

    // --- Local editing state ---
    const [score, setScore] = useState<number>(parNum);
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

    // Stable refs for use in hole-initialization effect
    const currentScoreRef = useRef(currentScore);
    currentScoreRef.current = currentScore;
    const currentStatsRef = useRef(currentStats);
    currentStatsRef.current = currentStats;
    const parNumRef = useRef(parNum);
    parNumRef.current = parNum;
    const onSaveRef = useRef(onSave);
    onSaveRef.current = onSave;

    // Push current state to context (optimistic update)
    const pushUpdate = useCallback(
      (overrides?: {
        score?: number;
        putts?: number;
        hasPutts?: boolean;
        fairway?: FairwayResult;
        bunkers?: BunkerEntry[];
        penalties?: PenaltyEntry[];
      }) => {
        const s = overrides?.score ?? score;
        const p = overrides?.putts ?? puttsCount;
        const hp = overrides?.hasPutts ?? hasPuttsEntry;
        const f = overrides?.fairway ?? fairway;
        const b = overrides?.bunkers ?? bunkers;
        const pen = overrides?.penalties ?? penalties;
        onSave({
          score: String(s),
          stats: {
            fairway: f,
            putts: hp ? p : null,
            gir: calculateGIR(s, hp ? p : null, parNum),
            bunkers: b,
            penalties: pen,
          },
        });
      },
      [score, puttsCount, hasPuttsEntry, fairway, bunkers, penalties, parNum, onSave],
    );

    // Re-initialize when holeNumber changes + auto-populate par
    useEffect(() => {
      const cs = currentScoreRef.current;
      const pn = parNumRef.current;
      const stats = currentStatsRef.current ?? createDefaultHoleStats();

      const scoreVal = cs ? parseInt(cs, 10) : pn;
      setScore(scoreVal);
      setFairway(stats.fairway);
      setPuttsCount(stats.putts ?? 2);
      setHasPuttsEntry(stats.putts != null);
      setBunkers([...stats.bunkers]);
      setPenalties([...stats.penalties]);

      // Auto-populate: push par (or existing score) to context immediately
      onSaveRef.current({
        score: String(scoreVal),
        stats: {
          fairway: stats.fairway,
          putts: stats.putts,
          gir: calculateGIR(scoreVal, stats.putts, pn),
          bunkers: stats.bunkers,
          penalties: stats.penalties,
        },
      });
    }, [holeNumber]);

    // Effective putts for GIR calculation
    const effectivePutts = hasPuttsEntry ? puttsCount : null;

    // GIR auto-calculation
    const gir = calculateGIR(score, effectivePutts, parNum);

    // Score-to-par feedback — use neutral diff during transition to prevent red flicker
    const displayScoreDiff = isTransitioning ? 0 : score - parNum;
    const scoreColor = getScoreColor(displayScoreDiff);
    const scoreLabel = getScoreLabel(displayScoreDiff);

    // Score stepper helpers
    const incrementScore = () => {
      const next = Math.min(score + 1, 15);
      setScore(next);
      pushUpdate({ score: next });
    };
    const decrementScore = () => {
      const next = Math.max(score - 1, 1);
      setScore(next);
      pushUpdate({ score: next });
    };

    // Putts stepper helpers
    const incrementPutts = () => {
      const next = Math.min(puttsCount + 1, 10);
      setPuttsCount(next);
      setHasPuttsEntry(true);
      pushUpdate({ putts: next, hasPutts: true });
    };
    const decrementPutts = () => {
      const next = Math.max(puttsCount - 1, 0);
      setPuttsCount(next);
      setHasPuttsEntry(true);
      pushUpdate({ putts: next, hasPutts: true });
    };

    // Fairway toggle
    const toggleFairway = (value: FairwayResult) => {
      const next = fairway === value ? null : value;
      setFairway(next);
      pushUpdate({ fairway: next });
    };

    const handleBunkerChange = (type: BunkerEntry["type"], delta: number) => {
      setBunkers((prev) => {
        const current = countByType(prev, type);
        const next = Math.max(0, current + delta);
        const updated = setCountForType(prev, type, next, (t) => ({
          type: t as BunkerEntry["type"],
        }));
        pushUpdate({ bunkers: updated });
        return updated;
      });
    };

    const handlePenaltyChange = (type: PenaltyEntry["type"], delta: number) => {
      setPenalties((prev) => {
        const current = countByType(prev, type);
        const next = Math.max(0, current + delta);
        const updated = setCountForType(prev, type, next, (t) => ({
          type: t as PenaltyEntry["type"],
        }));
        pushUpdate({ penalties: updated });
        return updated;
      });
    };

    return (
      <View style={[styles.card, disabled && styles.cardDisabled]}>
        <Animated.View style={animatedStyle}>
          {/* Top section: D-pad + Score/Putts steppers */}
          <View style={styles.topSection}>
            {/* Fairway D-pad */}
            <View
              style={[styles.dpadWrapper, isPar3 && { opacity: 0.25 }]}
              pointerEvents={isPar3 ? "none" : "auto"}
            >
              <Text style={styles.stepperLabel}>Tee Shot Accuracy</Text>
              <DPad
                size={150}
                value={fairway}
                onControl={toggleFairway}
                quadrantColor={Color.neutral200}
                selectedColor={Color.primary}
                iconColor={Color.neutral400}
                selectedIconColor={Color.white}
                centerBgColor={Color.neutral300}
                centerTextColor={Color.neutral500}
                iconSize={24}
              />
            </View>

            {/* Score + Putts steppers */}
            <View style={styles.steppersArea}>
              {/* Score stepper */}
              <View style={styles.stepperColumn}>
                <Text style={styles.stepperLabel}>Score</Text>
                <Stepper
                  value={score}
                  onIncrement={incrementScore}
                  onDecrement={decrementScore}
                  direction="vertical"
                  disabled={disabled}
                  valueColor={scoreColor}
                />
                <Text style={[styles.pillSubLabel, { color: scoreColor }]}>
                  {scoreLabel}
                </Text>
              </View>

              {/* Putts stepper */}
              <View style={styles.stepperColumn}>
                <Text style={styles.stepperLabel}>Putts</Text>
                <Stepper
                  value={puttsCount}
                  onIncrement={incrementPutts}
                  onDecrement={decrementPutts}
                  direction="vertical"
                  disabled={disabled}
                />
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

          {/* Advanced toggle */}
          <Pressable
            onPress={() => setAdvancedExpanded((prev) => !prev)}
            style={styles.advancedToggle}
          >
            <Text style={styles.advancedToggleText}>Advanced</Text>
            <Feather
              name={advancedExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={Color.neutral500}
            />
          </Pressable>

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
}

export default HoleEntryPanel;

// === Styles ===

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: Color.neutral200,
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
  // Steppers area (right side)
  steppersArea: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Space.xxl,
  },
  stepperColumn: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    alignItems: "center",
  },
  stepperLabel: {
    ...Type.overline,
    marginBottom: Space.sm - 4,
  },
  pillSubLabel: {
    fontFamily: Font.semiBold,
    fontSize: 11,
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
    fontFamily: Font.semiBold,
    fontSize: 11,
  },
  girTextTrue: {
    color: Color.white,
  },
  girTextFalse: {
    color: Color.neutral500,
  },

  // Advanced toggle
  advancedToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: Space.xs,
    paddingVertical: Space.xs,
  },
  advancedToggleText: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.neutral500,
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
    fontFamily: Font.bold,
    color: Color.neutral400,
    letterSpacing: 0.5,
    marginBottom: Space.sm,
  },
});
