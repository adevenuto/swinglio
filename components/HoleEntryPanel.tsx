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
import DPad from "./DPad";
import Stepper, { CountStepperRow } from "./Stepper";

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
              style={[styles.dpadWrapper, isPar3 && { opacity: 0.25 }]}
              pointerEvents={isPar3 ? "none" : "auto"}
            >
              <DPad
                size={120}
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
                  variant="primary"
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
                  variant="primary"
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
  },
);

HoleEntryPanel.displayName = "HoleEntryPanel";

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
    gap: Space.sm,
  },
  stepperColumn: {
    flex: 1,
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
