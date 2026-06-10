/* ═══════════════════════════════════════════════════════════════════════════
   دروب Droob — Utilities
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Format a date string to Arabic relative time (e.g. "منذ ٥ دقائق")
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "الآن";
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  if (diffHr < 24) return `منذ ${diffHr} ساعة`;
  if (diffDay < 30) return `منذ ${diffDay} يوم`;
  return date.toLocaleDateString("ar-JO");
}

/**
 * Format a date string to Arabic locale (e.g. "١٢ مايو ٢٠٢٦")
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format a date string to Arabic locale with time
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a fare value to JOD display string.
 * Values > 10 are interpreted as fils (divided by 1000).
 * Returns a 3-decimal string (e.g. "0.500").
 */
export function formatFare(fare: string | number | null | undefined, fallback = "0.350"): string {
  if (fare === null || fare === undefined) return fallback;
  const n = typeof fare === "string" ? parseFloat(fare) : fare;
  if (isNaN(n)) return fallback;
  const jod = n > 10 ? n / 1000 : n;
  return jod.toFixed(3);
}

/**
 * Arabic labels for modes
 */
export const modeLabels: Record<string, string> = {
  city_bus: "حافلة مدينة",
  brt: "باص سريع",
  serveece: "سرفيس",
  intercity: "بين المحافظات",
};

/**
 * Arabic labels for roles
 */
export const roleLabels: Record<string, string> = {
  super_admin: "مدير النظام",
  admin: "مشرف",
  editor: "محرر",
  operator: "مشغل",
  viewer: "مشاهد",
  driver: "سائق",
  passenger: "راكب",
};

/**
 * Arabic labels for entity types
 */
export const entityTypeLabels: Record<string, string> = {
  route: "خط",
  stop: "محطة",
  vehicle: "مركبة",
  alert: "تنبيه",
  schedule: "جدول",
  fare: "تسعيرة",
  prayer_time: "مواقيت صلاة",
  user: "مستخدم",
};

/**
 * Arabic labels for actions
 */
export const actionLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تحديث",
  delete: "حذف",
  import: "استيراد",
  export: "تصدير",
};
