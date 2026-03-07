import { Color, Font, Radius, Space, Type } from "@/constants/design-tokens";
import { GreenCenter } from "@/hooks/use-course-search";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import Mapbox from "@rnmapbox/maps";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  visible: boolean;
  holeNumber: number;
  courseLat: number;
  courseLng: number;
  currentCenter: GreenCenter | null;
  onConfirm: (center: GreenCenter) => void;
  onClear: () => void;
  onCancel: () => void;
};

export default function GreenCenterPicker({
  visible,
  holeNumber,
  courseLat,
  courseLng,
  currentCenter,
  onConfirm,
  onClear,
  onCancel,
}: Props) {
  const [pin, setPin] = useState<GreenCenter | null>(currentCenter);

  // Reset pin when modal opens with new data
  React.useEffect(() => {
    if (visible) {
      setPin(currentCenter);
    }
  }, [visible, currentCenter]);

  const handleMapPress = useCallback((feature: GeoJSON.Feature) => {
    const coords = (feature.geometry as GeoJSON.Point).coordinates;
    setPin({ lat: coords[1], lng: coords[0] });
  }, []);

  const handleConfirm = () => {
    if (pin) onConfirm(pin);
  };

  const centerCoord: [number, number] = pin
    ? [pin.lng, pin.lat]
    : [courseLng, courseLat];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Hole {holeNumber} — Tap Green Center
          </Text>
        </View>

        {/* Map */}
        <View style={styles.mapWrapper}>
          <Mapbox.MapView
            style={styles.map}
            styleURL={Mapbox.StyleURL.SatelliteStreet}
            onPress={handleMapPress}
            logoEnabled={false}
            attributionEnabled={false}
            compassEnabled
          >
            <Mapbox.Camera
              defaultSettings={{
                centerCoordinate: centerCoord,
                zoomLevel: pin ? 18 : 17,
              }}
            />
            {pin && (
              <Mapbox.PointAnnotation
                id="green-center-pin"
                coordinate={[pin.lng, pin.lat]}
              >
                <View style={styles.pinOuter}>
                  <MaterialCommunityIcons
                    name="flag"
                    size={22}
                    color={Color.white}
                  />
                </View>
              </Mapbox.PointAnnotation>
            )}
          </Mapbox.MapView>
        </View>

        {/* Coordinates display */}
        {pin && (
          <View style={styles.coordRow}>
            <Text style={styles.coordText}>
              {pin.lat.toFixed(6)}, {pin.lng.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Bottom actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.cancelBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Pressable
            onPress={onClear}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.clearBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>

          <Pressable
            onPress={handleConfirm}
            disabled={!pin}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.confirmBtn,
              !pin && { opacity: 0.5 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.confirmText}>Confirm</Text>
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
  },
  headerTitle: {
    ...Type.h3,
    textAlign: "center",
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  pinOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Color.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Color.white,
  },
  coordRow: {
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    backgroundColor: Color.white,
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
    alignItems: "center",
  },
  coordText: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Color.neutral500,
  },
  actions: {
    flexDirection: "row",
    gap: Space.md,
    paddingHorizontal: Space.lg,
    paddingTop: Space.md,
    paddingBottom: Space.xxl,
    backgroundColor: Color.white,
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: Color.neutral100,
  },
  cancelText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral700,
  },
  clearBtn: {
    borderWidth: 1,
    borderColor: Color.danger,
    backgroundColor: Color.white,
  },
  clearText: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.danger,
  },
  confirmBtn: {
    backgroundColor: Color.primary,
  },
  confirmText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Color.white,
  },
});
