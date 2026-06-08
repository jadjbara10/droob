"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   Error Boundary & Error State with Retry
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <InlineError
          message={this.state.error?.message || "حدث خطأ غير متوقع"}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export function InlineError({
  message = "فشل تحميل البيانات",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="error-state">
      <div className="error-state-icon">
        <AlertTriangle size={24} />
      </div>
      <div className="error-state-title">حدث خطأ</div>
      <div className="error-state-message">{message}</div>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={14} />
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = "لا توجد بيانات للعرض" }: { message?: string }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}
