// ============================================================================
// دروب (Droob) — MapScreen placeholder (Mapbox removed for now)
// ============================================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight } from '@theme/tokens';

export default function MapScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>الخريطة</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface_2, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: 'IBM Plex Sans Arabic', fontSize: fontSize[18], fontWeight: fontWeight.medium, color: colors.text_tertiary },
});
