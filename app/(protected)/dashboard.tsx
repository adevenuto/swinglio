import { useAuth } from "@/contexts/auth-context";
import React from "react";
import { Text, View } from "react-native";
import "../../global.css";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-8">
        <View className="w-full max-w-md">
          <Text className="text-3xl font-bold text-center mb-4">Dashboard</Text>
          <Text className="text-lg text-center text-gray-600 mb-8">
            Welcome back, {user?.email?.split("@")[0]}!
          </Text>

          <View className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
            <Text className="text-xl font-semibold text-blue-900 mb-2">
              🎉 You're all set!
            </Text>
            <Text className="text-base text-blue-700">
              Your account is active and ready to use.
            </Text>
          </View>

          <View className="bg-gray-50 rounded-lg p-6">
            <Text className="text-sm font-medium text-gray-500 mb-4">
              Quick Stats
            </Text>
            <View className="flex-row justify-between mb-3">
              <Text className="text-gray-600">Account Status</Text>
              <Text className="font-semibold text-green-600">Active</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Member Since</Text>
              <Text className="font-semibold text-gray-900">
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString()
                  : "N/A"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
