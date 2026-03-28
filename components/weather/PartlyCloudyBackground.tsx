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
      {/* Same clouds as cloudy, layered on the sunny sky (no gray gradient) */}
      <CloudyBackground isNight={false} showSky={false} />
    </View>
  );
}
