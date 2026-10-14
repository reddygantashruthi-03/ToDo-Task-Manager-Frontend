const API = "http://localhost:8080/api/tasks";
const form = document.querySelector("#task-form");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const dueDateInput = document.querySelector("#dueDate");
const priorityInput = document.querySelector("#priority");
const taskIdInput = document.querySelector("#task-id");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty");
const message = document.querySelector("#message");
const submitButton = document.querySelector("#submit-btn");
const taskCount = document.querySelector("#task-count");
const taskSummary = document.querySelector("#task-summary");
let tasks = [];
let currentFilter = "ALL";

async function request(path = "", options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed (${response.status})`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function showMessage(text = "") { message.textContent = text; }

async function loadTasks() {
  try {
    showMessage("");
    tasks = await request();
    renderTasks();
  } catch (error) {
    showMessage("Could not connect to the backend. Start Spring Boot in the backend folder, then refresh. " + error.message);
    tasks = [];
    renderTasks();
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderTasks() {
  taskList.replaceChildren();
  const completedCount = tasks.filter(task => task.completed).length;
  taskCount.textContent = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}`;
  taskSummary.textContent = ` · ${completedCount} completed`;
  const filtered = tasks.filter(task =>
    currentFilter === "ALL" ||
    (currentFilter === "COMPLETED" && task.completed) ||
    (currentFilter === "PENDING" && !task.completed)
  );
  emptyState.hidden = filtered.length > 0;
  if (!filtered.length) {
    emptyState.querySelector("h2").textContent = tasks.length ? "Nothing in this filter" : "No tasks here yet";
    emptyState.querySelector("p").textContent = tasks.length ? "Try another filter or add a new task." : "Add a task above and make today count.";
  }
  for (const task of filtered) {
    const item = makeElement("li", `task-item${task.completed ? " completed" : ""}`);
    const check = makeElement("button", "check", task.completed ? "✓" : "");
    check.type = "button";
    check.setAttribute("aria-label", task.completed ? "Task completed" : "Mark task completed");
    check.addEventListener("click", () => completeTask(task.id));
    const content = makeElement("div", "task-content");
    content.append(makeElement("div", "task-title", task.title));
    if (task.description) content.append(makeElement("div", "task-description", task.description));
    const meta = makeElement("div", "meta");
    meta.append(makeElement("span", `pill ${task.priority}`, `${task.priority || "MEDIUM"} priority`));
    if (task.dueDate) meta.append(makeElement("span", "pill", `Due ${task.dueDate}`));
    meta.append(makeElement("span", "pill", task.completed ? "Completed" : "Pending"));
    content.append(meta);
    const actions = makeElement("div", "actions");
    const edit = makeElement("button", "action", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => editTask(task));
    const remove = makeElement("button", "action", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteTask(task.id));
    actions.append(edit, remove);
    item.append(check, content, actions);
    taskList.append(item);
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) { showMessage("Please enter a task title."); return; }
  const payload = {
    title,
    description: descriptionInput.value.trim(),
    dueDate: dueDateInput.value || null,
    priority: priorityInput.value
  };
  try {
    showMessage("");
    const id = taskIdInput.value;
    if (id) await request(`/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await request("", { method: "POST", body: JSON.stringify(payload) });
    resetForm();
    await loadTasks();
  } catch (error) { showMessage(error.message); }
});

function editTask(task) {
  taskIdInput.value = task.id;
  titleInput.value = task.title || "";
  descriptionInput.value = task.description || "";
  dueDateInput.value = task.dueDate || "";
  priorityInput.value = task.priority || "MEDIUM";
  submitButton.innerHTML = "Save changes <span>✓</span>";
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function resetForm() {
  form.reset();
  taskIdInput.value = "";
  priorityInput.value = "MEDIUM";
  submitButton.innerHTML = "Add task <span>＋</span>";
}
async function completeTask(id) {
  try { await request(`/${id}/complete`, { method: "PATCH" }); await loadTasks(); }
  catch (error) { showMessage(error.message); }
}
async function deleteTask(id) {
  if (!window.confirm("Delete this task?")) return;
  try { await request(`/${id}`, { method: "DELETE" }); await loadTasks(); }
  catch (error) { showMessage(error.message); }
}
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    renderTasks();
  });
});
loadTasks();
