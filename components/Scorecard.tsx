import { Color, Font, Radius } from "@/constants/design-tokens";
import { Teebox } from "@/hooks/use-course-search";
import { getContrastColor } from "@/lib/color-contrast";
import { ScoreDetails } from "@/types/scoring";
import { LinearGradient } from "expo-linear-gradient";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

// --- Types ---

export type ScorecardPlayer = {
  id: number;
  golfer_id: string;
  first_name: string;
  score_details: ScoreDetails | null;
};

type ScorecardProps = {
  teeboxData: Teebox;
  players: ScorecardPlayer[];
  onHolePress?: (holeNumber: number) => void;
  currentUserId?: string;
  currentHole?: number | null;
};

export type ScorecardRef = {
  scrollToHole: (holeNumber: number) => void;
};

// --- Constants ---

const FIXED_COL_WIDTH = 120;
const SHADOW_WIDTH = 8;
const CELL_WIDTH = 62;
const CELL_HEIGHT = 48;
const BORDER_COLOR = Color.neutral200;
const CELL_PADDING = 7;
const FALLBACK_TEEBOX_COLOR = "#677079";
const HIGHLIGHT_BG = Color.neutral50;
const HIGHLIGHT_BORDER = Color.neutral300;
const SYMBOL_SIZE = 28;
const SYMBOL_COLOR = Color.neutral900;

// --- Column definitions ---

type ColumnDef =
  | { type: "hole"; key: string; number: number }
  | { type: "out" }
  | { type: "in" };

function buildColumns(holeCount: number): ColumnDef[] {
  const cols: ColumnDef[] = [];
  const frontNine = Math.min(9, holeCount);

  for (let i = 1; i <= frontNine; i++) {
    cols.push({ type: "hole", key: `hole-${i}`, number: i });
  }

  if (holeCount > 9) {
    cols.push({ type: "out" });
    for (let i = 10; i <= holeCount; i++) {
      cols.push({ type: "hole", key: `hole-${i}`, number: i });
    }
  }

  cols.push({ type: "in" });

  return cols;
}

function getHoleKeys(holeCount: number): { front: string[]; back: string[] } {
  const front: string[] = [];
  const back: string[] = [];
  for (let i = 1; i <= holeCount; i++) {
    if (i <= 9) front.push(`hole-${i}`);
    else back.push(`hole-${i}`);
  }
  return { front, back };
}

function sumField(
  holes: Record<string, { par?: string; length?: string; score?: string }>,
  keys: string[],
  field: "par" | "length" | "score",
): string {
  let total = 0;
  let hasValue = false;
  for (const key of keys) {
    const val = holes[key]?.[field];
    if (val && val !== "") {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        total += num;
        hasValue = true;
      }
    }
  }
  return hasValue ? String(total) : "";
}

// --- Component ---

const Scorecard = forwardRef<ScorecardRef, ScorecardProps>(
  ({ teeboxData, players, onHolePress, currentUserId, currentHole }, ref) => {
    const scrollRef = useRef<ScrollView>(null);

    const holeCount = useMemo(
      () => Object.keys(teeboxData.holes).length,
      [teeboxData],
    );
    const columns = useMemo(() => buildColumns(holeCount), [holeCount]);
    const { front, back } = useMemo(() => getHoleKeys(holeCount), [holeCount]);
    const allKeys = useMemo(() => [...front, ...back], [front, back]);

    const teeboxColor = teeboxData.color || FALLBACK_TEEBOX_COLOR;
    const teeboxTextColor = getContrastColor(teeboxColor);
    const secondaryColor = teeboxData.secondaryColor || null;

    useImperativeHandle(ref, () => ({
      scrollToHole: (holeNumber: number) => {
        const colIndex = columns.findIndex(
          (c) => c.type === "hole" && c.number === holeNumber,
        );
        if (colIndex >= 0) {
          scrollRef.current?.scrollTo({
            x: colIndex * CELL_WIDTH,
            animated: true,
          });
        }
      },
    }));

    // --- Cell renderers ---

    const renderFixedCell = (
      label: string,
      bgColor?: string,
      textColor?: string,
    ) => (
      <View
        style={[
          styles.fixedCell,
          bgColor ? { backgroundColor: bgColor } : undefined,
        ]}
      >
        <Text
          style={[
            styles.cellText,
            textColor ? { color: textColor } : undefined,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    );

    const renderDataCell = (
      content: string,
      key: string,
      bgColor?: string,
      textColor?: string,
      borderColor?: string,
    ) => (
      <View
        key={key}
        style={[
          styles.dataCell,
          bgColor ? { backgroundColor: bgColor } : undefined,
          borderColor ? { borderColor } : undefined,
        ]}
      >
        <Text
          style={[
            styles.cellText,
            textColor ? { color: textColor } : undefined,
          ]}
        >
          {content}
        </Text>
      </View>
    );

    const renderScoreCell = (
      score: string,
      par: string,
      key: string,
      highlight?: boolean,
    ) => {
      const scoreNum = parseInt(score, 10);
      const parNum = parseInt(par, 10);
      const hasScore = score !== "" && !isNaN(scoreNum);
      const hasPar = !isNaN(parNum);

      if (!hasScore) {
        return renderDataCell(
          " ",
          key,
          highlight ? HIGHLIGHT_BG : undefined,
          undefined,
          highlight ? HIGHLIGHT_BORDER : undefined,
        );
      }

      if (!hasPar) {
        return renderDataCell(
          score,
          key,
          highlight ? HIGHLIGHT_BG : undefined,
          undefined,
          highlight ? HIGHLIGHT_BORDER : undefined,
        );
      }

      const diff = scoreNum - parNum;

      let inner: React.ReactNode;

      if (diff === 0) {
        inner = <Text style={styles.cellText}>{score}</Text>;
      } else if (diff === -1) {
        inner = (
          <View style={symbolStyles.circle}>
            <Text style={styles.cellText}>{score}</Text>
          </View>
        );
      } else if (diff === -2) {
        inner = (
          <View style={symbolStyles.circleSolid}>
            <Text style={[styles.cellText, { color: Color.white }]}>
              {score}
            </Text>
          </View>
        );
      } else if (diff <= -3) {
        inner = (
          <View style={symbolStyles.circleFrame}>
            <View style={symbolStyles.circleSolid}>
              <Text style={[styles.cellText, { color: Color.white }]}>
                {score}
              </Text>
            </View>
          </View>
        );
      } else if (diff === 1) {
        inner = (
          <View style={symbolStyles.square}>
            <Text style={styles.cellText}>{score}</Text>
          </View>
        );
      } else if (diff === 2) {
        inner = (
          <View style={symbolStyles.squareSolid}>
            <Text style={[styles.cellText, { color: Color.white }]}>
              {score}
            </Text>
          </View>
        );
      } else {
        inner = (
          <View style={symbolStyles.squareFrame}>
            <View style={symbolStyles.squareSolid}>
              <Text style={[styles.cellText, { color: Color.white }]}>
                {score}
              </Text>
            </View>
          </View>
        );
      }

      return (
        <View
          key={key}
          style={[
            styles.dataCell,
            highlight
              ? { backgroundColor: HIGHLIGHT_BG, borderColor: HIGHLIGHT_BORDER }
              : undefined,
          ]}
        >
          {inner}
        </View>
      );
    };

    // --- Row builders ---

    const buildHoleNumberRow = () =>
      columns.map((col) => {
        if (col.type === "hole") {
          const hl = col.number === currentHole;
          const cell = renderDataCell(
            String(col.number),
            col.key,
            hl ? HIGHLIGHT_BG : undefined,
            undefined,
            hl ? HIGHLIGHT_BORDER : undefined,
          );
          if (onHolePress) {
            return (
              <Pressable
                key={`hn-${col.key}`}
                onPress={() => onHolePress(col.number)}
                style={({ pressed }) =>
                  pressed ? { opacity: 0.5 } : undefined
                }
              >
                {cell}
              </Pressable>
            );
          }
          return cell;
        }
        if (col.type === "out") {
          return renderDataCell("OUT", "out", Color.neutral100);
        }
        return renderDataCell("IN", "in", Color.neutral100);
      });

    const buildTeeboxRow = () =>
      columns.map((col) => {
        if (col.type === "hole") {
          const length = teeboxData.holes[col.key]?.length ?? "";
          const hl = col.number === currentHole;
          return renderDataCell(
            length,
            `tb-${col.key}`,
            teeboxColor,
            teeboxTextColor,
            hl ? HIGHLIGHT_BORDER : undefined,
          );
        }
        if (col.type === "out") {
          const total = sumField(teeboxData.holes, front, "length");
          return renderDataCell(total, "tb-out", teeboxColor, teeboxTextColor);
        }
        // IN
        const inKeys = holeCount > 9 ? back : allKeys;
        const total = sumField(teeboxData.holes, inKeys, "length");
        return renderDataCell(total, "tb-in", teeboxColor, teeboxTextColor);
      });

    const buildParRow = () =>
      columns.map((col) => {
        if (col.type === "hole") {
          const par = teeboxData.holes[col.key]?.par ?? "";
          const hl = col.number === currentHole;
          return renderDataCell(
            par,
            `par-${col.key}`,
            hl ? HIGHLIGHT_BG : Color.neutral100,
            undefined,
            hl ? HIGHLIGHT_BORDER : undefined,
          );
        }
        if (col.type === "out") {
          const total = sumField(teeboxData.holes, front, "par");
          return renderDataCell(total, "par-out", Color.neutral100);
        }
        const inKeys = holeCount > 9 ? back : allKeys;
        const total = sumField(teeboxData.holes, inKeys, "par");
        return renderDataCell(total, "par-in", Color.neutral100);
      });

    const buildPlayerRow = (player: ScorecardPlayer) => {
      const holes = player.score_details?.holes ?? {};
      return columns.map((col) => {
        if (col.type === "hole") {
          const score = holes[col.key]?.score ?? "";
          const par = teeboxData.holes[col.key]?.par ?? "";
          const hl = col.number === currentHole;
          const cell = renderScoreCell(
            score,
            par,
            `${player.id}-${col.key}`,
            hl,
          );
          if (onHolePress) {
            return (
              <Pressable
                key={`${player.id}-hn-${col.key}`}
                onPress={() => onHolePress(col.number)}
                style={({ pressed }) =>
                  pressed ? { opacity: 0.5 } : undefined
                }
              >
                {cell}
              </Pressable>
            );
          }
          return cell;
        }
        if (col.type === "out") {
          const total = sumField(holes, front, "score");
          return renderDataCell(total || " ", `${player.id}-out`);
        }
        const inKeys = holeCount > 9 ? back : allKeys;
        const total = sumField(holes, inKeys, "score");
        return renderDataCell(total || " ", `${player.id}-in`);
      });
    };

    return (
      <View style={styles.container}>
        {/* Fixed left column (sticky) */}
        <View style={styles.fixedColumn}>
          {renderFixedCell("Hole")}
          <View style={[styles.fixedCell, { backgroundColor: teeboxColor }]}>
            {secondaryColor && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 0,
                  height: 0,
                  borderTopWidth: 12,
                  borderRightWidth: 12,
                  borderTopColor: secondaryColor,
                  borderRightColor: "transparent",
                }}
              />
            )}
            <Text
              style={[styles.cellText, { color: teeboxTextColor }]}
              numberOfLines={1}
            >
              {teeboxData.name}
            </Text>
          </View>
          {renderFixedCell("Par", Color.neutral100)}
          {players.map((p) => {
            const isCurrentUser = p.golfer_id === currentUserId;
            const inSkins = p.score_details?.inSkins === true;
            return (
              <View key={`fixed-${p.id}`} style={styles.fixedCell}>
                {inSkins && <View style={styles.skinsIndicator} />}
                <Text
                  style={[
                    styles.cellText,
                    { textTransform: "capitalize" },
                    isCurrentUser && { fontFamily: Font.bold },
                  ]}
                  numberOfLines={1}
                >
                  {p.first_name}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Shadow overlay on fixed column edge */}
        <LinearGradient
          colors={["rgba(0,0,0,.3)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shadowOverlay}
          pointerEvents="none"
        />

        {/* Scrollable right area */}
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.scrollArea}
        >
          <View>
            {/* Hole numbers */}
            <View style={styles.row}>{buildHoleNumberRow()}</View>
            {/* Teebox yardage */}
            <View style={styles.row}>{buildTeeboxRow()}</View>
            {/* Par */}
            <View style={styles.row}>{buildParRow()}</View>
            {/* Player score rows */}
            {players.map((p) => (
              <View key={`score-${p.id}`} style={styles.row}>
                {buildPlayerRow(p)}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  },
);

Scorecard.displayName = "Scorecard";

export default Scorecard;

// --- Styles ---

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: Color.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Color.neutral300,
    overflow: "hidden",
  },
  fixedColumn: {
    width: FIXED_COL_WIDTH,
    zIndex: 1,
  },
  shadowOverlay: {
    position: "absolute",
    left: FIXED_COL_WIDTH,
    top: 0,
    bottom: 0,
    width: SHADOW_WIDTH,
    zIndex: 2,
  },
  scrollArea: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
  },
  fixedCell: {
    width: FIXED_COL_WIDTH,
    height: CELL_HEIGHT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: CELL_PADDING,
    justifyContent: "center",
  },
  dataCell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: CELL_PADDING,
    justifyContent: "center",
    alignItems: "center",
  },
  cellText: {
    fontFamily: Font.medium,
    fontSize: 18,
    color: Color.neutral900,
  },
  skinsIndicator: {
    position: "absolute" as const,
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: Color.primary,
  },
});

const symbolStyles = StyleSheet.create({
  circle: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    borderRadius: SYMBOL_SIZE / 2,
    borderWidth: 2,
    borderColor: SYMBOL_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  circleSolid: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    borderRadius: SYMBOL_SIZE / 2,
    backgroundColor: SYMBOL_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  circleFrame: {
    borderWidth: 2,
    borderColor: SYMBOL_COLOR,
    borderRadius: (SYMBOL_SIZE + 8) / 2,
    padding: 2,
  },
  square: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    borderWidth: 2,
    borderColor: SYMBOL_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  squareSolid: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
    backgroundColor: SYMBOL_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  squareFrame: {
    borderWidth: 2,
    borderColor: SYMBOL_COLOR,
    padding: 2,
  },
});
