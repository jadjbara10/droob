// ============================================================================
// دروب (Droob) — App Entry Point
// ============================================================================

import React, { useEffect } from 'react';
import { StatusBar, I18nManager, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import { transportConfig } from './src/config/transport.config';

// Force RTL for Arabic UI
I18nManager.forceRTL(true);

export default function App() {
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setTranslucent(true);
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent
          />
          <AppNavigator />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}