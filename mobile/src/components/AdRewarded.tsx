// ============================================================================
// دروب (Droob) — AdRewarded (Placeholder)
// No-op until react-native-google-mobile-ads build issues are resolved.
// The architecture is ready — just needs native module integration.
// ============================================================================

export type RewardType = "remove_ads_1h" | "extra_trip" | "offline_map" | "route_details";

export function useRewardedAd(_adUnitId: string, _rewardType: RewardType) {
  // Placeholder — always "not loaded", won't show any ad
  const show = async (): Promise<boolean> => false;
  return { show, isLoaded: false, isEarned: false };
}
