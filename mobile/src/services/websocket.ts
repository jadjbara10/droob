import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const WS_URL = Constants.expoConfig?.extra?.API_URL || 'https://api.droob-jo.com';

let socket: Socket | null = null;

export function connectWs(token?: string): Socket {
  if (socket?.connected) return socket;
  socket = io(WS_URL, {
    transports: ['websocket'],
    auth: token ? { token } : {},
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 20,
  });
  return socket;
}

export function disconnectWs() {
  socket?.disconnect();
  socket = null;
}

export function subscribeVehicles(lineCode: string, cb: (data: unknown) => void) {
  const s = connectWs();
  s.emit('subscribe:line', { lineCode });
  s.on(`line:${lineCode}:jo`, cb);
  return () => { s.off(`line:${lineCode}:jo`, cb); s.emit('unsubscribe:line', { lineCode }); };
}

export function subscribeDepartures(stopId: string, cb: (data: unknown) => void) {
  const s = connectWs();
  s.emit('subscribe:stop', { stopId });
  s.on(`stop:${stopId}:arrivals`, cb);
  return () => { s.off(`stop:${stopId}:arrivals`, cb); s.emit('unsubscribe:stop', { stopId }); };
}

export function subscribeAlerts(gov: string, cb: (data: unknown) => void) {
  const s = connectWs();
  s.emit('subscribe:alerts', { governorate: gov });
  s.on(`alerts:${gov}`, cb);
  return () => { s.off(`alerts:${gov}`, cb); };
}