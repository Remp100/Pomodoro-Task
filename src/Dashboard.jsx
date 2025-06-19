import React, { useReducer, useState, useRef, useEffect } from "react";

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

// Reducer for Tasks
function taskReducer(state, action) {
  switch (action.type) {
    case "ADD":
      return [...state, action.payload];
    case "REORDER":
      return action.payload;
    default:
      return state;
  }
}

export default function Dashboard() {
  const [storedTasks, setStoredTasks] = useLocalStorage("tasks", []);
  const [tasks, dispatch] = useReducer(taskReducer, storedTasks);
  useEffect(() => setStoredTasks(tasks), [tasks]);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const dragItem = useRef();
  const dragOverItem = useRef();

  const addTask = () => {
    if (!title.trim()) return;
    dispatch({ type: "ADD", payload: { id: Date.now(), title, desc } });
    setTitle("");
    setDesc("");
  };

  const onDragStart = (_, index) => {
    dragItem.current = index;
  };
  const onDragEnter = (_, index) => {
    dragOverItem.current = index;
  };
  const onDragEnd = () => {
    const list = Array.from(tasks);
    const item = list.splice(dragItem.current, 1)[0];
    list.splice(dragOverItem.current, 0, item);
    dispatch({ type: "REORDER", payload: list });
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <div className="mb-4 space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titlu"
          className="border p-2 w-full"
        />
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Descriere"
          className="border p-2 w-full"
        />
        <button
          onClick={addTask}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Adaugă Task
        </button>
      </div>
      <ul>
        {tasks.map((t, idx) => (
          <li
            key={t.id}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragEnter={(e) => onDragEnter(e, idx)}
            onDragEnd={onDragEnd}
            className="p-4 mb-2 border rounded bg-gray-50 dark:bg-gray-800"
          >
            <h3 className="font-bold">{t.title}</h3>
            <p>{t.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
