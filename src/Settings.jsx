import React, { useState, useEffect } from "react";

export default function Settings() {
  const [form, setForm] = useState({ work: 25, shortBreak: 5, longBreak: 15 });
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("pomodoro"));
    setForm({
      work: stored.work,
      shortBreak: stored.shortBreak,
      longBreak: stored.longBreak,
    });
  }, []);

  const save = () => {
    const data = JSON.parse(localStorage.getItem("pomodoro"));
    const updated = {
      ...data,
      work: form.work,
      shortBreak: form.shortBreak,
      longBreak: form.longBreak,
    };
    localStorage.setItem("pomodoro", JSON.stringify(updated));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>
      {["work", "shortBreak", "longBreak"].map((key) => (
        <div key={key}>
          <label className="block capitalize">{key}</label>
          <input
            type="number"
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: +e.target.value }))}
            className="mt-1 block w-24 border p-1"
          />
        </div>
      ))}
      <button
        onClick={save}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save
      </button>
    </div>
  );
}
