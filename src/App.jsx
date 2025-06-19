import React from "react";
import Dashboard from "./Dashboard";
import Pomodoro from "./Pomodoro";
import Analytics from "./Analytics";
import Settings from "./Settings";

export default function App() {
  const [page, setPage] = React.useState("dashboard");
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pomodoro Task Manager</h1>
        <nav className="space-x-4">
          {["dashboard", "pomodoro", "analytics", "settings"].map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className="hover:underline"
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Toggle Dark
          </button>
        </nav>
      </header>
      <main className="p-4">
        {page === "dashboard" && <Dashboard />}
        {page === "pomodoro" && <Pomodoro />}
        {page === "analytics" && <Analytics />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
