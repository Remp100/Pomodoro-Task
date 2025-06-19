import React, { useReducer, useState, useEffect, useRef } from "react";

// useLocalStorage Hook integrated into file
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

// Reducer for Pomodoro
function pomoReducer(state, action) {
  switch (action.type) {
    case "SETTINGS":
      return { ...state, ...action.payload };
    case "ADD_SESSION":
      return { ...state, sessions: [...state.sessions, action.payload] };
    default:
      return state;
  }
}

// usePomodoro Hook integrated into file
function usePomodoro({ work, shortBreak, longBreak }, onSessionEnd) {
  const [mode, setMode] = useState("work");
  const [timeLeft, setTimeLeft] = useState(work * 60);
  const intervalRef = useRef(null);
  useEffect(() => {
    setTimeLeft(
      (mode === "work"
        ? work
        : mode === "shortBreak"
        ? shortBreak
        : longBreak) * 60
    );
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
    setTimeLeft(
      (mode === "work"
        ? work
        : mode === "shortBreak"
        ? shortBreak
        : longBreak) * 60
    );
  };
  return { mode, timeLeft, start, pause, reset };
}

export default function Pomodoro() {
  const [stored, setStored] = useLocalStorage("pomodoro", {
    work: 25,
    shortBreak: 5,
    longBreak: 15,
    sessions: [],
  });
  const [state, dispatch] = useReducer(pomoReducer, stored);
  useEffect(() => setStored(state), [state]);

  const notify = (msg) => window.Notification && new Notification(msg);
  const onSessionEnd = (mode) => {
    dispatch({ type: "ADD_SESSION", payload: { mode, timestamp: Date.now() } });
    notify(mode === "work" ? "Pomodoro terminat" : "Pauză terminată");
  };

  const { mode, timeLeft, start, pause, reset } = usePomodoro(
    state,
    onSessionEnd
  );
  useEffect(() => {
    if (Notification.permission !== "granted") Notification.requestPermission();
  }, []);

  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Pomodoro</h2>
      <div className="text-center space-y-4">
        <div className="text-6xl">
          {minutes}:{seconds}
        </div>
        <div>{mode === "work" ? "Lucru" : "Pauză"}</div>
        <div className="space-x-2">
          <button
            onClick={start}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Start
          </button>
          <button
            onClick={pause}
            className="px-4 py-2 bg-yellow-600 text-white rounded"
          >
            Pauză
          </button>
          <button
            onClick={reset}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
