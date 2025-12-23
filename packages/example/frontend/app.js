const API_URL = "http://localhost:8080"
const todoList = document.getElementById("todoList")
const userIdInput = document.getElementById("userId")

// Encapsulated API handlers
const api = {
  todo: {
    query: async (userId, condition) =>
      await fetch(`${API_URL}/todo/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-userid": userId,
        },
        body: JSON.stringify(condition),
      }).then((res) => res.json()),

    insert: async (todo, userId) =>
      await fetch(`${API_URL}/todo/insert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-userid": userId,
        },
        body: JSON.stringify(todo),
      }),

    get: async (id, userId) =>
      await fetch(`${API_URL}/todo/detail/${id}`, {
        method: "GET",
        headers: {"x-userid": userId},
      }).then((res) => res.json()),

    update: async (id, updates, userId) =>
      await fetch(`${API_URL}/todo/modify/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-userid": userId,
        },
        body: JSON.stringify(updates),
      }),

    delete: async (id, userId) =>
      await fetch(`${API_URL}/todo/${id}`, {
        method: "DELETE",
        headers: {"x-userid": userId},
      }),
  },
}

// Fetch and display todos
async function loadTodos() {
  const userId = userIdInput.value.trim()
  if (!userId) {
    alert("Please enter a User ID.")
    return
  }

  const todos = await api.todo.query(userId, {
    condition: {owner: {Equal: userId}},
  })

  todoList.innerHTML = ""
  todos.forEach((todo) => {
    const todoItem = document.createElement("div")
    todoItem.className = `todo-item ${todo.done ? "completed" : ""}`
    todoItem.innerHTML = `
      <span>${todo.todoItem}</span>
      <div>
        <button onclick="toggleTodo('${todo._id}')">${
      todo.done ? "Undo" : "Complete"
    }</button>
        <button onclick="deleteTodo('${todo._id}')">Delete</button>
      </div>
    `
    todoList.appendChild(todoItem)
  })
}

// Add a new todo
async function addTodo(event) {
  event.preventDefault()
  const userId = userIdInput.value.trim()
  const newTodoItem = document.getElementById("newTodoItem").value.trim()

  if (!userId || !newTodoItem) {
    alert("Please enter a User ID and Todo item.")
    return
  }

  await api.todo.insert(
    {
      _id: crypto.randomUUID(),
      todoItem: newTodoItem,
      owner: userId,
      done: false,
    },
    userId
  )

  document.getElementById("newTodoItem").value = ""
  loadTodos()
}

// Toggle todo completion
async function toggleTodo(id) {
  const userId = userIdInput.value.trim()
  if (!userId) {
    alert("Please enter a User ID.")
    return
  }

  const todo = await api.todo.get(id, userId)

  await api.todo.update(id, {done: !todo.done}, userId)

  loadTodos()
}

// Delete a todo
async function deleteTodo(id) {
  const userId = userIdInput.value.trim()
  if (!userId) {
    alert("Please enter a User ID.")
    return
  }

  await api.todo.delete(id, userId)

  loadTodos()
}

document.getElementById("loadTodos").addEventListener("click", loadTodos)
document.getElementById("addTodoForm").addEventListener("submit", addTodo)
