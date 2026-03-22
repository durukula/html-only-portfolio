document.addEventListener("DOMContentLoaded", () => {
  const TASKS_STORAGE_KEY = "portfolio.todo.tasks";
  const PERSIST_PREFERENCE_KEY = "portfolio.todo.remember";

  const todoInputEl = document.getElementById("todoInput");
  const addTaskButtonEl = document.getElementById("addTodoButton");
  const taskListEl = document.getElementById("todoList");
  const rememberTasksEl = document.getElementById("rememberTasks");
  const inputErrorEl = document.getElementById("inputError");
  const emptyStateEl = document.getElementById("emptyState");
  const counterTotalEl = document.getElementById("counterTotal");
  const counterCompletedEl = document.getElementById("counterCompleted");
  const counterRemainingEl = document.getElementById("counterRemaining");
  const filterAllEl = document.getElementById("filterAll");
  const filterRemainingEl = document.getElementById("filterRemaining");
  const filterCompletedEl = document.getElementById("filterCompleted");

  let activeFilter = "all";

  function getActiveStorage() {
    return rememberTasksEl.checked ? localStorage : sessionStorage;
  }

  function createTaskId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function parseTasks(rawJson) {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => ({
        id: String(item.id ?? createTaskId()),
        text: String(item.text ?? ""),
        completed: Boolean(item.completed),
      }))
      .filter((task) => task.text.trim().length > 0);
  }

  function getTasks() {
    try {
      const raw = getActiveStorage().getItem(TASKS_STORAGE_KEY);
      if (!raw) return [];
      return parseTasks(raw);
    } catch {
      return [];
    }
  }

  function setTasks(tasks) {
    getActiveStorage().setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }

  function readPersistPreference() {
    return localStorage.getItem(PERSIST_PREFERENCE_KEY) === "true";
  }

  function writePersistPreference(nextValue) {
    localStorage.setItem(PERSIST_PREFERENCE_KEY, nextValue ? "true" : "false");
  }

  function moveStoredTasks(fromStorage, toStorage) {
    const raw = fromStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) return;
    toStorage.setItem(TASKS_STORAGE_KEY, raw);
    fromStorage.removeItem(TASKS_STORAGE_KEY);
  }

  function updateTaskCounters(tasks) {
    const total = tasks.length;
    const completed = tasks.reduce((acc, t) => acc + (t.completed ? 1 : 0), 0);
    const remaining = total - completed;

    counterTotalEl.textContent = String(total);
    counterCompletedEl.textContent = String(completed);
    counterRemainingEl.textContent = String(remaining);
  }

  function setEmptyStateVisible(isVisible) {
    emptyStateEl.classList.toggle("hidden", !isVisible);
  }

  function setEmptyStateMessage(message) {
    emptyStateEl.textContent = message;
  }

  function showInputError(message) {
    inputErrorEl.textContent = message;
    inputErrorEl.classList.remove("hidden");
  }

  function hideInputError() {
    inputErrorEl.classList.add("hidden");
  }

  function toggleTaskCompleted(taskId) {
    const tasks = getTasks();
    const nextTasks = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    setTasks(nextTasks);
    render();
  }

  function editTaskText(taskId, nextText) {
    const text = String(nextText ?? "").trim();
    if (!text) {
      showInputError("Please enter a task.");
      return;
    }
    hideInputError();

    const tasks = getTasks();
    const nextTasks = tasks.map((t) => (t.id === taskId ? { ...t, text } : t));
    setTasks(nextTasks);
    render();
  }

  function deleteTask(taskId) {
    const tasks = getTasks();
    const nextTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(nextTasks);
    render();
  }

  function setActiveFilter(nextFilter) {
    activeFilter = nextFilter;
    render();
  }

  function updateFilterTabs() {
    const tabs = [
      { id: "all", el: filterAllEl },
      { id: "remaining", el: filterRemainingEl },
      { id: "completed", el: filterCompletedEl },
    ];

    tabs.forEach((tab) => {
      const isActive = tab.id === activeFilter;
      tab.el.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  function getVisibleTasks(tasks) {
    if (activeFilter === "completed") return tasks.filter((t) => t.completed);
    if (activeFilter === "remaining") return tasks.filter((t) => !t.completed);
    return tasks;
  }

  function createTaskListItem(task) {
    const li = document.createElement("li");
    li.className = "group flex w-full min-w-0 items-start justify-between gap-4 py-4";

    const left = document.createElement("div");
    left.className = "flex items-center gap-3 min-w-0 flex-1";

    const right = document.createElement("div");
    right.className = "flex items-center gap-2 shrink-0";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.className = "mt-0.5 h-5 w-5 accent-[#B02A1B] shrink-0";
    checkbox.addEventListener("change", () => toggleTaskCompleted(task.id));

    const text = document.createElement("p");
    text.className = "text-sm font-semibold text-[#161317] min-w-0 break-words break-all";
    text.textContent = task.text;

    left.appendChild(checkbox);
    left.appendChild(text);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "text-xs font-extrabold uppercase tracking-wide text-[#56483B] transition hover:text-[#161317] focus:outline-none focus:ring-2 focus:ring-[#B02A1B]/40";
    editButton.textContent = "Edit";

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "shrink-0 text-xs font-extrabold uppercase tracking-wide text-[#B02A1B] transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-[#B02A1B]/40";
    removeButton.textContent = "Delete";
    removeButton.addEventListener("click", () => deleteTask(task.id));

    function applyCompletedStyles() {
      const isCompleted = checkbox.checked;
      text.classList.toggle("line-through", isCompleted);
      text.classList.toggle("opacity-60", isCompleted);
      li.classList.toggle("opacity-70", isCompleted);
    }

    function enterEditMode() {
      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.value = task.text;
      editInput.className = "min-w-0 flex-1 bg-transparent px-0 py-1 text-sm font-semibold text-[#161317] outline-none border-b border-black/15 focus:border-[#B02A1B]";

      left.replaceChild(editInput, text);

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = editButton.className;
      saveButton.textContent = "Save";

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "text-xs font-extrabold uppercase tracking-wide text-[#56483B] transition hover:text-[#161317] focus:outline-none focus:ring-2 focus:ring-[#B02A1B]/40";
      cancelButton.textContent = "Cancel";

      function save() {
        editTaskText(task.id, editInput.value);
      }

      function cancel() {
        render();
      }

      saveButton.addEventListener("click", save);
      cancelButton.addEventListener("click", cancel);
      editInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
      });

      right.replaceChildren(saveButton, cancelButton, removeButton);
      editInput.focus();
      editInput.select();
    }

    editButton.addEventListener("click", enterEditMode);

    applyCompletedStyles();
    checkbox.addEventListener("change", applyCompletedStyles);

    li.appendChild(left);
    right.appendChild(editButton);
    right.appendChild(removeButton);
    li.appendChild(right);

    return li;
  }

  function render() {
    taskListEl.innerHTML = "";
    updateFilterTabs();

    const tasks = getTasks();
    const visibleTasks = getVisibleTasks(tasks);
    updateTaskCounters(tasks);

    let emptyMessage = "No tasks yet. Add your first task above.";
    if (tasks.length > 0 && activeFilter === "completed") emptyMessage = "No completed tasks yet.";
    if (tasks.length > 0 && activeFilter === "remaining") emptyMessage = "No remaining tasks.";
    setEmptyStateMessage(emptyMessage);
    setEmptyStateVisible(visibleTasks.length === 0);

    visibleTasks.forEach((task) => {
      taskListEl.appendChild(createTaskListItem(task));
    });
  }

  function addTaskFromInput() {
    const text = todoInputEl.value.trim();
    if (!text) {
      showInputError("Please enter a task.");
      return;
    }
    hideInputError();

    const tasks = getTasks();
    const newTask = { id: createTaskId(), text, completed: false };
    setTasks([newTask, ...tasks]);
    todoInputEl.value = "";
    render();
  }

  function syncPersistenceToggle() {
    rememberTasksEl.checked = readPersistPreference();
  }

  function handlePersistToggleChange() {
    const fromStorage = rememberTasksEl.checked ? sessionStorage : localStorage;
    const toStorage = rememberTasksEl.checked ? localStorage : sessionStorage;
    moveStoredTasks(fromStorage, toStorage);
    writePersistPreference(rememberTasksEl.checked);
    render();
  }

  addTaskButtonEl.addEventListener("click", addTaskFromInput);
  todoInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTaskFromInput();
  });

  filterAllEl.addEventListener("click", () => setActiveFilter("all"));
  filterRemainingEl.addEventListener("click", () => setActiveFilter("remaining"));
  filterCompletedEl.addEventListener("click", () => setActiveFilter("completed"));

  syncPersistenceToggle();
  rememberTasksEl.addEventListener("change", handlePersistToggleChange);

  render();
});
