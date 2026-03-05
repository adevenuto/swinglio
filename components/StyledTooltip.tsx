import { Color, Font, Radius, Shadow } from "@/constants/design-tokens";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Portal, Text } from "react-native-paper";

type ChildrenMeasurement = {
  width: number;
  height: number;
  pageX: number;
  pageY: number;
};

type TooltipLayout = { width: number; height: number; x: number; y: number };

type Measurement = {
  children: ChildrenMeasurement;
  tooltip: TooltipLayout;
  measured: boolean;
};

type Props = {
  children: React.ReactElement;
  title: string;
  enterTouchDelay?: number;
  leaveTouchDelay?: number;
};

function getPosition(
  { children, tooltip, measured }: Measurement,
  _component: React.ReactElement
): {} | { left: number; top: number } {
  if (!measured) return {};

  const { width: screenW } = Dimensions.get("window");
  const { height: screenH } = Dimensions.get("window");

  const cx = children.pageX;
  const cw = children.width;
  const tw = tooltip.width;
  const th = tooltip.height;

  // horizontal center
  let left = cw > 0 ? cx + (cw - tw) / 2 : cx;
  if (left < 0) left = cx;
  if (left + tw > screenW) left = cx + cw - tw;

  // prefer below, flip above if overflows
  let top = children.pageY + children.height;
  if (top + th > screenH) top = children.pageY - th;

  return { left, top };
}

export default function StyledTooltip({
  children,
  title,
  enterTouchDelay = 0,
  leaveTouchDelay = 1500,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [measurement, setMeasurement] = useState<Measurement>({
    children: {} as ChildrenMeasurement,
    tooltip: {} as TooltipLayout,
    measured: false,
  });

  const childRef = useRef<View>(null);
  const touched = useRef(false);
  const showTimers = useRef<NodeJS.Timeout[]>([]);
  const hideTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    return () => {
      showTimers.current.forEach(clearTimeout);
      hideTimers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", () => setVisible(false));
    return () => sub.remove();
  }, []);

  const handleTouchStart = useCallback(() => {
    hideTimers.current.forEach(clearTimeout);
    hideTimers.current = [];
    touched.current = true;
    setVisible(true);
  }, []);

  const handleTouchEnd = useCallback(() => {
    touched.current = false;
    showTimers.current.forEach(clearTimeout);
    showTimers.current = [];
    const id = setTimeout(() => {
      setVisible(false);
      setMeasurement({
        children: {} as ChildrenMeasurement,
        tooltip: {} as TooltipLayout,
        measured: false,
      });
    }, leaveTouchDelay);
    hideTimers.current.push(id);
  }, [leaveTouchDelay]);

  const handleLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    childRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setMeasurement({
        children: { pageX, pageY, height, width },
        tooltip: { ...layout },
        measured: true,
      });
    });
  };

  return (
    <>
      {visible && (
        <Portal>
          <View
            onLayout={handleLayout}
            style={[
              styles.tooltip,
              {
                ...getPosition(measurement, children),
                ...(measurement.measured ? styles.visible : styles.hidden),
              },
            ]}
          >
            <Text style={styles.tooltipText}>{title}</Text>
          </View>
        </Portal>
      )}
      <Pressable
        ref={childRef}
        style={styles.pressContainer}
        onPress={() => {
          if (!touched.current) {
            const props = children.props as { onPress?: () => void };
            props.onPress?.();
          }
        }}
        onLongPress={handleTouchStart}
        onPressOut={handleTouchEnd}
        delayLongPress={enterTouchDelay}
      >
        {children}
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 14,
    height: 34,
    maxHeight: 34,
    backgroundColor: Color.white,
    borderWidth: 1,
    borderColor: Color.neutral200,
    borderRadius: Radius.sm,
    ...Shadow.md,
  },
  tooltipText: {
    fontFamily: Font.semiBold,
    fontSize: 13,
    color: Color.primary,
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
  pressContainer: {
    ...(Platform.OS === "web" && { cursor: "default" }),
  } as ViewStyle,
});
