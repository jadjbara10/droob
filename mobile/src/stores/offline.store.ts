// ============================================================================
// دروب (Droob) — Offline Store
// Manages pending operations queue for offline→online sync, connectivity state.
// ============================================================================

import NetInfo from '@react-native-community/netinfo';
import { getPendingActions } from '../services/offline-cache';

interface PendingOperation {
  id: string;
  type: 'bookmark' | 'report' | 'feedback';
  payload: Record<string, unknown>;
  timestamp: number;
}

class OfflineStore {
  private pending: PendingOperation[] = [];
  private _isOnline = true;
  private _lastSyncTime: number | null = null;
  private unsubscribeNetInfo: (() => void) | null = null;

  constructor() {
    this.initNetListener();
  }

  private initNetListener(): void {
    // Fetch initial state
    NetInfo.fetch().then((state) => {
      this._isOnline = state.isConnected === true && state.isInternetReachable !== false;
    });

    // Listen for changes
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const wasOffline = !this._isOnline;
      this._isOnline = state.isConnected === true && state.isInternetReachable !== false;
      if (wasOffline && this._isOnline) {
        this._lastSyncTime = Date.now();
      }
    });
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  get lastSyncTime(): number | null {
    return this._lastSyncTime;
  }

  get pendingActions(): number {
    return getPendingActions().length + this.pending.length;
  }

  /** Queue an operation to be synced when back online */
  addPending(op: Omit<PendingOperation, 'id' | 'timestamp'>): void {
    this.pending.push({
      ...op,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    });
  }

  /** Sync all pending operations with the backend */
  async syncPending(): Promise<void> {
    if (this.pending.length === 0) return;

    const ops = [...this.pending];
    this.pending = [];

    for (const op of ops) {
      try {
        // In production, would POST to API
        console.log(`[Offline] Syncing ${op.type}:`, op.payload);
      } catch {
        // Re-queue failed operations
        this.pending.push(op);
      }
    }

    this._lastSyncTime = Date.now();
  }

  get pendingCount(): number {
    return this.pending.length;
  }

  /** Cleanup NetInfo listener */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }
}

export const offlineStorage = new OfflineStore();
