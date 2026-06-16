// Habits Tracker Module (Page 3)
const HabitsController = {
  habits: [],

  async init() {
    await this.loadData();
    this.bindEvents();
    this.render();
  },

  async loadData() {
    try {
      this.habits = await window.SheetsService.loadHabits();
    } catch (err) {
      window.App.showToast("Failed to lock habits database.", "error");
    }
  },

  bindEvents() {
    const addHabitForm = document.getElementById("habits-add-form");
    if (addHabitForm) {
      addHabitForm.onsubmit = async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById("habits-new-name");
        const goalInput = document.getElementById("habits-new-goal");
        
        if (!nameInput || !goalInput) return;
        const name = nameInput.value.trim();
        const goal = parseInt(goalInput.value, 10) || 1;

        if (!name) {
          window.App.showToast("Please enter a valid habit name", "error");
          return;
        }

        await this.addHabit(name, goal);
        
        // Reset form
        nameInput.value = "";
        goalInput.value = "1";
      };
    }
  },

  async addHabit(name, dailyGoal) {
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Create new habit model
    const newHabit = {
      name,
      dailyGoal: dailyGoal,
      progress: 0,
      completed: false,
      streak: 0,
      weeklyProgress: [false, false, false, false, false, false, false],
      heatmap: {
        [todayStr]: false
      }
    };

    try {
      const savedHabit = await window.SheetsService.addHabit(newHabit);
      this.habits.push(savedHabit);
      window.App.showToast(`Habit "${name}" created!`, "success");
      this.render();
    } catch (err) {
      window.App.showToast("Failed to create habit", "error");
    }
  },

  async deleteHabit(id) {
    if (!confirm("Are you sure you want to delete this habit and all its history?")) return;

    try {
      await window.SheetsService.deleteHabit(id);
      this.habits = this.habits.filter(x => String(x.id) !== String(id));
      window.App.showToast("Habit deleted", "success");
      this.render();
    } catch (err) {
      window.App.showToast("Failed to delete habit", "error");
    }
  },

  async toggleComplete(id) {
    const habit = this.habits.find(x => String(x.id) === String(id));
    if (!habit) return;

    const todayStr = new Date().toISOString().split("T")[0];
    
    habit.completed = !habit.completed;
    if (habit.completed) {
      habit.progress = habit.dailyGoal;
    } else {
      habit.progress = 0;
    }

    // Refresh streak and heatmap configurations
    habit.heatmap[todayStr] = habit.completed;
    this.recalculateStreaks(habit);

    try {
      await window.SheetsService.updateHabit(id, habit);
      this.render();
      window.App.showToast(`Updated "${habit.name}"`, "success");

      // Sync widgets on home screen
      if (window.App.activePage === "dashboard") {
        window.DashboardController.init();
      }
    } catch (err) {
      window.App.showToast("Sync tracker failure", "error");
    }
  },

  async adjustProgress(id, amount) {
    const habit = this.habits.find(x => String(x.id) === String(id));
    if (!habit) return;

    const todayStr = new Date().toISOString().split("T")[0];
    
    habit.progress = Math.max(0, (habit.progress || 0) + amount);
    
    const wasCompleted = habit.completed;
    habit.completed = habit.progress >= habit.dailyGoal;
    
    habit.heatmap[todayStr] = habit.completed;
    this.recalculateStreaks(habit);

    try {
      await window.SheetsService.updateHabit(id, habit);
      this.render();
      if (!wasCompleted && habit.completed) {
        window.App.showToast(`Goal reached for "${habit.name}"! 🎉`, "success");
      } else {
        window.App.showToast(`Updated progress for "${habit.name}"`, "success");
      }

      if (window.App.activePage === "dashboard") {
        window.DashboardController.init();
      }
    } catch (err) {
      window.App.showToast("Sync tracker failure", "error");
    }
  },

  recalculateStreaks(habit) {
    const today = new Date();
    let currentStreak = 0;
    let tempDate = new Date(today);

    // Track backwards to calculate daily streak
    while (true) {
      const dateStr = tempDate.toISOString().split("T")[0];
      const isRecordCompleted = habit.heatmap && habit.heatmap[dateStr] === true;

      if (isRecordCompleted) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        // If modern day is not completed, let's check yesterday to preserve streak continuity
        if (currentStreak === 0 && dateStr === today.toISOString().split("T")[0]) {
          tempDate.setDate(tempDate.getDate() - 1);
          continue;
        }
        break;
      }
    }

    habit.streak = currentStreak;

    // Weekly progress (past 7 days check: Index 0 is 6 days ago, index 6 is today)
    const weekBits = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      const dStr = day.toISOString().split("T")[0];
      weekBits.push(habit.heatmap && habit.heatmap[dStr] === true);
    }
    habit.weeklyProgress = weekBits;
  },

  // Generates past 30 days metadata coordinates
  getPast30DaysArray() {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({
        dateStr: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dayOfWeek: d.getDay()
      });
    }
    return dates;
  },

  render() {
    const gridContainer = document.getElementById("habits-grid");
    if (!gridContainer) return;

    if (this.habits.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full bg-white p-12 text-center rounded-xl border border-slate-100 shadow-sm text-slate-400">
          <div class="flex flex-col items-center justify-center space-y-3">
            <div class="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="font-medium text-slate-700">No habits tracked yet.</p>
            <p class="text-xs">Establish positive career habits (e.g. practicing algorithms, networking) above.</p>
          </div>
        </div>
      `;
      return;
    }

    const past30Days = this.getPast30DaysArray();

    gridContainer.innerHTML = this.habits.map(habit => {
      const percentage = Math.min(100, Math.round(((habit.progress || 0) / habit.dailyGoal) * 100));
      const weeklySuccessCount = (habit.weeklyProgress || []).filter(Boolean).length;
      
      // Streak text helpers
      const streakStatus = habit.streak > 0 
        ? `<span class="flex items-center text-amber-600 text-xs font-semibold bg-amber-50 px-2.5 py-1 rounded-full">🔥 ${habit.streak} day streak</span>`
        : `<span class="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-50 rounded-full">No streak yet</span>`;

      // Render monthly micro contribution heatmap style matrix (last 30 days grid)
      const heatmapCellsHTML = past30Days.map(day => {
        const isCompleted = habit.heatmap && habit.heatmap[day.dateStr] === true;
        const colorClass = isCompleted 
          ? "bg-emerald-500 shadow-xs ring-1 ring-emerald-600/10" 
          : "bg-slate-100 border border-slate-200/50";
        return `
          <div class="heatmap-cell ${colorClass} w-full" 
               title="${day.label}: ${isCompleted ? 'Completed' : 'Incomplete'}" 
               data-date="${day.dateStr}"
               data-habit-id="${habit.id}">
          </div>
        `;
      }).join("");

      return `
        <div class="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all duration-300" id="habit-${habit.id}">
          <!-- Habit Header -->
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-base font-bold text-slate-800 tracking-tight leading-tight mb-2">${habit.name}</h3>
              <div class="flex flex-wrap gap-2 items-center">
                ${streakStatus}
                <span class="text-xs font-medium text-slate-500 bg-slate-100/80 px-2 py-1 rounded-full">Weekly: ${weeklySuccessCount}/7 days</span>
              </div>
            </div>
            
            <!-- Complete toggle checkbox -->
            <button class="habit-toggle-complete p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500/20 outline-none" 
                    data-id="${habit.id}" 
                    title="Toggle today's completion">
              <svg class="h-6 w-6 ${habit.completed ? 'text-emerald-500 fill-emerald-100' : 'text-slate-400'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path class="${habit.completed ? '' : 'hidden'}" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4"></path>
              </svg>
            </button>
          </div>

          <!-- Progress Counters with buttons -->
          <div class="mb-5 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-slate-500 font-medium">Daily Goal progress:</span>
              <span class="text-xs font-bold text-slate-700 font-mono">${habit.progress || 0} / ${habit.dailyGoal}</span>
            </div>
            <div class="w-full bg-slate-200/85 h-2 rounded-full overflow-hidden mb-3.5">
              <div class="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full transition-all duration-300" style="width: ${percentage}%"></div>
            </div>
            <div class="flex items-center justify-between gap-2.5">
              <button class="habit-minus py-1 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-xs font-bold transition-all hover:scale-105" data-id="${habit.id}">-1</button>
              <button class="habit-plus py-1 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-bold transition-all hover:scale-105" data-id="${habit.id}">+1 increment</button>
              <button class="habit-delete text-xs text-slate-400 hover:text-red-500 px-2 py-1 transition-colors" data-id="${habit.id}">Delete</button>
            </div>
          </div>

          <!-- Heatmap View Section -->
          <div>
            <div class="flex items-center justify-between mb-2.5 border-t border-slate-100 pt-3">
              <span class="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Last 30 Days Timeline</span>
              <div class="flex gap-1.5 text-[9px] text-slate-400 items-center font-semibold">
                <span>Incomplete</span>
                <span class="w-2 h-2 bg-slate-100 border border-slate-200 rounded"></span>
                <span class="w-2 h-2 bg-emerald-500 rounded"></span>
                <span>Complete</span>
              </div>
            </div>
            <div class="grid grid-cols-[repeat(10,1fr)] gap-1.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
              ${heatmapCellsHTML}
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Bind custom clicks to incrementers and actions
    gridContainer.querySelectorAll(".habit-toggle-complete").forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        this.toggleComplete(id);
      };
    });

    gridContainer.querySelectorAll(".habit-plus").forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        this.adjustProgress(id, 1);
      };
    });

    gridContainer.querySelectorAll(".habit-minus").forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        this.adjustProgress(id, -1);
      };
    });

    gridContainer.querySelectorAll(".habit-delete").forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute("data-id"), 10);
        this.deleteHabit(id);
      };
    });

    // Toggle grid heatmap state click handles
    gridContainer.querySelectorAll(".heatmap-cell").forEach(cell => {
      cell.onclick = async () => {
        const habitId = parseInt(cell.getAttribute("data-habit-id"), 10);
        const cellDate = cell.getAttribute("data-date");
        const habit = this.habits.find(x => String(x.id) === String(habitId));
        if (!habit) return;

        // Toggle state specifically for clicked date
        if (!habit.heatmap) habit.heatmap = {};
        habit.heatmap[cellDate] = !habit.heatmap[cellDate];
        this.recalculateStreaks(habit);

        try {
          await window.SheetsService.updateHabit(habitId, habit);
          this.render();
          window.App.showToast(`Updated schedule state for ${cellDate}`, "success");
        } catch (e) {
          window.App.showToast("Failed to write date log", "error");
        }
      };
    });
  }
};

window.HabitsController = HabitsController;
