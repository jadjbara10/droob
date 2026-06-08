// ============================================================================
// دروب (Droob) — AdInterstitial (Placeholder)
// No-op until react-native-google-mobile-ads build issues are resolved.
// The architecture is ready — just needs native module integration.
// ============================================================================

export function useInterstitialAd(_adUnitId: string, _placement: string) {
  // Placeholder — always "not ready", won't show any ad
  const showIfReady = () => false;
  return { showIfReady, isLoaded: false, isShowing: false, isAdFree: false };
}
