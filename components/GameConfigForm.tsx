import {
  GameConfig,
  getPayoutTotal,
  ProxLowNetConfig,
} from "@/lib/game-config";
import React from "react";
import { View } from "react-native";
import { Switch, Text, TextInput } from "react-native-paper";
import "../global.css";

type Props = {
  config: GameConfig;
  onConfigChange: (config: GameConfig) => void;
};

export default function GameConfigForm({ config, onConfigChange }: Props) {
  const payoutTotal = getPayoutTotal(config.proxLowNet.payouts);
  const isPayoutValid = payoutTotal === 100;

  const updateProxLowNet = (updates: Partial<ProxLowNetConfig>) => {
    onConfigChange({
      ...config,
      proxLowNet: { ...config.proxLowNet, ...updates },
    });
  };

  const updatePayout = (
    key: keyof ProxLowNetConfig["payouts"],
    value: string
  ) => {
    const num = value === "" ? 0 : parseInt(value, 10);
    if (isNaN(num)) return;
    onConfigChange({
      ...config,
      proxLowNet: {
        ...config.proxLowNet,
        payouts: { ...config.proxLowNet.payouts, [key]: num },
      },
    });
  };

  const updateSkins = (updates: Partial<GameConfig["skins"]>) => {
    onConfigChange({
      ...config,
      skins: { ...config.skins, ...updates },
    });
  };

  const parseNumeric = (value: string): number => {
    const num = value === "" ? 0 : parseInt(value, 10);
    return isNaN(num) ? 0 : num;
  };

  return (
    <View>
      {/* Prox / Low Net Section */}
      <View className="p-4 mb-4 border rounded-lg" style={{ borderColor: "#d4d4d4" }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="titleSmall" style={{ color: "#111827" }}>
            Prox / Low Net Game
          </Text>
          <Switch
            value={config.proxLowNet.enabled}
            onValueChange={(val) => updateProxLowNet({ enabled: val })}
          />
        </View>

        {config.proxLowNet.enabled && (
          <>
            <TextInput
              mode="outlined"
              label="Entry Fee ($)"
              value={String(config.proxLowNet.entryFee)}
              onChangeText={(val) =>
                updateProxLowNet({ entryFee: parseNumeric(val) })
              }
              keyboardType="numeric"
              style={{ marginBottom: 12 }}
            />

            <Text
              variant="labelMedium"
              style={{ color: "#555", marginBottom: 8 }}
            >
              Payout Percentages
            </Text>

            <View className="flex-row gap-2 mb-2">
              <View className="flex-1">
                <TextInput
                  mode="outlined"
                  label="Low Net 1st %"
                  value={String(config.proxLowNet.payouts.lowNet1st)}
                  onChangeText={(val) => updatePayout("lowNet1st", val)}
                  keyboardType="numeric"
                  dense
                />
              </View>
              <View className="flex-1">
                <TextInput
                  mode="outlined"
                  label="Low Net 2nd %"
                  value={String(config.proxLowNet.payouts.lowNet2nd)}
                  onChangeText={(val) => updatePayout("lowNet2nd", val)}
                  keyboardType="numeric"
                  dense
                />
              </View>
              <View className="flex-1">
                <TextInput
                  mode="outlined"
                  label="Low Net 3rd %"
                  value={String(config.proxLowNet.payouts.lowNet3rd)}
                  onChangeText={(val) => updatePayout("lowNet3rd", val)}
                  keyboardType="numeric"
                  dense
                />
              </View>
            </View>

            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <TextInput
                  mode="outlined"
                  label="Low Gross %"
                  value={String(config.proxLowNet.payouts.lowGross)}
                  onChangeText={(val) => updatePayout("lowGross", val)}
                  keyboardType="numeric"
                  dense
                />
              </View>
              <View className="flex-1">
                <TextInput
                  mode="outlined"
                  label="Prox Total %"
                  value={String(config.proxLowNet.payouts.proxTotal)}
                  onChangeText={(val) => updatePayout("proxTotal", val)}
                  keyboardType="numeric"
                  dense
                />
              </View>
            </View>

            <Text
              variant="bodySmall"
              style={{
                color: isPayoutValid ? "#16a34a" : "#dc2626",
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              Total: {payoutTotal}%{isPayoutValid ? "" : " (must equal 100%)"}
            </Text>

            <TextInput
              mode="outlined"
              label="Number of Prox Holes"
              value={String(config.proxLowNet.proxHoleCount)}
              onChangeText={(val) =>
                updateProxLowNet({ proxHoleCount: parseNumeric(val) })
              }
              keyboardType="numeric"
            />
          </>
        )}
      </View>

      {/* Skins Section */}
      <View className="p-4 mb-4 border rounded-lg" style={{ borderColor: "#d4d4d4" }}>
        <View className="flex-row items-center justify-between mb-3">
          <Text variant="titleSmall" style={{ color: "#111827" }}>
            Skins Game
          </Text>
          <Switch
            value={config.skins.enabled}
            onValueChange={(val) => updateSkins({ enabled: val })}
          />
        </View>

        {config.skins.enabled && (
          <>
            <TextInput
              mode="outlined"
              label="Entry Fee ($)"
              value={String(config.skins.entryFee)}
              onChangeText={(val) =>
                updateSkins({ entryFee: parseNumeric(val) })
              }
              keyboardType="numeric"
              style={{ marginBottom: 12 }}
            />

            <View className="flex-row items-center justify-between">
              <Text variant="bodyMedium" style={{ color: "#555" }}>
                Carry over if no skins won
              </Text>
              <Switch
                value={config.skins.carryOver}
                onValueChange={(val) => updateSkins({ carryOver: val })}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
