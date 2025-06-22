import React, { useEffect, useState } from "react";

// Hook pentru a citi task-urile din localStorage
function useLocalTasks() {
  const [tasks] = useState(() => {
    const stored = localStorage.getItem("tasks");
    return stored ? JSON.parse(stored) : [];
  });
  return tasks;
}

// Generează matricea de săptămâni pentru o lună dată
function generateMonth(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const weeks = [];
  let current = new Date(firstDay);
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

export default function Calendar({ setPage }) {
  const tasks = useLocalTasks();
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

  useEffect(() => {
    // Load GAPI client
    const script1 = document.createElement("script");
    script1.src = "https://apis.google.com/js/api.js";
    script1.onload = () => {
      window.gapi.load("client", () => {
        window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
      });
    };
    document.body.appendChild(script1);

    // Load Google Identity Services
    const script2 = document.createElement("script");
    script2.src = "https://accounts.google.com/gsi/client";
    script2.onload = initGoogleAuth;
    document.body.appendChild(script2);

    return () => {
      document.body.removeChild(script1);
      document.body.removeChild(script2);
    };
  }, []);

  // Initialize GIS
  const initGoogleAuth = () => {
    window.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) return console.error(resp.error);
        setIsSignedIn(true);
        fetchGoogleEvents();
      },
    });
  };

  // Fetch events from Google Calendar
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
    window.google.accounts.oauth2.revoke(
      window.gapi.client.getToken().access_token
    );
    setIsSignedIn(false);
    setEvents([]);
  };

  // Normalizează data pentru a evita decalajul fusului orar
  const normalizeDate = (dateStr) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dt = new Date(year, month - 1, day);
    return dt.toISOString().split("T")[0];
  };

  // Insert tasks to Google Calendar
  const addTasksToGoogleCalendar = (tasksToAdd) => {
    tasksToAdd.forEach((task) => {
      const date = normalizeDate(task.deadline);
      window.gapi.client.calendar.events
        .insert({
          calendarId: "primary",
          resource: {
            summary: task.title,
            description: task.description,
            start: { date },
            end: { date },
          },
        })
        .then(fetchGoogleEvents)
        .catch((err) => console.error("Error inserting event:", err));
    });
  };

  // Build calendar grid
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const weeks = generateMonth(year, month);

  // Only Google events until tasks added
  const allEvents = events.map((ev) => ({
    summary: ev.summary,
    date: ev.start.dateTime ? ev.start.dateTime.split("T")[0] : ev.start.date,
    labelColor: "#34D399",
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Calendar</h1>
        <div className="space-x-2">
          <button
            onClick={() => setPage("dashboard")}
            className="px-4 py-2 bg-gray-600 rounded-full"
          >
            Dashboard
          </button>
          {isSignedIn ? (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 rounded-full"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              className="px-4 py-2 bg-blue-600 rounded-full"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Month Navigation */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="px-3 py-1 bg-gray-700 rounded-full"
        >
          Prev
        </button>
        <h2 className="text-2xl font-semibold">
          {currentDate.toLocaleString("default", {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="px-3 py-1 bg-gray-700 rounded-full"
        >
          Next
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weeks.flat().map((day) => {
          const key = day.toISOString().split("T")[0];
          const isCurrent = day.getMonth() === month;
          const dayEvents = allEvents.filter((e) => e.date === key);
          return (
            <div
              key={key}
              className={`${
                isCurrent ? "bg-gray-800" : "bg-gray-700/40"
              } p-2 rounded-lg h-28 flex flex-col`}
            >
              <div className="text-sm mb-1">{day.getDate()}</div>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {dayEvents.map((e, i) => (
                  <div
                    key={i}
                    className="text-xs truncate rounded px-1"
                    style={{ backgroundColor: e.labelColor }}
                  >
                    {e.summary}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="mt-6 flex space-x-2">
        <button
          onClick={() => addTasksToGoogleCalendar(tasks)}
          className="px-4 py-2 bg-green-500 rounded-full"
        >
          Add All Tasks
        </button>
        <button
          onClick={() => setSelectModalOpen(true)}
          className="px-4 py-2 bg-purple-500 rounded-full"
        >
          Select Tasks
        </button>
      </div>

      {/* Modal Select Tasks */}
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
