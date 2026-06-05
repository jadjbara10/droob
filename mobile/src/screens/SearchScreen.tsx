// ============================================================================
// دروب (Droob) — Search Screen
// Uber-quality stop/place search with real API, MMKV recents, quick tiles
// ============================================================================
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, Keyboard, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { colors, spacing, radius, fontFamily, fontSize, fontWeight } from '@theme/tokens';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AMMAN_CENTER } from '../config/transport.config';
import { stopsApi } from '@/services/api-client';
import { saveRecentStop, getRecentStops } from '@/services/storage';
import type { Stop, Governorate } from '../types/transit.types';

// ============================================================================
// MMKV storage for recent stops (via shared storage service)
// ============================================================================
const MAX_RECENTS = 10;

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
  const [results, setResults] = useState<Stop[]>([]);
  const [recentStops, setRecentStops] = useState<Stop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Load recents on mount ─────────────────────────────────────────────
  useEffect(() => {
    setRecentStops(getRecentStops() as unknown as Stop[]);
  }, []);

  // ── Debounced API search (300 ms) ─────────────────────────────────────
  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    stopsApi.list({ q: debouncedQuery.trim() })
      .then((response: any) => {
        if (cancelled) return;
        const data = response?.data ?? (Array.isArray(response) ? response : []);
        setResults(data as Stop[]);
        setIsSearching(false);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.message || 'حدث خطأ أثناء البحث');
        setResults([]);
        setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // ── Debounced search handler ──────────────────────────────────────────
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
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
    setResults([]);
    setError(null);
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  // ── Select a stop ─────────────────────────────────────────────────────
  const handleSelectStop = useCallback(
    (stop: Stop) => {
      // Persist to recents via shared storage service
      saveRecentStop(stop as any);
      const updated = [stop, ...recentStops.filter((s) => s.id !== stop.id)].slice(0, MAX_RECENTS);
      setRecentStops(updated);

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

  // ── Render helpers ────────────────────────────────────────────────────

  const renderResultItem = useCallback(
    ({ item }: { item: Stop }) => (
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

  const hasQuery = query.trim().length > 0;
  const showEmpty = hasSearched && !isSearching && results.length === 0 && !error;
  const showError = hasSearched && error && !isSearching;

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
      {isSearching && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.brand_blue} />
          <Text style={styles.loadingText}>جاري البحث...</Text>
        </View>
      )}

      {/* ── Error state ────────────────────────────────────────────────── */}
      {showError && (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.cancelled} />
          <Text style={styles.emptyTitle}>حدث خطأ</Text>
          <Text style={styles.emptySub}>{error}</Text>
        </View>
      )}

      {/* ── Search results ─────────────────────────────────────────────── */}
      {!isSearching && results.length > 0 && (
        <FlatList
          data={results}
          renderItem={renderResultItem}
          keyExtractor={(item: Stop) => item.id}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {showEmpty && (
        <View style={styles.centerBox}>
          <MaterialCommunityIcons name="map-marker-off" size={48} color={colors.text_tertiary} />
          <Text style={styles.emptyTitle}>لا توجد نتائج</Text>
          <Text style={styles.emptySub}>&quot;{debouncedQuery}&quot;</Text>
        </View>
      )}

      {/* ── Default view: recents + quick tiles ────────────────────────── */}
      {!hasQuery && !isSearching && (
        <FlatList
          data={[]}
          renderItem={() => null}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
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
});
