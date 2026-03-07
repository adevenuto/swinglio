import AppDrawer from "@/components/AppDrawer";
import BottomTabBar from "@/components/BottomTabBar";
import BrandHeader from "@/components/BrandHeader";
import { Color } from "@/constants/design-tokens";
import { AppDrawerProvider } from "@/contexts/app-drawer-context";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { usePendingFriendCount } from "@/hooks/use-friends";
import { on } from "@/lib/events";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  const { count: pendingCount, refresh: refreshPendingCount } =
    usePendingFriendCount(user?.id ?? "");
  const { activeRounds, refresh: refreshActiveRounds } = useActiveRounds(
    user?.id ?? "",
  );

  useFocusEffect(
    useCallback(() => {
      refreshPendingCount();
      refreshActiveRounds();
    }, [refreshPendingCount, refreshActiveRounds]),
  );

  useEffect(() => {
    return on("friends-changed", refreshPendingCount);
  }, [refreshPendingCount]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <AppDrawerProvider>
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: Color.screenBg }}
    >
    <BrandHeader />
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="dashboard"
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="sports-golf" size={size} color={color} />
          ),
          tabBarBadge:
            activeRounds.length > 0 ? activeRounds.length : undefined,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" size={size} color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: "Stats",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="bar-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          href: null,
          tabBarItemStyle: { display: "none" },
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{
          title: "Editor",
          href: null,
          tabBarItemStyle: { display: "none" },
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="edit" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          href: null,
          tabBarItemStyle: { display: "none" },
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </SafeAreaView>
    <AppDrawer />
    </AppDrawerProvider>
  );
}
