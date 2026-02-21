import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePendingFriendCount } from "@/hooks/use-friends";
import { on } from "@/lib/events";
import { Redirect, Tabs, useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function ProtectedLayout() {
  const { user, isLoading, isEditor } = useAuth();
  const colorScheme = useColorScheme();
  const { count: pendingCount, refresh: refreshPendingCount } =
    usePendingFriendCount(user?.id ?? "");

  useFocusEffect(
    useCallback(() => {
      refreshPendingCount();
    }, [refreshPendingCount]),
  );

  useEffect(() => {
    return on("friends-changed", refreshPendingCount);
  }, [refreshPendingCount]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
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
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.2.fill" color={color} />
          ),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{
          title: "Editor",
          href: isEditor ? undefined : null,
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="gearshape.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
