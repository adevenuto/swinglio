import Entypo from "@expo/vector-icons/Entypo";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

// Pre-composed paths in a 100×100 viewBox — no transforms needed
const TOP_D =
  "M50 0C61.8373 0 72.7132 4.11423 81.2774 10.9899C83.0333 12.3997 83.0597 15.0056 81.4673 16.5978L67.9314 30.1324C66.4342 31.6294 64.0462 31.665 62.2558 30.5351C58.7079 28.296 54.5055 27 50 27C45.5338 27 41.3652 28.2733 37.8368 30.4765C36.0483 31.5932 33.6723 31.5512 32.1814 30.0603L18.6367 16.5156C17.0416 14.9205 17.0715 12.3089 18.8346 10.9016C27.3815 4.07933 38.2139 0 50 0Z";

const BOTTOM_D =
  "M81.3623 83.4834C82.9575 85.0785 82.9275 87.6901 81.1644 89.0975C72.6177 95.9199 61.7861 100 50 100C38.2651 100 27.4761 95.9557 18.9467 89.1867C17.1765 87.7819 17.1429 85.1646 18.7409 83.5666L32.295 70.0117C33.7798 68.5269 36.1436 68.4786 37.9301 69.5821C41.4386 71.7493 45.5732 73 50 73C54.4662 73 58.6342 71.7261 62.1624 69.5227C63.9507 68.4058 66.3267 68.4478 67.8176 69.9387L81.3623 83.4834Z";

const LEFT_D =
  "M30.0603 32.1814C31.5512 33.6723 31.5932 36.0483 30.4765 37.8368C28.2733 41.3652 27 45.5338 27 50C27 54.5055 28.296 58.7079 30.5351 62.2558C31.665 64.0462 31.6294 66.4342 30.1324 67.9314L16.5978 81.4673C15.0056 83.0597 12.3997 83.0333 10.99 81.2774C4.11423 72.7132 0 61.8373 0 50C0 38.2139 4.07933 27.3815 10.9016 18.8346C12.3089 17.0715 14.9205 17.0416 16.5156 18.6367L30.0603 32.1814Z";

const RIGHT_D =
  "M83.5666 18.7409C85.1646 17.1429 87.7819 17.1765 89.1867 18.9467C95.9557 27.4761 100 38.2651 100 50C100 61.7861 95.9199 72.6177 89.0975 81.1644C87.6901 82.9275 85.0786 82.9575 83.4834 81.3623L69.9388 67.8176C68.4478 66.3267 68.4058 63.9507 69.5227 62.1624C71.7261 58.6342 73 54.4662 73 50C73 45.5732 71.7493 41.4386 69.5821 37.9301C68.4786 36.1436 68.5269 33.7798 70.0117 32.295L83.5666 18.7409Z";

const CENTER_D =
  "M70 50C70 61.0457 61.0457 70 50 70C38.9543 70 30 61.0457 30 50C30 38.9543 38.9543 30 50 30C61.0457 30 70 38.9543 70 50Z";

export type DPadValue = "left" | "right" | "long" | "short" | "hit";

type Props = {
  size?: number;
  value?: DPadValue | null;
  quadrantColor?: string;
  selectedColor?: string;
  iconColor?: string;
  selectedIconColor?: string;
  iconSize?: number;
  centerBgColor?: string;
  centerText?: string;
  centerTextColor?: string;
  pressedOpacity?: number;
  onControl?: (value: DPadValue) => void;
  style?: ViewStyle;
};

export default function DPad({
  size = 140,
  value = null,
  quadrantColor = "#DDE5ED",
  selectedColor = "#15603A",
  iconColor = "#6F7F92",
  selectedIconColor = "#FFFFFF",
  iconSize = 22,
  centerBgColor = "#BFEA4C",
  centerText = "HIT",
  centerTextColor = "#2B2B2B",
  pressedOpacity = 0.65,
  onControl,
  style,
}: Props) {
  const [pressedSegment, setPressedSegment] = useState<DPadValue | null>(null);

  const handleControl = useCallback(
    (v: DPadValue) => {
      onControl?.(v);
    },
    [onControl],
  );

  // Proportions from 100×100 viewBox — clean percentages
  const thin = size * 0.3; // arc zone (0–30%)
  const offset = size * 0.7; // start of far arc (70–100%)
  const centerSize = size * 0.4; // center circle diameter (30–70%)
  const centerOffset = size * 0.3; // center circle origin (30%)

  const segmentOpacity = (segment: DPadValue) =>
    pressedSegment === segment ? pressedOpacity : 1;

  return (
    <View
      style={[
        { width: size, height: size, position: "relative", overflow: "hidden" },
        style,
      ]}
    >
      {/* Single SVG with all 5 pre-positioned paths — visual layer only */}
      <Svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <Path d={TOP_D} fill={value === "long" ? selectedColor : quadrantColor} opacity={segmentOpacity("long")} />
        <Path d={BOTTOM_D} fill={value === "short" ? selectedColor : quadrantColor} opacity={segmentOpacity("short")} />
        <Path d={LEFT_D} fill={value === "left" ? selectedColor : quadrantColor} opacity={segmentOpacity("left")} />
        <Path d={RIGHT_D} fill={value === "right" ? selectedColor : quadrantColor} opacity={segmentOpacity("right")} />
        <Path d={CENTER_D} fill={value === "hit" ? selectedColor : centerBgColor} opacity={segmentOpacity("hit")} />
      </Svg>

      {/* Transparent touch targets with icons */}

      {/* TOP — "long" */}
      <Pressable
        onPress={() => handleControl("long")}
        onPressIn={() => setPressedSegment("long")}
        onPressOut={() => setPressedSegment(null)}
        style={[
          styles.quadrant,
          { top: 0, left: 0, width: size, height: thin },
        ]}
      >
        <View style={styles.iconOverlay}>
          <Entypo name="chevron-up" size={iconSize} color={value === "long" ? selectedIconColor : iconColor} />
        </View>
      </Pressable>

      {/* BOTTOM — "short" */}
      <Pressable
        onPress={() => handleControl("short")}
        onPressIn={() => setPressedSegment("short")}
        onPressOut={() => setPressedSegment(null)}
        style={[
          styles.quadrant,
          { top: offset, left: 0, width: size, height: thin },
        ]}
      >
        <View style={styles.iconOverlay}>
          <Entypo name="chevron-down" size={iconSize} color={value === "short" ? selectedIconColor : iconColor} />
        </View>
      </Pressable>

      {/* LEFT — "left" */}
      <Pressable
        onPress={() => handleControl("left")}
        onPressIn={() => setPressedSegment("left")}
        onPressOut={() => setPressedSegment(null)}
        style={[
          styles.quadrant,
          { top: 0, left: 0, width: thin, height: size },
        ]}
      >
        <View style={styles.iconOverlay}>
          <Entypo name="chevron-left" size={iconSize} color={value === "left" ? selectedIconColor : iconColor} />
        </View>
      </Pressable>

      {/* RIGHT — "right" */}
      <Pressable
        onPress={() => handleControl("right")}
        onPressIn={() => setPressedSegment("right")}
        onPressOut={() => setPressedSegment(null)}
        style={[
          styles.quadrant,
          { top: 0, left: offset, width: thin, height: size },
        ]}
      >
        <View style={styles.iconOverlay}>
          <Entypo name="chevron-right" size={iconSize} color={value === "right" ? selectedIconColor : iconColor} />
        </View>
      </Pressable>

      {/* CENTER — "hit" */}
      <Pressable
        onPress={() => handleControl("hit")}
        onPressIn={() => setPressedSegment("hit")}
        onPressOut={() => setPressedSegment(null)}
        style={[
          styles.center,
          {
            top: centerOffset,
            left: centerOffset,
            width: centerSize,
            height: centerSize,
          },
        ]}
      >
        <Text
          style={[
            styles.centerText,
            { color: value === "hit" ? selectedIconColor : centerTextColor, fontSize: centerSize * 0.35 },
          ]}
        >
          {centerText}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  quadrant: {
    position: "absolute",
  },
  iconOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    position: "absolute",
    fontWeight: "800",
  },
});
