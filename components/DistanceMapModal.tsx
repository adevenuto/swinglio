import { Color, Font, Radius, Space } from "@/constants/design-tokens";
import { usePreferences } from "@/contexts/preferences-context";
import { formatDistance, yardsToUnit, unitLabel } from "@/lib/geo";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

let Mapbox: typeof import("@rnmapbox/maps").default | null = null;
try {
  Mapbox = require("@rnmapbox/maps").default;
  Mapbox!.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
} catch {
  // Native module not linked — fallback UI will show
}

type Props = {
  visible: boolean;
  onClose: () => void;
  playerLat: number;
  playerLng: number;
  greenCenter: { lat: number; lng: number };
  holeNumber: number;
  distanceYards: number;
};

export default function DistanceMapModal({
  visible,
  onClose,
  playerLat,
  playerLng,
  greenCenter,
  holeNumber,
  distanceYards,
}: Props) {
  const { distanceUnit } = usePreferences();
  const cameraRef = useRef<any>(null);
  const zoomRef = useRef(17);

  const [anchorCoord, setAnchorCoord] = useState<[number, number]>([
    (playerLng + greenCenter.lng) / 2,
    (playerLat + greenCenter.lat) / 2,
  ]);

  const playerToAnchor = useMemo(
    () =>
      formatDistance(
        playerLat,
        playerLng,
        anchorCoord[1],
        anchorCoord[0],
        distanceUnit,
      ),
    [playerLat, playerLng, anchorCoord, distanceUnit],
  );

  const anchorToGreen = useMemo(
    () =>
      formatDistance(
        anchorCoord[1],
        anchorCoord[0],
        greenCenter.lat,
        greenCenter.lng,
        distanceUnit,
      ),
    [anchorCoord, greenCenter.lat, greenCenter.lng, distanceUnit],
  );

  const handleZoom = useCallback((delta: number) => {
    zoomRef.current = Math.min(22, Math.max(10, zoomRef.current + delta));
    cameraRef.current?.setCamera({
      zoomLevel: zoomRef.current,
      animationDuration: 200,
    });
  }, []);

  const lineGeoJSON: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [playerLng, playerLat],
            anchorCoord,
            [greenCenter.lng, greenCenter.lat],
          ],
        },
      },
    ],
  };

  const bounds = {
    ne: [
      Math.max(playerLng, greenCenter.lng),
      Math.max(playerLat, greenCenter.lat),
    ] as [number, number],
    sw: [
      Math.min(playerLng, greenCenter.lng),
      Math.min(playerLat, greenCenter.lat),
    ] as [number, number],
    paddingTop: 80,
    paddingBottom: 80,
    paddingLeft: 80,
    paddingRight: 80,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Map */}
        <View style={styles.mapWrapper}>
          {Mapbox ? (
            <>
              <Mapbox.MapView
                style={styles.map}
                styleURL={Mapbox.StyleURL.SatelliteStreet}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={false}
                zoomEnabled
                scrollEnabled
              >
                <Mapbox.Camera
                  ref={cameraRef}
                  defaultSettings={{ bounds }}
                  maxZoomLevel={18}
                />

                {/* Distance line */}
                <Mapbox.ShapeSource id="distance-line" shape={lineGeoJSON}>
                  <Mapbox.LineLayer
                    id="distance-line-layer"
                    style={{
                      lineColor: Color.white,
                      lineWidth: 2,
                      lineDasharray: [2, 2],
                    }}
                  />
                </Mapbox.ShapeSource>

                {/* Player marker — blue dot */}
                <Mapbox.MarkerView
                  coordinate={[playerLng, playerLat]}
                  allowOverlap
                >
                  <View style={styles.playerDot} />
                </Mapbox.MarkerView>

                {/* Distance label above green center */}
                <Mapbox.MarkerView
                  coordinate={[greenCenter.lng, greenCenter.lat]}
                  anchor={{ x: 0.5, y: 1 }}
                  allowOverlap
                >
                  <View style={styles.pillAboveMarker}>
                    <View style={styles.distancePill}>
                      <Text style={styles.distancePillText}>
                        {anchorToGreen.value} {anchorToGreen.label}
                      </Text>
                    </View>
                  </View>
                </Mapbox.MarkerView>

                {/* Green center marker */}
                <Mapbox.MarkerView
                  coordinate={[greenCenter.lng, greenCenter.lat]}
                  anchor={{ x: 0.5, y: 0.5 }}
                  allowOverlap
                >
                  <View style={styles.greenPin}>
                    <MaterialCommunityIcons
                      name="flag"
                      size={18}
                      color={Color.white}
                    />
                  </View>
                </Mapbox.MarkerView>

                {/* Distance label above anchor */}
                <Mapbox.MarkerView
                  coordinate={anchorCoord}
                  anchor={{ x: 0.5, y: 1 }}
                  allowOverlap
                >
                  <View style={styles.pillAboveMarker}>
                    <View style={styles.distancePill}>
                      <Text style={styles.distancePillText}>
                        {playerToAnchor.value} {playerToAnchor.label}
                      </Text>
                    </View>
                  </View>
                </Mapbox.MarkerView>

                {/* Landing-zone anchor — long-press to drag */}
                <Mapbox.PointAnnotation
                  id="landing-zone"
                  coordinate={anchorCoord}
                  draggable
                  onDrag={(e: any) => {
                    const coords = e?.geometry?.coordinates as
                      | [number, number]
                      | undefined;
                    if (coords) setAnchorCoord(coords);
                  }}
                  onDragEnd={(e: any) => {
                    const coords = e?.geometry?.coordinates as
                      | [number, number]
                      | undefined;
                    if (coords) setAnchorCoord(coords);
                  }}
                >
                  <View style={styles.anchorDot} />
                </Mapbox.PointAnnotation>
              </Mapbox.MapView>

              {/* Top overlay — hole info pill + legend */}
              <View style={styles.topOverlay}>
                <Text style={styles.topOverlayText}>
                  Hole {holeNumber} ·{" "}
                  {yardsToUnit(distanceYards, distanceUnit)}{" "}
                  {unitLabel(distanceUnit)}
                </Text>
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>Hold & drag to measure</Text>
              </View>

              {/* Close X button */}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.closeCircle,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={Color.white}
                />
              </Pressable>

              {/* Zoom controls */}
              <View style={styles.zoomControls}>
                <Pressable
                  onPress={() => handleZoom(1)}
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={22}
                    color={Color.white}
                  />
                </Pressable>
                <View style={styles.zoomDivider} />
                <Pressable
                  onPress={() => handleZoom(-1)}
                  style={({ pressed }) => [
                    styles.zoomBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="minus"
                    size={22}
                    color={Color.white}
                  />
                </Pressable>
              </View>
            </>
          ) : (
            <View style={styles.fallback}>
              <MaterialCommunityIcons
                name="map-marker-off"
                size={48}
                color={Color.neutral400}
              />
              <Text style={styles.fallbackTitle}>Map Not Available</Text>
              <Text style={styles.fallbackBody}>
                Mapbox native code is not linked. Run "npx expo prebuild
                --clean" then "npx expo run:ios" to enable maps.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.neutral900,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.xl,
  },
  fallbackTitle: {
    fontFamily: Font.semiBold,
    fontSize: 17,
    color: Color.neutral700,
    marginTop: Space.md,
    marginBottom: Space.sm,
  },
  fallbackBody: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
    textAlign: "center",
    lineHeight: 20,
  },
  playerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Color.info,
    borderWidth: 3,
    borderColor: Color.white,
  },
  anchorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.white,
    borderWidth: 6,
    borderColor: Color.accentDark,
  },
  greenPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Color.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Color.white,
  },
  topOverlay: {
    position: "absolute",
    top: Space.xl,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: Radius.lg,
    paddingVertical: Space.xs,
    paddingHorizontal: Space.md,
  },
  topOverlayText: {
    fontFamily: Font.semiBold,
    fontSize: 14,
    color: Color.white,
  },
  closeCircle: {
    position: "absolute",
    top: Space.xl,
    right: Space.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillAboveMarker: {
    marginBottom: 20,
  },
  distancePill: {
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    flexDirection: "row",
  },
  distancePillText: {
    fontFamily: Font.semiBold,
    fontSize: 12,
    color: Color.white,
    flexShrink: 0,
  },
  zoomControls: {
    position: "absolute",
    right: Space.md,
    bottom: Space.lg,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  zoomBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  legend: {
    position: "absolute",
    top: Space.xl + 32,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Color.white,
    borderWidth: 3,
    borderColor: Color.accentDark,
  },
  legendText: {
    fontSize: 12,
    fontFamily: Font.medium,
    color: Color.white,
  },
});
