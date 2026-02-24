import React from "react";
import { ScrollView, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import "../../global.css";

export default function StatsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <ScrollView className="flex-1">
        <View className="items-center px-8 pt-12">
          <Text
            variant="headlineSmall"
            style={{
              fontWeight: "700",
              color: "#1a1a1a",
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            Stats
          </Text>
          <Text
            variant="bodyLarge"
            style={{ color: "#555", textAlign: "center", marginBottom: 24 }}
          >
            Coming soon
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
