// Google Sheets Web App API Service
// Implements load & save actions with LocalStorage fallback

const SheetsService = {
  // Check if API_URL is active and configured
  isApiConfigured() {
    return window.CONFIG && 
           window.CONFIG.API_URL !== "GOOGLE_APPS_SCRIPT_URL" && 
           window.CONFIG.API_URL !== "" && 
           window.CONFIG.API_URL.startsWith("http");
  },

  // Helper to make API post requests
  async apiRequest(action, payload = {}) {
    const url = window.CONFIG.API_URL;
    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // GAS webApp workaround for preflight options
        },
        body: JSON.stringify({ action, ...payload })
      });
      const result = await response.json();
      if (result && result.success === false) {
        throw new Error(result.error || "Google Sheets Web App returned success=false");
      }
      return result;
    } catch (err) {
      console.error(`Google Sheets API error on action ${action}:`, err);
      throw err;
    }
  },

  // Initialize data stores with elegant placeholder data if empty
  initFallbackData() {
    if (localStorage.getItem("fallback_data_seeded") === "true") {
      return;
    }
    // 1. Applications Defaults
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICATIONS)) {
      const sampleApps = [
        {
          id: 1,
          company: "Google",
          jobTitle: "Senior Software Engineer",
          jobLink: "https://careers.google.com/jobs/results/123",
          resumeUsed: "Resume_Tech_Lead_2026.pdf",
          dateApplied: "2026-06-10",
          status: "Interview",
          notes: "Prepared system design. Spoke with recruiter Sarah.",
          followUpDate: "2026-06-20",
          lastUpdated: "2026-06-15 14:30"
        },
        {
          id: 2,
          company: "Airbnb",
          jobTitle: "Frontend Frontend Developer",
          jobLink: "https://careers.airbnb.com/jobs/456",
          resumeUsed: "Resume_UX_Engineering.pdf",
          dateApplied: "2026-06-12",
          status: "Under Review",
          notes: "Requires a 2-hour technical screen next week.",
          followUpDate: "2026-06-19",
          lastUpdated: "2026-06-14 09:22"
        },
        {
          id: 3,
          company: "Stripe",
          jobTitle: "Fullstack Engineer",
          jobLink: "https://stripe.com/jobs/789",
          resumeUsed: "Resume_Tech_Lead_2026.pdf",
          dateApplied: "2026-06-08",
          status: "Assessment",
          notes: "Coding challenge sent. Needs completion by Friday.",
          followUpDate: "2026-06-14",
          lastUpdated: "2026-06-14 18:00"
        },
        {
          id: 4,
          company: "Metaphysical AI",
          jobTitle: "Core Kernel Architect",
          jobLink: "https://meta.ai/jobs/012",
          resumeUsed: "Resume_MLOps_Kernel.pdf",
          dateApplied: "2026-06-05",
          status: "Selected",
          notes: "Received written offer! $180k base + eq. Reviewing contract.",
          followUpDate: "2026-06-18",
          lastUpdated: "2026-06-16 08:30"
        },
        {
          id: 5,
          company: "Netflix",
          jobTitle: "UI Engineer",
          jobLink: "https://netflix.com/careers/55",
          resumeUsed: "Resume_UX_Engineering.pdf",
          dateApplied: "2026-05-28",
          status: "Rejected",
          notes: "Passed tech screen, but role put on freeze.",
          followUpDate: "",
          lastUpdated: "2026-06-12 11:15"
        },
        {
          id: 6,
          company: "Vercel",
          jobTitle: "Senior Developer Advocate",
          jobLink: "https://vercel.com/careers/99",
          resumeUsed: "Resume_Tech_Lead_2026.pdf",
          dateApplied: "2026-06-14",
          status: "Applied",
          notes: "Applied via referral. Reached out on LinkedIn.",
          followUpDate: "2026-06-25",
          lastUpdated: "2026-06-14 10:00"
        }
      ];
      localStorage.setItem(CONFIG.STORAGE_KEYS.APPLICATIONS, JSON.stringify(sampleApps));
    }

    // 2. Habits Defaults
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS)) {
      const sampleHabits = [
        {
          id: 1,
          name: "LeetCode Practice",
          dailyGoal: 1,
          progress: 1,
          completed: true,
          streak: 8,
          weeklyProgress: [true, true, false, true, true, true, true],
          heatmap: {
            "2026-06-10": true,
            "2026-06-11": true,
            "2026-06-12": false,
            "2026-06-13": true,
            "2026-06-14": true,
            "2026-06-15": true,
            "2026-06-16": true
          }
        },
        {
          id: 2,
          name: "Company Research",
          dailyGoal: 2,
          progress: 1,
          completed: false,
          streak: 3,
          weeklyProgress: [false, true, true, false, true, false, false],
          heatmap: {
            "2026-06-11": true,
            "2026-06-12": true,
            "2026-06-13": false,
            "2026-06-14": true,
            "2026-06-15": false,
            "2026-06-16": false
          }
        },
        {
          id: 3,
          name: "System Design Prep",
          dailyGoal: 1,
          progress: 0,
          completed: false,
          streak: 5,
          weeklyProgress: [true, true, true, true, true, false, false],
          heatmap: {
            "2026-06-10": true,
            "2026-06-11": true,
            "2026-06-12": true,
            "2026-06-13": true,
            "2026-06-14": true,
            "2026-06-15": false,
            "2026-06-16": false
          }
        },
        {
          id: 4,
          name: "Networking Reach Outs",
          dailyGoal: 3,
          progress: 3,
          completed: true,
          streak: 12,
          weeklyProgress: [true, true, true, true, true, true, true],
          heatmap: {
            "2026-06-10": true,
            "2026-06-11": true,
            "2026-06-12": true,
            "2026-06-13": true,
            "2026-06-14": true,
            "2026-06-15": true,
            "2026-06-16": true
          }
        }
      ];
      localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(sampleHabits));
    }

    // 3. Todos Defaults
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TODOS)) {
      const sampleTodos = [
        { id: 1, text: "Finish Stripe coding test assignment", priority: "High", completed: false, dueDate: "2026-06-18", position: 0 },
        { id: 2, text: "Send follow up email to Sarah at Google", priority: "High", completed: false, dueDate: "2026-06-20", position: 1 },
        { id: 3, text: "Refine System Design resume version", priority: "Medium", completed: true, dueDate: "2026-06-15", position: 2 },
        { id: 4, text: "Submit application to Vercel via internal link", priority: "Medium", completed: false, dueDate: "2026-06-19", position: 3 },
        { id: 5, text: "Review algorithmic cheat-sheet", priority: "Low", completed: false, dueDate: "2026-06-22", position: 4 },
        { id: 6, text: "Schedule virtual coffee chat with David", priority: "Low", completed: true, dueDate: "2026-06-14", position: 5 }
      ];
      localStorage.setItem(CONFIG.STORAGE_KEYS.TODOS, JSON.stringify(sampleTodos));
    }

    // 4. Settings Defaults
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS)) {
      const sampleSettings = {
        userName: "Alex Morgan",
        email: "alex.morgan@career.com",
        reminderTime: "09:00",
        dailyReview: true,
        jobFollowUp: true,
        habitReminder: true
      };
      localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(sampleSettings));
    }
    localStorage.setItem("fallback_data_seeded", "true");
  },

  // ================= APPLICATIONS RESOURCE CRUD =================
  async loadApplications() {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("loadApplications");
      return response.data || [];
    }
    this.initFallbackData();
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICATIONS)) || [];
  },

  async addApplication(app) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("addApplication", { app });
      return response.data;
    }
    this.initFallbackData();
    const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICATIONS));
    const newId = list.length ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
    const newApp = { id: newId, ...app };
    list.push(newApp);
    localStorage.setItem(CONFIG.STORAGE_KEYS.APPLICATIONS, JSON.stringify(list));
    return newApp;
  },

  async updateApplication(id, updatedFields) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("updateApplication", { id, app: updatedFields });
      return response.data;
    }
    this.initFallbackData();
    const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICATIONS));
    const index = list.findIndex(x => Number(x.id) === Number(id));
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      localStorage.setItem(CONFIG.STORAGE_KEYS.APPLICATIONS, JSON.stringify(list));
      return list[index];
    }
    throw new Error("Application not found with ID " + id);
  },

  async deleteApplication(id) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("deleteApplication", { id });
      return response.data;
    }
    this.initFallbackData();
    let list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.APPLICATIONS));
    list = list.filter(x => Number(x.id) !== Number(id));
    localStorage.setItem(CONFIG.STORAGE_KEYS.APPLICATIONS, JSON.stringify(list));
    return true;
  },

  // ================= HABITS RESOURCE CRUD =================
  async loadHabits() {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("loadHabits");
      return response.data || [];
    }
    this.initFallbackData();
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS)) || [];
  },

  async addHabit(habit) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("addHabit", { habit });
      return response.data;
    }
    this.initFallbackData();
    const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS));
    const newId = list.length ? Math.max(...list.map(x => x.id || 0)) + 1 : Date.now();
    const newHabit = { id: newId, ...habit };
    list.push(newHabit);
    localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(list));
    return newHabit;
  },

  async updateHabit(id, updatedFields) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("updateHabit", { id, habit: updatedFields });
      return response.data;
    }
    this.initFallbackData();
    const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS));
    const index = list.findIndex(x => Number(x.id) === Number(id));
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(list));
      return list[index];
    }
    throw new Error("Habit not found with ID " + id);
  },

  async deleteHabit(id) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("deleteHabit", { id });
      return response.data;
    }
    this.initFallbackData();
    let list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS));
    list = list.filter(x => Number(x.id) !== Number(id));
    localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify(list));
    return true;
  },

  // ================= TODOS RESOURCE CRUD =================
  async loadTodos() {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("loadTodos");
      return response.data || [];
    }
    this.initFallbackData();
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TODOS)) || [];
  },

  async addTodo(todo) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("addTodo", { todo });
      return response.data;
    }
    this.initFallbackData();
    const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TODOS));
    const newId = list.length ? Math.max(...list.map(x => x.id || 0)) + 1 : 1;
    const newTodo = { id: newId, ...todo };
    list.push(newTodo);
    localStorage.setItem(CONFIG.STORAGE_KEYS.TODOS, JSON.stringify(list));
    return newTodo;
  },

  async updateTodo(id, updatedFields) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("updateTodo", { id, todo: updatedFields });
      return response.data;
    }
    this.initFallbackData();
    const list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TODOS));
    const index = list.findIndex(x => Number(x.id) === Number(id));
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      localStorage.setItem(CONFIG.STORAGE_KEYS.TODOS, JSON.stringify(list));
      return list[index];
    }
    throw new Error("Todo not found with ID " + id);
  },

  async deleteTodo(id) {
    if (this.isApiConfigured()) {
      const response = await this.apiRequest("deleteTodo", { id });
      return response.data;
    }
    this.initFallbackData();
    let list = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TODOS));
    list = list.filter(x => Number(x.id) !== Number(id));
    localStorage.setItem(CONFIG.STORAGE_KEYS.TODOS, JSON.stringify(list));
    return true;
  },

  // ================= SETTINGS =================
  async loadSettings() {
    this.initFallbackData();
    return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS));
  },

  async updateSettings(settings) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return settings;
  }
};

window.SheetsService = SheetsService;
