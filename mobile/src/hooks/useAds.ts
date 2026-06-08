// ============================================================================
// دروب (Droob) — useAds Hook
// Manages ad frequency, rewarded state, ad-free status
// ============================================================================

import { useState, useCallback, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { INTERSTITIAL_COOLDOWN, INTERSTITIAL_ROUTE_COOLDOWN, MAX_FREE_TRIPS_PER_DAY } from "@config/ads";
import { useAppStore } from "@stores/app.store";

// ──── Use Interstitial ────
// Returns: { showIfReady: () => boolean, markShown: () => void }
export function useInterstitial(placement: "trip" | "route") {
  const lastShownRef = useRef(0);
  const cooldown = placement === "trip" ? INTERSTITIAL_COOLDOWN : INTERSTITIAL_ROUTE_COOLDOWN;

  // Check if ad-free
  const isAdFree = useAppStore((s) => s.user?.isAdFree ?? false);

  const canShow = useCallback(() => {
    if (isAdFree) return false;
    const now = Date.now();
    return now - lastShownRef.current > cooldown * 1000;
  }, [isAdFree, cooldown]);

  const markShown = useCallback(() => {
    lastShownRef.current = Date.now();
  }, []);

  return { canShow, markShown, isAdFree };
}

// ──── Use Rewarded ────
// Manages rewarded video state per reward type
export function useRewarded(rewardType: string) {
  const [isEarned, setIsEarned] = useState(false);

  const markEarned = useCallback(() => {
    setIsEarned(true);
    // Store reward state
    switch (rewardType) {
      case "remove_ads_1h":
        // Will be handled by the ad-free timer in app store
        setTimeout(() => setIsEarned(false), 60 * 60 * 1000); // 1 hour
        break;
      case "extra_trip":
        // Reset after the extra trip is used
        break;
      case "offline_map":
      case "route_details":
        // One-time unlock: stays earned
        break;
    }
  }, [rewardType]);

  return { isEarned, markEarned, setIsEarned };
}

// ──── Trip Counter (daily free trips) ────
export function useTripCounter() {
  const [dailyTrips, setDailyTrips] = useState(0);
  const todayRef = useRef(new Date().toDateString());

  const incrementTrip = useCallback(() => {
    const today = new Date().toDateString();
    if (today !== todayRef.current) {
      todayRef.current = today;
      setDailyTrips(1);
      return true;
    }
    const next = dailyTrips + 1;
    setDailyTrips(next);
    return next <= MAX_FREE_TRIPS_PER_DAY;
  }, [dailyTrips]);

  const hasFreeTrips = dailyTrips < MAX_FREE_TRIPS_PER_DAY;

  return { dailyTrips, incrementTrip, hasFreeTrips, maxTrips: MAX_FREE_TRIPS_PER_DAY };
}
