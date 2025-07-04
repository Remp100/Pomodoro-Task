import React, { useReducer, useState, useEffect, useRef } from "react";

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

function usePomodoro({ work, shortBreak, longBreak }, onExpire) {
  const [mode, setMode] = useState("work");
  const [timeLeft, setTimeLeft] = useState(work * 60);
  const intervalRef = useRef(null);
  const expiredRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);
  const deadlineRef = useRef(null);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    const sec =
      mode === "work" ? work : mode === "shortBreak" ? shortBreak : longBreak;
    setTimeLeft(sec);
  }, [mode, work, shortBreak, longBreak]);

  const start = () => {
    if (intervalRef.current) return;
    expiredRef.current = false;
    setIsRunning(true);

    const sec =
      mode === "work" ? work : mode === "shortBreak" ? shortBreak : longBreak;
    deadlineRef.current = Date.now() + sec * 1000;

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.round((deadlineRef.current - Date.now()) / 1000)
      );
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);

        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire();
        }
      }
    }, 500);
  };

  const pause = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsRunning(false);
  };

  const reset = () => {
    pause();
    const sec =
      mode === "work" ? work : mode === "shortBreak" ? shortBreak : longBreak;
    setTimeLeft(sec);
    deadlineRef.current = null;
  };

  return { mode, timeLeft, start, pause, reset, setMode, isRunning };
}

export default function Pomodoro({ selectedTask, setPage }) {
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [stored, setStored] = useLocalStorage("pomodoro", {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    sessions: [],
  });
  const [state, dispatch] = useReducer(pomoReducer, stored);
  useEffect(() => setStored(state), [state]);

  const notify = (msg) => window.Notification && new Notification(msg);
  const onExpire = () => {
    dispatch({
      type: "ADD_SESSION",
      payload: { mode, timestamp: Date.now() },
    });
    notify(mode === "work" ? "Pomodoro ended" : "Break ended");

    setMode((prev) => (prev === "work" ? "shortBreak" : "work"));
  };

  const { mode, timeLeft, start, pause, reset, setMode, isRunning } =
    usePomodoro(state, onExpire);
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  const [form, setForm] = useState({
    workMinutes: Math.floor(state.work / 60),
    workSeconds: state.work % 60,
    shortBreakMinutes: Math.floor(state.shortBreak / 60),
    shortBreakSeconds: state.shortBreak % 60,
    longBreakMinutes: Math.floor(state.longBreak / 60),
    longBreakSeconds: state.longBreak % 60,
  });
  useEffect(() => {
    setForm({
      workMinutes: Math.floor(state.work / 60),
      workSeconds: state.work % 60,
      shortBreakMinutes: Math.floor(state.shortBreak / 60),
      shortBreakSeconds: state.shortBreak % 60,
      longBreakMinutes: Math.floor(state.longBreak / 60),
      longBreakSeconds: state.longBreak % 60,
    });
  }, [state.work, state.shortBreak, state.longBreak]);
  const saveSettings = (e) => {
    e.preventDefault();
    dispatch({
      type: "SETTINGS",
      payload: {
        work: form.workMinutes * 60 + form.workSeconds,
        shortBreak: form.shortBreakMinutes * 60 + form.shortBreakSeconds,
        longBreak: form.longBreakMinutes * 60 + form.longBreakSeconds,
      },
    });
  };

  const today = new Date().toISOString().slice(0, 10);
  const [taskProgress, setTaskProgress] = useState({
    date: today,
    task: null,
    workedSec: 0,
    workedH: 0,
    workedM: 0,
  });

  useEffect(() => {
    if (!selectedTask) return;

    const progressKey = `${selectedTask.id}_${today}`;

    let initial = {
      date: today,
      task: selectedTask,
      workedSec: 0,
      workedH: 0,
      workedM: 0,
    };

    try {
      const raw = localStorage.getItem("allTaskProgress");
      if (raw) {
        const all = JSON.parse(raw);
        const obj = all[progressKey];
        if (obj) {
          const sec = obj.workedSec || 0;
          initial = {
            ...initial,
            workedSec: sec,
            workedH: Math.floor(sec / 3600),
            workedM: Math.floor((sec % 3600) / 60),
          };
        }
      }
    } catch {}

    setTaskProgress(initial);
    setProgressLoaded(true);
  }, [selectedTask, today]);

  const [totalProgress, setTotalProgress] = useState({
    workedSec: 0,
    workedH: 0,
    workedM: 0,
  });

  useEffect(() => {
    if (!progressLoaded) return;

    try {
      const raw = localStorage.getItem("allTaskProgress");
      if (raw) {
        const all = JSON.parse(raw);
        let totalSec = 0;

        for (const [key, value] of Object.entries(all)) {
          if (key.endsWith(`_${today}`)) {
            totalSec += value.workedSec || 0;
          }
        }

        const newTotal = {
          workedSec: totalSec,
          workedH: Math.floor(totalSec / 3600),
          workedM: Math.floor((totalSec % 3600) / 60),
        };

        setTotalProgress(newTotal);

        const rawTotal = localStorage.getItem("totalDailyProgress");
        const totalAll = rawTotal ? JSON.parse(rawTotal) : {};

        totalAll[today] = newTotal;
        localStorage.setItem("totalDailyProgress", JSON.stringify(totalAll));
      }
    } catch {}
  }, [taskProgress, progressLoaded, today]);

  useEffect(() => {
    if (!selectedTask || !progressLoaded) return;

    const progressKey = `${selectedTask.id}_${today}`;

    const raw = localStorage.getItem("allTaskProgress");
    const all = raw ? JSON.parse(raw) : {};

    all[progressKey] = {
      workedSec: taskProgress.workedSec,
      workedH: taskProgress.workedH,
      workedM: taskProgress.workedM,
    };

    localStorage.setItem("allTaskProgress", JSON.stringify(all));
  }, [taskProgress, selectedTask, today, progressLoaded]);

  useEffect(() => {
    if (!selectedTask || !isRunning || mode !== "work") return;

    setTaskProgress((tp) => {
      const newWorkedSec = tp.workedSec + 1;
      return {
        ...tp,
        workedSec: newWorkedSec,
        workedH: Math.floor(newWorkedSec / 3600),
        workedM: Math.floor((newWorkedSec % 3600) / 60),
      };
    });

    const interval = setInterval(() => {
      setTaskProgress((tp) => {
        const newWorkedSec = tp.workedSec + 1;
        return {
          ...tp,
          workedSec: newWorkedSec,
          workedH: Math.floor(newWorkedSec / 3600),
          workedM: Math.floor((newWorkedSec % 3600) / 60),
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, mode, selectedTask]);

  const dailyH = selectedTask?.dailyHours || 0;
  const dailyM = selectedTask?.dailyMinutes || 0;
  const dailyTotalSec = dailyH * 3600 + dailyM * 60;

  const pct =
    dailyTotalSec > 0
      ? Math.min((taskProgress.workedSec / dailyTotalSec) * 100, 100)
      : 0;

  const workedH = taskProgress.workedH;
  const workedM = taskProgress.workedM;

  const dailyTargetH = Math.floor(dailyTotalSec / 3600);
  const dailyTargetM = Math.floor((dailyTotalSec % 3600) / 60);

  const formatMode = (mode) => {
    if (mode === "work") return "Work";
    if (mode === "shortBreak") return "Short Break";
    if (mode === "longBreak") return "Long Break";
    return mode;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2  gap-8">
        <div className="md:col-start-1 md:row-span-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-indigo-500" />
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white text-center">
              Pomodoro Timer
            </h2>
          </div>
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="text-7xl font-mono text-white">
                {minutes}:{seconds}
              </div>
              <div className="uppercase text-gray-400">
                {mode === "work" ? "Work" : "Break"}
              </div>
            </div>

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
                onClick={() => {
                  reset();
                }}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition"
              >
                Reset
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">
                Session History
              </h3>
              <ul className="max-h-40 overflow-y-auto divide-y divide-gray-700 text-gray-300 text-sm">
                {state.sessions.length > 0 ? (
                  [...state.sessions].reverse().map((s, i) => (
                    <li key={i} className="py-2 flex justify-between">
                      <span>{formatMode(s.mode)}</span>
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

        {selectedTask && (
          <div
            className="
      md:col-start-2 md:row-start-1
      bg-gradient-to-br from-gray-800 to-gray-900
      rounded-2xl shadow-2xl overflow-hidden
      text-white max-h-64
    "
          >
            <div
              className="h-1 w-full"
              style={{ backgroundColor: selectedTask.labelColor }}
            />

            <div className="p-4 space-y-4 flex flex-col">
              <h3 className="text-2xl font-bold">{selectedTask.title}</h3>
              <p className=" text-gray-300 break-words line-clamp-1">
                {selectedTask.description}
              </p>
              {selectedTask.labelName && (
                <span
                  className="inline-block max-w-36 truncate px-2 py-1 text-xs font-semibold uppercase rounded-full"
                  style={{ backgroundColor: selectedTask.labelColor }}
                >
                  {selectedTask.labelName}
                </span>
              )}
              {dailyTotalSec > 0 && (
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span>
                      {workedH}h {workedM}m / {dailyTargetH}h {dailyTargetM}m
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all bg-green-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={() => setPage("dashboard")}
                className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

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
                { key: "work", label: "Work" },
                { key: "shortBreak", label: "Short Break" },
                { key: "longBreak", label: "Long Break" },
              ].map(({ key, label }) => (
                <div key={key} className="flex flex-col space-y-2">
                  <label className="text-gray-300">{label}</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={form[`${key}Minutes`]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = raw === "" ? "" : parseInt(raw, 10);
                        if (raw === "" || (!isNaN(num) && num >= 0)) {
                          setForm((f) => ({ ...f, [`${key}Minutes`]: num }));
                        }
                      }}
                      onBlur={() => {
                        let v = form[`${key}Minutes`];
                        if (v !== "") {
                          v = Math.min(Math.max(v, 0), 1000);
                          setForm((f) => ({ ...f, [`${key}Minutes`]: v }));
                        }
                      }}
                      className="w-24 px-3 py-2 rounded-lg bg-gray-700 text-white"
                      placeholder="Minutes"
                    />
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={form[`${key}Seconds`]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const num = raw === "" ? "" : parseInt(raw, 10);
                        if (raw === "" || (!isNaN(num) && num >= 0)) {
                          setForm((f) => ({ ...f, [`${key}Seconds`]: num }));
                        }
                      }}
                      onBlur={() => {
                        let v = form[`${key}Seconds`];
                        if (v !== "") {
                          v = Math.min(Math.max(v, 0), 59);
                          setForm((f) => ({ ...f, [`${key}Seconds`]: v }));
                        }
                      }}
                      className="w-24 px-3 py-2 rounded-lg bg-gray-700 text-white"
                      placeholder="Seconds"
                    />
                  </div>
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
