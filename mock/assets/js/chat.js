/*
 * chat.js — contacts, messaging, poke, and a mock call sequence.
 */
(function () {
  "use strict";

  var CJ = window.CJ;
  var contacts = [];
  var threads = {};
  var activeContactId = null;
  var searchTerm = "";
  var callTimerInterval = null;
  var callSeconds = 0;

  document.addEventListener("DOMContentLoaded", function () {
    contacts = CJ.getContacts();
    threads = CJ.getThreads();

    var contactListEl = document.getElementById("contact-list");
    var contactTotalEl = document.getElementById("contact-total");
    var searchInput = document.getElementById("contact-search");

    var threadHeader = document.getElementById("thread-header");
    var threadEmpty = document.getElementById("thread-empty");
    var threadFeed = document.getElementById("thread-feed");
    var threadComposer = document.getElementById("thread-composer");
    var threadAvatarTile = document.getElementById("thread-avatar");
    var threadAvatarInitials = document.getElementById("thread-initials");
    var threadNameEl = document.getElementById("thread-name");
    var threadStatusEl = document.getElementById("thread-status");
    var messageInput = document.getElementById("message-input");
    var pokeBtn = document.getElementById("poke-button");
    var callBtn = document.getElementById("call-button");
    var testIncomingBtn = document.getElementById("test-incoming-button");

    var callOverlay = document.getElementById("call-overlay");
    var callName = document.getElementById("call-name");
    var callInitials = document.getElementById("call-initials");
    var callStatus = document.getElementById("call-status");
    var callActionsOutgoing = document.getElementById("call-actions-outgoing");
    var callActionsIncoming = document.getElementById("call-actions-incoming");
    var callActionsConnected = document.getElementById("call-actions-connected");
    var callTimerEl = document.getElementById("call-timer");
    var callAnswerBtn = document.getElementById("call-answer");
    var callRejectBtn = document.getElementById("call-reject");
    var callCancelBtn = document.getElementById("call-cancel");
    var callHangupBtn = document.getElementById("call-hangup");
    var callCloseBtn = document.getElementById("call-close");
    var pendingCallTimeout = null;
    var currentCallState = null; // "outgoing" | "incoming" | "connected"
    var idleContact = null;

    var callPortrait = document.querySelector(".call-portrait");
    var callIdle = document.getElementById("call-idle");
    var idleInitials = document.getElementById("idle-initials");
    var idleName = document.getElementById("idle-name");
    var idleAnswerBtn = document.getElementById("idle-answer");
    var idleRejectBtn = document.getElementById("idle-reject");

    var STATUS_LABEL = { online: "Online", dnd: "Do not disturb", offline: "Offline" };

    function initials(name) {
      var parts = name.trim().split(/\s+/);
      var first = parts[0] ? parts[0][0] : "";
      var last = parts.length > 1 ? parts[parts.length - 1][0] : "";
      return (first + last).toUpperCase();
    }

    function findContact(id) {
      return contacts.find(function (c) {
        return c.id === id;
      });
    }

    function persistContacts() {
      var ok = CJ.saveContacts(contacts);
      if (!ok) CJ.showToast("Save failed — browser storage unavailable.", "error");
      return ok;
    }

    function persistThreads() {
      var ok = CJ.saveThreads(threads);
      if (!ok) CJ.showToast("Save failed — browser storage unavailable.", "error");
      return ok;
    }

    function filteredContacts() {
      var term = searchTerm.trim().toLowerCase();
      if (!term) return contacts;
      return contacts.filter(function (c) {
        return c.name.toLowerCase().indexOf(term) !== -1;
      });
    }

    function renderContacts() {
      var list = filteredContacts();
      CJ.setText(contactTotalEl, contacts.length < 10 ? "0" + contacts.length : String(contacts.length));
      contactListEl.innerHTML = "";

      if (contacts.length === 0) {
        var empty = document.createElement("div");
        empty.className = "list-empty-state";
        empty.textContent = "No contacts yet.";
        contactListEl.appendChild(empty);
        return;
      }
      if (list.length === 0) {
        var noResults = document.createElement("div");
        noResults.className = "list-empty-state";
        noResults.textContent = "No contacts match your search.";
        contactListEl.appendChild(noResults);
        return;
      }

      list.forEach(function (contact) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "contact-row" + (contact.id === activeContactId ? " active" : "");
        row.dataset.contactId = contact.id;
        row.setAttribute("aria-current", contact.id === activeContactId ? "true" : "false");

        var avatar = document.createElement("span");
        avatar.className = "avatar-tile avatar-tile-small";
        avatar.dataset.tint = contact.tint || "crimson";
        var glitch = document.createElement("span");
        glitch.className = "avatar-glitch";
        var initialsEl = document.createElement("span");
        initialsEl.className = "avatar-initials";
        initialsEl.textContent = initials(contact.name);
        avatar.appendChild(glitch);
        avatar.appendChild(initialsEl);

        var body = document.createElement("span");
        body.className = "contact-row-body";

        var nameEl = document.createElement("span");
        nameEl.className = "contact-row-name";
        nameEl.textContent = contact.name;

        var statusEl = document.createElement("span");
        statusEl.className = "presence-label presence-" + contact.status;
        statusEl.innerHTML = "";
        var dot = document.createElement("i");
        dot.className = "presence-dot presence-dot-" + contact.status;
        statusEl.appendChild(dot);
        statusEl.appendChild(document.createTextNode(STATUS_LABEL[contact.status]));

        body.appendChild(nameEl);
        body.appendChild(statusEl);

        row.appendChild(avatar);
        row.appendChild(body);

        if (contact.unread > 0) {
          var badge = document.createElement("span");
          badge.className = "unread-badge";
          badge.textContent = contact.unread > 9 ? "9+" : String(contact.unread);
          row.appendChild(badge);
        }

        row.addEventListener("click", function () {
          selectContact(contact.id);
        });

        contactListEl.appendChild(row);
      });
    }

    var WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    /* Today / Yesterday / weekday name (this Monday-start week) / full
       date — the label names the day of the messages that FOLLOW the
       divider, matching the To-do calendar's own week convention. */
    function dividerLabel(dateKey) {
      var todayKey = CJ.todayKey();
      if (dateKey === todayKey) return "Today";

      var yesterday = CJ.fromKey(todayKey);
      yesterday.setDate(yesterday.getDate() - 1);
      if (dateKey === CJ.toKey(yesterday)) return "Yesterday";

      var today = CJ.fromKey(todayKey);
      var startOfWeek = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - ((today.getDay() + 6) % 7)
      );
      var date = CJ.fromKey(dateKey);
      if (date.getTime() >= startOfWeek.getTime()) {
        return WEEKDAY_NAMES[date.getDay()];
      }

      return CJ.monthNames[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
    }

    /* Flattens messages into a render list of date dividers and
       sender-grouped bubble clusters. A divider always starts a fresh
       group, even if the sender is the same as right before it. */
    function buildFeedItems(messages) {
      var items = [];
      var lastDateKey = null;
      var currentGroup = null;

      messages.forEach(function (msg) {
        var dateKey = CJ.toKey(new Date(msg.timestamp));
        if (dateKey !== lastDateKey) {
          items.push({ type: "divider", label: dividerLabel(dateKey) });
          lastDateKey = dateKey;
          currentGroup = null;
        }

        var last = currentGroup && currentGroup.messages[currentGroup.messages.length - 1];
        if (currentGroup && currentGroup.from === msg.from && msg.timestamp - last.timestamp < 5 * 60000) {
          currentGroup.messages.push(msg);
        } else {
          currentGroup = { type: "group", from: msg.from, messages: [msg] };
          items.push(currentGroup);
        }
      });

      return items;
    }

    function formatTime(ts) {
      var d = new Date(ts);
      var h = d.getHours();
      var m = d.getMinutes();
      var period = h >= 12 ? "PM" : "AM";
      var h12 = h % 12 || 12;
      return h12 + ":" + (m < 10 ? "0" + m : m) + " " + period;
    }

    function renderThread() {
      var contact = findContact(activeContactId);
      if (!contact) {
        threadHeader.hidden = true;
        threadFeed.hidden = true;
        threadComposer.hidden = true;
        threadEmpty.hidden = false;
        return;
      }

      threadEmpty.hidden = true;
      threadHeader.hidden = false;
      threadFeed.hidden = false;
      threadComposer.hidden = false;

      threadAvatarTile.dataset.tint = contact.tint || "crimson";
      CJ.setText(threadAvatarInitials, initials(contact.name));
      CJ.setText(threadNameEl, contact.name);
      threadStatusEl.innerHTML = "";
      var dot = document.createElement("i");
      dot.className = "presence-dot presence-dot-" + contact.status;
      threadStatusEl.appendChild(dot);
      threadStatusEl.appendChild(document.createTextNode(STATUS_LABEL[contact.status]));

      var messages = threads[contact.id] || [];
      threadFeed.innerHTML = "";

      if (messages.length === 0) {
        var emptyThread = document.createElement("p");
        emptyThread.className = "list-empty-state";
        emptyThread.textContent = "No messages yet. Say hello.";
        threadFeed.appendChild(emptyThread);
        return;
      }

      var items = buildFeedItems(messages);
      items.forEach(function (item) {
        if (item.type === "divider") {
          var divider = document.createElement("div");
          divider.className = "thread-date-divider";
          var label = document.createElement("span");
          label.textContent = item.label;
          divider.appendChild(label);
          threadFeed.appendChild(divider);
          return;
        }

        if (item.from === "system") {
          item.messages.forEach(function (msg) {
            var sys = document.createElement("div");
            sys.className = "thread-system-line";
            sys.textContent = msg.text;
            threadFeed.appendChild(sys);
          });
          return;
        }

        var wrap = document.createElement("div");
        wrap.className = "bubble-group " + (item.from === "me" ? "sent" : "received");

        item.messages.forEach(function (msg) {
          var bubble = document.createElement("div");
          bubble.className = "chat-bubble";
          bubble.tabIndex = 0;
          var textEl = document.createElement("span");
          textEl.textContent = msg.text;
          bubble.appendChild(textEl);
          var time = document.createElement("span");
          time.className = "bubble-time";
          time.textContent = formatTime(msg.timestamp);
          bubble.appendChild(time);
          wrap.appendChild(bubble);
        });

        threadFeed.appendChild(wrap);
      });

      threadFeed.scrollTop = threadFeed.scrollHeight;
    }

    function selectContact(id) {
      activeContactId = id;
      var contact = findContact(id);
      if (contact && contact.unread > 0) {
        contact.unread = 0;
        persistContacts();
      }
      renderContacts();
      renderThread();
      messageInput.focus();
    }

    searchInput.addEventListener("input", function () {
      searchTerm = searchInput.value;
      renderContacts();
    });

    threadComposer.addEventListener("submit", function (event) {
      event.preventDefault();
      var text = messageInput.value.trim();
      if (!text || !activeContactId) return;

      if (!threads[activeContactId]) threads[activeContactId] = [];
      threads[activeContactId].push({
        id: CJ.generateId("msg"),
        from: "me",
        text: text,
        timestamp: Date.now(),
      });

      var saved = persistThreads();
      messageInput.value = "";
      if (!saved) return;
      renderThread();
    });

    pokeBtn.addEventListener("click", function () {
      var contact = findContact(activeContactId);
      if (!contact) return;

      if (!threads[activeContactId]) threads[activeContactId] = [];
      threads[activeContactId].push({
        id: CJ.generateId("msg"),
        from: "system",
        text: "You poked " + contact.name + ".",
        timestamp: Date.now(),
      });
      persistThreads();
      renderThread();
      CJ.showToast("You poked " + contact.name + ".");

      var row = contactListEl.querySelector('[data-contact-id="' + contact.id + '"]');
      if (row) {
        row.classList.add("poked");
        window.setTimeout(function () {
          row.classList.remove("poked");
        }, 500);
      }
    });

    /* ---------- mock call sequence ----------
       Two distinct flows so it's obvious which end started the call:
       - Outgoing (you press Call): "CALLING…", one Cancel control, then
         auto-connects after a short mock delay (simulating pickup).
       - Incoming (Test Incoming Call button simulates a contact calling
         you): "INCOMING CALL", Answer/Reject, and a Close (×) button.
         Close doesn't end the call — it minimizes to a small idle
         notification (still Answer/Reject-able) so you can deal with it
         later. The 30s unanswered timeout runs the whole time, on-screen
         or idle, and logs a missed call if it fires. */

    function clearPendingCallTimeout() {
      if (pendingCallTimeout) {
        window.clearTimeout(pendingCallTimeout);
        pendingCallTimeout = null;
      }
    }

    function showCallState(state) {
      currentCallState = state;
      callActionsOutgoing.hidden = state !== "outgoing";
      callActionsIncoming.hidden = state !== "incoming";
      callActionsConnected.hidden = state !== "connected";
    }

    function openOutgoingCall(contact) {
      CJ.setText(callName, contact.name);
      CJ.setText(callInitials, initials(contact.name));
      callPortrait.dataset.tint = contact.tint || "crimson";
      CJ.setText(callStatus, "CALLING…");
      showCallState("outgoing");
      callOverlay.hidden = false;
      callCancelBtn.focus();

      pendingCallTimeout = window.setTimeout(function () {
        pendingCallTimeout = null;
        CJ.setText(callStatus, "CONNECTED");
        showCallState("connected");
        startConnectedTimer();
      }, 2200);
    }

    function openIncomingCall(contact) {
      idleContact = contact;
      CJ.setText(callName, contact.name);
      CJ.setText(callInitials, initials(contact.name));
      callPortrait.dataset.tint = contact.tint || "crimson";
      CJ.setText(callStatus, "INCOMING CALL");
      showCallState("incoming");
      callIdle.hidden = true;
      callOverlay.hidden = false;
      callRejectBtn.focus();

      pendingCallTimeout = window.setTimeout(function () {
        pendingCallTimeout = null;
        closeCallOverlay();
        hideIdleCall();
        logMissedCall(contact);
      }, 30000);
    }

    function minimizeToIdle() {
      var contact = idleContact;
      if (!contact) return;
      callOverlay.hidden = true;
      CJ.setText(idleInitials, initials(contact.name));
      callIdle.querySelector(".call-idle-avatar").dataset.tint = contact.tint || "crimson";
      CJ.setText(idleName, contact.name);
      callIdle.hidden = false;
    }

    function hideIdleCall() {
      callIdle.hidden = true;
      idleContact = null;
    }

    function answerCall() {
      clearPendingCallTimeout();
      hideIdleCall();
      CJ.setText(callStatus, "CONNECTED");
      callOverlay.hidden = false;
      showCallState("connected");
      startConnectedTimer();
    }

    function rejectCall() {
      hideIdleCall();
      closeCallOverlay();
    }

    function logMissedCall(contact) {
      if (!threads[contact.id]) threads[contact.id] = [];
      threads[contact.id].push({
        id: CJ.generateId("msg"),
        from: "system",
        text: "Missed call from " + contact.name + ".",
        timestamp: Date.now(),
      });
      persistThreads();
      if (contact.id === activeContactId) renderThread();
      CJ.showToast("Missed call from " + contact.name + ".");
    }

    function closeCallOverlay() {
      callOverlay.hidden = true;
      if (callTimerInterval) {
        window.clearInterval(callTimerInterval);
        callTimerInterval = null;
      }
      clearPendingCallTimeout();
      callSeconds = 0;
      currentCallState = null;
    }

    function startConnectedTimer() {
      callSeconds = 0;
      CJ.setText(callTimerEl, "00:00");
      callTimerInterval = window.setInterval(function () {
        callSeconds += 1;
        var mm = Math.floor(callSeconds / 60);
        var ss = callSeconds % 60;
        CJ.setText(
          callTimerEl,
          (mm < 10 ? "0" + mm : mm) + ":" + (ss < 10 ? "0" + ss : ss)
        );
      }, 1000);
    }

    callBtn.addEventListener("click", function () {
      var contact = findContact(activeContactId);
      if (!contact) return;
      openOutgoingCall(contact);
    });

    testIncomingBtn.addEventListener("click", function () {
      var contact = findContact(activeContactId);
      if (!contact) return;
      openIncomingCall(contact);
    });

    callAnswerBtn.addEventListener("click", answerCall);
    callRejectBtn.addEventListener("click", rejectCall);
    idleAnswerBtn.addEventListener("click", answerCall);
    idleRejectBtn.addEventListener("click", rejectCall);

    callCancelBtn.addEventListener("click", function () {
      closeCallOverlay();
    });

    callHangupBtn.addEventListener("click", function () {
      closeCallOverlay();
    });

    callCloseBtn.addEventListener("click", function () {
      if (currentCallState === "incoming") {
        minimizeToIdle();
      } else {
        closeCallOverlay();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (!callOverlay.hidden && event.key === "Escape") {
        if (currentCallState === "incoming") {
          minimizeToIdle();
        } else {
          closeCallOverlay();
        }
      }
    });

    var toggleContactsBtn = document.getElementById("toggle-contacts");
    var toggleContactsLabel = document.getElementById("toggle-contacts-label");
    var contactsBody = document.getElementById("contacts-body");
    var chatLayout = document.querySelector(".chat-layout");
    toggleContactsBtn.addEventListener("click", function () {
      var expanded = toggleContactsBtn.getAttribute("aria-expanded") === "true";
      contactsBody.hidden = expanded;
      toggleContactsBtn.setAttribute("aria-expanded", String(!expanded));
      CJ.setText(toggleContactsLabel, expanded ? "OPEN CONTACTS" : "HIDE");
      chatLayout.classList.toggle("contacts-collapsed", expanded);
    });

    renderContacts();
    renderThread();
  });
})();
