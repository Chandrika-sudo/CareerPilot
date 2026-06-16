// To Do List module with Native HTML5 Drag and Drop (Page 4)
const TodosController = {
  todos: [],

  async init() {
    await this.loadData();
    this.bindEvents();
    this.render();
  },

  async loadData() {
    try {
      this.todos = await window.SheetsService.loadTodos();
    } catch (err) {
      window.App.showToast("Failed to load todos from DB", "error");
    }
  },

  bindEvents() {
    const addTodoForm = document.getElementById("todo-add-form");
    if (addTodoForm) {
      addTodoForm.onsubmit = async (e) => {
        e.preventDefault();
        const textInput = document.getElementById("todo-new-text");
        const prioritySelect = document.getElementById("todo-new-priority");
        const dateInput = document.getElementById("todo-new-date");

        if (!textInput) return;
        const text = textInput.value.trim();
        const priority = prioritySelect ? prioritySelect.value : "Medium";
        const dueDate = dateInput ? dateInput.value : "";

        if (!text) {
          window.App.showToast("Task description cannot be empty", "error");
          return;
        }

        await this.addNewTodo(text, priority, dueDate);

        // Reset Inputs
        textInput.value = "";
        if (dateInput) dateInput.value = "";
      };
    }
  },

  async addNewTodo(text, priority, dueDate) {
    const newTodo = {
      text,
      priority,
      completed: false,
      dueDate,
      position: this.todos.length
    };

    try {
      const response = await window.SheetsService.addTodo(newTodo);
      this.todos.push(response);
      window.App.showToast("Task added successfully", "success");
      this.render();
      
      if (window.App.activePage === "dashboard") {
        window.DashboardController.init();
      }
    } catch (err) {
      window.App.showToast("Failed to append task", "error");
    }
  },

  async toggleTodoComplete(id) {
    const todo = this.todos.find(x => String(x.id) === String(id));
    if (!todo) return;

    todo.completed = !todo.completed;

    try {
      await window.SheetsService.updateTodo(id, { completed: todo.completed });
      this.render();
      window.App.showToast(todo.completed ? "Task marked complete! Check it off." : "Task marked incomplete", "success");
      
      if (window.App.activePage === "dashboard") {
        window.DashboardController.init();
      }
    } catch (err) {
      window.App.showToast("Failed to save state", "error");
    }
  },

  async deleteTodo(id) {
    try {
      await window.SheetsService.deleteTodo(id);
      this.todos = this.todos.filter(x => String(x.id) !== String(id));
      window.App.showToast("Task deleted", "success");
      this.render();

      if (window.App.activePage === "dashboard") {
        window.DashboardController.init();
      }
    } catch (err) {
      window.App.showToast("Failed to erase task", "error");
    }
  },

  // HTML5 Drag and Drop Handlers
  setupDragAndDrop() {
    const draggableCards = document.querySelectorAll(".task-card");
    const containers = document.querySelectorAll(".task-list");

    draggableCards.forEach(card => {
      card.ondragstart = (e) => {
        card.classList.add("dragging");
        e.dataTransfer.setData("text/plain", card.getAttribute("data-todo-id"));
        e.dataTransfer.effectAllowed = "move";
      };

      card.ondragend = () => {
        card.classList.remove("dragging");
      };
    });

    containers.forEach(container => {
      const priority = container.getAttribute("data-priority");

      container.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        container.classList.add("bg-slate-100/60", "border-indigo-200");
      };

      container.ondragleave = () => {
        container.classList.remove("bg-slate-100/60", "border-indigo-200");
      };

      container.ondrop = async (e) => {
        e.preventDefault();
        container.classList.remove("bg-slate-100/60", "border-indigo-200");
        
        const todoIdStr = e.dataTransfer.getData("text/plain");
        if (!todoIdStr) return;
        const todoId = parseInt(todoIdStr, 10);
        
        const todo = this.todos.find(x => String(x.id) === String(todoId));
        if (!todo) return;

        // Shift priority context if dropped in another column
        if (todo.priority !== priority) {
          todo.priority = priority;
          try {
            await window.SheetsService.updateTodo(todoId, { priority: priority });
            window.App.showToast(`Moved task to ${priority} Priority`, "success");
            this.render();

            if (window.App.activePage === "dashboard") {
              window.DashboardController.init();
            }
          } catch (err) {
            window.App.showToast("Failed to sync drag modification", "error");
          }
        }
      };
    });
  },

  render() {
    const listHigh = document.getElementById("list-high-priority");
    const listMedium = document.getElementById("list-medium-priority");
    const listLow = document.getElementById("list-low-priority");
    const progressText = document.getElementById("todos-progress-text");
    const progressBar = document.getElementById("todos-progress-bar");

    if (!listHigh || !listMedium || !listLow) return;

    // Filter tasks by priority and status
    const highTodos = this.todos.filter(x => x.priority === "High");
    const mediumTodos = this.todos.filter(x => x.priority === "Medium");
    const lowTodos = this.todos.filter(x => x.priority === "Low");

    // Completion percentage
    const totalCount = this.todos.length;
    const completedCount = this.todos.filter(x => x.completed).length;
    const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (progressText) progressText.textContent = `${completedCount} of ${totalCount} tasks completed (${percent}%)`;
    if (progressBar) progressBar.style.width = `${percent}%`;

    const getTodoHTML = (todo) => {
      const isPastDue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;
      const formattedDate = todo.dueDate ? new Date(todo.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No due date";
      return `
        <div class="task-card bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-3 hover:shadow-md hover:border-slate-300 transition-all duration-200" 
             draggable="true" 
             data-todo-id="${todo.id}">
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3 max-w-[85%]">
              <button class="todo-check-btn mt-0.5" data-id="${todo.id}">
                <div class="w-5 h-5 rounded-full border-2 ${todo.completed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'} hover:border-indigo-600 transition-all flex items-center justify-center cursor-pointer">
                  ${todo.completed ? `<svg class="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>` : ''}
                </div>
              </button>
              <div>
                <p class="text-sm font-medium ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'} break-words">${todo.text}</p>
                <div class="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1">
                  <span class="text-[10px] items-center py-0.5 px-1.5 rounded-md font-mono ${isPastDue ? 'bg-red-50 text-red-600 font-bold' : 'bg-slate-100 text-slate-500'}">
                    📅 ${formattedDate}
                  </span>
                </div>
              </div>
            </div>
            
            <button class="todo-delete-btn text-slate-400 hover:text-red-500 transition-colors p-1" data-id="${todo.id}" title="Delete Task">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      `;
    };

    // Render lists contents
    listHigh.innerHTML = highTodos.length ? highTodos.map(getTodoHTML).join("") : `
      <div class="py-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-lg">
        Drag High priority tasks here
      </div>
    `;

    listMedium.innerHTML = mediumTodos.length ? mediumTodos.map(getTodoHTML).join("") : `
      <div class="py-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-lg">
        Drag Medium priority tasks here
      </div>
    `;

    listLow.innerHTML = lowTodos.length ? lowTodos.map(getTodoHTML).join("") : `
      <div class="py-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-lg">
        Drag Low priority tasks here
      </div>
    `;

    // Setup drag handling binds
    this.setupDragAndDrop();

    // Bind checkboxes and deletion buttons
    document.querySelectorAll(".todo-check-btn").forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        this.toggleTodoComplete(id);
      };
    });

    document.querySelectorAll(".todo-delete-btn").forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        this.deleteTodo(id);
      };
    });
  }
};

window.TodosController = TodosController;
