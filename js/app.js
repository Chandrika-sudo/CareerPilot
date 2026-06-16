// Core App controller & Router (Page 1 Dashboard & Page 5 Settings)
const App = {
  activePage: "dashboard",
  settings: {},

  async init() {
    // 1. Initialize fallback databases if empty
    window.SheetsService.initFallbackData();

    // 2. Load profile settings
    await this.loadSettings();

    // 3. Setup Navigation & Routing events
    this.setupRouter();
    this.setupSidebar();
    this.setupSettingsEvents();
    
    // 4. Load the startup page
    this.navigateTo(this.activePage);
  },

  async loadSettings() {
    this.settings = await window.SheetsService.loadSettings() || {};
    if (this.settings.apiUrl) {
      window.CONFIG.API_URL = this.settings.apiUrl;
    }
    this.applySettingsToUI();
  },

  applySettingsToUI() {
    // Update user display text in sidebars
    const userNameElements = document.querySelectorAll(".profile-user-name");
    const userEmailElements = document.querySelectorAll(".profile-user-email");

    userNameElements.forEach(el => el.textContent = this.settings.userName || "Alex Morgan");
    userEmailElements.forEach(el => el.textContent = this.settings.email || "alex.morgan@career.com");

    // Populate Settings Form fields
    const nameInput = document.getElementById("settings-name");
    const emailInput = document.getElementById("settings-email");
    const timeInput = document.getElementById("settings-reminder-time");
    const dailyCheck = document.getElementById("settings-check-daily");
    const followCheck = document.getElementById("settings-check-follow");
    const habitCheck = document.getElementById("settings-check-habit");

    if (nameInput) nameInput.value = this.settings.userName || "";
    if (emailInput) emailInput.value = this.settings.email || "";
    if (timeInput) timeInput.value = this.settings.reminderTime || "09:00";
    if (dailyCheck) dailyCheck.checked = !!this.settings.dailyReview;
    if (followCheck) followCheck.checked = !!this.settings.jobFollowUp;
    if (habitCheck) habitCheck.checked = !!this.settings.habitReminder;

    // Check configuration warning bar
    const warnBar = document.getElementById("api-status-accent");
    if (warnBar) {
      if (window.SheetsService.isApiConfigured()) {
        warnBar.innerHTML = `
          <div class="flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Google Sheets Sync Node Active</span>
          </div>
        `;
      } else {
        warnBar.innerHTML = `
          <div class="flex items-center space-x-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 text-xs font-semibold">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Database Status: Active (Local Offline Mode)</span>
          </div>
        `;
      }
    }
  },

  setupRouter() {
    const navLinks = document.querySelectorAll("[data-target-page]");
    navLinks.forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const pageId = link.getAttribute("data-target-page");
        this.navigateTo(pageId);
      };
    });
  },

  setupSidebar() {
    // Mobil Sidebar toggling
    const mobileMenuBtn = document.getElementById("mobile-menu-toggle");
    const mobileSidebar = document.getElementById("desktop-sidebar");

    if (mobileMenuBtn && mobileSidebar) {
      mobileMenuBtn.onclick = () => {
        mobileSidebar.classList.toggle("-translate-x-full");
      };

      // Close sidebar if clicking outside on mobile
      document.addEventListener("click", (e) => {
        if (!mobileSidebar.contains(e.target) && !mobileMenuBtn.contains(e.target) && window.innerWidth < 1024) {
          mobileSidebar.classList.add("-translate-x-full");
        }
      });
    }
  },

  setupSettingsEvents() {
    const form = document.getElementById("settings-form");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const userName = document.getElementById("settings-name").value.trim();
        const email = document.getElementById("settings-email").value.trim();
        const reminderTime = document.getElementById("settings-reminder-time").value;
        const dailyReview = document.getElementById("settings-check-daily").checked;
        const jobFollowUp = document.getElementById("settings-check-follow").checked;
        const habitReminder = document.getElementById("settings-check-habit").checked;

        const updatedSettings = {
          userName,
          email,
          reminderTime,
          dailyReview,
          jobFollowUp,
          habitReminder,
          apiUrl: this.settings.apiUrl || "" // Retain the API sync URL
        };

        try {
          await window.SheetsService.updateSettings(updatedSettings);
          this.settings = updatedSettings;
          this.applySettingsToUI();
          this.showToast("Settings saved successfully!", "success");
        } catch (err) {
          this.showToast("Failed to save configuration", "error");
        }
      };
    }

    // Connect Sheet configuration integration
    const connectBtn = document.getElementById("btn-configure-api");
    const apiInput = document.getElementById("settings-gas-url");
    if (connectBtn && apiInput) {
      // Init input value if already configured
      if (window.CONFIG.API_URL !== "GOOGLE_APPS_SCRIPT_URL") {
        apiInput.value = window.CONFIG.API_URL;
      }

      connectBtn.onclick = async () => {
        const url = apiInput.value.trim();
        if (!url) {
          window.App.showToast("API Endpoint string cannot be empty", "error");
          return;
        }

        window.CONFIG.API_URL = url;
        this.settings.apiUrl = url;
        
        try {
          await window.SheetsService.updateSettings(this.settings);
          this.applySettingsToUI();
          this.showToast("Google Sheets target node updated! Hot reloading database...", "success");
          
          // Reboot system contexts
          setTimeout(() => {
            this.navigateTo(this.activePage);
          }, 1200);
        } catch (err) {
          window.App.showToast("Failed to save synchronization endpoint", "error");
        }
      };
    }

    // Wipe Database/Sample Data Clean Slate
    const clearBtn = document.getElementById("btn-clear-database");
    if (clearBtn) {
      clearBtn.onclick = async () => {
        if (!confirm("Are you sure you want to clear all job applications, daily habits, and to-do lists? This action is irreversible and prepares a completely empty dashboard for your own actual data.")) {
          return;
        }

        try {
          // Zero out storage models
          localStorage.setItem(CONFIG.STORAGE_KEYS.APPLICATIONS, JSON.stringify([]));
          localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify([]));
          localStorage.setItem(CONFIG.STORAGE_KEYS.TODOS, JSON.stringify([]));
          
          // Force seeding flag to true so empty lists are preserved on reload
          localStorage.setItem("fallback_data_seeded", "true");

          this.showToast("Sample data wiped. Clean slate activated!", "success");

          // Short delay to allow user to read the toast, then hot-reload page to refresh and draw blank states
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } catch (err) {
          window.App.showToast("Failed to reset workspace data", "error");
        }
      };
    }
  },

  // Centralized Navigation System
  async navigateTo(pageId) {
    this.activePage = pageId;

    // Toggle viewport section views
    const pages = document.querySelectorAll(".app-page-section");
    pages.forEach(p => p.classList.add("hidden"));

    const targetSection = document.getElementById(`page-${pageId}`);
    if (targetSection) targetSection.classList.remove("hidden");

    // Toggle active link visual elements
    const links = document.querySelectorAll("[data-target-page]");
    links.forEach(l => {
      if (l.getAttribute("data-target-page") === pageId) {
        l.classList.add("nav-link-active");
      } else {
        l.classList.remove("nav-link-active");
      }
    });

    // Close mobile sidebars to clean screen space
    const mobileSidebar = document.getElementById("desktop-sidebar");
    if (mobileSidebar && window.innerWidth < 1024) {
      mobileSidebar.classList.add("-translate-x-full");
    }

    // Initialize sub-controllers on entering pages
    try {
      if (pageId === "dashboard") {
        await window.DashboardController.init();
      } else if (pageId === "jobs") {
        await window.JobsController.init();
      } else if (pageId === "habits") {
        await window.HabitsController.init();
      } else if (pageId === "todo") {
        await window.TodosController.init();
      }
    } catch (err) {
      console.error(`Page transition error on rendering ${pageId}:`, err);
    }
  },

  // Toast System
  showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast max-w-sm w-full bg-white shadow-xl rounded-xl border border-slate-100 flex items-center p-4 text-slate-800 transition-all pointer-events-auto`;
    
    // Colorful icon layout based on result feedback type
    let iconHTML = "";
    if (type === "success") {
      iconHTML = `
        <div class="p-1 px-1.5 bg-green-50 text-green-500 rounded-lg mr-3">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      `;
    } else {
      iconHTML = `
        <div class="p-1 px-1.5 bg-red-50 text-red-500 rounded-lg mr-3">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      `;
    }

    toast.innerHTML = `
      ${iconHTML}
      <div class="text-sm font-semibold text-slate-800 mr-2">${message}</div>
      <button class="ml-auto text-slate-300 hover:text-slate-500 cursor-pointer text-xs" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    // Auto delete toast after completion of timeline
    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 4000);
  },

  async copyAppsScript() {
    try {
      const response = await fetch('/google_apps_script.js');
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      this.showToast("Apps Script code copied! Paste in Extensions > Apps Script.", "success");
    } catch (err) {
      console.error(err);
      this.showToast("Clipboard write permission block. Copy raw google_apps_script.js file.", "error");
    }
  }
};

// ================= CO-LOGIC DASHBOARD CONTROLLER =================
const DashboardController = {
  async init() {
    // Grab all datas
    const applications = await window.SheetsService.loadApplications();
    const habits = await window.SheetsService.loadHabits();
    const todos = await window.SheetsService.loadTodos();

    this.renderStats(applications);
    this.renderHabitsWidget(habits);
    this.renderTodosWidget(todos);
    this.renderFollowUpsWidget(applications);
    this.renderRecentUpdatesWidget(applications);
  },

  renderStats(apps) {
    const totalApps = apps.length;
    const underReview = apps.filter(x => x.status === "Under Review").length;
    const interviews = apps.filter(x => x.status === "Interview").length;
    const rejections = apps.filter(x => x.status === "Rejected").length;
    const offers = apps.filter(x => x.status === "Selected").length;

    const elTotal = document.getElementById("stat-total");
    const elReview = document.getElementById("stat-review");
    const elInterviews = document.getElementById("stat-interviews");
    const elRejections = document.getElementById("stat-rejections");
    const elOffers = document.getElementById("stat-offers");

    if (elTotal) elTotal.textContent = totalApps;
    if (elReview) elReview.textContent = underReview;
    if (elInterviews) elInterviews.textContent = interviews;
    if (elRejections) elRejections.textContent = rejections;
    if (elOffers) elOffers.textContent = offers;
  },

  renderHabitsWidget(habits) {
    const container = document.getElementById("widget-habits-body");
    if (!container) return;

    if (habits.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">Establish positive job hunting habits in the habits page.</p>`;
      return;
    }

    container.innerHTML = habits.map(habit => {
      const percentage = Math.round(((habit.progress || 0) / habit.dailyGoal) * 100);
      return `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-100/50 transition-all duration-200">
          <div class="flex-1 mr-4">
            <div class="flex items-center justify-between mb-1">
              <span class="text-sm font-bold text-slate-700 truncate max-w-[160px]">${habit.name}</span>
              <span class="text-xs font-bold text-slate-500 font-mono">${habit.progress}/${habit.dailyGoal}</span>
            </div>
            <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div class="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full" style="width: ${Math.min(100, percentage)}%"></div>
            </div>
          </div>
          <!-- Tiny click toggle from Dashboard directly -->
          <button class="dash-habit-check p-1 border border-slate-200 hover:bg-white rounded transition-all scale-105 cursor-pointer" data-id="${habit.id}">
            <svg class="h-5 w-5 ${habit.completed ? 'text-emerald-500' : 'text-slate-300'}" fill="${habit.completed ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      `;
    }).join("");

    // Bind checklist handlers
    container.querySelectorAll(".dash-habit-check").forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        await window.HabitsController.toggleComplete(id);
        // Refresh with latest DB state
        await this.init();
      };
    });
  },

  renderTodosWidget(todos) {
    const container = document.getElementById("widget-todos-body");
    if (!container) return;

    // Filter pending high-priority or standard pending tasks
    const pending = todos.filter(t => !t.completed).slice(0, 4);

    if (pending.length === 0) {
      container.innerHTML = `
        <div class="py-6 text-center text-slate-400">
          <p class="text-xs italic">All current tasks check-marked. Hooray!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pending.map(todo => {
      const isPastDue = todo.dueDate && new Date(todo.dueDate) < new Date();
      return `
        <div class="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-100/50 transition-all duration-200">
          <div class="flex items-center space-x-3 truncate mr-2">
            <button class="dash-todo-check cursor-pointer" data-id="${todo.id}">
              <div class="w-4 h-4 rounded-full border-2 border-slate-300 hover:border-indigo-600 transition-colors flex items-center justify-center"></div>
            </button>
            <div class="truncate">
              <p class="text-sm font-bold text-slate-700 truncate leading-snug">${todo.text}</p>
              <div class="flex items-center space-x-2 mt-0.5">
                <span class="inline-block w-1.5 h-1.5 rounded-full ${todo.priority === 'High' ? 'bg-red-500' : todo.priority === 'Medium' ? 'bg-amber-400' : 'bg-blue-400'}"></span>
                <span class="text-[10px] text-slate-400 font-medium font-mono">${todo.priority} Priority</span>
                ${todo.dueDate ? `<span class="text-[10px] ${isPastDue ? 'text-red-500 font-bold' : 'text-slate-400'} font-mono">📅 ${todo.dueDate}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Bind dashboard todo completions
    container.querySelectorAll(".dash-todo-check").forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        await window.TodosController.toggleTodoComplete(id);
        await this.init();
      };
    });
  },

  renderFollowUpsWidget(apps) {
    const container = document.getElementById("widget-followups-body");
    if (!container) return;

    // Filter apps having future action date
    const todayStr = new Date().toISOString().split("T")[0];
    const followUps = apps
      .filter(x => x.followUpDate && x.status !== "Rejected" && x.status !== "Selected")
      .sort((a,b) => new Date(a.followUpDate) - new Date(b.followUpDate))
      .slice(0, 4);

    if (followUps.length === 0) {
      container.innerHTML = `
        <div class="py-6 text-center text-slate-400">
          <p class="text-xs italic">No follow-ups recorded.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = followUps.map(app => {
      const daysLeft = Math.ceil((new Date(app.followUpDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
      const timelineBadge = daysLeft === 0 
        ? `<span class="px-2 py-0.5 bg-red-50 text-red-600 font-bold rounded text-[10px] font-mono">Today</span>` 
        : daysLeft < 0 
          ? `<span class="px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px] font-mono">Overdue</span>` 
          : `<span class="px-2 py-0.5 bg-amber-50 text-amber-600 font-semibold rounded text-[10px] font-mono">${daysLeft} days left</span>`;

      return `
        <div class="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-100/50 transition-all duration-200 flex items-center justify-between">
          <div class="truncate mr-4">
            <span class="text-sm font-bold text-slate-700">${app.company}</span>
            <span class="text-xs text-slate-500 font-medium ml-1">(${app.jobTitle})</span>
            <p class="text-[10px] text-slate-400 leading-none mt-1">Status: <span class="font-semibold text-indigo-500">${app.status}</span></p>
          </div>
          <div class="flex flex-col items-end gap-1 flex-shrink-0">
            ${timelineBadge}
            <span class="text-[10px] text-slate-400 font-mono">${app.followUpDate}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  renderRecentUpdatesWidget(apps) {
    const container = document.getElementById("widget-recent-body");
    if (!container) return;

    // Pull 4 records having the latest 'lastUpdated' value
    const sorted = [...apps]
      .filter(x => x.lastUpdated)
      .sort((a,b) => new Date(b.lastUpdated.replace(' ', 'T')) - new Date(a.lastUpdated.replace(' ', 'T')))
      .slice(0, 4);

    if (sorted.length === 0) {
      container.innerHTML = `<p class="text-xs text-slate-400 italic py-4 text-center">No recent edits recorded.</p>`;
      return;
    }

    container.innerHTML = sorted.map(app => {
      const badgeClass = window.JobsController.getStatusBadgeClass(app.status);
      return `
        <div class="p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-slate-300 hover:bg-slate-100/50 transition-all duration-200 flex items-center justify-between">
          <div class="truncate mr-4">
            <div class="flex items-center space-x-1.5 mb-1">
              <span class="text-sm font-bold text-slate-700 truncate max-w-[120px]">${app.company}</span>
              <span class="badge-status ${badgeClass} text-[10px]">${app.status}</span>
            </div>
            <p class="text-xs text-slate-500 truncate font-semibold leading-none">${app.jobTitle}</p>
          </div>
          <span class="text-[10px] text-slate-400 font-mono flex-shrink-0" title="Last auto-saved timestamp">${app.lastUpdated}</span>
        </div>
      `;
    }).join("");
  }
};

window.App = App;
window.DashboardController = DashboardController;

// Launch App automatically on load
document.addEventListener("DOMContentLoaded", () => {
  window.App.init();
});
