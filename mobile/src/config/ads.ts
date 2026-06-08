// ============================================================================
// دروب (Droob) — AdMob Configuration
// Test IDs for development, production IDs for release
// ============================================================================

const IS_PROD = true; // ✅ Production — real AdMob IDs

// Test ad unit IDs (fallback for dev)
const TEST_IDS: Record<string, string> = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
  rewarded: "ca-app-pub-3940256099942544/5224354917",
};

// Production ad unit IDs ✅
const PROD_IDS: Record<string, string> = {
  banner_home: "ca-app-pub-9458980714107954/1364177424",
  banner_departures: "ca-app-pub-9458980714107954/4262333732",
  banner_routes: "ca-app-pub-9458980714107954/4046181085",
  interstitial_trip: "ca-app-pub-9458980714107954/6617034334",
  interstitial_route: "ca-app-pub-9458980714107954/5303952668",
  rewarded_remove_ads: "ca-app-pub-9458980714107954/5387713142",
  rewarded_extra_trips: "ca-app-pub-9458980714107954/6505353690",
  rewarded_offline_map: "ca-app-pub-9458980714107954/8232838105",
  rewarded_route_details: "ca-app-pub-9458980714107954/8995785664",
};

// Banner — use test IDs for all dev banners
export const AD_BANNER_HOME = IS_PROD ? PROD_IDS.banner_home : TEST_IDS.banner;
export const AD_BANNER_DEPARTURES = IS_PROD ? PROD_IDS.banner_departures : TEST_IDS.banner;
export const AD_BANNER_ROUTES = IS_PROD ? PROD_IDS.banner_routes : TEST_IDS.banner;

// Interstitial
export const AD_INTERSTITIAL_TRIP = IS_PROD ? PROD_IDS.interstitial_trip : TEST_IDS.interstitial;
export const AD_INTERSTITIAL_ROUTE = IS_PROD ? PROD_IDS.interstitial_route : TEST_IDS.interstitial;

// Rewarded
export const AD_REWARDED_REMOVE_ADS = IS_PROD ? PROD_IDS.rewarded_remove_ads : TEST_IDS.rewarded;
export const AD_REWARDED_EXTRA_TRIPS = IS_PROD ? PROD_IDS.rewarded_extra_trips : TEST_IDS.rewarded;
export const AD_REWARDED_OFFLINE_MAP = IS_PROD ? PROD_IDS.rewarded_offline_map : TEST_IDS.rewarded;
export const AD_REWARDED_ROUTE_DETAILS = IS_PROD ? PROD_IDS.rewarded_route_details : TEST_IDS.rewarded;

// Frequency caps (seconds)
export const INTERSTITIAL_COOLDOWN = 180; // 3 minutes min between interstitials
export const INTERSTITIAL_ROUTE_COOLDOWN = 300; // 5 minutes for route detail
export const MAX_FREE_TRIPS_PER_DAY = 10; // require rewarded video after this
