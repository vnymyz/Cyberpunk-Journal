/*
 * journal.js — journal management, search, saving, unsaved-change protection.
 */
(function () {
  "use strict";

  var CJ = window.CJ;
  var entries = [];
  var activeId = null;
  var dirty = false;
  var searchTerm = "";

  document.addEventListener("DOMContentLoaded", function () {
    entries = CJ.getEntries();

    var listEl = document.getElementById("entry-list");
    var totalEl = document.getElementById("entry-total");
    var searchInput = document.getElementById("entry-search");
    var newEntryBtn = document.getElementById("new-entry");
    var form = document.getElementById("journal-form");
    var titleInput = document.getElementById("entry-title");
    var dateInput = document.getElementById("entry-date");
    var moodInput = document.getElementById("entry-mood");
    var bodyInput = document.getElementById("entry-body");
    var deleteBtn = document.getElementById("delete-entry");
    var saveStatus = document.getElementById("save-status");
    var wordCountEl = document.getElementById("word-count");
    var errorEl = document.getElementById("entry-error");

    function sortedEntries() {
      return entries.slice().sort(function (a, b) {
        return b.updatedAt - a.updatedAt;
      });
    }

    function filteredEntries() {
      var term = searchTerm.trim().toLowerCase();
      var list = sortedEntries();
      if (!term) return list;
      return list.filter(function (e) {
        return (
          e.title.toLowerCase().indexOf(term) !== -1 ||
          e.body.toLowerCase().indexOf(term) !== -1
        );
      });
    }

    function renderList() {
      var list = filteredEntries();
      CJ.setText(totalEl, entries.length < 10 ? "0" + entries.length : String(entries.length));
      listEl.innerHTML = "";

      if (entries.length === 0) {
        var empty = document.createElement("div");
        empty.className = "list-empty-state";
        empty.textContent = "No entries yet. Start your first one.";
        listEl.appendChild(empty);
        return;
      }

      if (list.length === 0) {
        var noResults = document.createElement("div");
        noResults.className = "list-empty-state";
        noResults.textContent = "No entries match your search.";
        listEl.appendChild(noResults);
        return;
      }

      list.forEach(function (entry) {
        var item = document.createElement("button");
        item.type = "button";
        item.className = "entry-item" + (entry.id === activeId ? " active" : "");
        item.setAttribute("aria-current", entry.id === activeId ? "true" : "false");

        var titleEl = document.createElement("span");
        titleEl.className = "entry-item-title";
        titleEl.textContent = entry.title || "Untitled";

        var metaEl = document.createElement("span");
        metaEl.className = "entry-item-meta";
        metaEl.textContent = entry.date + (entry.mood ? " · " + entry.mood : "");

        var snippetEl = document.createElement("span");
        snippetEl.className = "entry-item-snippet";
        snippetEl.textContent = entry.body.slice(0, 80);

        item.appendChild(titleEl);
        item.appendChild(metaEl);
        item.appendChild(snippetEl);

        item.addEventListener("click", function () {
          if (entry.id === activeId) return;
          guardedAction(function () {
            selectEntry(entry.id);
          });
        });

        listEl.appendChild(item);
      });
    }

    function updateWordCount() {
      var words = bodyInput.value.trim();
      var count = words ? words.split(/\s+/).length : 0;
      CJ.setText(wordCountEl, count + (count === 1 ? " WORD" : " WORDS"));
    }

    function setSaveStatus(text) {
      CJ.setText(saveStatus, text);
    }

    function setDirty(value) {
      dirty = value;
      setSaveStatus(dirty ? "UNSAVED CHANGES" : "ALL CHANGES SAVED");
    }

    function loadEntryIntoForm(entry) {
      titleInput.value = entry ? entry.title : "";
      dateInput.value = entry ? entry.date : CJ.toKey(new Date());
      moodInput.value = entry ? entry.mood : "";
      bodyInput.value = entry ? entry.body : "";
      updateWordCount();
      CJ.setText(errorEl, "");
      var modeLabel = document.getElementById("entry-mode");
      CJ.setText(modeLabel, entry ? "PERSONAL LOG" : "NEW ENTRY");
      deleteBtn.hidden = !entry;
      setDirty(false);
    }

    function selectEntry(id) {
      activeId = id;
      var entry = entries.find(function (e) {
        return e.id === id;
      });
      loadEntryIntoForm(entry || null);
      renderList();
    }

    function guardedAction(action) {
      if (!dirty) {
        action();
        return;
      }
      var proceed = window.confirm(
        "You have unsaved changes in this entry. Leaving now will discard them. Continue?"
      );
      if (proceed) action();
    }

    function startNewEntry() {
      guardedAction(function () {
        activeId = null;
        loadEntryIntoForm(null);
        renderList();
        titleInput.focus();
      });
    }

    newEntryBtn.addEventListener("click", startNewEntry);

    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value;
      renderList();
    });

    [titleInput, dateInput, moodInput, bodyInput].forEach(function (input) {
      input.addEventListener("input", function () {
        setDirty(true);
        if (input === bodyInput) updateWordCount();
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var title = titleInput.value.trim();
      var date = dateInput.value;
      var body = bodyInput.value.trim();

      if (!title || !date || !body) {
        CJ.setText(errorEl, "Title, date, and body are all required.");
        return;
      }
      CJ.setText(errorEl, "");

      var now = Date.now();
      if (activeId) {
        var existing = entries.find(function (e) {
          return e.id === activeId;
        });
        existing.title = title;
        existing.date = date;
        existing.mood = moodInput.value;
        existing.body = body;
        existing.updatedAt = now;
      } else {
        var newEntry = {
          id: CJ.generateId("entry"),
          title: title,
          date: date,
          mood: moodInput.value,
          body: body,
          updatedAt: now,
        };
        entries.push(newEntry);
        activeId = newEntry.id;
      }

      var saved = CJ.saveEntries(entries);
      if (!saved) {
        CJ.setText(errorEl, "Save failed — browser storage is unavailable. Your entry was not saved.");
        return;
      }
      setDirty(false);
      renderList();
      CJ.showToast("Entry saved.");
    });

    deleteBtn.addEventListener("click", function () {
      if (!activeId) return;
      var proceed = window.confirm("Delete this entry? This cannot be undone.");
      if (!proceed) return;
      entries = entries.filter(function (e) {
        return e.id !== activeId;
      });
      var saved = CJ.saveEntries(entries);
      if (!saved) {
        CJ.setText(errorEl, "Delete failed — browser storage is unavailable.");
        return;
      }
      activeId = null;
      loadEntryIntoForm(null);
      renderList();
      CJ.showToast("Entry deleted.");
    });

    window.addEventListener("beforeunload", function (event) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });

    window.__cjConfirmLeave = function () {
      if (!dirty) return true;
      return window.confirm("You have unsaved changes in this entry. Leaving now will discard them. Continue?");
    };

    document.querySelectorAll('header a.nav-link, header a.wordmark, footer a').forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (!dirty) return;
        if (!window.__cjConfirmLeave()) {
          event.preventDefault();
        }
      });
    });

    var toggleEntriesBtn = document.getElementById("toggle-entries");
    var toggleEntriesLabel = document.getElementById("toggle-entries-label");
    var entriesBody = document.getElementById("entries-body");
    var journalLayout = document.querySelector(".journal-layout");
    toggleEntriesBtn.addEventListener("click", function () {
      var expanded = toggleEntriesBtn.getAttribute("aria-expanded") === "true";
      entriesBody.hidden = expanded;
      toggleEntriesBtn.setAttribute("aria-expanded", String(!expanded));
      CJ.setText(toggleEntriesLabel, expanded ? "OPEN ENTRIES" : "HIDE");
      journalLayout.classList.toggle("entries-collapsed", expanded);
    });

    renderList();
    if (entries.length > 0) {
      selectEntry(sortedEntries()[0].id);
    } else {
      loadEntryIntoForm(null);
    }
  });
})();
