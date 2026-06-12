"use client";

import { useEffect, useRef, type ReactNode, useCallback } from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: ModalSize;
  /** Show confirm/cancel footer buttons */
  footer?: ReactNode;
  /** Close on Escape key (default true) */
  closeOnEscape?: boolean;
  /** Close on clicking outside (default true) */
  closeOnOutsideClick?: boolean;
}

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
  footer,
  closeOnEscape = true,
  closeOnOutsideClick = true,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Focus trap + Escape handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
      // Basic focus trap: tab loops inside modal
      if (e.key === "Tab" && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose, closeOnEscape]
  );

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element
    requestAnimationFrame(() => {
      const first = contentRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOutsideClick && e.target === overlayRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(7, 11, 24, 0.85)",
        backdropFilter: "blur(4px)",
        padding: "20px",
        animation: "modalFadeIn 0.2s ease-out",
      }}
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || "نافذة"}
        className={SIZE_STYLES[size]}
        style={{
          width: "100%",
          maxHeight: "90vh",
          background: "var(--surface, #111827)",
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          borderRadius: "var(--radius, 16px)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,176,255,0.1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "modalSlideUp 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        {(title || description) && (
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border, rgba(255,255,255,0.08))",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              {title && (
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--text-primary, #F0F4FF)",
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary, #8899BB)",
                    marginTop: 4,
                    margin: 0,
                  }}
                >
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                border: "1px solid var(--border, rgba(255,255,255,0.08))",
                background: "transparent",
                color: "var(--text-secondary, #8899BB)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-2, #1A2235)";
                e.currentTarget.style.color = "var(--text-primary, #F0F4FF)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary, #8899BB)";
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border, rgba(255,255,255,0.08))",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            {footer}
          </div>
        )}
      </div>

    </div>
  );
}

/** Pre-built footer for confirm/cancel forms */
export function ModalFooter({
  onClose,
  onConfirm,
  confirmLabel = "حفظ",
  cancelLabel = "إلغاء",
  loading = false,
  danger = false,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <>
      <button
        onClick={onClose}
        disabled={loading}
        style={{
          padding: "8px 20px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          border: "1px solid var(--border, rgba(255,255,255,0.08))",
          background: "transparent",
          color: "var(--text-secondary, #8899BB)",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        style={{
          padding: "8px 20px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          border: "none",
          background: danger
            ? "var(--danger, #FF4D6A)"
            : "var(--accent, #3BB0FF)",
          color: "white",
          cursor: loading ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          opacity: loading ? 0.7 : 1,
          transition: "all 0.15s",
        }}
      >
        {loading && <Spinner size={14} />}
        {confirmLabel}
      </button>
    </>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        display: "inline-block",
        animation: "spin 0.6s linear infinite",
      }}
    />
  );
}
