import BottomTabBar from "@/components/BottomTabBar";
import { useAuth } from "@/contexts/auth-context";
import { useActiveRounds } from "@/hooks/use-active-rounds";
import { usePendingFriendCount } from "@/hooks/use-friends";
import { on } from "@/lib/events";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Redirect, Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

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
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="dashboard"
    >
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
    </Tabs>
  );
}
