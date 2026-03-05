import {
  Animation,
  Color,
  Font,
  Shadow,
  Space,
} from "@/constants/design-tokens";
import { useAppDrawer } from "@/contexts/app-drawer-context";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, View } from "react-native";
import { Drawer } from "react-native-paper";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const RAIL_WIDTH = 100;

export default function AppDrawer() {
  const { isDrawerOpen, closeDrawer } = useAppDrawer();
  const { isEditor, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [modalVisible, setModalVisible] = useState(false);
  const translateX = useSharedValue(-RAIL_WIDTH);
  const backdropOpacity = useSharedValue(0);

  const hideModal = useCallback(() => {
    setModalVisible(false);
  }, []);

  // Open animation
  useEffect(() => {
    if (isDrawerOpen) {
      setModalVisible(true);
      translateX.value = withTiming(0, { duration: Animation.durationMs });
      backdropOpacity.value = withTiming(1, {
        duration: Animation.durationMs,
      });
    } else if (modalVisible) {
      // Close animation
      translateX.value = withTiming(-RAIL_WIDTH, {
        duration: Animation.durationMs,
      });
      backdropOpacity.value = withTiming(0, {
        duration: Animation.durationMs,
      });
      // Delay modal unmount until animation completes
      setTimeout(() => {
        runOnJS(hideModal)();
      }, Animation.durationMs);
    }
  }, [isDrawerOpen]);

  const railStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const navigateTo = (path: string) => {
    closeDrawer();
    router.push(path as any);
  };

  const handleSignOut = () => {
    closeDrawer();
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  };

  if (!modalVisible) return null;

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      onRequestClose={closeDrawer}
    >
      {/* Dimmed backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      {/* Left-side rail */}
      <Animated.View
        style={[
          styles.rail,
          railStyle,
          { paddingTop: insets.top + Space.lg },
        ]}
      >
        <View style={styles.items}>
          <Drawer.CollapsedItem
            focusedIcon="account"
            unfocusedIcon="account-outline"
            label="Profile"
            onPress={() => navigateTo("/(protected)/profile")}
          />
          {isEditor && (
            <Drawer.CollapsedItem
              focusedIcon="pencil"
              unfocusedIcon="pencil-outline"
              label="Editor"
              onPress={() => navigateTo("/(protected)/editor")}
            />
          )}
          <Drawer.CollapsedItem
            focusedIcon="cog"
            unfocusedIcon="cog-outline"
            label="Settings"
            onPress={() => navigateTo("/(protected)/settings")}
          />
        </View>

        <View style={styles.bottom}>
          <Drawer.CollapsedItem
            focusedIcon="logout"
            unfocusedIcon="logout"
            label="Sign Out"
            onPress={handleSignOut}
            theme={{
              colors: {
                onSecondaryContainer: Color.danger,
                onSurfaceVariant: Color.danger,
              },
            }}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  rail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: RAIL_WIDTH,
    backgroundColor: Color.white,
    justifyContent: "space-between",
    paddingBottom: Space.xxl,
    ...Shadow.lg,
  },
  items: {
    gap: Space.sm,
  },
  bottom: {
    borderTopWidth: 1,
    borderTopColor: Color.neutral200,
    paddingTop: Space.sm,
  },
});
