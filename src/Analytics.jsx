import React, { useState, useEffect, useMemo } from "react";

export default function Analytics() {
  // 1️⃣ Load sessions + work length from localStorage
  const totalDailyProgress =
    JSON.parse(localStorage.getItem("totalDailyProgress")) || {};
  console.log("[DEBUG] totalDailyProgress:", totalDailyProgress);

  // helper to format YYYY-MM-DD
  const fmt = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 🗝️ oră fixă

    // Start corect: today - 29 zile
    const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

    const arr = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const day = fmt(d);

      const daily = totalDailyProgress[day] || {
        workedSec: 0,
        workedH: 0,
        workedM: 0,
      };

      const hours = daily.workedH + daily.workedM / 60;

      arr.push({
        day,
        label: day.slice(5),
        sessions: 0,
        hours,
      });
    }

    console.log("[DEBUG] heatmapData:", arr);
    return arr;
  }, [totalDailyProgress]);

  const chartData = useMemo(() => {
    const daily = heatmapData.map((d) => ({
      label: d.label,
      hours: d.hours,
    }));

    console.log("[DEBUG] chartData.daily:", daily);

    const weekMap = {};
    heatmapData.forEach(({ day, hours }) => {
      const dt = new Date(day);
      const dow = dt.getDay();
      const mon = new Date(dt);
      mon.setDate(dt.getDate() - ((dow + 6) % 7));
      const wk = fmt(mon);
      if (!weekMap[wk]) weekMap[wk] = { hours: 0 };
      weekMap[wk].hours += hours;
    });
    const weekly = Object.entries(weekMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([wk, v]) => ({
        label: wk.slice(5),
        hours: v.hours,
      }));

    const monthMap = {};
    heatmapData.forEach(({ day, hours }) => {
      const m = day.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { hours: 0 };
      monthMap[m].hours += hours;
    });
    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([m, v]) => ({ label: m, hours: v.hours }));

    return { daily, weekly, monthly };
  }, [heatmapData]);

  const heatmapCounts = useMemo(() => {
    const m = {};
    for (const [day, value] of Object.entries(totalDailyProgress)) {
      const h = value.workedH || 0;
      const mnt = value.workedM || 0;
      m[day] = h + mnt / 60;
    }
    const todayStr = fmt(new Date());
    if (!m[todayStr]) m[todayStr] = 0;

    console.log("[DEBUG] heatmapCounts:", m);

    return m;
  }, [totalDailyProgress]);

  // 4️⃣ Build calendarCells: blanks before/after + 30 days
  const calendarCells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🔑 Start corect: folosește aritmetică pe milisecunde, nu .setDate()
    const start = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    // Calculează blanks înainte
    const blanksBefore = (start.getDay() + 6) % 7;
    const total = blanksBefore + 30;
    const blanksAfter = (7 - (total % 7)) % 7;

    const arr = [];

    // Blanks înainte
    for (let i = 0; i < blanksBefore; i++) arr.push(null);

    // ✅ Zile reale: de la start la today inclusiv
    for (let i = 0; i < 30; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      arr.push(d);
    }

    // Blanks după
    for (let i = 0; i < blanksAfter; i++) arr.push(null);

    console.log("[DEBUG] start:", fmt(start));
    console.log("[DEBUG] today:", fmt(today));
    console.log(
      "[DEBUG] calendarCells days:",
      arr.map((d) => (d ? fmt(d) : null))
    );

    return arr;
  }, []);

  // chart toggle & dims
  const data = chartData.daily;
  const BAR_WIDTH = 30;
  const CHART_HEIGHT = 200;
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <div className="container mx-auto py-8 space-y-3 text-white">
      {/* — Line chart of hours worked — */}
      <h3 className="text-lg font-semibold">Last 30 Calendar Chart Line</h3>
      <div className="w-full overflow-x-auto bg-gray-800 p-4 rounded-lg flex justify-center">
        <svg
          width={data.length * BAR_WIDTH}
          height={CHART_HEIGHT + 30}
          style={{ display: "block" }}
        >
          {[0, 1, 2, 3, 4].map((i) => {
            const y = (CHART_HEIGHT / 4) * i;
            return (
              <line
                key={i}
                x1={0}
                y1={y}
                x2={data.length * BAR_WIDTH}
                y2={y}
                stroke="#444"
              />
            );
          })}

          {data.some((d) => d.hours > 0) && (
            <>
              <polyline
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="2"
                points={data
                  .map((d, i) => {
                    const y =
                      CHART_HEIGHT - (d.hours / maxHours) * CHART_HEIGHT;
                    const x = i * BAR_WIDTH + BAR_WIDTH / 2;
                    return `${x},${y}`;
                  })
                  .join(" ")}
              />
              {data.map((d, i) => {
                if (d.hours <= 0) return null;
                const y = CHART_HEIGHT - (d.hours / maxHours) * CHART_HEIGHT;
                const x = i * BAR_WIDTH + BAR_WIDTH / 2;
                return (
                  <text
                    key={i}
                    x={x}
                    y={y - 6}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#8B5CF6"
                  >
                    {`${Math.floor(d.hours)}:${String(
                      Math.round((d.hours % 1) * 60)
                    ).padStart(2, "0")}`}
                  </text>
                );
              })}
            </>
          )}
          {data.map((d, i) => (
            <text
              key={i}
              x={i * BAR_WIDTH + BAR_WIDTH / 2}
              y={CHART_HEIGHT + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#ccc"
            >
              {d.label}
            </text>
          ))}
        </svg>
      </div>

      {/* — Calendar Heatmap — */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Last 30 Days Heatmap</h3>
        <div className="bg-gray-800 p-4 rounded-2xl grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((wd) => (
            <div
              key={wd}
              className="text-xs text-gray-400 font-medium text-center"
            >
              {wd}
            </div>
          ))}

          {/* Calendar days */}
          {calendarCells.map((d, i) => {
            if (!d) return <div key={i} />;

            const dayStr = fmt(d);
            const cnt = heatmapCounts[dayStr] || 0;
            console.log(`[DEBUG] Cell ${dayStr} → cnt:`, cnt);

            const MIN_VISIBLE = 0.083;
            let alpha = 0;
            if (cnt > 0 && cnt < MIN_VISIBLE) {
              alpha = 0.2;
            } else if (cnt >= MIN_VISIBLE) {
              alpha = Math.min(cnt / 2, 1);
            }

            const totalMinutes = Math.round(cnt * 60);
            const workedH = Math.floor(totalMinutes / 60);
            const workedM = totalMinutes % 60;
            const timeStr = `${workedH}:${workedM.toString().padStart(2, "0")}`;

            return (
              <div
                key={i}
                className="h-10 flex items-center justify-center text-sm font-medium text-white"
                style={{
                  backgroundColor:
                    alpha > 0 ? `rgba(16,185,129,${alpha})` : "transparent",
                  cursor: "pointer",
                }}
                title={`Worked: ${timeStr} (H:M)`}
              >
                {d.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
