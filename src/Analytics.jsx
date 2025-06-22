import React, { useState, useEffect } from "react";

export default function Analytics() {
  const [sessions, setSessions] = useState([]);
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("pomodoro"));
    setSessions(data?.sessions || []);
  }, []);

  const sessionsByDay = sessions.reduce((acc, s) => {
    const day = new Date(s.timestamp).toLocaleDateString();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="container bg-gray-900">
      <h2 className="text-xl font-semibold mb-4">Analytics</h2>
      <div className="grid grid-cols-7 gap-1">
        {Object.entries(sessionsByDay).map(([day, count]) => (
          <div
            key={day}
            className="p-2 text-center"
            title={`${count} sesiuni`}
            style={{ background: `rgba(16,185,129,${Math.min(count / 5, 1)})` }}
          >
            {day.split(".")?.[0]}
          </div>
        ))}
      </div>
    </div>
  );
}
