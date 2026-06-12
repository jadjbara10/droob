"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Settings Page (super_admin only)
   System config · DB stats · API usage · Ads · Geo · Backup · Audit log
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useState } from "react";
import { RefreshCw, Server, Globe, Clock, Shield, Database, MapPin, DollarSign, Cpu, Download, FileText, History, Save, AlertTriangle } from "lucide-react";
import { InlineError } from "@/components/error-boundary";
import { TableSkeleton } from "@/components/skeleton";
import { Panel } from "@/components/panel";
import { KpiCard } from "@/components/kpi-card";
import { adminApi, adsApi, adminExtendedApi, type ActivityRecord } from "@/lib/api";
import { formatRelativeTime, entityTypeLabels, actionLabels } from "@/lib/utils";

export default function SettingsPage() {
  const [sysHealth, setSysHealth] = useState<any>(null);
  const [sysHealthErr, setSysHealthErr] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbStatsErr, setDbStatsErr] = useState(false);
  const [apiUsage, setApiUsage] = useState<any>(null);
  const [apiUsageErr, setApiUsageErr] = useState(false);
  const [geoStats, setGeoStats] = useState<any>(null);
  const [geoStatsErr, setGeoStatsErr] = useState(false);
  const [adsStats, setAdsStats] = useState<any>(null);
  const [adsStatsErr, setAdsStatsErr] = useState(false);
  const [loading, setLoading] = useState(true);

  // Audit log
  const [auditLog, setAuditLog] = useState<ActivityRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditErr, setAuditErr] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);

  // Backup
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMsg, setBackupMsg] = useState("");

  // App config
  const [configMsg, setConfigMsg] = useState("");

  async function fetchSection(fetcher: () => Promise<any>, setter: (v: any) => void, errSetter: (v: boolean) => void) {
    try { const data = await fetcher(); setter(data); }
    catch { errSetter(true); }
  }

  async function fetchAll() {
    setLoading(true);
    await Promise.all([
      fetchSection(adminApi.getSystemHealth, setSysHealth, setSysHealthErr),
      fetchSection(adminApi.getDbStats, setDbStats, setDbStatsErr),
      fetchSection(adminApi.getApiUsage, setApiUsage, setApiUsageErr),
      fetchSection(() => adminApi.getGeometryStats().catch(() => null), setGeoStats, setGeoStatsErr),
      fetchSection(() => adsApi.getStats(30).catch(() => null), setAdsStats, setAdsStatsErr),
    ]);
    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []);

  async function fetchAuditLog() {
    setAuditExpanded(true);
    if (auditLog.length > 0) return;
    setAuditLoading(true); setAuditErr(false);
    try {
      const res = await adminExtendedApi.getAuditLog({ limit: 100 });
      setAuditLog(res.data || []);
    } catch { setAuditErr(true); }
    finally { setAuditLoading(false); }
  }

  async function handleBackup() {
    setBackupLoading(true);
    setBackupMsg("");
    try {
      const res = await adminExtendedApi.exportBackup();
      if (res && (res as any).success) {
        const blob = new Blob([JSON.stringify((res as any).data, null, 2)], { type: "application/json; charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `droob-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setBackupMsg("✅ تم تصدير البيانات بنجاح");
      } else {
        setBackupMsg("✅ جاري تحضير النسخة الاحتياطية...");
      }
    } catch (err: any) {
      setBackupMsg(`❌ فشل التصدير: ${err.message || "خطأ غير معروف"}`);
    }
    finally { setBackupLoading(false); }
  }

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton" style={{ height: 130, borderRadius: "var(--radius)" }} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>إعدادات النظام</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={handleBackup} disabled={backupLoading}
            style={{ borderColor: "var(--accent-2)", color: "var(--accent-2)" }}>
            <Download size={12} /> {backupLoading ? "جاري التصدير..." : "تصدير"}
          </button>
          <button className="btn btn-sm" onClick={fetchAll}>
            <RefreshCw size={12} /> تحديث الكل
          </button>
        </div>
      </div>

      {backupMsg && (
        <div style={{
          padding: "10px 16px", marginBottom: 12, borderRadius: "var(--radius-sm)", fontSize: 13,
          background: backupMsg.startsWith("✅") ? "var(--accent-2-soft)" : "var(--danger-soft)",
          color: backupMsg.startsWith("✅") ? "var(--accent-2)" : "var(--danger)",
          border: `1px solid ${backupMsg.startsWith("✅") ? "var(--accent-2)" : "var(--danger)"}`,
        }}>
          {backupMsg}
        </div>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {/* System Health */}
        <Panel title="الخادم" subtitle="حالة النظام والموارد" headerRight={<Server size={16} style={{ color: "var(--text-muted)" }} />}>
          {sysHealthErr ? <InlineError message="فشل التحميل" onRetry={() => fetchSection(adminApi.getSystemHealth, setSysHealth, setSysHealthErr)} />
            : sysHealth ? (
              <ConfigGrid>
                <ConfigItem icon={<Cpu size={14} />} label="المعالج" value={`${sysHealth.cpu_percent}%`} />
                <ConfigItem icon={<Server size={14} />} label="الذاكرة" value={`${sysHealth.memory_used_gb} / ${sysHealth.memory_total_gb} GB`} />
                <ConfigItem icon={<Clock size={14} />} label="وقت التشغيل" value={`${sysHealth.uptime_hours} ساعة`} />
                <ConfigItem icon={<Shield size={14} />} label="الحالة" value={sysHealth.status === "healthy" ? "✅ سليم" : sysHealth.status} />
                <ConfigItem icon={<Globe size={14} />} label="النظام" value={`${sysHealth.platform} · ${sysHealth.hostname}`} />
              </ConfigGrid>
            ) : null}
        </Panel>

        {/* Database */}
        <Panel title="قاعدة البيانات" subtitle="PostgreSQL + PostGIS" headerRight={<Database size={16} style={{ color: "var(--text-muted)" }} />}>
          {dbStatsErr ? <InlineError message="فشل التحميل" onRetry={() => fetchSection(adminApi.getDbStats, setDbStats, setDbStatsErr)} />
            : dbStats ? (
              <ConfigGrid>
                <ConfigItem label="الخطوط" value={dbStats.total_routes.toLocaleString("ar-JO")} />
                <ConfigItem label="المحطات" value={dbStats.total_stops.toLocaleString("ar-JO")} />
                <ConfigItem label="المركبات" value={dbStats.total_vehicles.toLocaleString("ar-JO")} />
                <ConfigItem label="المستخدمين" value={dbStats.total_users.toLocaleString("ar-JO")} />
                <ConfigItem label="الإعلانات" value={dbStats.total_ads.toLocaleString("ar-JO")} />
                <ConfigItem label="الحجم" value={dbStats.db_size} />
              </ConfigGrid>
            ) : null}
        </Panel>

        {/* Ads Revenue */}
        <Panel title="إدارة الإعلانات" subtitle={adsStats ? `آخر ${adsStats.days} يوم` : "إحصائيات الإعلانات"} headerRight={<DollarSign size={16} style={{ color: "var(--accent-2)" }} />}>
          {adsStatsErr ? <InlineError message="فشل التحميل" onRetry={() => fetchSection(() => adsApi.getStats(30), setAdsStats, setAdsStatsErr)} />
            : adsStats ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
                  <KpiCard label="إجمالي الإيرادات"
                    value={adsStats.revenueByType?.reduce((s: number, r: any) => s + r.total_revenue, 0).toFixed(3) || "0"}
                    suffix="USD" accent="accent-2" />
                  <KpiCard label="مرات الظهور"
                    value={adsStats.revenueByType?.reduce((s: number, r: any) => s + r.impressions, 0).toLocaleString("ar-JO") || "0"}
                    accent="accent" />
                  <KpiCard label="النقرات"
                    value={adsStats.revenueByType?.reduce((s: number, r: any) => s + r.clicks, 0).toLocaleString("ar-JO") || "0"}
                    accent="warn" />
                  <KpiCard label="نسبة التعبئة"
                    value={adsStats.fillRate ? `${((adsStats.fillRate.filled / Math.max(1, adsStats.fillRate.total)) * 100).toFixed(1)}%` : "0%"}
                    accent="purple" />
                </div>
                {adsStats.revenueByType?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>الإيرادات حسب نوع الإعلان</h4>
                    <table className="data-table">
                      <thead><tr><th>النوع</th><th>الإيرادات</th><th>الظهور</th><th>النقرات</th><th>المكافآت</th></tr></thead>
                      <tbody>
                        {adsStats.revenueByType.map((r: any, i: number) => (
                          <tr key={i}>
                            <td><span className={`badge ${r.ad_type === "rewarded" ? "badge-purple" : r.ad_type === "interstitial" ? "badge-warn" : "badge-info"}`}>
                              {r.ad_type === "banner" ? "بانر" : r.ad_type === "interstitial" ? "interstitial" : "مكافأة"}</span></td>
                            <td className="cell-mono">${r.total_revenue.toFixed(3)}</td>
                            <td className="cell-mono">{r.impressions.toLocaleString("ar-JO")}</td>
                            <td className="cell-mono">{r.clicks.toLocaleString("ar-JO")}</td>
                            <td className="cell-mono">{r.rewards.toLocaleString("ar-JO")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(!adsStats.revenueByType || adsStats.revenueByType.length === 0) && (
                  <div className="empty-state">لا توجد بيانات إعلانات بعد</div>
                )}
              </div>
            ) : null}
        </Panel>

        {/* API Usage */}
        <Panel title="استخدام API" subtitle="إحصائيات اليوم" headerRight={<Globe size={16} style={{ color: "var(--text-muted)" }} />}>
          {apiUsageErr ? <InlineError message="فشل التحميل" onRetry={() => fetchSection(adminApi.getApiUsage, setApiUsage, setApiUsageErr)} />
            : apiUsage ? (
              <ConfigGrid>
                <ConfigItem label="طلبات اليوم" value={apiUsage.requests_today.toLocaleString("ar-JO")} />
                <ConfigItem label="طلبات الساعة" value={apiUsage.requests_this_hour.toLocaleString("ar-JO")} />
                <ConfigItem label="متوسط الاستجابة" value={`${apiUsage.avg_response_ms} ms`} />
                <ConfigItem label="نسبة الأخطاء" value={`${apiUsage.error_rate_pct}%`} />
                <ConfigItem label="تجاوز الحد" value={apiUsage.rate_limit_hits.toLocaleString("ar-JO")} />
              </ConfigGrid>
            ) : null}
        </Panel>

        {/* Geometry Stats */}
        {geoStats && !geoStatsErr && (
          <Panel title="البيانات الجغرافية" subtitle="PostGIS" headerRight={<MapPin size={16} style={{ color: "var(--text-muted)" }} />}>
            <ConfigGrid>
              <ConfigItem label="إجمالي المحطات" value={geoStats.total.toLocaleString("ar-JO")} />
              <ConfigItem label="بيانات جغرافية صالحة" value={geoStats.haveValidGeom.toLocaleString("ar-JO")} />
              <ConfigItem label="بدون بيانات جغرافية" value={geoStats.nullGeom.toLocaleString("ar-JO")} />
            </ConfigGrid>
          </Panel>
        )}

        {/* App Config */}
        <Panel title="إعدادات التطبيق" subtitle="الاسم الافتراضي، اللغة، العملة" headerRight={<Save size={16} style={{ color: "var(--text-muted)" }} />}>
          <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
            <ConfigItem icon={<FileText size={14} />} label="اسم التطبيق" value="دروب Droob" />
            <ConfigItem icon={<Globe size={14} />} label="اللغة الافتراضية" value="العربية (ar)" />
            <ConfigItem icon={<DollarSign size={14} />} label="العملة" value="دينار أردني (JOD)" />
            <ConfigItem icon={<Clock size={14} />} label="المنطقة الزمنية" value="Asia/Amman (UTC+3)" />
            <ConfigItem icon={<Server size={14} />} label="OSRM URL" value="https://droob-osrm.fly.dev" />
            <ConfigItem icon={<Globe size={14} />} label="API URL" value="https://api.droob-jo.com" />
            <ConfigItem icon={<Database size={14} />} label="قاعدة البيانات" value="PostgreSQL 16 + PostGIS 3.4 (Fly.io)" />
            <ConfigItem icon={<Shield size={14} />} label="Redis" value="Redis 7 (Fly.io)" />
          </div>
        </Panel>

        {/* Audit Log */}
        <Panel
          title="سجل التغييرات"
          subtitle="آخر التعديلات في النظام"
          headerRight={
            <button className="btn btn-sm" onClick={fetchAuditLog}>
              <History size={14} /> {auditExpanded ? "تحديث" : "عرض"}
            </button>
          }
        >
          {!auditExpanded ? (
            <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: 13 }}>
              اضغط على &quot;عرض&quot; لتحميل سجل آخر التعديلات
            </div>
          ) : auditErr ? (
            <InlineError message="فشل تحميل سجل التغييرات" onRetry={fetchAuditLog} />
          ) : auditLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : auditLog.length === 0 ? (
            <div className="empty-state">لا توجد تغييرات مسجلة</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>الإجراء</th>
                    <th>النوع</th>
                    <th>التفاصيل</th>
                    <th>الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.slice(0, 50).map((log: ActivityRecord) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: 12 }}>{log.user?.name || "—"}</td>
                      <td><span className="badge badge-info">{actionLabels[log.action] || log.action}</span></td>
                      <td className="cell-mono" style={{ fontSize: 12 }}>{entityTypeLabels[log.entity_type] || log.entity_type}</td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.details ? JSON.stringify(log.details).substring(0, 50) : "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatRelativeTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ConfigGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
      {children}
    </div>
  );
}

function ConfigItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--surface-2)", borderRadius: "var(--radius-sm)" }}>
      {icon && <span style={{ color: "var(--text-muted)", flexShrink: 0 }}>{icon}</span>}
      <div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
        <div className="mono" style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{value}</div>
      </div>
    </div>
  );
}
