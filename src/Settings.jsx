import React, { useState, useEffect } from "react";

export default function Settings() {
  const [form, setForm] = useState({
    work: 25,
    shortBreak: 5,
    longBreak: 15,
  });

  // Încarcă din localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("pomodoro") || "{}");
    if (stored.work) {
      setForm({
        work: stored.work,
        shortBreak: stored.shortBreak,
        longBreak: stored.longBreak,
      });
    }
  }, []);

  const save = (e) => {
    e.preventDefault();
    const data = JSON.parse(localStorage.getItem("pomodoro") || "{}");
    const updated = { ...data, ...form };
    localStorage.setItem("pomodoro", JSON.stringify(updated));
    // Poți notifica utilizatorul cu un toast aici
  };

  return (
    <div className="container bg-gray-900">
      <div className="bg-gray-800 dark:bg-gray-700 rounded-3xl shadow-lg p-8 max-w-md mx-auto">
        <h2 className="text-2xl font-extrabold text-white mb-6">Settings</h2>
        <form onSubmit={save} className="space-y-4">
          {[
            { key: "work", label: "Work Duration (minutes)" },
            { key: "shortBreak", label: "Short Break (minutes)" },
            { key: "longBreak", label: "Long Break (minutes)" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <label className="text-gray-300">{label}</label>
              <input
                type="number"
                min="1"
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: +e.target.value }))
                }
                className="w-20 px-3 py-2 rounded-lg bg-gray-600 text-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition"
          >
            Save Settings
          </button>
        </form>
      </div>
    </div>
  );
}
