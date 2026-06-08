// ============================================================================
// دروب (Droob) — App Entry Point
// Bilingual (Ar/En), dynamic RTL, i18next integration
// ============================================================================

import React, { useEffect } from 'react';
import { StatusBar, I18nManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@components/ErrorBoundary';
import AppNavigator from './src/navigation/AppNavigator';
import './src/i18n/index';

// Set initial RTL based on stored preference (default: Arabic)
const storedLang = 'ar'; // Will be read from MMKV store on mount
I18nManager.allowRTL(true);
I18nManager.forceRTL(storedLang === 'ar');

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
