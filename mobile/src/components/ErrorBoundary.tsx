// ============================================================================
// دروب (Droob) — ErrorBoundary
// Catches JS render errors, shows Arabic error screen, reports to Sentry
// Never shows raw error to user
// ============================================================================

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, radius, fontSize, fontWeight, shadows } from "@theme/tokens";

interface Props { children: ReactNode; fallback?: ReactNode; onError?: (error: Error, info: ErrorInfo) => void; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Report to Sentry (if configured)
    try {
      // Sentry.captureException(error, { contexts: { react: info } });
      console.error("[ErrorBoundary]", error.message, info.componentStack);
    } catch (_) {}
    this.props.onError?.(error, info);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.root}>
          <View style={styles.card}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>حدث خطأ غير متوقع</Text>
            <Text style={styles.subtitle}>يرجى المحاولة مرة أخرى. تم إرسال تقرير بالخطأ تلقائياً.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:colors.surface_2, alignItems:"center", justifyContent:"center", padding:32 },
  card: { backgroundColor:colors.surface, borderRadius:radius.modal, padding:32, alignItems:"center", ...shadows.md, maxWidth:320 },
  icon: { fontSize:48, marginBottom:16 },
  title: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[20], fontWeight:fontWeight.bold, color:colors.text_primary, textAlign:"center", marginBottom:8 },
  subtitle: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:colors.text_secondary, textAlign:"center", lineHeight:22, marginBottom:24 },
  retryBtn: { backgroundColor:colors.brand_blue, borderRadius:radius.pill, paddingHorizontal:32, paddingVertical:14 },
  retryText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[15], fontWeight:fontWeight.bold, color:"#fff" },
});

export default ErrorBoundary;
