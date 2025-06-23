import React, { useReducer, useState, useRef, useEffect } from "react";

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

// Reducer for managing tasks
function taskReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.payload];
    case "REMOVE":
      return state.filter((task) => task.id !== action.payload);
    case "REORDER":
      return action.payload;
    default:
      return state;
  }
}

// Helper for background color based on deadline proximity
function getDeadlineColor(deadline) {
  if (!deadline) return "#4B5563";
  const now = new Date();
  const dl = new Date(deadline);
  const diffDays = (dl - now) / (1000 * 60 * 60 * 24);
  if (dl < now) return "#B91C1C";
  if (diffDays <= 1) return "#F87171";
  if (diffDays <= 3) return "#FBBF24";
  return "#34D399";
}

export default function Dashboard({ setPage, setSelectedTask }) {
  // tasks state
  const [storedTasks, setStoredTasks] = useLocalStorage("tasks", []);
  const [allTaskProgress, setAllTaskProgress] = useLocalStorage(
    "allTaskProgress",
    {}
  );
  const [selectedTaskLS, setSelectedTaskLS] = useLocalStorage(
    "selectedTask",
    null
  );
  const [tasks, dispatch] = useReducer(taskReducer, storedTasks);
  useEffect(() => setStoredTasks(tasks), [tasks]);

  // form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labelName, setLabelName] = useState("");
  const [labelColor, setLabelColor] = useState("#34D399");
  const [dailyHours, setDailyHours] = useState("");
  const [estimatedFinish, setEstimatedFinish] = useState("");
  const [deadline, setDeadline] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [selectedTask, setSelectedTaskState] = useState(selectedTaskLS);

  const today = new Date().toISOString().split("T")[0];

  // view toggle
  const [viewMode, setViewMode] = useState("label");
  // modal for viewing a task
  const [modalTask, setModalTask] = useState(null);
  // modal for creating a task
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // drag & drop
  const dragItem = useRef();
  const dragOverItem = useRef();

  const onDragStart = (_, index) => {
    dragItem.current = index;
  };

  const onDragEnter = (_, index) => {
    dragOverItem.current = index;
  };

  const onDragEnd = () => {
    const list = Array.from(tasks);
    const draggedItemContent = list.splice(dragItem.current, 1)[0];
    list.splice(dragOverItem.current, 0, draggedItemContent);

    dispatch({ type: "REORDER", payload: list });

    dragItem.current = null;
    dragOverItem.current = null;
  };

  const isValid = () => {
    return (
      title.trim() !== "" &&
      description.trim() !== "" &&
      labelName.trim() !== "" &&
      deadline.trim() !== ""
    );
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLabelName("");
    setLabelColor("#34D399");
    setDailyHours("");
    setDailyMinutes("");
    setEstimatedFinish("");
    setDeadline("");
    setEditingTaskId(null); // foarte important!
  };

  // add new task
  const addTask = () => {
    if (!isValid()) return;

    if (editingTaskId) {
      // UPDATE
      const updatedTasks = tasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              title,
              description,
              labelName,
              labelColor,
              dailyHours: dailyHours || null,
              dailyMinutes: dailyMinutes || null,
              estimatedFinish: estimatedFinish || null,
              deadline: deadline || null,
            }
          : task
      );
      dispatch({ type: "REORDER", payload: updatedTasks });

      // 🔑 Update selectedTask și LS dacă task-ul editat e cel selectat
      if (selectedTask && selectedTask.id === editingTaskId) {
        const updated = updatedTasks.find((t) => t.id === editingTaskId);
        setSelectedTaskState(updated);
        setSelectedTask(updated);
        setSelectedTaskLS(updated);
      }

      setEditingTaskId(null);
    } else {
      // ADD nou
      const newTask = {
        id: Date.now(),
        title,
        description,
        labelName,
        labelColor,
        dailyHours: dailyHours || null,
        dailyMinutes: dailyMinutes || null,
        estimatedFinish: estimatedFinish || null,
        deadline: deadline || null,
      };
      dispatch({ type: "ADD", payload: newTask });
    }

    resetForm();
  };

  const removeTask = (id) => {
    dispatch({ type: "REMOVE", payload: id });

    // 🔑 Șterge progresul din allTaskProgress
    const updatedProgress = { ...allTaskProgress };
    Object.keys(updatedProgress).forEach((key) => {
      if (key.startsWith(`${id}_`)) {
        delete updatedProgress[key];
      }
    });
    setAllTaskProgress(updatedProgress);

    // 🔑 Dacă ștergi task-ul selectat => reset
    if (selectedTask && selectedTask.id === id) {
      setSelectedTaskState(null);
      setSelectedTask(null);
      setSelectedTaskLS(null);
    }
  };

  return (
    <div className="container bg-gray-900">
      <div className="container mx-auto py-8 space-y-8">
        {/* Toolbar */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode("label")}
              className={`px-4 py-2 rounded-full transition ${
                viewMode === "label"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              Show Label
            </button>
            <button
              onClick={() => setViewMode("deadline")}
              className={`ml-2 px-4 py-2 rounded-full transition ${
                viewMode === "deadline"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              Show Deadline
            </button>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
          >
            + New Task
          </button>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.length > 0 ? (
            tasks.map((t, idx) => {
              const bg =
                viewMode === "label"
                  ? t.labelColor
                  : getDeadlineColor(t.deadline);
              return (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragEnter={(e) => onDragEnter(e, idx)}
                  onDragEnd={onDragEnd}
                  style={{ backgroundColor: bg }}
                  className="p-6 rounded-2xl text-white cursor-move shadow-lg flex flex-col transition hover:shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-xl">#{idx + 1}</span>
                    {t.labelName && (
                      <span
                        className="px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full"
                        style={{ backgroundColor: t.labelColor }}
                      >
                        {t.labelName}
                      </span>
                    )}
                  </div>
                  <h3 className="text-3xl font-extrabold mb-2 leading-tight">
                    {t.title}
                  </h3>
                  <p className="text-base mb-6 flex-1">{t.description}</p>
                  <div className="border-t border-white/20 pt-4 text-sm space-y-2 mb-6 opacity-80">
                    {(t.dailyHours || t.dailyMinutes) && (
                      <div>
                        <strong>Time/Day: </strong>
                        {t.dailyHours ? `${t.dailyHours}h` : ""}
                        {t.dailyMinutes ? ` ${t.dailyMinutes}m` : ""}
                      </div>
                    )}
                    {t.estimatedFinish && (
                      <div>
                        <strong>Est. Finish:</strong>{" "}
                        {new Date(t.estimatedFinish).toLocaleDateString()}
                      </div>
                    )}
                    {t.deadline && (
                      <div>
                        <strong>Deadline:</strong>{" "}
                        {new Date(t.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="mt-auto flex justify-end gap-3">
                    <button
                      onClick={() => setModalTask(t)}
                      className="px-4 py-2 bg-white text-gray-800 rounded-lg text-sm transition hover:bg-gray-100"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setSelectedTaskState(t);
                        setSelectedTask(t);
                        setSelectedTaskLS(t);
                        setPage("pomodoro");
                      }}
                      className="px-4 py-2 bg-green-400 hover:bg-green-500 rounded-lg text-sm transition"
                    >
                      Start
                    </button>
                    <button
                      onClick={() => removeTask(t.id)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm transition"
                    >
                      End
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="col-span-full text-center text-gray-400">
              No tasks. Add one via “+ New Task”!
            </p>
          )}
        </div>
      </div>

      {/* ==== CREATE TASK MODAL ==== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-11/12 max-w-lg overflow-hidden">
            {/* — accent bar removed — */}

            {/* Form contents: single column */}
            <div className="p-6 grid grid-cols-1 gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
              />
              <input
                type="text"
                value={labelName}
                onChange={(e) => setLabelName(e.target.value)}
                placeholder="Label Name"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
              />
              <input
                type="color"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
                className="h-10 rounded-lg border-none w-full"
              />
              <input
                type="number"
                value={dailyHours}
                onChange={(e) => setDailyHours(e.target.value)}
                placeholder="Hours/Day (optional)"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
                min="0"
              />
              <input
                type="number"
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(e.target.value)}
                placeholder="Minutes/Day (optional)"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
                min="0"
                max="59"
              />
              <input
                type={estimatedFinish ? "date" : "text"}
                value={estimatedFinish}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                onChange={(e) => setEstimatedFinish(e.target.value)}
                placeholder="Estimated date for finishing the task (optional)"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
                min={today}
              />
              <input
                type={deadline ? "date" : "text"}
                value={deadline}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => {
                  if (!e.target.value) e.target.type = "text";
                }}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="Deadline for finishing the task"
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 w-full"
                min={today}
              />
            </div>

            {/* Action bar */}
            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between">
              <button
                onClick={() => {
                  resetForm();
                  setIsCreateOpen(false);
                }}
                className="text-white hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addTask();
                  if (isValid()) setIsCreateOpen(false);
                }}
                disabled={!isValid()}
                className={`px-4 py-2 ${
                  isValid()
                    ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                    : "bg-gray-400 cursor-not-allowed"
                } text-white rounded-lg transition`}
              >
                {editingTaskId ? "Update Task" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==== VIEW TASK MODAL ==== */}
      {modalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg w-11/12 max-w-md overflow-hidden">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold">{modalTask.title}</h2>
            </div>
            <div className="p-4 space-y-2 text-gray-800 dark:text-gray-100">
              <p>
                <strong>Description:</strong> {modalTask.description}
              </p>
              {modalTask.labelName && (
                <p>
                  <strong>Label:</strong> {modalTask.labelName}
                </p>
              )}
              {(modalTask.dailyHours || modalTask.dailyMinutes) && (
                <p>
                  <strong>Time/Day: </strong>
                  {modalTask.dailyHours ? `${modalTask.dailyHours}h` : ""}
                  {modalTask.dailyMinutes ? ` ${modalTask.dailyMinutes}m` : ""}
                </p>
              )}
              {modalTask.estimatedFinish && (
                <p>
                  <strong>Est. Finish:</strong>{" "}
                  {new Date(modalTask.estimatedFinish).toLocaleDateString()}
                </p>
              )}
              {modalTask.deadline && (
                <p>
                  <strong>Deadline:</strong>{" "}
                  {new Date(modalTask.deadline).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="p-4 border-t flex justify-center gap-4 dark:border-gray-700">
              <button
                onClick={() => setModalTask(null)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedTask(modalTask);
                  setSelectedTaskLS(modalTask);
                  setPage("pomodoro");
                  setModalTask(null);
                }}
                className="px-3 py-1 bg-green-400 text-white rounded-lg hover:bg-green-500 transition"
              >
                Start
              </button>
              <button
                onClick={() => {
                  removeTask(modalTask.id);
                  setModalTask(null);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                End
              </button>
              <button
                onClick={() => {
                  // Populează formularul cu datele task-ului
                  setTitle(modalTask.title);
                  setDescription(modalTask.description);
                  setLabelName(modalTask.labelName);
                  setLabelColor(modalTask.labelColor || "#34D399");
                  setDailyHours(modalTask.dailyHours || "");
                  setDailyMinutes(modalTask.dailyMinutes || "");
                  setEstimatedFinish(modalTask.estimatedFinish || "");
                  setDeadline(modalTask.deadline || "");
                  setEditingTaskId(modalTask.id); // ADĂUGĂ ASTA!
                  setModalTask(null); // închide modalul de View
                  setIsCreateOpen(true); // deschide modalul de Create/Edit
                }}
                className="px-3 py-1 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
