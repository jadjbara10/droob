// ============================================================================
// دروب (Droob) — Search Screen
// Autocomplete stop finder with Arabic search, recent stops, quick access
// ============================================================================
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Keyboard, I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { Stop, TransportMode, TransitRoute } from '../types/transit.types';
import { COLORS, TRANSPORT_MODES, QUICK_ACCESS_STOPS } from '../config/transport.config';
import TransportIcon from '../components/TransportIcon';

// Named quick-access tiles
const QUICK_TILES = [
  { name_ar: 'الجامعة الأردنية', name_en: 'University of Jordan', lat: 32.015, lng: 35.871 },
  { name_ar: 'وسط البلد', name_en: 'Downtown', lat: 31.950, lng: 35.935 },
  { name_ar: 'مطار الملكة علياء', name_en: 'QAI Airport', lat: 31.723, lng: 35.993 },
  { name_ar: 'العبدلي', name_en: 'Abdali', lat: 31.960, lng: 35.910 },
  { name_ar: 'مجمع الجاردنز', name_en: 'Gardens', lat: 31.985, lng: 35.865 },
  { name_ar: 'الصويلح', name_en: 'Sweileh', lat: 32.035, lng: 35.846 },
  { name_ar: 'الرابع', name_en: '4th Circle', lat: 31.958, lng: 35.880 },
  { name_ar: 'دوار الداخلية', name_en: 'Interior Circle', lat: 31.964, lng: 35.900 },
];

type SearchRouteParams = {
  mode: 'origin' | 'destination' | 'general';
  onSelect?: string; // not used via route, callback via params
};

type ScreenRouteProp = RouteProp<{ Search: SearchRouteParams }, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation();
  const route = useRoute<ScreenRouteProp>();
  const searchMode = route.params?.mode || 'general';
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentStops, setRecentStops] = useState<Stop[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent stops on mount
  useEffect(() => {
    (async () => {
      try {
        const recent = await apiClient.getRecentStops();
        setRecentStops(recent || []);
      } catch { /* no-op */ }
    })();
  }, []);

  // Debounce input
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 300);
  }, []);

  // Search query
  const {
    data: searchResults,
    isLoading,
    isError,
  } = useQuery<Stop[]>({
    queryKey: ['stops', 'search', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const res = await apiClient.searchStops(debouncedQuery);
      return res.data ?? res;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const hasResults = debouncedQuery.length >= 2;
  const results = searchResults || [];

  // Select a stop
  const handleSelectStop = useCallback(async (stop: Stop) => {
    // Save to recents
    try { await apiClient.saveRecentStop(stop._id || stop.id || '0'); } catch { /* no-op */ }
    Keyboard.dismiss();
    // Navigate back with the selected stop
    navigation.goBack();
    // Use route params to pass back — handled by screen that pushed this
    setTimeout(() => {
      // @ts-ignore
      navigation.navigate('Map', {
        screen: 'MapMain',
        params: {
          selectedStop: stop,
          action: searchMode === 'origin' ? 'setOrigin' : searchMode === 'destination' ? 'setDestination' : 'viewStop',
        },
        merge: true,
      });
    }, 100);
  }, [navigation, searchMode]);

  // Handle quick tile press
  const handleQuickTile = useCallback((tile: typeof QUICK_TILES[0]) => {
    const stop: Stop = {
      _id: '',
      id: '',
      name_ar: tile.name_ar,
      name_en: tile.name_en,
      location: { type: 'Point', coordinates: [tile.lng, tile.lat] },
      modes: ['city_bus'],
      amenities: [],
      active: true,
    };
    handleSelectStop(stop);
  }, [handleSelectStop]);

  // Render item
  const renderStopItem = useCallback(({ item }: { item: Stop }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectStop(item)}>
      <View style={styles.resultIcon}>
        <MaterialCommunityIcons name="map-marker" size={22} color={COLORS.primary} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.name_ar}
        </Text>
        <Text style={styles.resultEn} numberOfLines={1}>
          {item.name_en}
        </Text>
        {item.modes && item.modes.length > 0 && (
          <View style={styles.modeRow}>
            {item.modes.slice(0, 3).map((m, i) => (
              <Text key={i} style={styles.modeTag}>
                {TRANSPORT_MODES[m]?.label_ar || m}
              </Text>
            ))}
          </View>
        )}
      </View>
      <MaterialCommunityIcons name="chevron-left" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  ), [handleSelectStop]);

  const renderRecentItem = useCallback(({ item }: { item: Stop }) => (
    <TouchableOpacity style={styles.recentItem} onPress={() => handleSelectStop(item)}>
      <MaterialCommunityIcons name="history" size={16} color={COLORS.textSecondary} />
      <Text style={styles.recentName} numberOfLines={1}>{item.name_ar}</Text>
    </TouchableOpacity>
  ), [handleSelectStop]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-right" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={searchMode === 'origin' ? 'نقطة الانطلاق...' : searchMode === 'destination' ? 'الوجهة...' : 'ابحث عن محطة...'}
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            textAlign={I18nManager.isRTL ? 'right' : 'left'}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setDebouncedQuery(''); }}>
              <MaterialCommunityIcons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Loading ────────────────────────────────────────────────── */}
      {isLoading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.centerText}>جاري البحث...</Text>
        </View>
      )}

      {/* ─── Results ────────────────────────────────────────────────── */}
      {hasResults && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderStopItem}
          keyExtractor={(item) => item._id || item.id || String(item.location?.coordinates?.join(','))}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* ─── No results ─────────────────────────────────────────────── */}
      {hasResults && results.length === 0 && !isLoading && (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color={COLORS.textSecondary} />
          <Text style={styles.centerText}>لا توجد نتائج لـ</Text>
          <Text style={styles.centerQuery}>"{debouncedQuery}"</Text>
        </View>
      )}

      {/* ─── Empty state: Quick tiles + Recents ────────────────────── */}
      {!hasResults && (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {/* Quick access tiles */}
              <Text style={styles.sectionTitle}>وجهات سريعة</Text>
              <View style={styles.quickGrid}>
                {QUICK_TILES.map((tile, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.quickTile}
                    onPress={() => handleQuickTile(tile)}
                  >
                    <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.primary} />
                    <Text style={styles.quickTileText} numberOfLines={2}>{tile.name_ar}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Recent stops */}
              {recentStops.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>آخر المحطات</Text>
                  {recentStops.slice(0, 6).map((stop, i) => (
                    <TouchableOpacity key={i} style={styles.recentItem} onPress={() => handleSelectStop(stop)}>
                      <MaterialCommunityIcons name="history" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.recentName} numberOfLines={1}>{stop.name_ar}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 4,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontFamily: 'IBM Plex Sans Arabic',
    textAlign: 'right',
    paddingVertical: 0,
  },
  // Results
  list: {
    paddingBottom: 40,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  resultEn: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modeRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  modeTag: {
    fontSize: 10,
    color: COLORS.textSecondary,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
  // Empty / No results
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  centerText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 12,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  centerQuery: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 4,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // Sections
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'IBM Plex Sans Arabic',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  quickTile: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  quickTileText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: 'IBM Plex Sans Arabic',
    lineHeight: 16,
  },
  // Recents
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  recentName: {
    fontSize: 13,
    color: COLORS.text,
    fontFamily: 'IBM Plex Sans Arabic',
  },
});