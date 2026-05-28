// ============================================================================
// دروب (Droob) — useNetworkStatus Hook Tests
// ============================================================================
import { renderHook, act } from '@testing-library/react-native';
import useNetworkStatus from '@hooks/useNetworkStatus';
import NetInfo from '@react-native-community/netinfo';

// NetInfo is mocked in setup.ts; override per-test as needed
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// Mock the offline store dependency
jest.mock('@stores/offline.store', () => ({
  offlineStorage: {
    syncPending: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('useNetworkStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial connected state', () => {
    const { result } = renderHook(() => useNetworkStatus());

    // Default initial state before NetInfo.fetch resolves
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
    expect(result.current.connectionType).toBe('unknown');
    expect(result.current.lastChecked).toBeInstanceOf(Date);
  });

  it('updates state when network connects', async () => {
    let listener: (state: any) => void;

    (mockNetInfo.addEventListener as jest.Mock).mockImplementation((cb: any) => {
      listener = cb;
      return () => {};
    });
    (mockNetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Wait for fetch to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // Simulate network connect
    act(() => {
      listener!({ isConnected: true, isInternetReachable: true, type: 'cellular' });
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isInternetReachable).toBe(true);
    expect(result.current.connectionType).toBe('cellular');
  });

  it('updates state when network disconnects', async () => {
    let listener: (state: any) => void;

    (mockNetInfo.addEventListener as jest.Mock).mockImplementation((cb: any) => {
      listener = cb;
      return () => {};
    });

    const { result } = renderHook(() => useNetworkStatus());

    // Simulate network offline
    act(() => {
      listener!({ isConnected: false, isInternetReachable: false, type: 'none' });
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isInternetReachable).toBe(false);
    expect(result.current.connectionType).toBe('none');
  });

  it('cleans up listener on unmount', () => {
    const unsubscribe = jest.fn();
    (mockNetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('has connectionType property', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(typeof result.current.connectionType).toBe('string');
  });

  it('has lastChecked timestamp', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.lastChecked).toBeInstanceOf(Date);
  });
});