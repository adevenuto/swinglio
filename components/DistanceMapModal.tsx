import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useCallback, useRef } from "react";
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
  const cameraRef = useRef<any>(null);
  const zoomRef = useRef(17);

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
            [greenCenter.lng, greenCenter.lat],
          ],
        },
      },
    ],
  };

  const centerLng = (playerLng + greenCenter.lng) / 2;
  const centerLat = (playerLat + greenCenter.lat) / 2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Hole {holeNumber}</Text>
          <Text style={styles.headerDistance}>{distanceYards} yards to pin</Text>
        </View>

        {/* Map */}
        <View style={styles.mapWrapper}>
          {Mapbox ? (
            <>
              <Mapbox.MapView
                style={styles.map}
                styleURL={Mapbox.StyleURL.SatelliteStreet}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled
                zoomEnabled
                scrollEnabled
              >
                <Mapbox.Camera
                  ref={cameraRef}
                  defaultSettings={{
                    centerCoordinate: [centerLng, centerLat],
                    zoomLevel: 17,
                  }}
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
                <Mapbox.MarkerView coordinate={[playerLng, playerLat]}>
                  <View style={styles.playerDot} />
                </Mapbox.MarkerView>

                {/* Green center marker — green pin */}
                <Mapbox.MarkerView
                  coordinate={[greenCenter.lng, greenCenter.lat]}
                >
                  <View style={styles.greenPin}>
                    <MaterialCommunityIcons
                      name="flag"
                      size={18}
                      color={Color.white}
                    />
                  </View>
                </Mapbox.MarkerView>
              </Mapbox.MapView>

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
                    color={Color.neutral700}
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
                    color={Color.neutral700}
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
                Mapbox native code is not linked. Run "npx expo prebuild --clean"
                then "npx expo run:ios" to enable maps.
              </Text>
            </View>
          )}
        </View>

        {/* Close button */}
        <View style={styles.actions}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.screenBg,
  },
  header: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.xl,
    paddingBottom: Space.md,
    backgroundColor: Color.white,
    borderBottomWidth: 1,
    borderBottomColor: Color.neutral200,
    alignItems: "center",
  },
  headerTitle: {
    ...Type.h3,
    textAlign: "center",
  },
  headerDistance: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.accentDark,
    marginTop: Space.xs,
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
  zoomControls: {
    position: "absolute",
    right: Space.md,
    bottom: Space.lg,
    backgroundColor: Color.white,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Color.neutral200,
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
    backgroundColor: Color.neutral200,
  },
  actions: {
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.xxl,
    backgroundColor: Color.white,
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
  },
  closeBtn: {
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Color.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral700,
  },
});
