import { getContrastColor } from "@/lib/color-contrast";
import { Teebox } from "@/hooks/use-course-search";
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

// --- Types ---

export type ScorecardPlayer = {
  id: number;
  golfer_id: string;
  first_name: string;
  score_details: {
    name: string;
    holes: Record<string, { par: string; length: string; score: string }>;
  } | null;
};

type ScorecardProps = {
  teeboxData: Teebox;
  players: ScorecardPlayer[];
};

export type ScorecardRef = {
  scrollToHole: (holeNumber: number) => void;
};

// --- Constants ---

const FIXED_COL_WIDTH = 80;
const CELL_WIDTH = 56;
const CELL_HEIGHT = 44;
const BORDER_COLOR = "#f1f1f1";
const CELL_PADDING = 7;
const FALLBACK_TEEBOX_COLOR = "#677079";

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
  ({ teeboxData, players }, ref) => {
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

    useImperativeHandle(ref, () => ({
      scrollToHole: (holeNumber: number) => {
        // Calculate the x offset: each column is CELL_WIDTH, find index of the hole
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
          style={[styles.cellText, textColor ? { color: textColor } : undefined]}
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
    ) => (
      <View
        key={key}
        style={[
          styles.dataCell,
          bgColor ? { backgroundColor: bgColor } : undefined,
        ]}
      >
        <Text
          style={[styles.cellText, textColor ? { color: textColor } : undefined]}
        >
          {content}
        </Text>
      </View>
    );

    // --- Row builders ---

    const buildHoleNumberRow = () =>
      columns.map((col) => {
        if (col.type === "hole") {
          return renderDataCell(String(col.number), col.key);
        }
        if (col.type === "out") {
          return renderDataCell("OUT", "out", "#fafafa");
        }
        return renderDataCell("IN", "in", "#fafafa");
      });

    const buildTeeboxRow = () =>
      columns.map((col) => {
        if (col.type === "hole") {
          const length = teeboxData.holes[col.key]?.length ?? "";
          return renderDataCell(
            length,
            `tb-${col.key}`,
            teeboxColor,
            teeboxTextColor,
          );
        }
        if (col.type === "out") {
          const total = sumField(teeboxData.holes, front, "length");
          return renderDataCell(
            total,
            "tb-out",
            teeboxColor,
            teeboxTextColor,
          );
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
          return renderDataCell(par, `par-${col.key}`, "#fafafa");
        }
        if (col.type === "out") {
          const total = sumField(teeboxData.holes, front, "par");
          return renderDataCell(total, "par-out", "#fafafa");
        }
        const inKeys = holeCount > 9 ? back : allKeys;
        const total = sumField(teeboxData.holes, inKeys, "par");
        return renderDataCell(total, "par-in", "#fafafa");
      });

    const buildPlayerRow = (player: ScorecardPlayer) => {
      const holes = player.score_details?.holes ?? {};
      return columns.map((col) => {
        if (col.type === "hole") {
          const score = holes[col.key]?.score ?? "";
          return renderDataCell(score || " ", `${player.id}-${col.key}`);
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
          {renderFixedCell(teeboxData.name, teeboxColor, teeboxTextColor)}
          {renderFixedCell("Par", "#fafafa")}
          {players.map((p) => (
            <View key={`fixed-${p.id}`}>
              {renderFixedCell(p.first_name)}
            </View>
          ))}
        </View>

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
    backgroundColor: "#fff",
  },
  fixedColumn: {
    width: FIXED_COL_WIDTH,
    zIndex: 1,
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
    fontSize: 13,
    color: "#1a1a1a",
  },
});
