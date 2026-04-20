import GradientButton from "@/components/GradientButton";
import {
  Color,
  Font,
  Radius,
  Space,
  Type
} from "@/constants/design-tokens";
import { useSubscription } from "@/contexts/subscription-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { PACKAGE_TYPE } from "react-native-purchases";
import { toast } from "sonner-native";

const FEATURES = [
  { icon: "trending-up" as const, text: "Full handicap index with trends" },
  {
    icon: "bar-chart-2" as const,
    text: "Detailed stats — FWY%, GIR, putts & more",
  },
  { icon: "map-pin" as const, text: "GPS yardage on supported courses" },
  {
    icon: "cloud" as const,
    text: "Live weather backgrounds & on-course conditions",
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { offerings, purchase, restore, isPro } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    // Default to annual if available
    const annualIdx = offerings.findIndex(
      (p) => p.packageType === PACKAGE_TYPE.ANNUAL,
    );
    return annualIdx >= 0 ? annualIdx : 0;
  });

  const justPurchased = useRef(false);

  // Navigate back reactively once isPro flips to true
  useEffect(() => {
    if (isPro) {
      if (justPurchased.current) {
        toast.success("Welcome to Swinglio Pro!");
      }
      router.back();
    }
  }, [isPro]);

  const monthlyPkg = offerings.find(
    (p) => p.packageType === PACKAGE_TYPE.MONTHLY,
  );
  const annualPkg = offerings.find(
    (p) => p.packageType === PACKAGE_TYPE.ANNUAL,
  );

  const packages = [annualPkg, monthlyPkg].filter(Boolean) as typeof offerings;

  const handlePurchase = async () => {
    const pkg = packages[selectedIdx];
    if (!pkg) return;

    setLoading(true);
    const success = await purchase(pkg);
    setLoading(false);

    if (success) {
      justPurchased.current = true;
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    await restore();
    setLoading(false);
    toast.success("Purchases restored");
  };

  return (
    <View style={styles.screen}>
      {/* Close button */}
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
        hitSlop={12}
      >
        <Feather name="x" size={24} color={Color.neutral700} />
      </Pressable>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Unlock Swinglio Pro</Text>
        <Text style={styles.subtitle}>
          Take your game to the next level with advanced stats, full handicap
          tracking, and unlimited round history.
        </Text>

        {/* Feature list */}
        <View style={styles.featureList}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Feather name={f.icon} size={20} color={Color.primary} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Package options */}
        {packages.length > 0 ? (
          <View style={styles.packages}>
            {packages.map((pkg, i) => {
              const isAnnual = pkg.packageType === PACKAGE_TYPE.ANNUAL;
              const isSelected = selectedIdx === i;
              return (
                <Pressable
                  key={pkg.identifier}
                  onPress={() => setSelectedIdx(i)}
                  style={[
                    styles.packageCard,
                    isSelected && styles.packageCardSelected,
                  ]}
                >
                  {isAnnual && (
                    <View style={styles.saveBadge}>
                      <Text style={styles.saveBadgeText}>SAVE 50%</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.packageTitle,
                      isSelected && styles.packageTitleSelected,
                    ]}
                  >
                    {isAnnual ? "Annual" : "Monthly"}
                  </Text>
                  <Text
                    style={[
                      styles.packagePrice,
                      isSelected && styles.packagePriceSelected,
                    ]}
                  >
                    {pkg.product.priceString}
                    <Text style={styles.packagePeriod}>
                      /{isAnnual ? "yr" : "mo"}
                    </Text>
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.noPackages}>
            <Text style={styles.noPackagesText}>
              Subscription packages are not available yet. Check back soon.
            </Text>
          </View>
        )}

        {/* CTA */}
        <GradientButton
          onPress={handlePurchase}
          label="Continue"
          loading={loading}
          disabled={loading || packages.length === 0}
          style={{ marginBottom: Space.lg }}
        />

        {/* Restore */}
        <Pressable
          onPress={handleRestore}
          disabled={loading}
          style={({ pressed }) => [
            styles.restoreBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Color.white,
  },
  closeBtn: {
    position: "absolute",
    top: Space.xxxl + Space.md,
    right: Space.lg,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xxxl + Space.xxxl,
    paddingBottom: Space.xxxl,
  },
  title: {
    ...Type.h1,
    marginBottom: Space.md,
  },
  subtitle: {
    ...Type.body,
    color: Color.neutral500,
    marginBottom: Space.xxl,
  },

  // Features
  featureList: {
    marginBottom: Space.xxl,
    gap: Space.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Color.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontFamily: Font.medium,
    fontSize: 15,
    color: Color.neutral900,
    flex: 1,
  },

  // Packages
  packages: {
    flexDirection: "row",
    gap: Space.md,
    marginBottom: Space.xl,
  },
  packageCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: Color.neutral200,
    borderRadius: Radius.md,
    padding: Space.lg,
    alignItems: "center",
  },
  packageCardSelected: {
    borderColor: Color.primary,
    backgroundColor: Color.primaryLight,
  },
  saveBadge: {
    backgroundColor: Color.accent,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    marginBottom: Space.sm,
  },
  saveBadgeText: {
    fontFamily: Font.bold,
    fontSize: 11,
    color: Color.neutral900,
  },
  packageTitle: {
    fontFamily: Font.semiBold,
    fontSize: 15,
    color: Color.neutral700,
    marginBottom: Space.xs,
  },
  packageTitleSelected: {
    color: Color.primary,
  },
  packagePrice: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Color.neutral900,
  },
  packagePriceSelected: {
    color: Color.primary,
  },
  packagePeriod: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Color.neutral500,
  },
  noPackages: {
    padding: Space.xl,
    alignItems: "center",
    marginBottom: Space.xl,
  },
  noPackagesText: {
    ...Type.body,
    color: Color.neutral500,
    textAlign: "center",
  },

  // CTA
  cta: {
    backgroundColor: Color.primary,
    height: 52,
    borderRadius: Radius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Space.lg,
  },
  ctaText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Color.white,
  },

  // Restore
  restoreBtn: {
    alignItems: "center",
    paddingVertical: Space.sm,
  },
  restoreText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Color.neutral500,
  },
});
