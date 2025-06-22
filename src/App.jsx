import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import Pomodoro from "./Pomodoro";
import Analytics from "./Analytics";
import SettingsPage from "./Settings";

// Hook comun de LocalStorage
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
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

function Navbar({ page, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode((prev) => !prev);
  };

  return (
    <header className="max-w-6xl mx-auto bg-white/90 dark:bg-gray-800/90 backdrop-blur shadow sticky top-[3px] z-50 rounded-2xl">
      <div className="w-full flex flex-col py-4 px-6">
        <div className="relative flex items-center w-full">
          <h1 className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-extrabold">
            Pomodoro Task Manager
          </h1>
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle Dark Mode"
            className="ml-auto p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <span className="text-lg">{darkMode ? "🌞" : "🌙"}</span>
          </button>
        </div>
        <nav className="mt-4 flex justify-center flex-wrap gap-4 w-full">
          {navItems.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={
                `flex items-center space-x-2 py-2 px-4 rounded-full transition-all duration-200 ` +
                (page === key
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600")
              }
            >
              <span className="text-lg">{emoji}</span>
              <span className="font-medium">{label}</span>
            </button>
          ))}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            aria-label="Toggle Menu"
          >
            <span className="text-2xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </nav>
        {menuOpen && (
          <div className="md:hidden mt-2 flex flex-col items-center gap-2">
            {navItems.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => {
                  setPage(key);
                  setMenuOpen(false);
                }}
                className={
                  `flex items-center space-x-2 py-2 px-4 rounded-full transition-all duration-200 ` +
                  (page === key
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600")
                }
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
  // persist pagina curentă
  const [page, setPage] = useLocalStorage("currentPage", "dashboard");
  // persist task-ul selectat
  const [selectedTask, setSelectedTask] = useLocalStorage("selectedTask", null);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar page={page} setPage={setPage} />
      <main className="py-8 px-6 max-w-6xl mx-auto space-y-8">
        {page === "dashboard" && (
          <Dashboard setPage={setPage} setSelectedTask={setSelectedTask} />
        )}
        {page === "pomodoro" && (
          <Pomodoro selectedTask={selectedTask} setPage={setPage} />
        )}
        {page === "analytics" && <Analytics />}
        {page === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}
