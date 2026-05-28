// ============================================================================
// دروب (Droob) — Offline Store
// Manages pending operations queue for offline→online sync
// ============================================================================

interface PendingOperation {
  id: string;
  type: 'bookmark' | 'report' | 'feedback';
  payload: Record<string, unknown>;
  timestamp: number;
}

class OfflineStore {
  private pending: PendingOperation[] = [];

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
  }

  get pendingCount(): number {
    return this.pending.length;
  }
}

export const offlineStorage = new OfflineStore();