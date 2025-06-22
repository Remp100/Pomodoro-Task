import React, { useState, useEffect, useMemo } from "react";

export default function Analytics() {
  // 1️⃣ Load sessions + work length from localStorage
  const { sessions = [], work = 25 } =
    JSON.parse(localStorage.getItem("pomodoro")) || {};

  // helper to format YYYY-MM-DD
  const fmt = (d) => d.toISOString().slice(0, 10);

  // 2️⃣ Build heatmapCounts: day → number of work sessions
  const heatmapCounts = useMemo(() => {
    const m = {};
    sessions.forEach((s) => {
      if (s.mode === "work") {
        const day = fmt(new Date(s.timestamp));
        m[day] = (m[day] || 0) + 1;
      }
    });
    return m;
  }, [sessions]);

  // 3️⃣ Build chartData (daily/weekly/monthly) – unchanged
  const heatmapData = useMemo(() => {
    const today = new Date();
    const map = heatmapCounts;
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (29 - i));
      const day = fmt(d),
        cnt = map[day] || 0,
        hrs = (cnt * work) / 60;
      return { day, label: day.slice(5), sessions: cnt, hours: hrs };
    });
  }, [heatmapCounts, work]);

  const chartData = useMemo(() => {
    // daily
    const daily = heatmapData.map((d) => ({
      label: d.label,
      sessions: d.sessions,
      hours: d.hours,
    }));
    // weekly
    const weekMap = {};
    heatmapData.forEach(({ day, sessions, hours }) => {
      const dt = new Date(day),
        dow = dt.getDay(),
        mon = new Date(dt);
      mon.setDate(dt.getDate() - ((dow + 6) % 7));
      const wk = fmt(mon);
      if (!weekMap[wk]) weekMap[wk] = { sessions: 0, hours: 0 };
      weekMap[wk].sessions += sessions;
      weekMap[wk].hours += hours;
    });
    const weekly = Object.entries(weekMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([wk, v]) => ({
        label: wk.slice(5),
        sessions: v.sessions,
        hours: v.hours,
      }));
    // monthly
    const monthMap = {};
    heatmapData.forEach(({ day, sessions, hours }) => {
      const m = day.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { sessions: 0, hours: 0 };
      monthMap[m].sessions += sessions;
      monthMap[m].hours += hours;
    });
    const monthly = Object.entries(monthMap)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([m, v]) => ({ label: m, sessions: v.sessions, hours: v.hours }));

    return { daily, weekly, monthly };
  }, [heatmapData]);

  // 4️⃣ Build calendarCells: blanks before/after + 30 days
  const calendarCells = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const blanksBefore = (start.getDay() + 6) % 7;
    const total = blanksBefore + 30;
    const blanksAfter = (7 - (total % 7)) % 7;

    const arr = [];
    for (let i = 0; i < blanksBefore; i++) arr.push(null);
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    for (let i = 0; i < blanksAfter; i++) arr.push(null);
    return arr;
  }, []);

  // chart toggle & dims
  const [period, setPeriod] = useState("daily");
  const data = chartData[period];
  const BAR_WIDTH = 30;
  const CHART_HEIGHT = 200;
  const maxHours = Math.max(...data.map((d) => d.hours), 1);

  return (
    <div className="container mx-auto py-8 space-y-8 text-white">
      <h2 className="text-2xl font-bold">Analytics</h2>

      {/* — Period toggle — */}
      <div className="flex space-x-2">
        {["daily", "weekly", "monthly"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={
              "px-4 py-2 rounded-full transition " +
              (period === p ? "bg-indigo-600" : "bg-gray-700 hover:bg-gray-600")
            }
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* — Line chart of hours worked — */}
      <div className="w-full overflow-x-auto bg-gray-800 p-4 rounded-lg">
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
                    {d.hours.toFixed(1)}
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
            // empty slot → render nothing
            if (!d) return <div key={i} />;

            const dayStr = fmt(d);
            const cnt = heatmapCounts[dayStr] || 0;
            const alpha = Math.min(cnt / 5, 1);

            return (
              <div
                key={i}
                className="h-10 flex items-center justify-center text-sm font-medium text-white"
                style={{
                  // only apply green when there's at least one session
                  backgroundColor:
                    cnt > 0 ? `rgba(16,185,129,${alpha})` : "transparent",
                }}
                title={`${cnt} session${cnt !== 1 ? "s" : ""}\n${(
                  (cnt * work) /
                  60
                ).toFixed(2)}h`}
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
