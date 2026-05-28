// ============================================================================
// دروب (Droob) — LeafletMap via WebView (free OpenStreetMap, no tokens)
// Professional map with markers, popups, animated center/zoom
// ============================================================================

import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";

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
<style>*{margin:0;padding:0}html,body{width:100%;height:100%}#map{width:100%;height:100%}</style>
</head><body><div id="map"></div><script>
var map=L.map('map',{zoomControl:false,attributionControl:false}).setView([${centerLat},${centerLng}],${zoom});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
${markerJS}
window.addEventListener('message',function(e){var d=JSON.parse(e.data);if(d.action==='flyTo')map.flyTo([d.lat,d.lng],d.zoom||14,{duration:0.8})});
</script></body></html>`;
}

export const LeafletMap = forwardRef<LeafletMapRef, Props>(({ style, centerLat=31.9539, centerLng=35.9106, zoom=13, markers }, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lng, lat, z=14) => {
      webViewRef.current?.postMessage(JSON.stringify({ action: "flyTo", lat, lng, zoom: z }));
    },
    addMarker: () => {},
    clearMarkers: () => {},
  }));

  const html = buildHTML(centerLat, centerLng, zoom, markers);

  return (
    <WebView
      ref={webViewRef}
      style={[styles.map, style]}
      source={{ html }}
      scrollEnabled={false}
      zoomEnabled={false}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      geolocationEnabled={false}
      cacheEnabled={true}
      androidLayerType="hardware"
    />
  );
});

LeafletMap.displayName = "LeafletMap";

const styles = StyleSheet.create({ map: { flex: 1 } });
export default LeafletMap;
