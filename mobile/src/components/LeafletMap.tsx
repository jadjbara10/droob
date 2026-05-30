// ============================================================================
// دروب (Droob) — LeafletMap via WebView (free OpenStreetMap, no tokens)
// Professional map with markers, popups, animated center/zoom
// ============================================================================

import React, { useRef, useCallback, useImperativeHandle, forwardRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "@theme/tokens";

export interface LeafletMapRef {
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  addMarker: (id: string, lng: number, lat: number, label: string, color?: string) => void;
  clearMarkers: () => void;
}

interface Props {
  style?: any;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  markers?: Array<{ id: string; lat: number; lng: number; label: string; color?: string }>;
}

function buildHTML(centerLat: number, centerLng: number, zoom: number, markers: Props["markers"]): string {
  const markerJS = (markers || []).map(m =>
    `L.circleMarker([${m.lat},${m.lng}],{radius:8,fillColor:'${m.color||"#1A4F8A"}',color:'#fff',weight:2,fillOpacity:0.9}).bindPopup('${m.label}').addTo(map);`
  ).join("\n");

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>*{margin:0;padding:0}html,body{width:100%;height:100%;background:#F8F9FA}#map{width:100%;height:100%}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${centerLat},${centerLng}],${zoom});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${markerJS}
window.addEventListener('message',function(e){var d=JSON.parse(e.data);if(d.action==='flyTo')map.flyTo([d.lat,d.lng],d.zoom||14,{duration:0.8})});
</script></body></html>`;
}

export const LeafletMap = forwardRef<LeafletMapRef, Props>(({ style, centerLat=31.9539, centerLng=35.9106, zoom=13, markers }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, z=14) => {
      webViewRef.current?.postMessage(JSON.stringify({ action: "flyTo", lat, lng, zoom: z }));
    },
    addMarker: () => {},
    clearMarkers: () => {},
  }));

  const html = buildHTML(centerLat, centerLng, zoom, markers);

  return (
    <View style={[styles.container, style]}>
      {isLoading && !hasError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.brand_blue} />
          <Text style={styles.loadingText}>جاري تحميل الخريطة...</Text>
        </View>
      )}
      {hasError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorIcon}>🗺️</Text>
          <Text style={styles.errorText}>تعذر تحميل الخريطة</Text>
          <Text style={styles.errorHint}>تحقق من اتصالك بالإنترنت</Text>
        </View>
      ) : (
        <WebView
          ref={webViewRef}
          style={styles.map}
          source={{ html }}
          scrollEnabled={false}
          setBuiltInZoomControls={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          geolocationEnabled={false}
          cacheEnabled={true}
          androidLayerType="hardware"
          onLoadEnd={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true); }}
          renderError={() => { setIsLoading(false); setHasError(true); return <View />; }}
          startInLoadingState={false}
        />
      )}
    </View>
  );
});

LeafletMap.displayName = "LeafletMap";

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface_2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  loadingText: {
    marginTop: 12,
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: 14,
    color: colors.text_secondary,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface_2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: 18,
    fontWeight: "700",
    color: colors.text_primary,
    marginBottom: 6,
  },
  errorHint: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: 14,
    color: colors.text_tertiary,
  },
});

export default LeafletMap;
