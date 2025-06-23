import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import Pomodoro from "./Pomodoro";
import Analytics from "./Analytics";
import CalendarPage from "./Calendar";

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

const navItems = [
  { key: "dashboard", label: "Dashboard", emoji: "🏠" },
  { key: "pomodoro", label: "Pomodoro", emoji: "⏱️" },
  { key: "analytics", label: "Analytics", emoji: "📊" },
  { key: "calendar", label: "Calendar", emoji: "⚙️" },
];

function Navbar({ page, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const otherPages = navItems.filter((item) => item.key !== page);
  const currentPage = navItems.find((item) => item.key === page);

  return (
    <header className="max-w-6xl mx-auto bg-gray-800/90 backdrop-blur shadow sticky top-[3px] z-50 rounded-2xl">
      <div className="w-full flex flex-col py-4 px-6">
        <div className="relative flex items-center w-full py-5">
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-extrabold">
            Pomodoro Task Manager
          </h1>
        </div>

        <nav className="mt-4 hidden md:flex justify-center flex-wrap gap-4 w-full">
          {navItems.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={
                `flex items-center space-x-2 py-2 px-4 rounded-full transition-all duration-200 ` +
                (page === key
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-700 text-white hover:bg-gray-600")
              }
            >
              <span className="text-lg">{emoji}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>

        <nav className="mt-4 flex md:hidden justify-center flex-wrap gap-4 w-full">
          <button
            key={currentPage.key}
            className="flex items-center space-x-2 py-2 px-4 rounded-full bg-blue-500 text-white shadow-lg"
          >
            <span className="text-lg">{currentPage.emoji}</span>
            <span className="font-medium">{currentPage.label}</span>
          </button>

          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 transition"
            aria-label="Toggle Menu"
          >
            <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </nav>

        {menuOpen && (
          <div className="mt-2 flex flex-col items-start ml-20 gap-2 md:hidden">
            {otherPages.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => {
                  setPage(key);
                  setMenuOpen(false);
                }}
                className="flex items-center space-x-2 py-2 px-4 rounded-full bg-gray-700 text-white hover:bg-gray-600 transition-all duration-200"
              >
                <span className="text-lg">{emoji}</span>
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

export default function App() {
  const [page, setPage] = useLocalStorage("currentPage", "dashboard");
  const [selectedTask, setSelectedTask] = useLocalStorage("selectedTask", null);

  return (
    <div className="min-h-screen bg-white bg-gray-900 text-gray-900 text-gray-100">
      <Navbar page={page} setPage={setPage} />
      <main className="py-8 px-6 max-w-6xl mx-auto space-y-8">
        {page === "dashboard" && (
          <Dashboard setPage={setPage} setSelectedTask={setSelectedTask} />
        )}
        {page === "pomodoro" && (
          <Pomodoro selectedTask={selectedTask} setPage={setPage} />
        )}
        {page === "analytics" && <Analytics />}
        {page === "calendar" && <CalendarPage />}
      </main>
    </div>
  );
}
