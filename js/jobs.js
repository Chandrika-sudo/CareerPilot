// Jobs module for Page 2: Job Applications Spreadsheet Tracker
const JobsController = {
  applications: [],
  selectedRowIds: new Set(),
  currentPage: 1,
  rowsPerPage: 10,
  searchTerm: "",
  sortColumn: "dateApplied",
  sortDirection: "desc", // 'asc' or 'desc'
  statusFilter: "all",
  activeCell: { row: null, col: null },

  // Columns definition
  columns: [
    { key: "company", title: "Company", type: "text", width: "150px" },
    { key: "jobTitle", title: "Job Title", type: "text", width: "180px" },
    { key: "jobLink", title: "Job Link", type: "url", width: "150px" },
    { key: "resumeUsed", title: "Resume Used", type: "text", width: "160px" },
    { key: "dateApplied", title: "Date Applied", type: "date", width: "135px" },
    { key: "status", title: "Status", type: "select", width: "140px" },
    { key: "notes", title: "Notes", type: "text", width: "240px" },
    { key: "followUpDate", title: "Follow-Up Date", type: "date", width: "135px" },
    { key: "lastUpdated", title: "Last Updated", type: "readonly", width: "150px" },
    { key: "actions", title: "Actions", type: "actions", width: "80px" }
  ],

  statusOptions: ["Applied", "Under Review", "Assessment", "Interview", "Selected", "Rejected", "No Response"],

  async init() {
    this.selectedRowIds.clear();
    this.currentPage = 1;
    this.activeCell = { row: null, col: null };
    await this.loadData();
    this.bindEvents();
    this.render();
  },

  async loadData() {
    this.showSkeleton(true);
    try {
      this.applications = await window.SheetsService.loadApplications();
    } catch (err) {
      window.App.showToast("Failed to lock applications database.", "error");
    } finally {
      this.showSkeleton(false);
    }
  },

  // Setup static controls events (Search, Filter, Actions, Bulk)
  bindEvents() {
    const searchInput = document.getElementById("jobs-search");
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.currentPage = 1;
        this.render();
      };
    }

    const filterSelect = document.getElementById("jobs-filter-status");
    if (filterSelect) {
      filterSelect.onchange = (e) => {
        this.statusFilter = e.target.value;
        this.currentPage = 1;
        this.render();
      };
    }

    const addRowBtn = document.getElementById("jobs-add-row");
    if (addRowBtn) {
      addRowBtn.onclick = () => this.addNewRow();
    }

    const deleteRowBtn = document.getElementById("jobs-delete-selected");
    if (deleteRowBtn) {
      deleteRowBtn.onclick = () => this.deleteSelectedRows();
    }

    const exportBtn = document.getElementById("jobs-export-csv");
    if (exportBtn) {
      exportBtn.onclick = () => this.exportToCSV();
    }

    const rowsPerPageSelect = document.getElementById("jobs-rows-per-page");
    if (rowsPerPageSelect) {
      rowsPerPageSelect.onchange = (e) => {
        this.rowsPerPage = parseInt(e.target.value, 10);
        this.currentPage = 1;
        this.render();
      };
    }

    // Modal Add Trigger in Spreadsheet Style
    const excelQuickAdd = document.getElementById("jobs-quick-add");
    if (excelQuickAdd) {
      excelQuickAdd.onkeyup = (e) => {
        if (e.key === "Enter" && e.target.value.trim() !== "") {
          this.quickAddRow(e.target.value.trim());
          e.target.value = "";
        }
      };
    }
  },

  showSkeleton(show) {
    const tableBody = document.getElementById("spreadsheet-body");
    if (!tableBody) return;
    if (show) {
      tableBody.innerHTML = Array(5).fill(0).map(() => `
        <tr>
          <td class="grid-cell sticky-col bg-white"><div class="h-4 w-4 bg-slate-200 rounded animate-pulse"></div></td>
          ${this.columns.map(() => `
            <td class="grid-cell"><div class="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div></td>
          `).join("")}
        </tr>
      `).join("");
    }
  },

  // Auto-saved core helper
  async saveCellEdit(id, field, value) {
    // Audit changes and save
    const app = this.applications.find(x => String(x.id) === String(id));
    if (!app) return;

    // Check if value actually changed
    const oldVal = app[field];
    if (String(oldVal) === String(value)) return;

    try {
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
      const updatedFields = {
        [field]: value,
        lastUpdated: dateStr
      };

      // Pessimistic update in applications array
      Object.assign(app, updatedFields);
      
      // Update cell in UI with new timestamp
      const lastUpdatedCell = document.querySelector(`[data-app-id="${id}"][data-field="lastUpdated"]`);
      if (lastUpdatedCell) lastUpdatedCell.textContent = dateStr;

      await window.SheetsService.updateApplication(id, updatedFields);
      window.App.showToast("Changes saved auto-synchronously", "success");
      
      // Refresh home metrics if relevant
      if (window.App.activePage === "dashboard") {
        window.DashboardController.init();
      }
    } catch (err) {
      window.App.showToast("Auto-save sync failure: connection weak", "error");
    }
  },

  // Fast row creations
  async addNewRow() {
    const todayStr = new Date().toISOString().split("T")[0];
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    
    const newApp = {
      company: "New Company",
      jobTitle: "Software Engineer",
      jobLink: "",
      resumeUsed: "Master_Resume.pdf",
      dateApplied: todayStr,
      status: "Applied",
      notes: "",
      followUpDate: "",
      lastUpdated: timestampStr
    };

    try {
      const response = await window.SheetsService.addApplication(newApp);
      this.applications.push(response);
      window.App.showToast("Added new application row", "success");
      
      // Navigate to last page to show the row, then render
      const totalFiltered = this.getFilteredApps().length;
      this.currentPage = Math.ceil(totalFiltered / this.rowsPerPage) || 1;
      this.render();
    } catch (err) {
      window.App.showToast("Failed to append row", "error");
    }
  },

  async quickAddRow(companyName) {
    const todayStr = new Date().toISOString().split("T")[0];
    const timestampStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    
    const newApp = {
      company: companyName,
      jobTitle: "Open Position",
      jobLink: "",
      resumeUsed: "Default.pdf",
      dateApplied: todayStr,
      status: "Applied",
      notes: "",
      followUpDate: "",
      lastUpdated: timestampStr
    };

    try {
      const response = await window.SheetsService.addApplication(newApp);
      this.applications.push(response);
      window.App.showToast(`Row appended for ${companyName}!`, "success");
      this.render();
    } catch (err) {
      window.App.showToast("Quick add failure", "error");
    }
  },

  async deleteSelectedRows() {
    if (this.selectedRowIds.size === 0) {
      window.App.showToast("No rows selected for deletion", "error");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${this.selectedRowIds.size} applications?`)) return;

    try {
      for (const id of this.selectedRowIds) {
        await window.SheetsService.deleteApplication(id);
      }
      this.applications = this.applications.filter(x => !this.selectedRowIds.has(x.id));
      this.selectedRowIds.clear();
      
      // Update check all checkbox state
      const checkAll = document.getElementById("jobs-check-all");
      if (checkAll) checkAll.checked = false;

      window.App.showToast("Selected applications deleted successfully", "success");
      this.render();
    } catch (err) {
      window.App.showToast("Error occurred during deletion", "error");
    }
  },

  getFilteredApps() {
    return this.applications.filter(app => {
      // 1. Filter by search
      const fieldsToSearch = [app.company, app.jobTitle, app.notes, app.resumeUsed, app.status];
      const matchSearch = fieldsToSearch.some(val => val && String(val).toLowerCase().includes(this.searchTerm));

      // 2. Filter by status
      const matchStatus = this.statusFilter === "all" || app.status === this.statusFilter;

      return matchSearch && matchStatus;
    });
  },

  getSortedApps(apps) {
    return [...apps].sort((a, b) => {
      let valA = a[this.sortColumn] || "";
      let valB = b[this.sortColumn] || "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return this.sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return this.sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  },

  // Main Render Spreadsheet call
  render() {
    const tableHeader = document.getElementById("spreadsheet-header");
    const tableBody = document.getElementById("spreadsheet-body");
    if (!tableHeader || !tableBody) return;

    const filtered = this.getFilteredApps();
    const sorted = this.getSortedApps(filtered);

    // Calculate Pagination bounds
    const totalRows = sorted.length;
    const totalPages = Math.ceil(totalRows / this.rowsPerPage) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.rowsPerPage;
    const endIdx = Math.min(startIdx + this.rowsPerPage, totalRows);
    const paginatedApps = sorted.slice(startIdx, endIdx);

    // Update bulk counter & pagination controls
    const bulkCount = document.getElementById("selected-count");
    if (bulkCount) bulkCount.textContent = `${this.selectedRowIds.size} rows selected`;

    // Empty state check
    if (this.applications.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${this.columns.length + 1}" class="px-6 py-12 text-center text-slate-400">
            <div class="flex flex-col items-center justify-center space-y-3">
              <div class="p-3 bg-slate-100 rounded-full text-slate-500">
                <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <p class="font-medium">No application records found.</p>
              <p class="text-xs">Type a company name in the quick bar above or click "Add Row" to start.</p>
            </div>
          </td>
        </tr>
      `;
      this.updatePaginationUI(0, 0, 0, 1);
      return;
    }

    // Render header
    const checkAllChecked = paginatedApps.length > 0 && paginatedApps.every(app => this.selectedRowIds.has(app.id));
    tableHeader.innerHTML = `
      <th class="sticky-col th-checkbox w-12 text-center select-none" style="min-width: 48px;">
        <input type="checkbox" id="jobs-check-all" class="rounded border-slate-300 accent-blue-600 cursor-pointer" ${checkAllChecked ? "checked" : ""}>
      </th>
      ${this.columns.map((col, idx) => {
        if (col.key === "actions") {
          return `
            <th style="width: ${col.width}; min-width: 60px;" class="text-center font-semibold text-slate-500 whitespace-nowrap">
              Action
            </th>
          `;
        }
        return `
          <th class="${idx === 0 ? 'sticky-col left-12' : ''}" style="width: ${col.width}; min-width: 80px;" data-column="${col.key}">
            <div class="flex items-center justify-between pointer-events-none">
              <span class="truncate">${col.title}</span>
              <span class="text-[10px] ml-1 text-slate-400">
                ${this.sortColumn === col.key ? (this.sortDirection === 'asc' ? '▲' : '▼') : ''}
              </span>
            </div>
            <div class="resize-handle" data-col-idx="${idx}"></div>
          </th>
        `;
      }).join("")}
    `;

    // Render body
    tableBody.innerHTML = paginatedApps.map((app, rIdx) => {
      const isRowChecked = this.selectedRowIds.has(app.id);
      return `
        <tr class="${isRowChecked ? 'bg-blue-50/40' : ''}" data-row-id="${app.id}">
          <td class="grid-cell sticky-col bg-white text-center w-12 select-none" style="min-width: 48px;">
            <input type="checkbox" class="row-selector rounded border-slate-300 accent-blue-600 cursor-pointer" data-id="${app.id}" ${isRowChecked ? "checked" : ""}>
          </td>
          ${this.columns.map((col, cIdx) => {
            const val = app[col.key] || "";
            let displayHTML = "";

            if (col.key === "status") {
              const badgeClass = this.getStatusBadgeClass(val);
              displayHTML = `<span class="badge-status ${badgeClass}">${val || "Applied"}</span>`;
            } else if (col.key === "jobLink") {
              displayHTML = val ? `<a href="${val}" target="_blank" class="text-blue-600 hover:underline hover:text-blue-800" tabindex="-1" onclick="event.stopPropagation()">${val}</a>` : `<span class="text-slate-300 font-mono text-xs italic">add link</span>`;
            } else if (col.key === "lastUpdated") {
              displayHTML = `<span class="text-xs text-slate-400 font-mono" data-app-id="${app.id}" data-field="lastUpdated">${val}</span>`;
            } else if (col.key === "actions") {
              displayHTML = `
                <button class="single-row-delete-btn p-1 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer" data-id="${app.id}" title="Delete this application">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              `;
            } else {
              displayHTML = val || `<span class="text-slate-300 italic">double click...</span>`;
            }

            if (col.key === "actions") {
              return `
                <td class="grid-cell text-center select-none" style="width: ${col.width};">
                  <div class="flex items-center justify-center">${displayHTML}</div>
                </td>
              `;
            }

            // Combine cell metadata
            return `
              <td class="grid-cell text-left ${cIdx === 0 ? 'sticky-col left-12 bg-white' : ''}" 
                  id="cell-${rIdx}-${cIdx}" 
                  tabindex="0" 
                  data-row-idx="${rIdx}" 
                  data-col-idx="${cIdx}" 
                  data-id="${app.id}" 
                  data-field="${col.key}">
                <div class="cell-display-content truncate max-w-full">${displayHTML}</div>
              </td>
            `;
          }).join("")}
        </tr>
      `;
    }).join("");

    // Bind Dynamic Interactions (Edit triggers, Selects, Column resizing, Sorting, Navigation)
    this.bindGridInteractions(paginatedApps, paginatedApps.length);
    this.updatePaginationUI(startIdx + 1, endIdx, totalRows, totalPages);
  },

  getStatusBadgeClass(status) {
    if (!status) return "status-applied";
    switch (status.trim().toLowerCase()) {
      case "applied": return "status-applied";
      case "under review": return "status-under-review";
      case "assessment": return "status-assessment";
      case "interview": return "status-interview";
      case "selected": return "status-selected";
      case "rejected": return "status-rejected";
      case "no response": return "status-no-response";
      default: return "status-applied";
    }
  },

  // Bind key events and actions specifically inside grid DOM elements
  bindGridInteractions(paginatedApps, activeRowsCount) {
    const tableBody = document.getElementById("spreadsheet-body");
    const tableHeader = document.getElementById("spreadsheet-header");

    // Click sorting on tables header
    tableHeader.querySelectorAll("th[data-column]").forEach(th => {
      const colKey = th.getAttribute("data-column");
      th.onclick = (e) => {
        // Prevent sorting if clicking the resize handle
        if (e.target.classList.contains("resize-handle")) return;
        
        if (this.sortColumn === colKey) {
          this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
        } else {
          this.sortColumn = colKey;
          this.sortDirection = "desc";
        }
        this.render();
      };
    });

    // Check All bulk select checkbox
    const checkAll = document.getElementById("jobs-check-all");
    if (checkAll) {
      checkAll.onchange = (e) => {
        const checked = e.target.checked;
        paginatedApps.forEach(app => {
          if (checked) {
            this.selectedRowIds.add(app.id);
          } else {
            this.selectedRowIds.delete(app.id);
          }
        });
        this.render();
      };
    }

    // Individual Selector checkboxes
    tableBody.querySelectorAll(".row-selector").forEach(box => {
      box.onchange = (e) => {
        const id = parseInt(e.target.getAttribute("data-id"), 10);
        if (e.target.checked) {
          this.selectedRowIds.add(id);
        } else {
          this.selectedRowIds.delete(id);
        }
        this.render();
      };
    });

    // Cell Clicks & Editors & Key listeners
    const cells = tableBody.querySelectorAll(".grid-cell[tabindex]");
    cells.forEach(cell => {
      // Focus element sets keyboard tracking indices
      cell.onfocus = () => {
        this.activeCell.row = parseInt(cell.getAttribute("data-row-idx"), 10);
        this.activeCell.col = parseInt(cell.getAttribute("data-col-idx"), 10);
        
        // Remove prior selected style classes
        tableBody.querySelectorAll(".selected-cell").forEach(el => el.classList.remove("selected-cell"));
        cell.classList.add("selected-cell");
      };

      // Double-click transforms to interactive input
      cell.ondblclick = () => {
        this.enterEditMode(cell);
      };

      // Single-click on interactive columns triggers edit mode immediately
      cell.onclick = () => {
        const colKey = cell.getAttribute("data-field");
        if (colKey === "status" || colKey === "followUpDate" || colKey === "resumeUsed") {
          this.enterEditMode(cell);
        }
      };

      // Handle Keydown navigation
      cell.onkeydown = (e) => {
        // If already in edit mode, let typing proceed natively
        if (cell.querySelector("input") || cell.querySelector("select")) {
          if (e.key === "Escape") {
            this.exitEditMode(cell, false);
            cell.focus();
          } else if (e.key === "Enter") {
            this.exitEditMode(cell, true);
            cell.focus();
            e.preventDefault();
          }
          return;
        }

        let nextRow = this.activeCell.row;
        let nextCol = this.activeCell.col;

        switch (e.key) {
          case "ArrowUp":
            if (nextRow > 0) nextRow--;
            e.preventDefault();
            break;
          case "ArrowDown":
            if (nextRow < activeRowsCount - 1) nextRow++;
            e.preventDefault();
            break;
          case "ArrowLeft":
            if (nextCol > 0) nextCol--;
            e.preventDefault();
            break;
          case "ArrowRight":
            if (nextCol < this.columns.length - 1) nextCol++;
            e.preventDefault();
            break;
          case "Tab":
            if (e.shiftKey) {
              if (nextCol > 0) nextCol--;
              else if (nextRow > 0) {
                nextRow--;
                nextCol = this.columns.length - 1;
              }
            } else {
              if (nextCol < this.columns.length - 1) nextCol++;
              else if (nextRow < activeRowsCount - 1) {
                nextRow++;
                nextCol = 0;
              }
            }
            e.preventDefault();
            break;
          case "Enter":
            this.enterEditMode(cell);
            e.preventDefault();
            return;
          default:
            return; // Exit handler
        }

        // Focus next target element
        const nextCell = document.getElementById(`cell-${nextRow}-${nextCol}`);
        if (nextCell) {
          nextCell.focus();
        }
      };
    });

    // Column resizing handle implementation
    let startX = 0, startWidth = 0, resizingTh = null;
    tableHeader.querySelectorAll(".resize-handle").forEach(handle => {
      handle.onmousedown = (e) => {
        resizingTh = handle.parentElement;
        startX = e.pageX;
        startWidth = resizingTh.offsetWidth;
        handle.classList.add("resizing");
        document.body.style.cursor = "col-resize";
        e.preventDefault();

        const moveHandler = (moveEvent) => {
          if (resizingTh) {
            const computedWidth = startWidth + (moveEvent.pageX - startX);
            const clampedWidth = Math.max(80, computedWidth);
            resizingTh.style.width = clampedWidth + "px";
          }
        };

        const stopHandler = () => {
          if (resizingTh) {
            handle.classList.remove("resizing");
            document.body.style.cursor = "default";
            resizingTh = null;
          }
          document.removeEventListener("mousemove", moveHandler);
          document.removeEventListener("mouseup", stopHandler);
        };

        document.addEventListener("mousemove", moveHandler);
        document.addEventListener("mouseup", stopHandler);
      };
    });

    // Bind single row delete button clicks
    tableBody.querySelectorAll(".single-row-delete-btn").forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.getAttribute("data-id"), 10);
        if (!confirm("Are you sure you want to delete this job application?")) return;
        
        try {
          await window.SheetsService.deleteApplication(id);
          this.applications = this.applications.filter(x => String(x.id) !== String(id));
          this.selectedRowIds.delete(id);
          window.App.showToast("Application deleted", "success");
          
          // Refresh dashboard
          if (window.App.activePage === "dashboard") {
            window.DashboardController.init();
          }
          this.render();
        } catch (err) {
          window.App.showToast("Failed to delete application", "error");
        }
      };
    });
  },

  // Transition UI element to Editor Form representation
  enterEditMode(cell) {
    if (cell.querySelector("input") || cell.querySelector("select")) return; // already editing

    const appId = parseInt(cell.getAttribute("data-id"), 10);
    const colKey = cell.getAttribute("data-field");
    const app = this.applications.find(x => String(x.id) === String(appId));
    if (!app) return;

    // Build specific input type container
    const currentVal = app[colKey] || "";
    const colDef = this.columns.find(x => x.key === colKey);
    if (!colDef || colDef.type === "readonly" || colDef.key === "actions") return; // Keep timestamps locked for data integrity

    const containerDiv = cell.querySelector(".cell-display-content");
    cell.classList.add("p-0");

    let editorHTML = "";
    if (colDef.type === "select") {
      editorHTML = `
        <select class="w-full h-full px-2 py-1 bg-white outline-none border-0 text-slate-800" style="min-height: 38px;">
          ${this.statusOptions.map(opt => `
            <option value="${opt}" ${opt === currentVal ? "selected" : ""}>${opt}</option>
          `).join("")}
        </select>
      `;
    } else if (colDef.type === "date") {
      editorHTML = `
        <input type="date" value="${currentVal}" class="w-full h-full px-2 py-1 bg-white outline-none border-0 text-slate-800 font-mono" style="min-height: 38px;">
      `;
    } else if (colKey === "resumeUsed") {
      editorHTML = `
        <div class="relative w-full h-full flex items-center bg-white pr-2" style="min-height: 38px;">
          <input type="text" id="resume-text-input" value="${currentVal}" class="w-full h-full px-2 py-1 bg-transparent outline-none border-0 text-slate-800 text-xs truncate mr-6" placeholder="Resume name...">
          <label class="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 cursor-pointer flex items-center justify-center transition-all bg-slate-50 border border-slate-200" title="Upload local file">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <input type="file" class="hidden" id="resume-file-uploader" accept=".pdf,.doc,.docx,.txt">
          </label>
        </div>
      `;
    } else {
      editorHTML = `
        <input type="text" value="${currentVal}" class="w-full h-full px-2 py-1 bg-white outline-none border-0 text-slate-800" style="min-height: 38px;">
      `;
    }

    containerDiv.innerHTML = editorHTML;
    
    // Focus Editor control & setup event hooks
    if (colKey === "resumeUsed") {
      const fileInput = containerDiv.querySelector("#resume-file-uploader");
      const textInput = containerDiv.querySelector("#resume-text-input");

      fileInput.onchange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          textInput.value = file.name;
          window.App.showToast(`Resume "${file.name}" linked!`, "success");
          this.exitEditMode(cell, true);
        }
      };

      textInput.onblur = () => {
        // Safe timeout so clicking file upload button trigger can process
        setTimeout(() => {
          if (document.activeElement !== fileInput && document.activeElement !== textInput) {
            this.exitEditMode(cell, true);
          }
        }, 200);
      };

      textInput.onkeydown = (e) => {
        if (e.key === "Escape") {
          this.exitEditMode(cell, false);
          e.stopPropagation();
        } else if (e.key === "Enter") {
          this.exitEditMode(cell, true);
          e.stopPropagation();
        }
      };

      textInput.focus();
      textInput.select();
    } else {
      const control = containerDiv.firstElementChild;
      control.focus();
      if (colDef.type === "text" || colDef.type === "url") {
        control.select();
      }

      if (colDef.type === "select") {
        control.onchange = () => {
          this.exitEditMode(cell, true);
        };
        control.onblur = () => {
          setTimeout(() => {
            if (cell.contains(control)) {
              this.exitEditMode(cell, true);
            }
          }, 250);
        };
      } else {
        control.onblur = () => {
          this.exitEditMode(cell, true);
        };
      }

      control.onkeydown = (e) => {
        if (e.key === "Escape") {
          this.exitEditMode(cell, false);
          e.stopPropagation();
        } else if (e.key === "Enter") {
          this.exitEditMode(cell, true);
          e.stopPropagation();
        }
      };
    }
  },

  // Save changes on leaving editing viewport state
  exitEditMode(cell, save) {
    const appId = parseInt(cell.getAttribute("data-id"), 10);
    const colKey = cell.getAttribute("data-field");
    const app = this.applications.find(x => String(x.id) === String(appId));
    if (!app) return;

    const control = cell.querySelector("#resume-text-input") || cell.querySelector("input, select");
    if (!control) return;

    const newVal = control.value;
    cell.classList.remove("p-0");

    if (save) {
      // Solve race-condition by synchronously updating the memory model
      app[colKey] = newVal;
      this.saveCellEdit(appId, colKey, newVal);
    }

    // Redraw cells to default styling
    let displayHTML = "";
    if (colKey === "status") {
      const badgeClass = this.getStatusBadgeClass(app[colKey]);
      displayHTML = `<span class="badge-status ${badgeClass}">${app[colKey] || "Applied"}</span>`;
    } else if (colKey === "jobLink") {
      displayHTML = app[colKey] ? `<a href="${app[colKey]}" target="_blank" class="text-blue-600 hover:underline hover:text-blue-800" tabindex="-1" onclick="event.stopPropagation()">${app[colKey]}</a>` : `<span class="text-slate-300 font-mono text-xs italic">add link</span>`;
    } else if (colKey === "lastUpdated") {
      displayHTML = `<span class="text-xs text-slate-400 font-mono" data-app-id="${app.id}" data-field="lastUpdated">${app[colKey]}</span>`;
    } else {
      displayHTML = app[colKey] || `<span class="text-slate-300 italic">double click...</span>`;
    }

    const containerDiv = cell.querySelector(".cell-display-content");
    containerDiv.innerHTML = displayHTML;
  },

  updatePaginationUI(start, end, total, totalPages) {
    const pageInfo = document.getElementById("jobs-page-info");
    const prevBtn = document.getElementById("jobs-prev-page");
    const nextBtn = document.getElementById("jobs-next-page");

    if (pageInfo) {
      if (total === 0) {
        pageInfo.textContent = "Showing 0 to 0 of 0";
      } else {
        pageInfo.textContent = `Showing ${start} to ${end} of ${total}`;
      }
    }

    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
      prevBtn.onclick = () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this.render();
        }
      };
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= totalPages;
      nextBtn.onclick = () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this.render();
        }
      };
    }
  },

  // Export spreadsheet contents as valid csv blob
  exportToCSV() {
    if (this.applications.length === 0) {
      window.App.showToast("No data to export", "error");
      return;
    }

    const exportCols = this.columns.filter(col => col.key !== "actions");

    // Headers line
    const csvRows = [
      exportCols.map(col => `"${col.title.replace(/"/g, '""')}"`).join(",")
    ];

    // Rows
    this.applications.forEach(app => {
      const row = exportCols.map(col => {
        const val = app[col.key] || "";
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    });

    const csvBlob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Career_Applications_Export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.App.showToast("CSV Download initiated!", "success");
  }
};

window.JobsController = JobsController;
