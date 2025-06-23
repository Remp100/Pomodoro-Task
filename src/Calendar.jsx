import React, { useEffect, useState } from "react";

// Hook pentru a citi și actualiza task-urile în localStorage
function useLocalTasks() {
  const [tasks, setTasks] = useState(() => {
    try {
      const stored = localStorage.getItem("tasks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      localStorage.removeItem("tasks");
      return [];
    }
  });

  // Sincronizare dacă se schimbă în alt tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "tasks") {
        try {
          setTasks(e.newValue ? JSON.parse(e.newValue) : []);
        } catch {
          setTasks([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateTask = (taskId, updates) => {
    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      );
      localStorage.setItem("tasks", JSON.stringify(updated));
      return updated;
    });
  };

  return [tasks, updateTask];
}

// Generează matricea de săptămâni pentru o lună anume
function generateMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];
  const current = new Date(firstDay);
  current.setDate(current.getDate() - current.getDay());

  while (current <= lastDay || current.getDay() !== 0) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Normalizează un "YYYY-MM-DD" la același string ISO local, pentru all-day events
function normalizeDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toISOString().split("T")[0];
}

export default function Calendar({ setPage }) {
  const [tasks, updateTask] = useLocalTasks();
  const [events, setEvents] = useState([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isSelectModalOpen, setSelectModalOpen] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);

  // Google API config
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  const DISCOVERY_DOCS = [
    "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
  ];
  const SCOPES = "https://www.googleapis.com/auth/calendar";

  // Încarcă GAPI și GIS la mount
  useEffect(() => {
    const s1 = document.createElement("script");
    s1.src = "https://apis.google.com/js/api.js";
    s1.onload = () =>
      window.gapi.load("client", () =>
        window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        })
      );
    document.body.appendChild(s1);

    const s2 = document.createElement("script");
    s2.src = "https://accounts.google.com/gsi/client";
    s2.onload = initGoogleAuth;
    document.body.appendChild(s2);

    return () => {
      document.body.removeChild(s1);
      document.body.removeChild(s2);
    };
  }, []);

  // Initialize GIS token client
  const initGoogleAuth = () => {
    window.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          console.error(resp.error);
          return;
        }
        setIsSignedIn(true);
        fetchGoogleEvents();
      },
    });
  };

  // Fetch evenimente din Google Calendar
  const fetchGoogleEvents = () => {
    window.gapi.client.calendar.events
      .list({
        calendarId: "primary",
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 50,
        orderBy: "startTime",
      })
      .then((res) => setEvents(res.result.items || []))
      .catch((err) => console.error("Error fetching events:", err));
  };

  const handleSignIn = () => window.tokenClient.requestAccessToken();
  const handleSignOut = () => {
    const token = window.gapi.client.getToken().access_token;
    window.google.accounts.oauth2.revoke(token);
    setIsSignedIn(false);
    setEvents([]);
  };

  // Adaugă task-uri ca evenimente all-day
  const addTasksToGoogleCalendar = (tasksToAdd) => {
    const inserts = tasksToAdd
      .filter((t) => !t.googleEventId)
      .map((task) => {
        const date = normalizeDate(task.deadline);
        return window.gapi.client.calendar.events
          .insert({
            calendarId: "primary",
            resource: {
              summary: task.title,
              description: task.description,
              start: { date },
              end: { date },
            },
          })
          .then((res) => {
            updateTask(task.id, { googleEventId: res.result.id });
          })
          .catch((err) => console.error("Error inserting event:", err));
      });

    Promise.all(inserts).then(fetchGoogleEvents);
  };

  // Șterge eveniment și curăță googleEventId din task
  const handleDeleteEvent = (eventId) => {
    window.gapi.client.calendar.events
      .delete({ calendarId: "primary", eventId })
      .then(() => {
        tasks.forEach((t) => {
          if (t.googleEventId === eventId) {
            updateTask(t.id, { googleEventId: null });
          }
        });
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      })
      .catch((err) => console.error("Error deleting event:", err));
  };

  // Pregătim datele pentru afișaj
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const weeks = generateMonth(year, month);
  const allEvents = events.map((ev) => ({
    id: ev.id,
    summary: ev.summary,
    date: ev.start.dateTime ? ev.start.dateTime.split("T")[0] : ev.start.date,
    labelColor: "#34D399",
  }));

  const goPrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const goNext = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 flex flex-col">
      {/* HEADER */}
      <header className="mb-4">
        <div className="flex justify-between items-center">
          {/* Stânga: Add All + Select */}
          <div className="flex space-x-2">
            <button
              onClick={() => addTasksToGoogleCalendar(tasks)}
              disabled={!isSignedIn}
              className="px-3 py-1 text-sm sm:text-base bg-green-500 rounded-full disabled:opacity-50"
            >
              Add All
            </button>
            <button
              onClick={() => setSelectModalOpen(true)}
              disabled={!isSignedIn}
              className="px-3 py-1 text-sm sm:text-base bg-purple-500 rounded-full disabled:opacity-50"
            >
              Select
            </button>
          </div>
          {/* Dreapta: Sign In / Sign Out */}
          <div>
            {isSignedIn ? (
              <button
                onClick={handleSignOut}
                className="px-3 py-1 text-sm sm:text-base bg-red-600 rounded-full"
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleSignIn}
                className="px-3 py-1 text-sm sm:text-base bg-blue-600 rounded-full"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Month Navigation */}
      <div className="flex justify-center items-center mb-4 space-x-4">
        <button
          onClick={goPrev}
          className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
          aria-label="Previous month"
        >
          {/* Chevron Left SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Aici afișăm luna + anul */}
        <span className="font-medium text-lg">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </span>

        <button
          onClick={goNext}
          className="p-2 bg-gray-700 rounded-full hover:bg-gray-600"
          aria-label="Next month"
        >
          {/* Chevron Right SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* GRID DESKTOP */}
      <div className="hidden sm:grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="hidden sm:grid grid-cols-7 gap-2 flex-1 overflow-auto">
        {weeks.flat().map((day) => {
          const key = day.toISOString().split("T")[0];
          const isCurrent = day.getMonth() === month;
          const dayEvents = allEvents.filter((e) => e.date === key);

          return (
            <div
              key={key}
              className={`${isCurrent ? "bg-gray-800" : "bg-gray-700/40"}
                          p-2 rounded-lg h-28 flex flex-col`}
            >
              <div className="text-sm mb-1">{day.getDate()}</div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayEvents.map((e) => (
                  <div
                    key={e.id}
                    className="text-xs truncate rounded px-1 py-1 flex justify-between items-center"
                    style={{ backgroundColor: e.labelColor }}
                  >
                    <span className="flex-1">{e.summary}</span>
                    <button
                      onClick={() => handleDeleteEvent(e.id)}
                      aria-label="Delete Event"
                      className="ml-2 w-4 h-5 flex items-center justify-center text-white text-sm font-bold"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* LISTĂ MOBIL */}
      <div className="sm:hidden flex-1 overflow-y-auto space-y-2">
        {weeks.flat().map((day) => {
          const key = day.toISOString().split("T")[0];
          const isCurrent = day.getMonth() === month;
          const dayEvents = allEvents.filter((e) => e.date === key);

          return (
            <div
              key={key}
              className={`${isCurrent ? "bg-gray-800" : "bg-gray-700/40"}
                          p-3 rounded-lg flex flex-col`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">{day.getDate()}</span>
                <span className="text-xs opacity-70">
                  {day.toLocaleString("default", { weekday: "short" })}
                </span>
              </div>

              {dayEvents.length ? (
                <ul className="space-y-1">
                  {dayEvents.map((e) => (
                    <li
                      key={e.id}
                      className="text-sm truncate rounded px-2 py-1 flex justify-between items-center"
                      style={{ backgroundColor: e.labelColor }}
                    >
                      <span className="flex-1">{e.summary}</span>
                      <button
                        onClick={() => handleDeleteEvent(e.id)}
                        aria-label="Delete Event"
                        className="ml-2 text-white font-bold"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs opacity-50">No events</p>
              )}
            </div>
          );
        })}
      </div>

      {/* SELECT TASKS MODAL */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg w-full max-w-5xl">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Select Tasks</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {tasks.map((task) => {
                  const checked = selectedTasks.some((t) => t.id === task.id);
                  return (
                    <div
                      key={task.id}
                      className="p-4 rounded-lg flex flex-col"
                      style={{ backgroundColor: task.labelColor }}
                    >
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked)
                              setSelectedTasks((prev) => [...prev, task]);
                            else
                              setSelectedTasks((prev) =>
                                prev.filter((t) => t.id !== task.id)
                              );
                          }}
                          className="mr-3 mt-1"
                        />
                        <div className="flex-1">
                          <h4 className="text-lg font-bold mb-1">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-sm mb-2">{task.description}</p>
                          )}
                          <div className="text-xs opacity-80 space-y-1">
                            {task.dailyHours && (
                              <div>
                                <strong>Hours/Day:</strong> {task.dailyHours}
                              </div>
                            )}
                            {task.estimatedFinish && (
                              <div>
                                <strong>Est. Finish:</strong>{" "}
                                {new Date(
                                  task.estimatedFinish
                                ).toLocaleDateString()}
                              </div>
                            )}
                            {task.deadline && (
                              <div>
                                <strong>Deadline:</strong>{" "}
                                {new Date(task.deadline).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setSelectModalOpen(false);
                  setSelectedTasks([]);
                }}
                className="px-4 py-2 bg-gray-600 rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addTasksToGoogleCalendar(selectedTasks);
                  setSelectedTasks([]);
                  setSelectModalOpen(false);
                }}
                className="px-4 py-2 bg-purple-600 rounded-full"
              >
                Add Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
