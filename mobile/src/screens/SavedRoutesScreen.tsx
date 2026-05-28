// ============================================================================
// دروب (Droob) — Saved Routes Screen (المحفوظات)
// Shows user's saved routes, bookmarked stops, and favorites
// ============================================================================
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SavedRoute {
  id: string;
  name: string;
  nameEn: string;
  type: 'city' | 'brt' | 'serveece' | 'intercity';
  from: string;
  to: string;
  duration: number;   // minutes
  lastUsed: string;    // ISO date
  isFavorite: boolean;
}

interface SavedStop {
  id: string;
  name: string;
  nameEn: string;
  routes: string[];   // Route codes serving this stop
  distance: number;    // meters
}

// ─── Seed data (would come from API / local storage) ─────────────────────────
const MOCK_SAVED_ROUTES: SavedRoute[] = [
  {
    id: 'sr1', name: 'الباص السريع — خط صويلح', nameEn: 'BRT — Sweileh Line',
    type: 'brt', from: 'العبدلي', to: 'صويلح', duration: 35, lastUsed: '2026-05-24T08:15:00Z',
    isFavorite: true,
  },
  {
    id: 'sr2', name: 'باص وسط البلد — صويلح', nameEn: 'Downtown — Sweileh Bus',
    type: 'city', from: 'البلد', to: 'صويلح', duration: 45, lastUsed: '2026-05-23T17:30:00Z',
    isFavorite: true,
  },
  {
    id: 'sr3', name: 'سرفيس — دوار الداخلية', nameEn: 'Serveece — Interior Circle',
    type: 'serveece', from: 'العبدلي', to: 'دوار الداخلية', duration: 20, lastUsed: '2026-05-22T12:00:00Z',
    isFavorite: false,
  },
  {
    id: 'sr4', name: 'بين المدن — إربد', nameEn: 'Inter-city — Irbid',
    type: 'intercity', from: 'مجمع الوحدات', to: 'إربد', duration: 90, lastUsed: '2026-05-20T06:45:00Z',
    isFavorite: false,
  },
];

const MOCK_SAVED_STOPS: SavedStop[] = [
  { id: 'ss1', name: 'دوار الداخلية', nameEn: 'Interior Circle', routes: ['BRT1', '2', '5', '23'], distance: 120 },
  { id: 'ss2', name: 'الجامعة الأردنية', nameEn: 'University of Jordan', routes: ['BRT1', '35'], distance: 350 },
  { id: 'ss3', name: 'مجمع الجاردنز', nameEn: 'Gardens Complex', routes: ['2', '23', '35'], distance: 200 },
];

// ─── Route type color & icon helpers ─────────────────────────────────────────
function getTypeConfig(type: SavedRoute['type']) {
  switch (type) {
    case 'city': return { color: COLORS.cityBus, label: 'باص مدني', icon: 'bus' as const };
    case 'brt': return { color: COLORS.brt, label: 'باص سريع', icon: 'bus-articulated' as const };
    case 'serveece': return { color: COLORS.serveece, label: 'سرفيس', icon: 'bus-side' as const };
    case 'intercity': return { color: COLORS.intercity, label: 'بين مدني', icon: 'bus-multiple' as const };
  }
}

function formatLastUsed(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (hours < 1) return 'الآن';
  if (hours < 24) return `قبل ${hours} ساعات`;
  if (days === 1) return 'أمس';
  return `قبل ${days} أيام`;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function SavedRoutesScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'routes' | 'stops'>('routes');
  const [refreshing, setRefreshing] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState(MOCK_SAVED_ROUTES);
  const [savedStops, setSavedStops] = useState(MOCK_SAVED_STOPS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setSavedRoutes(prev => prev.map(r =>
      r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
    ));
  }, []);

  // ─── Render route item ─────────────────────────────────────────────────
  const renderRoute = useCallback(({ item }: { item: SavedRoute }) => {
    const tc = getTypeConfig(item.type);
    return (
      <TouchableOpacity
        style={styles.routeCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('JourneyDetail' as never, { journeyId: item.id } as never)}
      >
        {/* Type stripe */}
        <View style={[styles.typeStripe, { backgroundColor: tc.color }]} />

        <View style={styles.routeContent}>
          {/* Header row */}
          <View style={styles.routeHeader}>
            <View style={styles.routeTitleRow}>
              <MaterialCommunityIcons name={tc.icon} size={18} color={tc.color} />
              <Text style={[styles.routeTypeLabel, { color: tc.color }]}>{tc.label}</Text>
            </View>
            <TouchableOpacity onPress={() => toggleFavorite(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons
                name={item.isFavorite ? 'star' : 'star-outline'}
                size={22}
                color={item.isFavorite ? '#F59E0B' : COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Route name */}
          <Text style={styles.routeName} numberOfLines={1}>{item.name}</Text>

          {/* From → To */}
          <View style={styles.fromToRow}>
            <Text style={styles.fromToText}>{item.from}</Text>
            <MaterialCommunityIcons name="arrow-left" size={14} color={COLORS.textSecondary} />
            <Text style={styles.fromToText}>{item.to}</Text>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{item.duration} دق</Text>
            </View>
            <Text style={styles.lastUsedText}>{formatLastUsed(item.lastUsed)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [navigation, toggleFavorite]);

  // ─── Render stop item ──────────────────────────────────────────────────
  const renderStop = useCallback(({ item }: { item: SavedStop }) => (
    <TouchableOpacity
      style={styles.stopCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('StopDetail' as never, { stopId: item.id, stopName: item.name } as never)}
    >
      <View style={styles.stopIcon}>
        <MaterialCommunityIcons name="bus-stop-covered" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.stopContent}>
        <Text style={styles.stopName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.stopMetaRow}>
          <View style={styles.stopRoutes}>
            {item.routes.slice(0, 4).map((code, i) => (
              <View key={i} style={styles.routeBadge}>
                <Text style={styles.routeBadgeText}>{code}</Text>
              </View>
            ))}
            {item.routes.length > 4 && (
              <Text style={styles.moreRoutesText}>+{item.routes.length - 4}</Text>
            )}
          </View>
          <Text style={styles.distanceText}>{item.distance}م</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-left" size={20} color={COLORS.textSecondary} />
    </TouchableOpacity>
  ), [navigation]);

  // ─── Empty states ──────────────────────────────────────────────────────
  const EmptyRoutes = useMemo(() => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bookmark-outline" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>لا توجد مسارات محفوظة</Text>
      <Text style={styles.emptySubtitle}>
        احفظ مساراتك المفضلة للوصول السريع
      </Text>
    </View>
  ), []);

  const EmptyStops = useMemo(() => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="bus-stop-uncovered" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>لا توجد محطات محفوظة</Text>
      <Text style={styles.emptySubtitle}>
        احفظ محطاتك المفضلة لمراقبة مواعيد المغادرة
      </Text>
    </View>
  ), []);

  // ─── Main Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المحفوظات</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'routes' && styles.tabActive]}
          onPress={() => setActiveTab('routes')}
        >
          <MaterialCommunityIcons
            name="routes"
            size={18}
            color={activeTab === 'routes' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'routes' && styles.tabTextActive]}>
            المسارات
          </Text>
          {savedRoutes.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{savedRoutes.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'stops' && styles.tabActive]}
          onPress={() => setActiveTab('stops')}
        >
          <MaterialCommunityIcons
            name="bus-stop-covered"
            size={18}
            color={activeTab === 'stops' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'stops' && styles.tabTextActive]}>
            المحطات
          </Text>
          {savedStops.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{savedStops.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'routes' ? (
        <FlatList
          data={savedRoutes}
          keyExtractor={item => item.id}
          renderItem={renderRoute}
          contentContainerStyle={savedRoutes.length === 0 ? { flex: 1 } : styles.listContent}
          ListEmptyComponent={EmptyRoutes}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={savedStops}
          keyExtractor={item => item.id}
          renderItem={renderStop}
          contentContainerStyle={savedStops.length === 0 ? { flex: 1 } : styles.listContent}
          ListEmptyComponent={EmptyStops}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'System',
  },
  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  // Route Card
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  typeStripe: { width: 4 },
  routeContent: { flex: 1, padding: 14, gap: 6 },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeTypeLabel: { fontSize: 11, fontWeight: '700' },
  routeName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  fromToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fromToText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  lastUsedText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Stop Card
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  stopIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopContent: { flex: 1, gap: 4 },
  stopName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  stopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopRoutes: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  routeBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  routeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  moreRoutesText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    alignSelf: 'center',
  },
  distanceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});