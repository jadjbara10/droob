// ============================================================================
// دروب (Droob) — useWebSocket Hook Tests
// ============================================================================
import { renderHook, act } from '@testing-library/react-native';
import { useWebSocket } from '@hooks/useWebSocket';

// Mock the WebSocket service
jest.mock('@services/websocket', () => ({
  connectWs: jest.fn(),
  subscribeDepartures: jest.fn(),
  subscribeAlerts: jest.fn(),
  disconnectWs: jest.fn(),
}));

import * as WebSocketService from '@services/websocket';

describe('useWebSocket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Null room → no connection ─────────────────────────────────────
  it('does not connect when room is null', () => {
    const { result } = renderHook(() => useWebSocket(null));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.data).toBeNull();
    expect(WebSocketService.connectWs).not.toHaveBeenCalled();
  });

  // ─── Valid room → subscribe to departures ─────────────────────────
  it('subscribes to departures for valid stop room', () => {
    const mockSocket = {
      connected: true,
      on: jest.fn(),
      off: jest.fn(),
    };
    const mockUnsub = jest.fn();

    (WebSocketService.connectWs as jest.Mock).mockReturnValue(mockSocket);
    (WebSocketService.subscribeDepartures as jest.Mock).mockReturnValue(mockUnsub);

    const { result } = renderHook(() => useWebSocket('stop:abc123:arrivals'));

    expect(WebSocketService.connectWs).toHaveBeenCalled();
    expect(WebSocketService.subscribeDepartures).toHaveBeenCalledWith(
      'abc123',
      expect.any(Function),
    );
    expect(result.current.isConnected).toBe(true);
  });

  // ─── Invalid room format → no subscription ────────────────────────
  it('does not subscribe for invalid room format', () => {
    const { result } = renderHook(() => useWebSocket('invalid_room'));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.data).toBeNull();
    expect(WebSocketService.connectWs).not.toHaveBeenCalled();
  });

  // ─── Receives data updates ────────────────────────────────────────
  it('updates data when departure arrives', () => {
    const mockSocket = {
      connected: true,
      on: jest.fn(),
      off: jest.fn(),
    };
    let departureCallback: (data: any) => void;

    (WebSocketService.connectWs as jest.Mock).mockReturnValue(mockSocket);
    (WebSocketService.subscribeDepartures as jest.Mock).mockImplementation(
      (stopId: string, cb: (data: any) => void) => {
        departureCallback = cb;
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useWebSocket('stop:abc123:arrivals'));

    act(() => {
      departureCallback!({ vehicleId: 'v1', eta: 300 });
    });

    expect(result.current.data).toEqual({ vehicleId: 'v1', eta: 300 });
  });

  // ─── Connection events ────────────────────────────────────────────
  it('updates isConnected on socket events', () => {
    const mockSocket = {
      connected: false,
      on: jest.fn(),
      off: jest.fn(),
    };
    let connectCb: () => void;
    let disconnectCb: () => void;

    (WebSocketService.connectWs as jest.Mock).mockReturnValue(mockSocket);
    (WebSocketService.subscribeDepartures as jest.Mock).mockReturnValue(jest.fn());
    (mockSocket.on as jest.Mock).mockImplementation((event: string, cb: any) => {
      if (event === 'connect') connectCb = cb;
      if (event === 'disconnect') disconnectCb = cb;
    });

    const { result } = renderHook(() => useWebSocket('stop:abc123:arrivals'));

    // Initial state based on socket.connected
    expect(result.current.isConnected).toBe(false);

    // Connect event
    act(() => {
      connectCb!();
    });
    expect(result.current.isConnected).toBe(true);

    // Disconnect event
    act(() => {
      disconnectCb!();
    });
    expect(result.current.isConnected).toBe(false);
  });

  // ─── Cleanup on unmount ───────────────────────────────────────────
  it('cleans up on unmount', () => {
    const mockSocket = {
      connected: true,
      on: jest.fn(),
      off: jest.fn(),
    };
    const mockUnsub = jest.fn();

    (WebSocketService.connectWs as jest.Mock).mockReturnValue(mockSocket);
    (WebSocketService.subscribeDepartures as jest.Mock).mockReturnValue(mockUnsub);

    const { unmount } = renderHook(() => useWebSocket('stop:abc123:arrivals'));
    unmount();

    expect(mockUnsub).toHaveBeenCalled();
    expect(mockSocket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockSocket.off).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  // ─── Reconnect on room change ─────────────────────────────────────
  it('reconnects when room changes', () => {
    const mockSocket = {
      connected: true,
      on: jest.fn(),
      off: jest.fn(),
    };
    const mockUnsub1 = jest.fn();
    const mockUnsub2 = jest.fn();

    (WebSocketService.connectWs as jest.Mock).mockReturnValue(mockSocket);
    (WebSocketService.subscribeDepartures as jest.Mock)
      .mockReturnValueOnce(mockUnsub1)
      .mockReturnValueOnce(mockUnsub2);

    const { rerender } = renderHook(
      ({ room }) => useWebSocket(room),
      { initialProps: { room: 'stop:abc123:arrivals' as string | null } },
    );

    // Change to different room
    rerender({ room: 'stop:def456:arrivals' });

    expect(mockUnsub1).toHaveBeenCalled();
  });
});