import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import "../../global.css";

export default function Profile() {
  const { user, signOut, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, [refreshUser]);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
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

  return (
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
            progressViewOffset={175}
          />
        }
      >
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-full max-w-md">
            <Text className="text-3xl font-bold text-center mb-4">Profile</Text>
            <Text className="text-lg text-center text-gray-600 mb-8">
              Your account information
            </Text>

            <View className="bg-gray-100 rounded-lg p-6 mb-8">
              <Text className="text-sm font-medium text-gray-500 mb-2">
                Email
              </Text>
              <Text className="text-base font-semibold text-gray-900">
                {user?.email}
              </Text>

              <Text className="text-sm font-medium text-gray-500 mt-4 mb-2">
                User ID
              </Text>
              <Text className="text-base font-mono text-gray-900">
                {user?.id}
              </Text>

              <Text className="text-sm font-medium text-gray-500 mt-4 mb-2">
                Account Created
              </Text>
              <Text className="text-base text-gray-900">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>

            <Pressable
              className="bg-red-600 rounded-lg py-3"
              onPress={handleSignOut}
            >
              <Text className="text-white text-center font-semibold text-base">
                Sign Out
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
