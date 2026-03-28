import React from "react";
import { StyleSheet, View } from "react-native";
import CloudyBackground from "./CloudyBackground";
import SunnyBackground from "./SunnyBackground";

/**
 * Partly cloudy: sunny sky as base with a couple of drifting clouds on top.
 * Reuses SunnyBackground + a lighter CloudyBackground overlay.
 */
export default function PartlyCloudyBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <SunnyBackground />
      {/* Fewer, more transparent clouds layered on the sunny sky */}
      <View style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}>
        <CloudyBackground isNight={false} />
      </View>
    </View>
  );
}
