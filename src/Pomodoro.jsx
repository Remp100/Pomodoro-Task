import React, { useReducer, useState, useEffect, useRef } from "react";

// Hook for syncing with localStorage
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// Reducer for Pomodoro settings and session history
function pomoReducer(state, action) {
  switch (action.type) {
    case "SETTINGS":
      return {
        ...state,
        work: action.payload.work,
        shortBreak: action.payload.shortBreak,
        longBreak: action.payload.longBreak,
      };
    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };
    default:
      return state;
  }
}

// Hook encapsulating Pomodoro timer logic
function usePomodoro({ work, shortBreak, longBreak }, onSessionEnd) {
  const [mode, setMode] = useState("work");
  const [timeLeft, setTimeLeft] = useState(work * 60);
  const intervalRef = useRef(null);

  // reset timer whenever mode or durations change
  useEffect(() => {
    const minutes =
      mode === "work" ? work : mode === "shortBreak" ? shortBreak : longBreak;
    setTimeLeft(minutes * 60);
  }, [mode, work, shortBreak, longBreak]);

  const start = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          onSessionEnd(mode);
          setMode((prev) => (prev === "work" ? "shortBreak" : "work"));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const reset = () => {
    pause();
    const minutes =
      mode === "work" ? work : mode === "shortBreak" ? shortBreak : longBreak;
    setTimeLeft(minutes * 60);
  };

  return { mode, timeLeft, start, pause, reset, setMode };
}

export default function Pomodoro({ selectedTask, setPage }) {
  // --- Pomodoro state + persistence ---
  const [stored, setStored] = useLocalStorage("pomodoro", {
    work: 25,
    shortBreak: 5,
    longBreak: 0,
    sessions: [],
  });
  const [state, dispatch] = useReducer(pomoReducer, stored);
  useEffect(() => setStored(state), [state]);

  // --- Notifications + session history handler ---
  const notify = (msg) => window.Notification && new Notification(msg);
  const onSessionEnd = (mode) => {
    dispatch({
      type: "ADD_SESSION",
      payload: { mode, timestamp: Date.now() },
    });
    notify(mode === "work" ? "Pomodoro ended" : "Break ended");
  };
  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
  }, []);

  // --- Timer hook ---
  const { mode, timeLeft, start, pause, reset, setMode } = usePomodoro(
    state,
    onSessionEnd
  );
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  // --- Settings form state ---
  const [form, setForm] = useState({
    work: state.work,
    shortBreak: state.shortBreak,
    longBreak: state.longBreak,
  });
  useEffect(() => {
    setForm({
      work: state.work,
      shortBreak: state.shortBreak,
      longBreak: state.longBreak,
    });
  }, [state.work, state.shortBreak, state.longBreak]);
  const saveSettings = (e) => {
    e.preventDefault();
    dispatch({ type: "SETTINGS", payload: form });
  };

  // === Task progress persistence ===
  const today = new Date().toISOString().slice(0, 10);
  const [taskProgress, setTaskProgress] = useState({
    date: today,
    task: null,
    workedSec: 0,
  });

  // load progress when a new task is selected
  useEffect(() => {
    if (!selectedTask) return;
    let initial = { date: today, task: selectedTask, workedSec: 0 };
    try {
      const raw = localStorage.getItem("taskProgress");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj.date === today && obj.task?.id === selectedTask.id) {
          initial = obj;
        }
      }
    } catch {}
    setTaskProgress(initial);
  }, [selectedTask, today]);

  // persist progress whenever it changes
  useEffect(() => {
    if (!selectedTask) return;
    localStorage.setItem("taskProgress", JSON.stringify(taskProgress));
  }, [taskProgress, selectedTask]);

  // count each second in work mode
  const prevTimeRef = useRef(timeLeft);
  useEffect(() => {
    if (mode === "work" && prevTimeRef.current > timeLeft && selectedTask) {
      setTaskProgress((tp) => ({
        ...tp,
        workedSec: tp.workedSec + 1,
      }));
    }
    prevTimeRef.current = timeLeft;
  }, [timeLeft, mode, selectedTask]);

  // derive progress percent and hours done
  const daily = selectedTask?.dailyHours || 0;
  const pct =
    daily > 0
      ? Math.min((taskProgress.workedSec / (daily * 3600)) * 100, 100)
      : 0;
  const doneH = (taskProgress.workedSec / 3600).toFixed(2);
  // === end task-progress code ===

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2  gap-8">
        {/* ==== Pomodoro Timer Card ==== */}
        <div className="md:col-start-1 md:row-span-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-indigo-500" />
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white text-center">
              Pomodoro Timer
            </h2>
          </div>
          <div className="p-8 space-y-6">
            {/* Timer display */}
            <div className="text-center space-y-2">
              <div className="text-7xl font-mono text-white">
                {minutes}:{seconds}
              </div>
              <div className="uppercase text-gray-400">
                {mode === "work" ? "Work" : "Break"}
              </div>
            </div>

            {/* Mode tabs */}
            <div className="flex justify-center space-x-4">
              {["work", "shortBreak", "longBreak"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    pause();
                    setMode(m);
                  }}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                    mode === m
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {m === "work"
                    ? "Work"
                    : m === "shortBreak"
                    ? "Short Break"
                    : "Long Break"}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={start}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition"
              >
                Start
              </button>
              <button
                onClick={pause}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition"
              >
                Pause
              </button>
              <button
                onClick={reset}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition"
              >
                Reset
              </button>
            </div>

            {/* Session History */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Session History
              </h3>
              <ul className="max-h-40 overflow-y-auto divide-y divide-gray-700 text-gray-300 text-sm">
                {state.sessions.length > 0 ? (
                  [...state.sessions].reverse().map((s, i) => (
                    <li key={i} className="py-2 flex justify-between">
                      <span className="capitalize">{s.mode}</span>
                      <span>{new Date(s.timestamp).toLocaleTimeString()}</span>
                    </li>
                  ))
                ) : (
                  <li className="py-2 text-center">No sessions yet</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* ==== Task Details & Progress ==== */}
        {selectedTask && (
          <div
            className="
            md:col-start-2 md:row-start-1
            bg-gray-800 rounded-2xl shadow-lg
            p-4                /* reduced padding */
            text-white space-y-4
            max-h-64          /* max height */
          "
          >
            <h3 className="text-2xl font-bold">{selectedTask.title}</h3>
            <p>{selectedTask.description}</p>
            {selectedTask.labelName && (
              <span
                className="inline-block px-3 py-1 text-xs font-semibold uppercase rounded-full"
                style={{ backgroundColor: selectedTask.labelColor }}
              >
                {selectedTask.labelName}
              </span>
            )}
            {daily > 0 && (
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Progress:</span>
                  <span>
                    {doneH}h / {daily}h
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
            <button
              onClick={() => setPage("dashboard")}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* ==== Settings Card ==== */}
        <div className="md:col-start-2 md:row-start-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-indigo-500" />
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white text-center">
              Settings
            </h2>
          </div>
          <div className="p-8 space-y-6">
            <form onSubmit={saveSettings} className="space-y-4">
              {[
                { key: "work", label: "Work (minutes)" },
                { key: "shortBreak", label: "Short Break (minutes)" },
                { key: "longBreak", label: "Long Break (minutes)" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <label className="text-gray-300">{label}</label>
                  <input
                    type="number"
                    min="0"
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: +e.target.value }))
                    }
                    className="w-24 px-3 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full mt-4 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full transition"
              >
                Save Settings
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
