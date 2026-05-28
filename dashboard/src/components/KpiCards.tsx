// دروب (Droob) — KPI Cards Component
import React from "react";

export interface KpiData {
  active_users: number;
  trips_today: number;
  vehicles_active: number;
  vehicles_total: number;
  avg_delay_minutes: number;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  suffix?: string;
}

function KpiCard({ title, value, icon, color, suffix }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color}`}>
          مباشر
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        <span>{value}</span>
        {suffix && <span className="text-sm font-normal text-gray-500 mr-1">{suffix}</span>}
      </div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}

interface KpiCardsProps {
  data?: KpiData;
}

export function KpiCards({ data }: KpiCardsProps) {
  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-3" />
            <div className="h-6 bg-gray-200 rounded mb-1" />
            <div className="h-4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards: KpiCardProps[] = [
    {
      title: "المستخدمين النشطين",
      value: data.active_users.toLocaleString("ar"),
      icon: "👥",
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "الرحلات اليوم",
      value: data.trips_today.toLocaleString("ar"),
      icon: "🚌",
      color: "bg-green-100 text-green-700",
    },
    {
      title: "المركبات النشطة",
      value: `${data.vehicles_active} / ${data.vehicles_total}`,
      icon: "🚍",
      color: "bg-amber-100 text-amber-700",
    },
    {
      title: "إجمالي المركبات",
      value: data.vehicles_total.toLocaleString("ar"),
      icon: "🏢",
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "متوسط التأخير",
      value: data.avg_delay_minutes,
      icon: "⏱️",
      color: "bg-red-100 text-red-700",
      suffix: "دقيقة",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.title} {...card} />
      ))}
    </div>
  );
}