# CareerPilot - Personal Career Dashboard

CareerPilot is a modern productivity dashboard designed to help job seekers organize their career journey in a single workspace.

The platform combines a professional job application tracker, daily learning habits manager, and task management system into a clean and intuitive interface inspired by spreadsheet-driven workflows.

---

## Features

### Job Application Tracker

* Spreadsheet-style application management
* Inline editing
* Search and filtering
* Status tracking
* Follow-up scheduling
* Resume version tracking
* Application notes and updates
* CSV export support

### Habits Tracker

* Daily learning habit monitoring
* Progress tracking
* Streak calculations
* Weekly activity tracking
* Monthly heatmap visualization

### Task Management

* Priority-based task organization
* Drag-and-drop ordering
* Due date management
* Completion tracking
* Progress monitoring

### Dashboard Analytics

* Application statistics
* Interview tracking
* Offer tracking
* Habit completion summaries
* Upcoming follow-ups
* Recent activity overview

---

## Technology Stack

Frontend:

* HTML5
* CSS3
* Vanilla JavaScript
* Vite

Data Storage:

* Google Sheets
* Google Apps Script Web API

Deployment:

* Vercel
* Netlify
* GitHub Pages (Frontend Only)

---

## Project Structure

```text
CareerPilot/
│
├── index.html
├── package.json
├── vite.config.ts
│
├── css/
│   └── styles.css
│
├── js/
│   ├── app.js
│   ├── jobs.js
│   ├── habits.js
│   ├── todos.js
│   ├── sheets.js
│   └── config.js
│
└── google_apps_script.js
```

---

## Getting Started

### Clone Repository

```bash
git clone <repository-url>
cd CareerPilot
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Google Sheets Database Setup

CareerPilot uses Google Sheets as a lightweight cloud database.

### Step 1: Create Spreadsheet

Create a new blank Google Spreadsheet.

Example:

```text
CareerPilot Database
```

No sheets need to be manually created.

The backend script automatically generates:

* Applications
* Habits
* Todos

during first execution.

---

### Step 2: Open Apps Script

Inside your spreadsheet:

```text
Extensions
→ Apps Script
```

Delete any default code.

Paste the contents of:

```text
google_apps_script.js
```

Save the project.

---

### Step 3: Deploy Apps Script

Select:

```text
Deploy
→ New Deployment
→ Web App
```

Configuration:

```text
Execute As:
Me

Who Has Access:
Anyone
```

Authorize access when prompted.

After deployment, Google generates a URL similar to:

```text
https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

Copy this URL.

---

## Connecting CareerPilot

Open the dashboard.

Navigate to:

```text
Settings
→ Google Sheets Integration
```

Paste the Apps Script Web App URL:

```text
https://script.google.com/macros/s/XXXXXXXXXXXX/exec
```

Click:

```text
Secure Connect API Node
```

The dashboard will immediately switch from local storage mode to cloud-synchronized mode.

---

## Data Flow

```text
CareerPilot Dashboard
          ↓
Google Apps Script
          ↓
Google Sheets
```

Applications, habits, and tasks are automatically synchronized through the Apps Script endpoint.

---

## Local Storage Fallback

When no API endpoint is configured:

```text
CareerPilot
      ↓
Browser Local Storage
```

The application automatically uses browser storage and sample data.

Once a valid Google Apps Script endpoint is connected, cloud synchronization becomes active.

---

## Design Philosophy

CareerPilot was created to provide a professional and distraction-free productivity environment focused on career growth.

The interface emphasizes:

* Spreadsheet efficiency
* Fast data entry
* Minimal cognitive load
* Clean visual hierarchy
* Responsive usability

The development process involved rapid interface prototyping, iterative workflow refinement, and extensive focus on user experience patterns commonly found in modern productivity platforms.

---

## Security Notes

Do NOT commit:

```text
Apps Script Web App URLs
Spreadsheet URLs
API Keys
.env files
```

Recommended `.gitignore`:

```gitignore
node_modules/
dist/

.env
.env.local
.env.*

.vscode/
.idea/

.DS_Store
Thumbs.db
```

---

## Deployment

### Build Project

```bash
npm run build
```

Generated output:

```text
dist/
```

### Deploy to Vercel

Upload the project repository to GitHub.

Import the repository into Vercel.

Deploy.


---

## Future Enhancements

* Resume document management
* Google Drive integration
* Calendar synchronization
* Email reminder workflows
* Multi-device settings sync
* Advanced analytics dashboard

---

## License

Personal and educational use.
