import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text as RNText, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}
        >
          <MaterialIcons name="chevron-left" size={28} color="#1a1a1a" />
          <RNText style={{ fontSize: 16, color: "#1a1a1a" }}>Back</RNText>
        </Pressable>
      </View>
      <View className="items-center px-8 pt-8">
        <Text
          variant="headlineSmall"
          style={{
            fontWeight: "700",
            color: "#1a1a1a",
            textAlign: "center",
            marginBottom: 4,
          }}
        >
          Settings
        </Text>
        <Text
          variant="bodyLarge"
          style={{ color: "#555", textAlign: "center", marginBottom: 24 }}
        >
          Coming soon
        </Text>
      </View>
    </SafeAreaView>
  );
}
