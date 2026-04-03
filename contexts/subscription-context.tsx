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
  PURCHASES_ERROR_CODE,
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

const ENTITLEMENT_ID = "Swinglio Pro";

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";
const RC_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? "";

// TODO: Re-enable once RevenueCat ships iOS 26 compatibility fix.
// Native Swift assertion failure in RC's async health check crashes the app
// on iOS 26 preview builds (~0.2s after Purchases.configure()).
const RC_DISABLED = true;

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
    let listenerActive = false;

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

      // Skip RevenueCat entirely — native crash on iOS 26
      if (RC_DISABLED) {
        setTier("free");
        setIsLoading(false);
        return;
      }

      const apiKey = Platform.OS === "ios" ? RC_IOS_KEY : RC_ANDROID_KEY;
      if (!apiKey) {
        // RevenueCat not configured yet — default to free
        setTier("free");
        setIsLoading(false);
        return;
      }

      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        Purchases.configure({ apiKey, appUserID: user.id });
      } catch (err) {
        console.error("RevenueCat configure error:", err);
        setTier("free");
        setIsLoading(false);
        return;
      }

      try {
        // Check current entitlements
        const customerInfo = await Purchases.getCustomerInfo();
        updateTierFromCustomerInfo(customerInfo);
      } catch (err) {
        console.error("RevenueCat getCustomerInfo error:", err);
        setTier("free");
      }

      try {
        // Fetch available packages
        const offeringsResult = await Purchases.getOfferings();
        if (offeringsResult.current?.availablePackages) {
          setOfferings(offeringsResult.current.availablePackages);
        }
      } catch (err) {
        console.error("RevenueCat getOfferings error:", err);
      }

      try {
        // Listen for subscription changes
        Purchases.addCustomerInfoUpdateListener(updateTierFromCustomerInfo);
        listenerActive = true;
      } catch (err) {
        console.error("RevenueCat listener error:", err);
      }

      setIsLoading(false);
    };

    init();

    return () => {
      if (listenerActive) {
        Purchases.removeCustomerInfoUpdateListener(updateTierFromCustomerInfo);
      }
    };
  }, [user?.id, isEditor]);

  const updateTierFromCustomerInfo = useCallback((info: CustomerInfo) => {
    const isActive = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    const newTier = isActive ? "pro" : "free";
    if (__DEV__) console.log("[Subscription] Tier update:", newTier, "entitlements:", Object.keys(info.entitlements.active));
    setTier(newTier);
  }, []);

  const restore = useCallback(async () => {
    try {
      const info = await Purchases.restorePurchases();
      updateTierFromCustomerInfo(info);
    } catch (err) {
      console.error("Restore purchases error:", err);
    }
  }, [updateTierFromCustomerInfo]);

  const purchase = useCallback(async (pkg: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isActive = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      if (__DEV__) console.log("[Subscription] Purchase result — entitlement active:", isActive);
      if (isActive) {
        setTier("pro");
      }
      updateTierFromCustomerInfo(customerInfo);
      return isActive;
    } catch (err: any) {
      const isCancelled =
        err.userCancelled ||
        err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
      if (!isCancelled) {
        console.error("Purchase error:", err);
      }
      return false;
    }
  }, [updateTierFromCustomerInfo]);

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
