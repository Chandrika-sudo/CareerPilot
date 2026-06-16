/**
 * =========================================================================
 *              CAREERPILOT - GOOGLE APPS SCRIPT WEB APP BACKEND
 * =========================================================================
 * Paste this entire script into your Google Sheets Apps Script module.
 * 
 * Instructions:
 * 1. Open a new or existing Google Sheet.
 * 2. Click "Extensions" > "Apps Script" in the top menu.
 * 3. Erase all default placeholder code in the script editor.
 * 4. Paste this code directly into the editor.
 * 5. Click the floppy disk icon to save the script.
 * 6. Click the "Deploy" button in top-right > "New Deployment".
 * 7. Click the gear icon next to "Select type" and select "Web app".
 * 8. Configure the web app settings:
 *    - Description: CareerPilot Sync Backend
 *    - Execute as: Me (your-email@gmail.com)
 *    - Who has access: Anyone (CRITICAL: Must be Anyone to accept cross-origin requests)
 * 9. Click "Deploy". Authorize any permissions requested by Google.
 * 10. Copy the generated "Web App URL" (this should end in "/exec").
 * 11. Paste this URL into CareerPilot Settings connection panel!
 */

// Handle GET requests (Browser verification/test)
function doGet(e) {
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html>' +
    '<html>' +
    '<head>' +
    '  <meta charset="utf-8">' +
    '  <title>CareerPilot Sync Node</title>' +
    '  <style>' +
    '    body { font-family: "Segoe UI", -apple-system, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 40px; text-align: center; }' +
    '    .card { background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-w: 500px; margin: 0 auto; border: 1px solid #e2e8f0; }' +
    '    h1 { color: #2563eb; margin-top: 0; font-size: 24px; font-weight: 800; }' +
    '    p { line-height: 1.6; margin-bottom: 20px; color: #64748b; font-size: 14px; }' +
    '    .badge { display: inline-block; background-color: #dcfce7; color: #15803d; font-weight: bold; padding: 6px 12px; rounded-radius: 20px; font-size: 12px; border-radius: 9999px; }' +
    '  </style>' +
    '</head>' +
    '<body>' +
    '  <div class="card">' +
    '    <h1>CareerPilot Sync Node Live</h1>' +
    '    <p>Your Google Sheets API script is deployed successfully and running live.</p>' +
    '    <div class="badge">● Connection Live</div>' +
    '  </div>' +
    '</body>' +
    '</html>'
  );
}

// Handle POST Requests (Main CRUD Interface)
function doPost(e) {
  try {
    // Parse input payloads
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var action = payload.action;
    
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // Auto initialize sheets if not present
    initSheetsIfNeeded(doc);
    
    var result;
    
    switch (action) {
      // --- Applications Resource ---
      case "loadApplications":
        result = loadApplications(doc);
        break;
      case "addApplication":
        result = addApplication(doc, payload.app);
        break;
      case "updateApplication":
        result = updateApplication(doc, payload.id, payload.app);
        break;
      case "deleteApplication":
        result = deleteApplication(doc, payload.id);
        break;
        
      // --- Habits Resource ---
      case "loadHabits":
        result = loadHabits(doc);
        break;
      case "addHabit":
        result = addHabit(doc, payload.habit);
        break;
      case "updateHabit":
        result = updateHabit(doc, payload.id, payload.habit);
        break;
      case "deleteHabit":
        result = deleteHabit(doc, payload.id);
        break;
        
      // --- Todos Resource ---
      case "loadTodos":
        result = loadTodos(doc);
        break;
      case "addTodo":
        result = addTodo(doc, payload.todo);
        break;
      case "updateTodo":
        result = updateTodo(doc, payload.id, payload.todo);
        break;
      case "deleteTodo":
        result = deleteTodo(doc, payload.id);
        break;
        
      default:
        throw new Error("Action " + action + " not supported on connection node.");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
                         .setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Auto Setup Sheets and headers on blank document
function initSheetsIfNeeded(doc) {
  var config = {
    "Applications": ["id", "company", "jobTitle", "jobLink", "resumeUsed", "dateApplied", "status", "notes", "followUpDate", "lastUpdated"],
    "Habits": ["id", "name", "dailyGoal", "progress", "completed", "streak", "weeklyProgress", "heatmap"],
    "Todos": ["id", "text", "priority", "completed", "dueDate", "position"]
  };
  
  for (var name in config) {
    var sheet = doc.getSheetByName(name);
    if (!sheet) {
      sheet = doc.insertSheet(name);
      sheet.appendRow(config[name]);
      seedSampleData(name, sheet);
    }
  }
  
  // Delete the default Sheet1 if vacant
  var sheet1 = doc.getSheetByName("Sheet1");
  if (sheet1 && sheet1.getLastRow() === 0 && doc.getSheets().length > 1) {
    doc.deleteSheet(sheet1);
  }
}

// Mapping row headers and values
function getSheetDataAsObjects(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  var data = [];
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      var key = headers[j];
      
      if (key === "id" || key === "dailyGoal" || key === "progress" || key === "streak" || key === "position") {
        obj[key] = isNaN(Number(val)) ? 0 : Number(val);
      } else if (key === "completed") {
        obj[key] = (val === true || val === "TRUE" || val === 1 || val === "1");
      } else if (key === "weeklyProgress" || key === "heatmap") {
        if (typeof val === "string" && val.trim() !== "") {
          try {
            obj[key] = JSON.parse(val);
          } catch (e) {
            obj[key] = key === "weeklyProgress" ? [] : {};
          }
        } else {
          obj[key] = key === "weeklyProgress" ? [] : {};
        }
      } else if (val instanceof Date) {
        obj[key] = Utilities.formatDate(val, Session.getScriptTimeZone() || "UTC", "yyyy-MM-dd");
      } else {
        obj[key] = val === undefined || val === null ? "" : String(val);
      }
    }
    data.push(obj);
  }
  return data;
}

// Flush object properties back to sheet row cells
function saveObjectToSheet(sheet, headers, obj, rowIndex) {
  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = obj[key];
    
    if (key === "weeklyProgress" || key === "heatmap") {
      rowValues.push(JSON.stringify(val || (key === "weeklyProgress" ? [] : {})));
    } else if (key === "completed") {
      rowValues.push(val ? true : false);
    } else {
      rowValues.push(val === undefined || val === null ? "" : val);
    }
  }
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
}


// ==========================================
// 1. APPLICATIONS SPREADSHEET OPERATIONS
// ==========================================
function loadApplications(doc) {
  var headers = ["id", "company", "jobTitle", "jobLink", "resumeUsed", "dateApplied", "status", "notes", "followUpDate", "lastUpdated"];
  var sheet = doc.getSheetByName("Applications");
  return getSheetDataAsObjects(sheet, headers);
}

function addApplication(doc, app) {
  var headers = ["id", "company", "jobTitle", "jobLink", "resumeUsed", "dateApplied", "status", "notes", "followUpDate", "lastUpdated"];
  var sheet = doc.getSheetByName("Applications");
  var list = getSheetDataAsObjects(sheet, headers);
  
  var newId = 1;
  if (list.length > 0) {
    var ids = list.map(function(item) { return item.id || 0; });
    newId = Math.max.apply(null, ids) + 1;
  }
  app.id = newId;
  
  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    if (key === "id") {
      rowValues.push(newId);
    } else {
      rowValues.push(app[key] === undefined || app[key] === null ? "" : app[key]);
    }
  }
  sheet.appendRow(rowValues);
  return app;
}

function updateApplication(doc, id, appFields) {
  var headers = ["id", "company", "jobTitle", "jobLink", "resumeUsed", "dateApplied", "status", "notes", "followUpDate", "lastUpdated"];
  var sheet = doc.getSheetByName("Applications");
  var list = getSheetDataAsObjects(sheet, headers);
  
  var rowIndex = -1;
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i].id) === Number(id)) {
      rowIndex = i + 2; // +1 for 0-index offset, +1 for header row
      break;
    }
  }
  
  if (rowIndex !== -1) {
    var currentObj = list[rowIndex - 2];
    for (var key in appFields) {
      currentObj[key] = appFields[key];
    }
    saveObjectToSheet(sheet, headers, currentObj, rowIndex);
    return currentObj;
  }
  throw new Error("Application not found with ID " + id);
}

function deleteApplication(doc, id) {
  var sheet = doc.getSheetByName("Applications");
  var headers = ["id", "company", "jobTitle", "jobLink", "resumeUsed", "dateApplied", "status", "notes", "followUpDate", "lastUpdated"];
  var list = getSheetDataAsObjects(sheet, headers);
  
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i].id) === Number(id)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}


// ==========================================
// 2. HABITS IN-CELL CRUD OPERATIONS
// ==========================================
function loadHabits(doc) {
  var headers = ["id", "name", "dailyGoal", "progress", "completed", "streak", "weeklyProgress", "heatmap"];
  var sheet = doc.getSheetByName("Habits");
  return getSheetDataAsObjects(sheet, headers);
}

function addHabit(doc, habit) {
  var headers = ["id", "name", "dailyGoal", "progress", "completed", "streak", "weeklyProgress", "heatmap"];
  var sheet = doc.getSheetByName("Habits");
  var list = getSheetDataAsObjects(sheet, headers);
  
  var newId = Date.now();
  habit.id = newId;
  
  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = habit[key];
    if (key === "id") {
      rowValues.push(newId);
    } else if (key === "weeklyProgress" || key === "heatmap") {
      rowValues.push(JSON.stringify(val || (key === "weeklyProgress" ? [] : {})));
    } else if (key === "completed") {
      rowValues.push(val ? true : false);
    } else {
      rowValues.push(val === undefined || val === null ? "" : val);
    }
  }
  sheet.appendRow(rowValues);
  return habit;
}

function updateHabit(doc, id, habitFields) {
  var headers = ["id", "name", "dailyGoal", "progress", "completed", "streak", "weeklyProgress", "heatmap"];
  var sheet = doc.getSheetByName("Habits");
  var list = getSheetDataAsObjects(sheet, headers);
  
  var rowIndex = -1;
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i].id) === Number(id)) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    var currentObj = list[rowIndex - 2];
    for (var key in habitFields) {
      currentObj[key] = habitFields[key];
    }
    saveObjectToSheet(sheet, headers, currentObj, rowIndex);
    return currentObj;
  }
  throw new Error("Habit not found with ID " + id);
}

function deleteHabit(doc, id) {
  var sheet = doc.getSheetByName("Habits");
  var headers = ["id", "name", "dailyGoal", "progress", "completed", "streak", "weeklyProgress", "heatmap"];
  var list = getSheetDataAsObjects(sheet, headers);
  
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i].id) === Number(id)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}


// ==========================================
// 3. TO DO TASKS CRUD OPERATIONS
// ==========================================
function loadTodos(doc) {
  var headers = ["id", "text", "priority", "completed", "dueDate", "position"];
  var sheet = doc.getSheetByName("Todos");
  return getSheetDataAsObjects(sheet, headers);
}

function addTodo(doc, todo) {
  var headers = ["id", "text", "priority", "completed", "dueDate", "position"];
  var sheet = doc.getSheetByName("Todos");
  var list = getSheetDataAsObjects(sheet, headers);
  
  var newId = 1;
  if (list.length > 0) {
    var ids = list.map(function(item) { return item.id || 0; });
    newId = Math.max.apply(null, ids) + 1;
  }
  todo.id = newId;
  
  var rowValues = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = todo[key];
    if (key === "id") {
      rowValues.push(newId);
    } else if (key === "completed") {
      rowValues.push(val ? true : false);
    } else {
      rowValues.push(val === undefined || val === null ? "" : val);
    }
  }
  sheet.appendRow(rowValues);
  return todo;
}

function updateTodo(doc, id, todoFields) {
  var headers = ["id", "text", "priority", "completed", "dueDate", "position"];
  var sheet = doc.getSheetByName("Todos");
  var list = getSheetDataAsObjects(sheet, headers);
  
  var rowIndex = -1;
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i].id) === Number(id)) {
      rowIndex = i + 2;
      break;
    }
  }
  
  if (rowIndex !== -1) {
    var currentObj = list[rowIndex - 2];
    for (var key in todoFields) {
      currentObj[key] = todoFields[key];
    }
    saveObjectToSheet(sheet, headers, currentObj, rowIndex);
    return currentObj;
  }
  throw new Error("Todo not found with ID " + id);
}

function deleteTodo(doc, id) {
  var sheet = doc.getSheetByName("Todos");
  var headers = ["id", "text", "priority", "completed", "dueDate", "position"];
  var list = getSheetDataAsObjects(sheet, headers);
  
  for (var i = 0; i < list.length; i++) {
    if (Number(list[i].id) === Number(id)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  return false;
}


// ==========================================
// 4. SAMPLE SEEDING UTILITY
// ==========================================
function seedSampleData(name, sheet) {
  if (name === "Applications") {
    var data = [
      [1, "Google", "Senior Software Engineer", "https://careers.google.com/jobs/results/123", "Resume_Tech_Lead_2026.pdf", "2026-06-10", "Interview", "Prepared system design. Spoke with recruiter Sarah.", "2026-06-20", "2026-06-15 14:30"],
      [2, "Airbnb", "Frontend Developer", "https://careers.airbnb.com/jobs/456", "Resume_UX_Engineering.pdf", "2026-06-12", "Under Review", "Requires a 2-hour technical screen next week.", "2026-06-19", "2026-06-14 09:22"],
      [3, "Stripe", "Fullstack Engineer", "https://stripe.com/jobs/789", "Resume_Tech_Lead_2026.pdf", "2026-06-08", "Assessment", "Coding challenge sent. Needs completion by Friday.", "2026-06-14", "2026-06-14 18:00"],
      [4, "Vercel", "Senior Developer Advocate", "https://vercel.com/careers/99", "Resume_Tech_Lead_2026.pdf", "2026-06-14", "Applied", "Applied via referral. Reached out on LinkedIn.", "2026-06-25", "2026-06-14 10:00"]
    ];
    for (var i = 0; i < data.length; i++) {
      sheet.appendRow(data[i]);
    }
  } else if (name === "Habits") {
    var specWeekly = JSON.stringify([true, true, false, true, true, true, true]);
    var specHeat = JSON.stringify({
      "2026-06-10": true, "2026-06-11": true, "2026-06-12": false, "2026-06-13": true, "2026-06-14": true, "2026-06-15": true, "2026-06-16": true
    });
    var data = [
      [1, "LeetCode Practice", 1, 1, true, 8, specWeekly, specHeat],
      [2, "Company Research", 2, 1, false, 3, JSON.stringify([false, true, true, false, true, false, false]), JSON.stringify({"2026-06-14": true, "2026-06-15": false, "2026-06-16": false})],
      [3, "System Design Prep", 1, 0, false, 5, JSON.stringify([true, true, true, true, true, false, false]), JSON.stringify({"2026-06-14": true, "2026-06-15": false, "2026-06-16": false})],
      [4, "Networking Reach Outs", 3, 3, true, 12, JSON.stringify([true, true, true, true, true, true, true]), JSON.stringify({"2026-06-14": true, "2026-06-15": true, "2026-06-16": true})]
    ];
    for (var i = 0; i < data.length; i++) {
      sheet.appendRow(data[i]);
    }
  } else if (name === "Todos") {
    var data = [
      [1, "Finish Stripe coding test assignment", "High", false, "2026-06-18", 0],
      [2, "Send follow up email to Sarah at Google", "High", false, "2026-06-20", 1],
      [3, "Refine System Design resume version", "Medium", true, "2026-06-15", 2],
      [4, "Submit application to Vercel via internal link", "Medium", false, "2026-06-19", 3],
      [5, "Review algorithmic cheat-sheet", "Low", false, "2026-06-22", 4]
    ];
    for (var i = 0; i < data.length; i++) {
      sheet.appendRow(data[i]);
    }
  }
}
