import GameConfigForm from "@/components/GameConfigForm";
import { useAuth } from "@/contexts/auth-context";
import { GameConfig, getPayoutTotal } from "@/lib/game-config";
import { supabase } from "@/lib/supabase";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";
import "../global.css";

export default function EditGameConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data, error } = await supabase
        .from("leagues")
        .select("game_config")
        .eq("id", id)
        .single();

      if (!error && data?.game_config) {
        setConfig(data.game_config as GameConfig);
      }

      // Verify coordinator access
      const { data: membership } = await supabase
        .from("league_users")
        .select("role")
        .eq("league_id", id)
        .eq("golfer_id", user?.id)
        .single();

      if (!membership || membership.role !== "coordinator") {
        Alert.alert("Access Denied", "Only coordinators can edit game settings.");
        router.back();
        return;
      }

      setIsLoading(false);
    }
    fetch();
  }, [id, user?.id]);

  const handleSave = async () => {
    if (!config) return;

    const payoutValid =
      !config.proxLowNet.enabled ||
      getPayoutTotal(config.proxLowNet.payouts) === 100;

    if (!payoutValid) {
      Alert.alert("Invalid Config", "Payout percentages must total 100%.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("leagues")
      .update({ game_config: config })
      .eq("id", id);
    setIsSaving(false);

    if (error) {
      Alert.alert("Error", "Failed to save configuration.");
      return;
    }

    router.back();
  };

  if (isLoading) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!config) {
    return (
      <View className="items-center justify-center flex-1 bg-white">
        <Text variant="bodyLarge">No configuration found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <GameConfigForm config={config} onConfigChange={setConfig} />
      </ScrollView>

      <View
        className="flex-row gap-3 px-4 pt-4 pb-12"
        style={{ borderTopWidth: 1, borderTopColor: "#e5e5e5" }}
      >
        <View className="flex-1">
          <Button mode="outlined" onPress={() => router.back()}>
            Cancel
          </Button>
        </View>
        <View className="flex-1">
          <Button
            mode="outlined"
            onPress={handleSave}
            loading={isSaving}
          >
            Save
          </Button>
        </View>
      </View>
    </View>
  );
}
