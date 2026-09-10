/*
 * todo.js — monthly calendar and per-day task list.
 */
(function () {
  "use strict";

  var CJ = window.CJ;
  var tasks = [];
  var viewYear, viewMonth; // 0-indexed month
  var selectedDateKey;
  var activeFilter = "all";
  var editingTaskId = null;

  document.addEventListener("DOMContentLoaded", function () {
    tasks = CJ.getTasks();
    var now = new Date();
    viewYear = now.getFullYear();
    viewMonth = now.getMonth();
    selectedDateKey = CJ.todayKey();

    var monthLabel = document.getElementById("calendar-month");
    var grid = document.getElementById("calendar-grid");
    var prevBtn = document.getElementById("previous-month");
    var nextBtn = document.getElementById("next-month");
    var todayBtn = document.getElementById("calendar-today");
    var monthTotalEl = document.getElementById("month-total");
    var monthCompletedEl = document.getElementById("month-completed");

    var dayHeading = document.getElementById("selected-date-heading");
    var dayLabel = document.getElementById("selected-day-label");
    var dayCountEl = document.getElementById("day-count");
    var taskListEl = document.getElementById("task-list");
    var allCountEl = document.getElementById("all-count");
    var activeCountEl = document.getElementById("active-count");
    var completedCountEl = document.getElementById("completed-count");
    var filterButtons = document.querySelectorAll(".task-filters button");
    var inlineNewTaskBtn = document.getElementById("inline-new-task");
    var newTaskBtn = document.getElementById("new-task");

    var dialog = document.getElementById("task-dialog");
    var taskForm = document.getElementById("task-form");
    var dialogTitle = document.getElementById("task-dialog-title");
    var titleInput = document.getElementById("task-title");
    var dateInput = document.getElementById("task-date");
    var priorityInput = document.getElementById("task-priority");
    var notesInput = document.getElementById("task-notes");
    var taskError = document.getElementById("task-error");
    var closeTaskBtn = document.getElementById("close-task");
    var cancelTaskBtn = document.getElementById("cancel-task");

    function persist() {
      var ok = CJ.saveTasks(tasks);
      if (!ok) {
        CJ.showToast("Save failed — browser storage unavailable.", "error");
      }
      return ok;
    }

    function tasksOnDate(dateKey) {
      return tasks.filter(function (t) {
        return t.dueDate === dateKey;
      });
    }

    function renderCalendar() {
      CJ.setText(monthLabel, CJ.monthNames[viewMonth].toUpperCase() + " " + viewYear);
      grid.innerHTML = "";
      var days = CJ.buildMonthGrid(viewYear, viewMonth);
      var todayKey = CJ.todayKey();

      days.forEach(function (date) {
        var key = CJ.toKey(date);
        var cell = document.createElement("button");
        cell.type = "button";
        cell.className = "calendar-day";
        if (date.getMonth() !== viewMonth) cell.classList.add("outside-month");
        if (key === todayKey) cell.classList.add("is-today");
        if (key === selectedDateKey) cell.classList.add("is-selected");

        var num = document.createElement("span");
        num.className = "day-number";
        num.textContent = String(date.getDate());
        cell.appendChild(num);

        if (tasksOnDate(key).length > 0) {
          var dot = document.createElement("span");
          dot.className = "day-indicator";
          dot.setAttribute("aria-hidden", "true");
          cell.appendChild(dot);
        }

        cell.setAttribute(
          "aria-label",
          CJ.formatLongDate(date) + (key === selectedDateKey ? ", selected" : "")
        );

        cell.addEventListener("click", function () {
          selectedDateKey = key;
          if (date.getMonth() !== viewMonth) {
            viewYear = date.getFullYear();
            viewMonth = date.getMonth();
            renderCalendar();
          } else {
            renderCalendar();
          }
          renderTasks();
        });

        grid.appendChild(cell);
      });

      var monthTasks = tasks.filter(function (t) {
        var d = CJ.fromKey(t.dueDate);
        return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
      });
      CJ.setText(monthTotalEl, String(monthTasks.length));
      CJ.setText(
        monthCompletedEl,
        String(
          monthTasks.filter(function (t) {
            return t.completed;
          }).length
        )
      );
    }

    function filteredTasksForSelectedDate() {
      var list = tasksOnDate(selectedDateKey);
      if (activeFilter === "active") {
        return list.filter(function (t) {
          return !t.completed;
        });
      }
      if (activeFilter === "completed") {
        return list.filter(function (t) {
          return t.completed;
        });
      }
      return list;
    }

    function priorityLabel(p) {
      if (p === "high") return "HIGH";
      if (p === "low") return "LOW";
      return "NORMAL";
    }

    function renderTasks() {
      var selectedDate = CJ.fromKey(selectedDateKey);
      var todayKey = CJ.todayKey();
      CJ.setText(dayLabel, selectedDateKey === todayKey ? "TODAY'S FOCUS" : "SELECTED DAY");
      CJ.setText(dayHeading, CJ.formatLongDate(selectedDate));

      var dayTasks = tasksOnDate(selectedDateKey);
      CJ.setText(dayCountEl, dayTasks.length + (dayTasks.length === 1 ? " TASK" : " TASKS"));

      CJ.setText(allCountEl, String(dayTasks.length));
      CJ.setText(
        activeCountEl,
        String(
          dayTasks.filter(function (t) {
            return !t.completed;
          }).length
        )
      );
      CJ.setText(
        completedCountEl,
        String(
          dayTasks.filter(function (t) {
            return t.completed;
          }).length
        )
      );

      filterButtons.forEach(function (btn) {
        var isActive = btn.dataset.filter === activeFilter;
        btn.classList.toggle("active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      var list = filteredTasksForSelectedDate();
      taskListEl.innerHTML = "";

      if (dayTasks.length === 0) {
        var empty = document.createElement("p");
        empty.className = "list-empty-state";
        empty.textContent = "No tasks for this day yet.";
        taskListEl.appendChild(empty);
        return;
      }

      if (list.length === 0) {
        var noMatch = document.createElement("p");
        noMatch.className = "list-empty-state";
        noMatch.textContent = "No tasks match this filter.";
        taskListEl.appendChild(noMatch);
        return;
      }

      list.forEach(function (task) {
        var row = document.createElement("div");
        row.className = "task-row" + (task.completed ? " completed" : "");

        var checkbox = document.createElement("button");
        checkbox.type = "button";
        checkbox.className = "task-checkbox";
        checkbox.setAttribute("aria-pressed", task.completed ? "true" : "false");
        checkbox.setAttribute(
          "aria-label",
          task.completed ? "Reopen task" : "Complete task"
        );
        checkbox.addEventListener("click", function () {
          task.completed = !task.completed;
          persist();
          renderTasks();
          renderCalendar();
        });
        row.appendChild(checkbox);

        var body = document.createElement("div");
        body.className = "task-body";

        var titleEl = document.createElement("p");
        titleEl.className = "task-title";
        titleEl.textContent = task.title;
        body.appendChild(titleEl);

        if (task.notes) {
          var notesEl = document.createElement("p");
          notesEl.className = "task-notes";
          notesEl.textContent = task.notes;
          body.appendChild(notesEl);
        }

        var metaEl = document.createElement("span");
        metaEl.className = "task-priority priority-" + task.priority;
        metaEl.textContent = priorityLabel(task.priority);
        body.appendChild(metaEl);

        row.appendChild(body);

        var actions = document.createElement("div");
        actions.className = "task-row-actions";

        var editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "icon-button";
        editBtn.textContent = "EDIT";
        editBtn.addEventListener("click", function () {
          openDialog(task);
        });
        actions.appendChild(editBtn);

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "icon-button";
        deleteBtn.textContent = "DELETE";
        deleteBtn.addEventListener("click", function () {
          var proceed = window.confirm("Delete this task? This cannot be undone.");
          if (!proceed) return;
          tasks = tasks.filter(function (t) {
            return t.id !== task.id;
          });
          persist();
          renderTasks();
          renderCalendar();
        });
        actions.appendChild(deleteBtn);

        row.appendChild(actions);
        taskListEl.appendChild(row);
      });
    }

    function openDialog(task) {
      editingTaskId = task ? task.id : null;
      CJ.setText(dialogTitle, task ? "Edit task." : "New task.");
      titleInput.value = task ? task.title : "";
      dateInput.value = task ? task.dueDate : selectedDateKey;
      priorityInput.value = task ? task.priority : "normal";
      notesInput.value = task ? task.notes : "";
      CJ.setText(taskError, "");
      dialog.showModal();
      titleInput.focus();
    }

    function closeDialog() {
      dialog.close();
    }

    filterButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeFilter = btn.dataset.filter;
        renderTasks();
      });
    });

    prevBtn.addEventListener("click", function () {
      viewMonth -= 1;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear -= 1;
      }
      renderCalendar();
    });

    nextBtn.addEventListener("click", function () {
      viewMonth += 1;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear += 1;
      }
      renderCalendar();
    });

    todayBtn.addEventListener("click", function () {
      var now = new Date();
      viewYear = now.getFullYear();
      viewMonth = now.getMonth();
      selectedDateKey = CJ.todayKey();
      renderCalendar();
      renderTasks();
    });

    newTaskBtn.addEventListener("click", function () {
      openDialog(null);
    });
    inlineNewTaskBtn.addEventListener("click", function () {
      openDialog(null);
    });
    closeTaskBtn.addEventListener("click", closeDialog);
    cancelTaskBtn.addEventListener("click", closeDialog);

    taskForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var title = titleInput.value.trim();
      var dueDate = dateInput.value;
      if (!title || !dueDate) {
        CJ.setText(taskError, "Task title and due date are required.");
        return;
      }
      CJ.setText(taskError, "");

      if (editingTaskId) {
        var existing = tasks.find(function (t) {
          return t.id === editingTaskId;
        });
        existing.title = title;
        existing.dueDate = dueDate;
        existing.priority = priorityInput.value;
        existing.notes = notesInput.value.trim();
      } else {
        tasks.push({
          id: CJ.generateId("task"),
          title: title,
          notes: notesInput.value.trim(),
          dueDate: dueDate,
          priority: priorityInput.value,
          completed: false,
        });
      }

      var saved = persist();
      if (!saved) {
        CJ.setText(taskError, "Save failed — browser storage is unavailable.");
        return;
      }

      selectedDateKey = dueDate;
      var d = CJ.fromKey(dueDate);
      viewYear = d.getFullYear();
      viewMonth = d.getMonth();

      closeDialog();
      renderCalendar();
      renderTasks();
      CJ.showToast("Task saved.");
    });

    var toggleCalendarBtn = document.getElementById("toggle-calendar");
    var toggleCalendarLabel = document.getElementById("toggle-calendar-label");
    var calendarBody = document.getElementById("calendar-body");
    var todoLayout = document.querySelector(".todo-layout");
    toggleCalendarBtn.addEventListener("click", function () {
      var expanded = toggleCalendarBtn.getAttribute("aria-expanded") === "true";
      calendarBody.hidden = expanded;
      toggleCalendarBtn.setAttribute("aria-expanded", String(!expanded));
      CJ.setText(toggleCalendarLabel, expanded ? "OPEN CALENDAR" : "HIDE");
      todoLayout.classList.toggle("calendar-collapsed", expanded);
    });

    renderCalendar();
    renderTasks();
  });
})();
