import { useAuth } from "@/contexts/auth-context";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
} from "react-native-purchases";
import { useRouter } from "expo-router";

export type SubscriptionTier = "free" | "pro";

type SubscriptionContextType = {
  tier: SubscriptionTier;
  isPro: boolean;
  isLoading: boolean;
  offerings: PurchasesPackage[];
  restore: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  presentPaywall: () => void;
  /** DEV ONLY: override tier for testing UI gating */
  devOverrideTier: SubscriptionTier | null;
  setDevOverrideTier: (tier: SubscriptionTier | null) => void;
};

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(
  undefined,
);

const ENTITLEMENT_ID = "pro";

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isEditor } = useAuth();
  const router = useRouter();
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesPackage[]>([]);
  const [devOverrideTier, setDevOverrideTier] = useState<SubscriptionTier | null>(null);

  // Derive effective tier: dev override > editor > RevenueCat
  const hasDevOverride = __DEV__ && devOverrideTier != null;
  const effectiveTier = hasDevOverride ? devOverrideTier : tier;
  const isPro = hasDevOverride ? effectiveTier === "pro" : effectiveTier === "pro" || isEditor;

  // Initialize RevenueCat when user is available
  useEffect(() => {
    const init = async () => {
      if (!user?.id) {
        setTier("free");
        setIsLoading(false);
        return;
      }

      // Skip RevenueCat if editor (they get everything for free)
      if (isEditor) {
        setTier("pro");
        setIsLoading(false);
        return;
      }

      try {
        const apiKey = Platform.OS === "ios" ? RC_IOS_KEY : RC_ANDROID_KEY;
        if (!apiKey) {
          // RevenueCat not configured yet — default to free
          setTier("free");
          setIsLoading(false);
          return;
        }

        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        Purchases.configure({ apiKey, appUserID: user.id });

        // Check current entitlements
        const customerInfo = await Purchases.getCustomerInfo();
        updateTierFromCustomerInfo(customerInfo);

        // Fetch available packages
        const offeringsResult = await Purchases.getOfferings();
        if (offeringsResult.current?.availablePackages) {
          setOfferings(offeringsResult.current.availablePackages);
        }

        // Listen for subscription changes
        Purchases.addCustomerInfoUpdateListener(updateTierFromCustomerInfo);
      } catch (err) {
        console.error("RevenueCat init error:", err);
        setTier("free");
      } finally {
        setIsLoading(false);
      }
    };

    init();

    return () => {
      Purchases.removeCustomerInfoUpdateListener(updateTierFromCustomerInfo);
    };
  }, [user?.id, isEditor]);

  const updateTierFromCustomerInfo = (info: CustomerInfo) => {
    const isActive = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    setTier(isActive ? "pro" : "free");
  };

  const restore = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      updateTierFromCustomerInfo(info);
    } catch (err) {
      console.error("Restore purchases error:", err);
    }
  }, []);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      updateTierFromCustomerInfo(customerInfo);
      return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (err: any) {
      if (!err.userCancelled) {
        console.error("Purchase error:", err);
      }
      return false;
    }
  }, []);

  const presentPaywall = useCallback(() => {
    router.push("/paywall" as any);
  }, [router]);

  return (
    <SubscriptionContext.Provider
      value={{ tier: effectiveTier, isPro, isLoading, offerings, restore, purchase, presentPaywall, devOverrideTier, setDevOverrideTier }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};
