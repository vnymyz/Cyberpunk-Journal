/*
 * planner.js — greeting, date, and hub summary counts.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var CJ = window.CJ;
    var session = CJ.getSession();
    var nameEl = document.getElementById("greeting-name");
    var dateEl = document.getElementById("greeting-date");
    var timeEl = document.getElementById("greeting-time");
    var journalCountEl = document.getElementById("journal-count");
    var taskCountEl = document.getElementById("task-count");
    var chatCountEl = document.getElementById("chat-count");
    var postsCountEl = document.getElementById("posts-count");
    var completedEl = document.getElementById("today-completed");
    var progressEl = document.getElementById("today-progress");

    if (nameEl) {
      CJ.setText(nameEl, session && session.name ? session.name.toUpperCase() : "RUNNER");
    }
    if (dateEl) {
      CJ.setText(dateEl, CJ.formatLongDate(new Date()).toUpperCase());
    }
    if (timeEl) {
      var updateTime = function () {
        var now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        var period = hours >= 12 ? "PM" : "AM";
        var hour12 = hours % 12 || 12;
        var minuteStr = minutes < 10 ? "0" + minutes : String(minutes);
        CJ.setText(timeEl, hour12 + ":" + minuteStr + " " + period);
      };
      updateTime();
      setInterval(updateTime, 15000);
    }

    var entries = CJ.getEntries();
    if (journalCountEl) {
      CJ.setText(journalCountEl, entries.length + (entries.length === 1 ? " ENTRY" : " ENTRIES"));
    }

    var tasks = CJ.getTasks();
    var activeTasks = tasks.filter(function (t) {
      return !t.completed;
    });
    if (taskCountEl) {
      CJ.setText(taskCountEl, activeTasks.length + (activeTasks.length === 1 ? " ACTIVE TASK" : " ACTIVE TASKS"));
    }

    var contacts = CJ.getContacts();
    var unreadTotal = contacts.reduce(function (sum, c) {
      return sum + (c.unread || 0);
    }, 0);
    if (chatCountEl) {
      CJ.setText(chatCountEl, unreadTotal + " UNREAD");
    }

    var postCount = CJ.getPosts().length;
    if (postsCountEl) {
      CJ.setText(postsCountEl, postCount + (postCount === 1 ? " POST" : " POSTS"));
    }

    var todayKey = CJ.todayKey();
    var todayTasks = tasks.filter(function (t) {
      return t.dueDate === todayKey;
    });
    var todayDone = todayTasks.filter(function (t) {
      return t.completed;
    }).length;

    if (completedEl) {
      var span = completedEl.querySelector("span");
      completedEl.childNodes[0].nodeValue = String(todayDone);
      if (span) span.textContent = " / " + todayTasks.length;
    }
    if (progressEl) {
      progressEl.max = Math.max(todayTasks.length, 1);
      progressEl.value = todayDone;
    }

    wireHubInfo();
  });

  /* Hover/focus info popup — active destinations (Journal, To-do) only.
     Positioned right beside the hovered card: to its left when there's
     room, otherwise flipped to its right. */
  function wireHubInfo() {
    var panel = document.getElementById("hub-info");
    var hubMap = document.querySelector(".hub-map");
    if (!panel || !hubMap) return;
    var titleEl = document.getElementById("hub-info-title");
    var bodyEl = document.getElementById("hub-info-body");
    var nodes = document.querySelectorAll(".hub-node[data-info-title]");
    var gap = 18;

    function position(node) {
      var panelWidth = panel.offsetWidth;
      var panelHeight = panel.offsetHeight;
      var mapWidth = hubMap.clientWidth;
      var mapHeight = hubMap.clientHeight;
      var spaceLeft = node.offsetLeft;
      var placeLeft = spaceLeft >= panelWidth + gap;

      var left = placeLeft
        ? node.offsetLeft - panelWidth - gap
        : node.offsetLeft + node.offsetWidth + gap;
      left = Math.max(8, Math.min(left, mapWidth - panelWidth - 8));

      var top = node.offsetTop + node.offsetHeight / 2 - panelHeight / 2;
      top = Math.max(8, Math.min(top, mapHeight - panelHeight - 8));

      panel.style.left = left + "px";
      panel.style.top = top + "px";
    }

    function show(node) {
      window.CJ.setText(titleEl, node.getAttribute("data-info-title"));
      window.CJ.setText(bodyEl, node.getAttribute("data-info-body"));
      panel.classList.add("visible");
      position(node);
    }
    function hide() {
      panel.classList.remove("visible");
    }

    nodes.forEach(function (node) {
      node.addEventListener("mouseenter", function () {
        show(node);
      });
      node.addEventListener("mouseleave", hide);
      node.addEventListener("focus", function () {
        show(node);
      });
      node.addEventListener("blur", hide);
    });
  }
})();
