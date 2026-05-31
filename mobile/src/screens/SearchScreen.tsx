// ============================================================================
// دروب (Droob) — Search Screen
// Uber-quality stop/place search with local data, MMKV recents, quick tiles
// ============================================================================
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Keyboard, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MMKV } from 'react-native-mmkv';

import { colors, spacing, radius, fontFamily, fontSize, fontWeight } from '@theme/tokens';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAppStore } from '../stores/app.store';
import { AMMAN_CENTER } from '../config/transport.config';
import type { Stop, Governorate } from '../types/transit.types';

// ============================================================================
// Local stops dataset — comprehensive Amman-area stops, no API required
// ============================================================================
const LOCAL_STOPS: Stop[] = [
  // ── LANDMARK_STOPS from transport.config (13) ──────────────────
  { id: 'lnd-4th',       code: 'AMM-4TH',  name_ar: 'الرابع',               name_en: '4th Circle',           lat: 31.9539, lng: 35.9106, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-bld',       code: 'AMM-BLD',  name_ar: 'وسط البلد',             name_en: 'Downtown Amman',       lat: 31.9516, lng: 35.9397, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: true,  hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-abd',       code: 'AMM-ABD',  name_ar: 'العبدلي',               name_en: 'Abdali Terminal',      lat: 31.9636, lng: 35.9156, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: true,  hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: true,  hasAc: true,  photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-whd',       code: 'AMM-WHD',  name_ar: 'الوحدات',               name_en: 'Wahdat Terminal',      lat: 31.9239, lng: 35.8900, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: true,  hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: true,  photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-uj',        code: 'AMM-UJ',   name_ar: 'الجامعة الأردنية',      name_en: 'University of Jordan',  lat: 32.0156, lng: 35.8747, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-gdn',       code: 'AMM-GDN',  name_ar: 'مجمع الجاردنز',         name_en: 'Gardens Complex',      lat: 31.9856, lng: 35.8714, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: true,  hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: true,  photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-mrk',       code: 'AMM-MRK',  name_ar: 'مجمع ماركا',            name_en: 'Marka Complex',        lat: 31.9778, lng: 35.9889, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: true,  hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-dakh',      code: 'AMM-DAKH', name_ar: 'دوار الداخلية',         name_en: 'Interior Ministry Circle',  lat: 31.9603, lng: 35.8833, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-mhk',       code: 'AMM-MHK',  name_ar: 'دوار المحكمة',          name_en: 'Court Circle',         lat: 31.9750, lng: 35.9139, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-swl',       code: 'AMM-SWL',  name_ar: 'الصويلح',               name_en: 'Sweileh',              lat: 32.0367, lng: 35.8275, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-ws',        code: 'AMM-WS',   name_ar: 'وادي السير',            name_en: 'Wadi Seer',            lat: 31.9431, lng: 35.8500, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-rus',       code: 'AMM-RUS',  name_ar: 'الرصيفة',               name_en: 'Rusaifa',              lat: 32.0167, lng: 36.0500, governorate: 'الزرقاء' as Governorate, city: 'الرصيفة', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'lnd-air',       code: 'AMM-AIR',  name_ar: 'مطار الملكة علياء',     name_en: 'QAI Airport',          lat: 31.7225, lng: 35.9933, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: true,  hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: true,  hasAc: true,  photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },

  // ── Additional common stops ────────────────────────────────────
  { id: 'loc-wah',       code: 'AMM-WAH',  name_ar: 'دوار الواحة',           name_en: 'Wahat Circle',         lat: 31.9900, lng: 35.8800, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-tab',       code: 'AMM-TAB',  name_ar: 'طبربور',                name_en: 'Tabarbour',            lat: 31.9975, lng: 35.8900, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-khl',       code: 'AMM-KHL',  name_ar: 'خلدا',                  name_en: 'Khalda',               lat: 31.9775, lng: 35.8450, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-mec',       code: 'AMM-MEC',  name_ar: 'شارع مكة',              name_en: 'Mecca Street',         lat: 31.9590, lng: 35.8950, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-8th',       code: 'AMM-8TH',  name_ar: 'دوار الثامن',           name_en: '8th Circle',           lat: 31.9550, lng: 35.8700, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-7th',       code: 'AMM-7TH',  name_ar: 'دوار السابع',           name_en: '7th Circle',           lat: 31.9630, lng: 35.8600, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-6th',       code: 'AMM-6TH',  name_ar: 'دوار السادس',           name_en: '6th Circle',           lat: 31.9660, lng: 35.8850, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-5th',       code: 'AMM-5TH',  name_ar: 'دوار الخامس',           name_en: '5th Circle',           lat: 31.9610, lng: 35.9000, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-jor',       code: 'AMM-JOR',  name_ar: 'شارع الأردن',           name_en: 'Jordan Street',        lat: 31.9700, lng: 35.9200, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-mdn',       code: 'AMM-MDN',  name_ar: 'شارع المدينة المنورة',  name_en: 'Madina Street',        lat: 31.9780, lng: 35.8950, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-jh',        code: 'AMM-JH',   name_ar: 'جبل الحسين',            name_en: 'Jabal Al-Hussein',     lat: 31.9600, lng: 35.9250, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-ja',        code: 'AMM-JA',   name_ar: 'جبل عمان',              name_en: 'Jabal Amman',          lat: 31.9450, lng: 35.9150, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-shm',       code: 'AMM-SHM',  name_ar: 'الشميساني',             name_en: 'Shmeisani',            lat: 31.9920, lng: 35.8900, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-dab',       code: 'AMM-DAB',  name_ar: 'دابوق',                 name_en: 'Dabouq',               lat: 31.9700, lng: 35.8300, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-abn',       code: 'AMM-ABN',  name_ar: 'عبدون',                 name_en: 'Abdoun',               lat: 31.9520, lng: 35.8750, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-tla',       code: 'AMM-TLA',  name_ar: 'تلاع العلي',            name_en: 'Tlaa Al-Ali',          lat: 31.9800, lng: 35.8600, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-bay',       code: 'AMM-BAY',  name_ar: 'البيادر',               name_en: 'Bayader',              lat: 31.9150, lng: 35.9300, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: false, hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-dah',       code: 'AMM-DAH',  name_ar: 'ضاحية الأمير حسن',      name_en: 'Prince Hassan Suburb', lat: 32.0050, lng: 35.8500, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-nasr',      code: 'AMM-NAS',  name_ar: 'نصر',                   name_en: 'Nasr',                 lat: 31.9680, lng: 35.8400, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-yad',       code: 'AMM-YAD',  name_ar: 'اليرموك',               name_en: 'Yarmouk',              lat: 32.0400, lng: 35.8700, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-hash',      code: 'AMM-HSH',  name_ar: 'الهاشمي',               name_en: 'Hashemi',              lat: 31.9620, lng: 35.9450, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-saha',      code: 'AMM-SAH',  name_ar: 'الساحة الهاشمية',       name_en: 'Hashemite Plaza',       lat: 31.9530, lng: 35.9370, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-zah',       code: 'AMM-ZAH',  name_ar: 'الزهراء',               name_en: 'Zahra',                lat: 31.9860, lng: 35.8680, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-istiqlal',  code: 'AMM-IST',  name_ar: 'الاستقلال',             name_en: 'Istiqlal',             lat: 31.9990, lng: 35.8570, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-sakhra',    code: 'AMM-SAKH', name_ar: 'الصخرة',                name_en: 'Sakhra',               lat: 31.9300, lng: 35.9050, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-jubeiha',   code: 'AMM-JUB',  name_ar: 'الجبيهة',               name_en: 'Jubeiha',              lat: 32.0280, lng: 35.8700, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: true,  hasLighting: true,  hasAccessibility: true,  hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-shafa',     code: 'AMM-SHF',  name_ar: 'شفا بدران',             name_en: 'Shafa Badran',         lat: 32.0480, lng: 35.8900, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
  { id: 'loc-marj',      code: 'AMM-MRJ',  name_ar: 'مرج الحمام',            name_en: 'Marj Al-Hamam',        lat: 31.9100, lng: 35.8450, governorate: 'عمان' as Governorate, city: 'عمان', isTerminal: false, hasShelter: false, hasLighting: true,  hasAccessibility: false, hasTicketMachine: false, hasAc: false, photoUrl: null, parentStationId: null, createdAt: '', updatedAt: '' },
];

// ============================================================================
// Quick tile definitions — emoji icons + labels for the 2x2 grid
// ============================================================================
const QUICK_TILES = [
  { code: 'AMM-UJ',  icon: '🏛',  label: 'الجامعة' },
  { code: 'AMM-BLD', icon: '🕌',  label: 'وسط البلد' },
  { code: 'AMM-AIR', icon: '✈️',  label: 'المطار' },
  { code: 'AMM-ABD', icon: '🚉',  label: 'العبدلي' },
] as const;

// ============================================================================
// MMKV storage for recent stops
// ============================================================================
const storage = new MMKV({ id: 'droob-search' });
const RECENTS_KEY = 'search_recent_stops';
const MAX_RECENTS = 10;

function loadRecents(): Stop[] {
  try {
    const raw = storage.getString(RECENTS_KEY);
    return raw ? JSON.parse(raw) as Stop[] : [];
  } catch {
    return [];
  }
}

function saveRecents(stops: Stop[]): void {
  try {
    storage.set(RECENTS_KEY, JSON.stringify(stops.slice(0, MAX_RECENTS)));
  } catch { /* noop */ }
}

// ============================================================================
// Haversine distance (km) between two lat/lng points
// ============================================================================
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================================
// Navigation types
// ============================================================================
type SearchMode = 'origin' | 'destination' | 'general';

type SearchRouteParams = {
  mode?: SearchMode;
};

type ScreenRouteProp = RouteProp<{ Search: SearchRouteParams }, 'Search'>;

// ============================================================================
// SearchScreen component
// ============================================================================
function SearchScreenContent(): React.ReactElement {
  const navigation = useNavigation();
  const route = useRoute<ScreenRouteProp>();
  const searchMode: SearchMode = route.params?.mode ?? 'general';

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recentStops, setRecentStops] = useState<Stop[]>([]);
  const [nearbyStops, setNearbyStops] = useState<(Stop & { distance_m?: number })[]>([]);

  // User location from the global store (Amman center as fallback)
  const userLocation = useAppStore((s) => s.userLocation);
  const originLat = userLocation?.[0] ?? AMMAN_CENTER.lat;
  const originLng = userLocation?.[1] ?? AMMAN_CENTER.lng;

  // ── Load recents on mount ─────────────────────────────────────────────
  useEffect(() => {
    setRecentStops(loadRecents());
  }, []);

  // ── Debounced search (300 ms) ─────────────────────────────────────────
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length > 0) {
      setIsSearching(true);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
      setIsSearching(false);
    }, 300);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Clear search ──────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
    inputRef.current?.focus();
  }, []);

  // ── Filtered search results (local only) ──────────────────────────────
  const results = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (q.length < 2) return [];

    const filtered = LOCAL_STOPS.filter(
      (stop) =>
        stop.name_ar.includes(q) ||
        stop.name_en.toLowerCase().includes(q) ||
        stop.code.toLowerCase().includes(q),
    );

    // Attach distance from user location and sort by relevance
    return filtered
      .map((stop) => ({
        ...stop,
        distance_m: Math.round(haversineKm(originLat, originLng, stop.lat, stop.lng) * 1000),
      }))
      .sort((a, b) => {
        // Name_ar start match > name_en start match > code match > distance
        const aStartsWithAr = a.name_ar.startsWith(debouncedQuery);
        const bStartsWithAr = b.name_ar.startsWith(debouncedQuery);
        if (aStartsWithAr && !bStartsWithAr) return -1;
        if (!aStartsWithAr && bStartsWithAr) return 1;

        const aStartsWithEn = a.name_en.toLowerCase().startsWith(q);
        const bStartsWithEn = b.name_en.toLowerCase().startsWith(q);
        if (aStartsWithEn && !bStartsWithEn) return -1;
        if (!aStartsWithEn && bStartsWithEn) return 1;

        return (a.distance_m ?? 0) - (b.distance_m ?? 0);
      });
  }, [debouncedQuery, originLat, originLng]);

  const hasQuery = debouncedQuery.length >= 2;
  const showNearby = nearbyStops.length > 0 && !hasQuery;
  const showEmpty = hasQuery && results.length === 0 && !isSearching;
  const displayResults = hasQuery ? results : showNearby ? nearbyStops : [];

  // ── Select a stop ─────────────────────────────────────────────────────
  const handleSelectStop = useCallback(
    (stop: Stop) => {
      // Persist to recents
      const updated = [stop, ...recentStops.filter((s) => s.id !== stop.id)].slice(0, MAX_RECENTS);
      setRecentStops(updated);
      saveRecents(updated);

      Keyboard.dismiss();
      navigation.goBack();

      // Defer navigation until the modal dismiss animation completes
      setTimeout(() => {
        if (searchMode === 'origin' || searchMode === 'destination') {
          (navigation as any).navigate('MainTabs', {
            screen: 'Home',
            params: {
              selectedStop: stop,
              action: searchMode === 'origin' ? 'setOrigin' : 'setDestination',
            },
            merge: true,
          });
        } else {
          (navigation as any).navigate('StopDetail', {
            stopId: stop.id,
            stopName: stop.name_ar,
          });
        }
      }, 120);
    },
    [navigation, searchMode, recentStops],
  );

  // ── Quick tile press ──────────────────────────────────────────────────
  const handleQuickTile = useCallback(
    (code: string) => {
      const stop = LOCAL_STOPS.find((s) => s.code === code);
      if (stop) handleSelectStop(stop);
    },
    [handleSelectStop],
  );

  // ── Use my location ───────────────────────────────────────────────────
  const handleUseMyLocation = useCallback(() => {
    if (!userLocation) return;
    const nearest = LOCAL_STOPS
      .map((stop) => ({
        ...stop,
        distance_m: Math.round(haversineKm(originLat, originLng, stop.lat, stop.lng) * 1000),
      }))
      .sort((a, b) => (a.distance_m ?? 0) - (b.distance_m ?? 0))
      .slice(0, 20);
    setNearbyStops(nearest);
    setQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
    inputRef.current?.blur();
    Keyboard.dismiss();
  }, [userLocation, originLat, originLng]);

  // ── Render helpers ────────────────────────────────────────────────────

  const renderResultItem = useCallback(
    ({ item }: { item: Stop & { distance_m?: number } }) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectStop(item)}
        activeOpacity={0.6}
      >
        <View style={styles.resultIconBox}>
          <MaterialCommunityIcons name="map-marker" size={22} color={colors.brand_blue} />
        </View>
        <View style={styles.resultInfo}>
          <View style={styles.resultNameRow}>
            <Text style={styles.resultName} numberOfLines={1}>
              {item.name_ar}
            </Text>
            {item.code ? (
              <Text style={styles.resultCode}>{item.code}</Text>
            ) : null}
          </View>
          <View style={styles.resultMetaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={12} color={colors.text_tertiary} />
            <Text style={styles.resultMeta}>
              {item.governorate}
              {item.distance_m != null ? ` · ${item.distance_m >= 1000 ? `${(item.distance_m / 1000).toFixed(1)} كم` : `${item.distance_m} م`}` : ''}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons name="chevron-left" size={20} color={colors.text_tertiary} />
      </TouchableOpacity>
    ),
    [handleSelectStop],
  );

  // ── Header placeholder text ───────────────────────────────────────────
  const placeholderText =
    searchMode === 'origin'
      ? 'ابحث عن نقطة الانطلاق...'
      : searchMode === 'destination'
        ? 'ابحث عن الوجهة...'
        : 'ابحث عن محطة أو وجهة...';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header: search bar ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="arrow-right" size={24} color={colors.text_primary} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={colors.text_tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={placeholderText}
            placeholderTextColor={colors.text_tertiary}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            textAlign="right"
            accessibilityLabel="بحث عن محطة"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.text_tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Loading indicator ──────────────────────────────────────────── */}
      {isSearching && query.trim().length > 0 && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.brand_blue} />
          <Text style={styles.loadingText}>جاري البحث...</Text>
        </View>
      )}

      {/* ── Search results / nearby stops ──────────────────────────────── */}
      {(hasQuery && results.length > 0) || showNearby ? (
        <FlatList
          data={displayResults}
          renderItem={renderResultItem}
          keyExtractor={(item: Stop & { distance_m?: number }) => item.id}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            showNearby && nearbyStops.length > 0 ? (
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={colors.text_tertiary} />
                <Text style={styles.sectionTitle}>أقرب المحطات</Text>
              </View>
            ) : null
          }
        />
      ) : null}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {showEmpty && (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color={colors.text_tertiary} />
          <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
          <Text style={styles.emptySub}>&quot;{debouncedQuery}&quot;</Text>
        </View>
      )}

      {/* ── Default view: recents + quick tiles ────────────────────────── */}
      {!hasQuery && !isSearching && !showNearby && (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {/* Use my location */}
              <TouchableOpacity
                style={styles.useLocationBtn}
                onPress={handleUseMyLocation}
                activeOpacity={0.6}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.brand_blue} />
                <Text style={styles.useLocationText}>استخدام موقعي الحالي</Text>
              </TouchableOpacity>

              {/* Recent searches */}
              {recentStops.length > 0 && (
                <View>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="history" size={16} color={colors.text_tertiary} />
                    <Text style={styles.sectionTitle}>بحث الأخير</Text>
                  </View>
                  <View style={styles.recentsList}>
                    {recentStops.slice(0, 5).map((stop) => (
                      <TouchableOpacity
                        key={stop.id}
                        style={styles.recentItemRow}
                        onPress={() => handleSelectStop(stop)}
                        activeOpacity={0.6}
                      >
                        <MaterialCommunityIcons name="map-marker" size={14} color={colors.text_tertiary} />
                        <Text style={styles.recentItemText} numberOfLines={1}>
                          {stop.name_ar}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Quick access tiles */}
              <View style={styles.quickSection}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="star" size={16} color={colors.gold_accent} />
                  <Text style={styles.sectionTitle}>محطات سريعة</Text>
                </View>
                <View style={styles.quickGrid}>
                  {QUICK_TILES.map((tile) => (
                    <TouchableOpacity
                      key={tile.code}
                      style={styles.quickTile}
                      onPress={() => handleQuickTile(tile.code)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.quickIconBox}>
                        <Text style={styles.quickIcon}>{tile.icon}</Text>
                      </View>
                      <Text style={styles.quickLabel} numberOfLines={2}>
                        {tile.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Wrapped export with ErrorBoundary
// ============================================================================
export default function SearchScreen(): React.ReactElement {
  return (
    <ErrorBoundary>
      <SearchScreenContent />
    </ErrorBoundary>
  );
}

// ============================================================================
// Styles
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface_2,
  },

  // ── Header ─────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing[1],
    marginRight: spacing[2],
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface_3,
    borderRadius: radius.input,
    paddingHorizontal: spacing[3],
    height: 42,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize[15],
    color: colors.text_primary,
    fontFamily: fontFamily.arabic.regular,
    paddingVertical: 0,
  },

  // ── Loading ────────────────────────────────────────────────────────────
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[10],
  },
  loadingText: {
    fontSize: fontSize[14],
    color: colors.text_secondary,
    fontFamily: fontFamily.arabic.regular,
    marginTop: spacing[3],
  },

  // ── Results ────────────────────────────────────────────────────────────
  resultsList: {
    paddingBottom: spacing[10],
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface,
  },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface_3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  resultInfo: {
    flex: 1,
  },
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resultName: {
    fontSize: fontSize[15],
    fontWeight: fontWeight.semiBold,
    color: colors.text_primary,
    fontFamily: fontFamily.arabic.regular,
    flexShrink: 1,
  },
  resultCode: {
    fontSize: fontSize[11],
    fontWeight: fontWeight.medium,
    color: colors.text_tertiary,
    fontFamily: fontFamily.latin.regular,
    backgroundColor: colors.surface_3,
    paddingHorizontal: spacing[1],
    paddingVertical: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  resultMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  resultMeta: {
    fontSize: fontSize[13],
    color: colors.text_secondary,
    fontFamily: fontFamily.arabic.regular,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64,
  },

  // ── Empty ──────────────────────────────────────────────────────────────
  emptyTitle: {
    fontSize: fontSize[16],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    fontFamily: fontFamily.arabic.regular,
    marginTop: spacing[4],
  },
  emptySub: {
    fontSize: fontSize[14],
    color: colors.text_secondary,
    fontFamily: fontFamily.arabic.regular,
    marginTop: spacing[1],
  },

  // ── Use location ───────────────────────────────────────────────────────
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  useLocationText: {
    fontSize: fontSize[14],
    fontWeight: fontWeight.medium,
    color: colors.brand_blue,
    fontFamily: fontFamily.arabic.regular,
  },

  // ── Sections ───────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
    gap: spacing[1],
  },
  sectionTitle: {
    fontSize: fontSize[13],
    fontWeight: fontWeight.bold,
    color: colors.text_secondary,
    fontFamily: fontFamily.arabic.regular,
  },
  recentsList: {
    backgroundColor: colors.surface,
    paddingBottom: spacing[1],
  },

  // ── Recent items ───────────────────────────────────────────────────────
  recentItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  recentItemText: {
    fontSize: fontSize[14],
    color: colors.text_primary,
    fontFamily: fontFamily.arabic.regular,
    flex: 1,
  },

  // ── Quick tiles ────────────────────────────────────────────────────────
  quickSection: {
    marginTop: spacing[1],
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[3],
    gap: spacing[2],
  },
  quickTile: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing[3],
  },
  quickIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface_3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIcon: {
    fontSize: 22,
  },
  quickLabel: {
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.text_primary,
    fontFamily: fontFamily.arabic.regular,
    flex: 1,
  },
});
