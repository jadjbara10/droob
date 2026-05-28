// ============================================================================
// دروب (Droob) — Alerts Center Page
// Alert Composer (bilingual) | Emergency Broadcast | Sent Alerts Feed
// ============================================================================

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardShell from "@/components/DashboardShell";
import { SeverityBadge } from "@/components/ui/StatusBadge";

// ─── Types ─────────────────────────────────────────────────────────────────

type AlertType = "delay" | "cancellation" | "reroute" | "service_update" | "emergency";
type AlertSeverity = "info" | "warning" | "critical";

interface SentAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  messageAr: string;
  messageEn: string;
  lines: string[];
  sentAt: string;
  sentBy: string;
  recipientCount: number;
  status: "sent" | "scheduled" | "draft";
}

const ALERT_TYPE_CONFIG: Record<AlertType, string> = {
  delay: "تأخير",
  cancellation: "إلغاء",
  reroute: "تحويل مسار",
  service_update: "تحديث خدمة",
  emergency: "طارئ",
};

// ─── Mock Data ─────────────────────────────────────────────────────────────

const AVAILABLE_LINES = [
  "BRT1", "BRT2", "BRT3", "B100", "B200", "B300",
  "B400", "B500", "B600", "B700", "B800", "B900",
];

const SENT_ALERTS: SentAlert[] = [
  {
    id: "ALT-001",
    type: "cancellation",
    severity: "critical",
    messageAr: "إلغاء جميع رحلات خط B300 حتى إشعار آخر بسبب حادث مروري",
    messageEn: "All B300 trips cancelled until further notice due to traffic incident",
    lines: ["B300"],
    sentAt: "قبل ٣٥ دقيقة",
    sentBy: "أحمد محمد",
    recipientCount: 12450,
    status: "sent",
  },
  {
    id: "ALT-002",
    type: "delay",
    severity: "warning",
    messageAr: "تأخير ٢٠ دقيقة على خط BRT2 بسبب ازدحام في شارع الملكة رانيا",
    messageEn: "20 min delay on BRT2 due to congestion on Queen Rania Street",
    lines: ["BRT2"],
    sentAt: "قبل ساعة",
    sentBy: "خالد العلي",
    recipientCount: 8900,
    status: "sent",
  },
  {
    id: "ALT-003",
    type: "service_update",
    severity: "info",
    messageAr: "إضافة مركبات إضافية على خط BRT1 خلال ساعة الذروة المسائية",
    messageEn: "Additional vehicles added to BRT1 during evening peak hour",
    lines: ["BRT1"],
    sentAt: "قبل ساعتين",
    sentBy: "محمود حسن",
    recipientCount: 15000,
    status: "sent",
  },
  {
    id: "ALT-004",
    type: "reroute",
    severity: "warning",
    messageAr: "تحويلة مؤقتة على خط B600 بسبب أعمال صيانة في دوار الواحة",
    messageEn: "Temporary reroute on B600 due to maintenance at Al-Waha Roundabout",
    lines: ["B600"],
    sentAt: "قبل ٤ ساعات",
    sentBy: "عمر عبدالله",
    recipientCount: 3200,
    status: "sent",
  },
];

// ─── Icons ─────────────────────────────────────────────────────────────────

const MegaphoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SendIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22,2 15,22 11,13 2,9" />
  </svg>
);

const ClockIconSmall: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const EyeIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const WarningTriangle: React.FC = () => (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ─── Emergency Broadcast Modal ──────────────────────────────────────────────

const EmergencyBroadcast: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    setCountdown(3);
    setIsCountingDown(false);
    setConfirmed(false);
  };

  const handleStartCountdown = () => {
    setIsCountingDown(true);
    let count = 3;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setConfirmed(true);
      }
    }, 1000);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Big red emergency button */}
      <button
        onClick={handleOpen}
        className="group relative flex flex-col items-center justify-center gap-2 w-[120px] h-[120px] rounded-2xl bg-cancelled/5 border-2 border-cancelled/20 hover:bg-cancelled/10 hover:border-cancelled/40 transition-all cursor-pointer"
      >
        <WarningTriangle />
        <span className="text-xs font-bold text-cancelled">بث طارئ</span>
        <span className="text-[10px] text-cancelled/60">لجميع المستخدمين</span>
        {/* Pulse ring on hover */}
        <div className="absolute inset-0 rounded-2xl border-2 border-cancelled/30 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-[440px] p-8 bg-surface rounded-modal border border-border shadow-xl"
            >
              {!confirmed ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-cancelled/10 flex items-center justify-center">
                      <WarningTriangle />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-text-primary">تأكيد البث الطارئ</h2>
                      <p className="text-sm text-text-secondary">سيتم إرسال التنبيه لجميع المستخدمين</p>
                    </div>
                  </div>

                  <div className="p-4 bg-cancelled/5 border border-cancelled/10 rounded-card mb-6">
                    <p className="text-sm text-text-primary font-medium mb-2">سيؤدي هذا الإجراء إلى:</p>
                    <ul className="space-y-2 text-sm text-text-secondary">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cancelled flex-shrink-0" />
                        <span>إرسال تنبيه فوري إلى <strong className="text-text-primary">12,450 مستخدم</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cancelled flex-shrink-0" />
                        <span>ظهور إشعار عاجل في تطبيق دروب</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cancelled flex-shrink-0" />
                        <span>تسجيل الحدث في سجل الطوارئ</span>
                      </li>
                    </ul>
                  </div>

                  {!isCountingDown ? (
                    <button
                      onClick={handleStartCountdown}
                      className="w-full h-12 rounded-input bg-cancelled text-white font-bold text-sm hover:bg-cancelled/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <SendIcon />
                      بدء البث الطارئ
                    </button>
                  ) : (
                    <div className="text-center">
                      <div className="text-[64px] font-bold tabular-nums text-cancelled leading-none mb-2">
                        {countdown}
                      </div>
                      <p className="text-sm text-text-secondary">جاري البث...</p>
                    </div>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full mt-3 h-10 rounded-input bg-surface-2 text-text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
                  >
                    إلغاء
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-text-primary mb-2">تم البث بنجاح</h2>
                  <p className="text-sm text-text-secondary mb-6">تم إرسال التنبيه الطارئ إلى 12,450 مستخدم</p>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 rounded-input bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 transition-colors"
                  >
                    تم
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── Sent Alert Card ───────────────────────────────────────────────────────

const SentAlertCard: React.FC<{ alert: SentAlert }> = ({ alert }) => (
  <div className="p-4 bg-surface rounded-card border border-border hover:shadow-sm transition-all">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-2">
        <SeverityBadge severity={alert.severity} label={ALERT_TYPE_CONFIG[alert.type]} />
        <span className="text-[11px] text-text-tertiary">{alert.sentAt}</span>
      </div>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-pill font-medium ${
          alert.status === "sent"
            ? "bg-brand-green/10 text-brand-green"
            : alert.status === "scheduled"
              ? "bg-brand-blue/10 text-brand-blue"
              : "bg-text-tertiary/10 text-text-tertiary"
        }`}
      >
        {alert.status === "sent" ? "تم الإرسال" : alert.status === "scheduled" ? "مجدول" : "مسودة"}
      </span>
    </div>

    <p className="text-sm text-text-primary font-medium mb-2">{alert.messageAr}</p>
    <p className="text-xs text-text-tertiary mb-3">{alert.messageEn}</p>

    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {alert.lines.map((line) => (
          <span
            key={line}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 text-text-secondary"
          >
            {line}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        <span>{alert.recipientCount.toLocaleString("ar-JO")} مستلم</span>
        <span>·</span>
        <span>{alert.sentBy}</span>
      </div>
    </div>
  </div>
);

// ─── Page Component ─────────────────────────────────────────────────────────

export default function AlertsCenterPage() {
  const [formData, setFormData] = useState({
    type: "delay" as AlertType,
    severity: "warning" as AlertSeverity,
    selectedLines: [] as string[],
    messageAr: "",
    messageEn: "",
  });

  const [showLineDropdown, setShowLineDropdown] = useState(false);

  const toggleLine = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedLines: prev.selectedLines.includes(code)
        ? prev.selectedLines.filter((l) => l !== code)
        : [...prev.selectedLines, code],
    }));
  };

  const handleSubmit = (action: "send" | "schedule" | "preview") => {
    // In production: API call
    console.log(`Alert action: ${action}`, formData);
  };

  const headerProps = {
    title: "مركز التنبيهات",
    breadcrumb: [
      { label: "الرئيسية", href: "/" },
      { label: "مركز التنبيهات" },
    ],
    actions: (
      <EmergencyBroadcast />
    ),
  };

  return (
    <DashboardShell headerProps={headerProps}>
      <div className="space-y-6">
        {/* ─── Alert Composer ─── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MegaphoneIcon className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="text-lg font-bold text-text-primary">إنشاء تنبيه جديد</h2>
              <p className="text-xs text-text-tertiary mt-0.5">إرسال إشعارات للمستخدمين بالعربية والإنجليزية</p>
            </div>
          </div>

          <div className="bg-surface rounded-card border border-border shadow-sm p-6">
            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Alert Type */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">نوع التنبيه</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as AlertType }))}
                  className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all appearance-none cursor-pointer"
                >
                  {Object.entries(ALERT_TYPE_CONFIG).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">الخطورة</label>
                <div className="flex gap-2">
                  {[
                    { value: "info" as AlertSeverity, label: "معلومة" },
                    { value: "warning" as AlertSeverity, label: "تحذير" },
                    { value: "critical" as AlertSeverity, label: "عاجل" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setFormData((prev) => ({ ...prev, severity: s.value }))}
                      className={`flex-1 h-10 rounded-input text-sm font-medium transition-all ${
                        formData.severity === s.value
                          ? s.value === "info"
                            ? "bg-brand-blue text-white"
                            : s.value === "warning"
                              ? "bg-delayed text-white"
                              : "bg-cancelled text-white"
                          : "bg-surface-2 text-text-secondary border border-border hover:bg-surface-3"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lines selector */}
            <div className="mb-5">
              <label className="block text-xs font-medium text-text-secondary mb-2">الخطوط المتأثرة</label>
              <div className="relative">
                <div
                  className="flex items-center flex-wrap gap-1.5 p-2 min-h-[42px] rounded-input bg-surface-2 border border-border cursor-pointer hover:border-brand-blue/30 transition-colors"
                  onClick={() => setShowLineDropdown(!showLineDropdown)}
                >
                  {formData.selectedLines.length === 0 ? (
                    <span className="text-sm text-text-tertiary px-2">اختر الخطوط...</span>
                  ) : (
                    formData.selectedLines.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-pill bg-brand-blue/10 text-brand-blue text-xs font-bold"
                      >
                        {code}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLine(code);
                          }}
                          className="ml-0.5 hover:text-cancelled transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <AnimatePresence>
                  {showLineDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full mt-1 left-0 right-0 z-10 p-3 bg-surface rounded-card border border-border shadow-lg grid grid-cols-6 gap-1.5"
                    >
                      {AVAILABLE_LINES.map((code) => (
                        <button
                          key={code}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLine(code);
                          }}
                          className={`text-xs font-bold px-2 py-1.5 rounded-input transition-all ${
                            formData.selectedLines.includes(code)
                              ? "bg-brand-blue text-white"
                              : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                          }`}
                        >
                          {code}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  الرسالة <span className="text-text-tertiary">(عربي)</span>
                </label>
                <textarea
                  value={formData.messageAr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, messageAr: e.target.value }))}
                  placeholder="اكتب الرسالة بالعربية..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">
                  Message <span className="text-text-tertiary">(English)</span>
                </label>
                <textarea
                  value={formData.messageEn}
                  onChange={(e) => setFormData((prev) => ({ ...prev, messageEn: e.target.value }))}
                  placeholder="Write message in English..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-input bg-surface-2 border border-border text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all resize-none"
                  style={{ direction: "ltr" }}
                />
              </div>
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">يبدأ</label>
                <input
                  type="datetime-local"
                  className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">ينتهي</label>
                <input
                  type="datetime-local"
                  className="w-full h-10 px-3 rounded-input bg-surface-2 border border-border text-sm text-text-primary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSubmit("send")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-brand-blue text-white text-sm font-bold hover:bg-brand-blue/90 transition-colors"
              >
                <SendIcon />
                إرسال الآن
              </button>
              <button
                onClick={() => handleSubmit("schedule")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-surface-2 border border-border text-text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
              >
                <ClockIconSmall />
                جدولة
              </button>
              <button
                onClick={() => handleSubmit("preview")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-input bg-surface-2 border border-border text-text-secondary text-sm font-medium hover:bg-surface-3 transition-colors"
              >
                <EyeIcon />
                معاينة
              </button>
            </div>
          </div>
        </section>

        {/* ─── Sent Alerts Feed ─── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-text-primary">التنبيهات المرسلة</h2>
              <p className="text-xs text-text-tertiary mt-0.5">سجل آخر التنبيهات المرسلة للمستخدمين</p>
            </div>
            <span className="text-xs text-text-tertiary">آخر ٣٠ يوماً</span>
          </div>

          <div className="space-y-3">
            {SENT_ALERTS.map((alert) => (
              <SentAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}