// ============================================================================
// دروب (Droob) — Network Status Hook
// Monitors connectivity via @react-native-community/netinfo
// Integrates with offline storage to serve cached data when disconnected
// ============================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineStorage } from '../stores/offline.store';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string;
  lastChecked: Date;
}

export default function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
    lastChecked: new Date(),
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const wasOffline = useRef(false);

  const handleNetworkChange = useCallback((state: NetInfoState) => {
    const isConnected = !!(state.isConnected);
    const isInternetReachable = state.isInternetReachable;

    setStatus({
      isConnected,
      isInternetReachable,
      connectionType: state.type,
      lastChecked: new Date(),
    });

    // ─── Offline → Online transition: sync pending data ────────────────
    if (wasOffline.current && isConnected && isInternetReachable) {
      console.log('[Network] Back online — syncing pending operations...');
      offlineStorage.syncPending().catch((err: Error) => {
        console.warn('[Network] Sync failed:', err);
      });
      wasOffline.current = false;
    }

    // Track offline state for transition detection
    if (!isConnected || isInternetReachable === false) {
      wasOffline.current = true;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then(handleNetworkChange).catch(() => {
      setStatus((s) => ({ ...s, isConnected: false }));
    });

    // Subscribe to changes
    unsubscribeRef.current = NetInfo.addEventListener(handleNetworkChange);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [handleNetworkChange]);

  return status;
}