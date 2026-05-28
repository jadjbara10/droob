// ============================================================================
// دروب (Droob) — WebSocket Hook
// Manages subscription to vehicle/stop/alert rooms via Socket.io
// ============================================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { connectWs, subscribeDepartures, subscribeAlerts, disconnectWs } from '../services/websocket';

interface WsState {
  data: any | null;
  isConnected: boolean;
}

/**
 * useWebSocket — subscribes to a Socket.io room (e.g. "stop:abc:arrivals")
 * and returns latest data + connection status.
 *
 * Pass `null` to disable (no subscription).
 */
export function useWebSocket(room: string | null): WsState {
  const [state, setState] = useState<WsState>({ data: null, isConnected: false });
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!room) {
      // No room → disconnect and reset
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      setState({ data: null, isConnected: false });
      return;
    }

    // Parse room: "stop:{stopId}:arrivals"
    const match = room.match(/^stop:(.+):arrivals$/);
    if (match) {
      const stopId = match[1];

      try {
        const socket = connectWs();
        setState(prev => ({ ...prev, isConnected: socket.connected }));

        // Connection status listener
        const onConnect = () => setState(prev => ({ ...prev, isConnected: true }));
        const onDisconnect = () => setState(prev => ({ ...prev, isConnected: false }));
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Subscribe to departures
        const unsub = subscribeDepartures(stopId, (data) => {
          setState(prev => ({ ...prev, data }));
        });

        cleanupRef.current = () => {
          unsub();
          socket.off('connect', onConnect);
          socket.off('disconnect', onDisconnect);
        };
      } catch {
        setState({ data: null, isConnected: false });
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [room]);

  return state;
}

export default useWebSocket;