/*
 * common.js — shared across every page.
 * Provides: storage layer + seeding, session helpers, route guard,
 * header/footer injection, icon library, toast, local-date utilities,
 * and a safe-text helper.
 */
(function () {
  "use strict";

  var STORAGE_PREFIX = "cj.v1.";
  var KEYS = {
    tasks: STORAGE_PREFIX + "tasks",
    journal: STORAGE_PREFIX + "journal",
    contacts: STORAGE_PREFIX + "contacts2",
    threads: STORAGE_PREFIX + "threads2",
    posts: STORAGE_PREFIX + "posts5",
    session: STORAGE_PREFIX + "session",
  };

  var storageAvailable = true;

  function testStorage() {
    try {
      var t = "__cj_test__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      return true;
    } catch (err) {
      return false;
    }
  }
  storageAvailable = testStorage();

  function showStorageWarning(message) {
    var el = document.getElementById("storage-warning");
    if (!el) return;
    el.textContent =
      message ||
      "Browser storage is unavailable. Changes in this session will not be saved.";
    el.hidden = false;
  }

  if (!storageAvailable) {
    document.addEventListener("DOMContentLoaded", function () {
      showStorageWarning();
    });
  }

  /* ---------- low-level storage read/write ---------- */

  function readJSON(key, fallback) {
    if (!storageAvailable) return fallback;
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    if (!storageAvailable) {
      showStorageWarning();
      return false;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      showStorageWarning(
        "Saving failed — your browser storage may be full or disabled. This change was not saved."
      );
      return false;
    }
  }

  /* ---------- local-date utilities (no UTC shifting) ---------- */

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function toKey(date) {
    return (
      date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate())
    );
  }

  function fromKey(key) {
    var parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function todayKey() {
    return toKey(new Date());
  }

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function daysInMonth(year, monthIndex) {
    var lengths = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return lengths[monthIndex];
  }

  var MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  var WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* Build a Monday-first 6x7 grid of Date objects covering the given month. */
  function buildMonthGrid(year, monthIndex) {
    var firstOfMonth = new Date(year, monthIndex, 1);
    var firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
    var start = new Date(year, monthIndex, 1 - firstWeekday);
    var grid = [];
    for (var i = 0; i < 42; i++) {
      grid.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    }
    return grid;
  }

  function formatLongDate(date) {
    var weekdayFull = [
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    ];
    var w = (date.getDay() + 6) % 7;
    return weekdayFull[w] + ", " + MONTH_NAMES[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
  }

  /* ---------- id generation ---------- */

  function generateId(prefix) {
    return (
      prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9)
    );
  }

  /* ---------- sample seed data ---------- */

  function buildSeedTasks() {
    var today = new Date();
    var todayStr = toKey(today);
    var tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    return [
      {
        id: generateId("task"),
        title: "Review the weekly plan",
        notes: "Look over what's left and reprioritize.",
        dueDate: todayStr,
        priority: "normal",
        completed: false,
      },
      {
        id: generateId("task"),
        title: "Hydrate. Actually do it.",
        notes: "",
        dueDate: todayStr,
        priority: "low",
        completed: true,
      },
      {
        id: generateId("task"),
        title: "Prep for tomorrow's sync",
        notes: "Bring the notes from last time.",
        dueDate: toKey(tomorrow),
        priority: "high",
        completed: false,
      },
      {
        id: generateId("task"),
        title: "Send the follow-up message",
        notes: "",
        dueDate: toKey(yesterday),
        priority: "normal",
        completed: true,
      },
    ];
  }

  function buildSeedEntries() {
    var today = new Date();
    var yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    var now = Date.now();
    return [
      {
        id: generateId("entry"),
        title: "A quiet start",
        date: toKey(yesterday),
        mood: "Calm",
        body:
          "Didn't get everything done today, and that's fine. Made a little room for what mattered and let the rest wait.",
        updatedAt: now - 86400000,
      },
      {
        id: generateId("entry"),
        title: "Trying this out",
        date: toKey(today),
        mood: "Reflective",
        body:
          "First real entry in here. Not sure what this will become, but it feels good to have somewhere to put these thoughts.",
        updatedAt: now,
      },
    ];
  }

  /* Static demo data lives in assets/data/chat-seed.js (loaded before
     this file). These two functions just turn that plain data into real
     records — assigning ids and converting relative "minutesAgo" into
     actual timestamps — once, the first time this device seeds. */
  function buildSeedContacts() {
    var seed = window.CJ_CHAT_SEED;
    return seed && seed.contacts ? seed.contacts.slice() : [];
  }

  function buildSeedThreads() {
    var seed = window.CJ_CHAT_SEED;
    if (!seed || !seed.threads) return {};
    var now = Date.now();
    var m = 60000;
    var out = {};
    Object.keys(seed.threads).forEach(function (contactId) {
      out[contactId] = seed.threads[contactId].map(function (msg) {
        return {
          id: generateId("msg"),
          from: msg.from,
          text: msg.text,
          timestamp: now - (msg.minutesAgo || 0) * m,
        };
      });
    });
    return out;
  }

  /* Static demo data for Posts lives in assets/data/post-seed.js. Same
     deal as chat: assign real ids and turn "minutesAgo" into real
     timestamps once, the first time this device seeds. */
  function buildSeedPosts() {
    var seed = window.CJ_POST_SEED;
    if (!seed) return [];
    var now = Date.now();
    var m = 60000;
    return seed.map(function (post) {
      var createdAt = now - (post.minutesAgo || 0) * m;
      return {
        id: generateId("post"),
        authorId: post.authorId,
        authorName: post.authorName,
        tint: post.tint || "crimson",
        title: post.title,
        body: post.body,
        hashtags: post.hashtags || [],
        media: post.media || null,
        score: post.likes || 0,
        voteState: null,
        reposts: 0,
        repostedFromId: null,
        createdAt: createdAt,
        updatedAt: createdAt,
        comments: buildSeedComments(post.comments, now, m),
      };
    });
  }

  /* Resolves each seed comment's replyToIndex (a position in this same
     post's comment list) into a real parentId, after ids exist. */
  function buildSeedComments(rawComments, now, m) {
    var list = rawComments || [];
    var built = list.map(function (c) {
      return {
        id: generateId("comment"),
        authorId: c.authorId || "seed",
        authorName: c.authorName,
        text: c.text,
        timestamp: now - (c.minutesAgo || 0) * m,
        parentId: null,
      };
    });
    list.forEach(function (c, i) {
      if (c.replyToIndex !== undefined && built[c.replyToIndex]) {
        built[i].parentId = built[c.replyToIndex].id;
      }
    });
    return built;
  }

  function ensureSeed() {
    if (!storageAvailable) return;
    // Each collection checks its own key rather than one global flag, so
    // a collection added later (like contacts/threads) still gets seeded
    // for browsers that already ran an earlier version of this seed.
    if (readJSON(KEYS.tasks, null) === null) {
      writeJSON(KEYS.tasks, buildSeedTasks());
    }
    if (readJSON(KEYS.journal, null) === null) {
      writeJSON(KEYS.journal, buildSeedEntries());
    }
    if (readJSON(KEYS.contacts, null) === null) {
      writeJSON(KEYS.contacts, buildSeedContacts());
    }
    if (readJSON(KEYS.threads, null) === null) {
      writeJSON(KEYS.threads, buildSeedThreads());
    }
    if (readJSON(KEYS.posts, null) === null && window.CJ_POST_SEED) {
      writeJSON(KEYS.posts, buildSeedPosts());
    }
  }

  /* ---------- tasks API ---------- */

  function getTasks() {
    return readJSON(KEYS.tasks, []);
  }

  function saveTasks(tasks) {
    return writeJSON(KEYS.tasks, tasks);
  }

  /* ---------- journal API ---------- */

  function getEntries() {
    return readJSON(KEYS.journal, []);
  }

  function saveEntries(entries) {
    return writeJSON(KEYS.journal, entries);
  }

  /* ---------- chat API ---------- */

  function getContacts() {
    return readJSON(KEYS.contacts, []);
  }

  function saveContacts(contacts) {
    return writeJSON(KEYS.contacts, contacts);
  }

  function getThreads() {
    return readJSON(KEYS.threads, {});
  }

  function saveThreads(threads) {
    return writeJSON(KEYS.threads, threads);
  }

  /* ---------- posts API ---------- */

  function getPosts() {
    return readJSON(KEYS.posts, []);
  }

  function savePosts(posts) {
    return writeJSON(KEYS.posts, posts);
  }

  /* ---------- session (kept separate from saved content) ---------- */

  function getSession() {
    return readJSON(KEYS.session, null);
  }

  function setSession(displayName, email) {
    return writeJSON(KEYS.session, { name: displayName, email: email || "" });
  }

  function clearSession() {
    if (!storageAvailable) return;
    try {
      window.localStorage.removeItem(KEYS.session);
    } catch (err) {
      /* ignore */
    }
  }

  /* ---------- safe text rendering ---------- */

  function text(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function setText(el, value) {
    if (el) el.textContent = text(value);
  }

  /* ---------- toast ---------- */

  var toastTimer = null;
  function showToast(message, tone) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.className = tone ? "toast-" + tone : "";
    el.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      el.hidden = true;
    }, 3200);
  }

  /* ---------- icon library ---------- */

  var ICONS = {
    journal:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 3.5h11a2 2 0 0 1 2 2V21l-3.2-2-3.3 2-3.3-2-3.2 2V5.5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.5 8h6M8.5 11.5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    tasks:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 12.5l2.3 2.3L16.5 8.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chat:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16v10H10l-4 3.5v-3.5H4v-10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h3.2l1.3 4-2 1.4a10.5 10.5 0 0 0 5.6 5.6l1.4-2 4 1.3V18a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    "phone-off":
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h3.2l1.3 4-2 1.4a10.5 10.5 0 0 0 5.6 5.6l1.4-2 4 1.3V18a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M3 3l18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    poke:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 3 6 13.5h5L11 21l7-10.5h-5L13 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="18.5" cy="5.5" r="1.4" fill="currentColor" stroke="none"/></svg>',
    send:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12 20 4l-6.5 16-2.5-7-7-1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    posts:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4.5" width="16" height="15" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M7.5 9h9M7.5 12.5h9M7.5 16h5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6" stroke="currentColor" stroke-width="1.6"/><path d="M15.2 15.2 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    lock:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5.5" y="10.5" width="13" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="1.5"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M4 9.5h16M8 3.5v4M16 3.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    bolt:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13 3 6 13.5h5L11 21l7-10.5h-5L13 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    "bolt-filled":
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3 6 13.5h5L11 21l7-10.5h-5L13 3Z" fill="currentColor"/></svg>',
    comment:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5h16v10H10l-4 3.5v-3.5H4v-10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 9.5h8M8 12.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    share:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4.5 20 4v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 4 10.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M17.5 13v6.5H4V6h6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    repost:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 8h11v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 5.5 17 8l-2 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 16H7v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 18.5 7 16l2-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hashtag:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 3.5 7 20.5M17 3.5l-2.5 17M4 8.5h16M3.5 15.5h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    edit:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.5 4.5 19.5 9.5 8 21H3v-5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12.5 6.5 17.5 11.5" stroke="currentColor" stroke-width="1.5"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l1 13h8l1-13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "chevron-up":
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 15l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "chevron-down":
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 9l7 7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor"/></svg>',
  };

  function renderIcons(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll("[data-icon]");
    nodes.forEach(function (node) {
      var name = node.getAttribute("data-icon");
      if (ICONS[name] && !node.dataset.iconRendered) {
        node.innerHTML = ICONS[name];
        node.dataset.iconRendered = "1";
      }
    });
  }

  /* ---------- header / footer / route guard ---------- */

  var PROTECTED_PAGES = ["planner", "journal", "todo", "chat", "posts"];
  var NAV_LINKS = [
    { page: "planner", href: "planner.html", label: "Planner" },
    { page: "journal", href: "journal.html", label: "Journal" },
    { page: "todo", href: "todo.html", label: "To-do" },
    { page: "chat", href: "chat.html", label: "Chat" },
    { page: "posts", href: "posts.html", label: "Posts" },
  ];

  function buildPublicHeader(currentPage) {
    var host = document.getElementById("public-header");
    if (!host) return;
    var showAuthLinks = currentPage !== "login";
    host.innerHTML =
      '<div class="site-nav">' +
      '<a class="wordmark" href="index.html">CHOOMIES</a>' +
      '<nav aria-label="Primary">' +
      (currentPage === "register"
        ? '<a class="nav-link" href="login.html">Log in</a>'
        : showAuthLinks
        ? '<a class="nav-link" href="register.html">Create your space</a><a class="button primary compact" href="login.html">Log in</a>'
        : "") +
      "</nav>" +
      "</div>";
  }

  function buildAppHeader(currentPage) {
    var host = document.getElementById("app-header");
    if (!host) return;
    var links = NAV_LINKS.map(function (item) {
      var active = item.page === currentPage ? ' aria-current="page" class="nav-link active"' : ' class="nav-link"';
      return '<a href="' + item.href + '"' + active + ">" + item.label + "</a>";
    }).join("");
    var session = getSession();
    var displayName = (session && session.name) || "Runner";
    var initials = displayName
      .trim()
      .split(/\s+/)
      .map(function (part) {
        return part[0];
      })
      .join("")
      .slice(0, 2)
      .toUpperCase();

    host.innerHTML =
      '<div class="site-nav app-site-nav">' +
      '<a class="wordmark" href="index.html">CHOOMIES</a>' +
      '<nav aria-label="Primary" class="site-nav-links">' +
      links +
      "</nav>" +
      '<div class="profile-menu-wrap">' +
      '<button type="button" class="profile-trigger" id="profile-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="profile-menu">' +
      '<span class="avatar-tile avatar-tile-small" data-tint="cyan"><span class="avatar-glitch"></span><span class="avatar-initials">' +
      text(initials) +
      "</span></span>" +
      '<span class="profile-trigger-name">' +
      text(displayName) +
      "</span>" +
      '<span data-icon="chevron-down"></span>' +
      "</button>" +
      '<div class="profile-menu" id="profile-menu" role="menu" hidden>' +
      '<button type="button" class="profile-menu-item" id="profile-menu-profile" role="menuitem">Profile</button>' +
      '<button type="button" class="profile-menu-item" id="profile-menu-settings" role="menuitem">Settings</button>' +
      '<button type="button" class="profile-menu-item danger" id="logout-button" role="menuitem">Logout</button>' +
      "</div>" +
      "</div>" +
      "</div>";

    var profileTrigger = document.getElementById("profile-trigger");
    var profileMenu = document.getElementById("profile-menu");

    function closeProfileMenu() {
      profileMenu.hidden = true;
      profileTrigger.setAttribute("aria-expanded", "false");
    }
    function toggleProfileMenu() {
      var expanded = profileTrigger.getAttribute("aria-expanded") === "true";
      profileMenu.hidden = expanded;
      profileTrigger.setAttribute("aria-expanded", String(!expanded));
    }

    profileTrigger.addEventListener("click", function (event) {
      event.stopPropagation();
      toggleProfileMenu();
    });
    document.addEventListener("click", function (event) {
      if (!profileMenu.hidden && !event.target.closest(".profile-menu-wrap")) {
        closeProfileMenu();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !profileMenu.hidden) closeProfileMenu();
    });

    var profileItem = document.getElementById("profile-menu-profile");
    var settingsItem = document.getElementById("profile-menu-settings");
    if (profileItem) {
      profileItem.addEventListener("click", function () {
        closeProfileMenu();
        showToast("Profile isn't part of this demo yet.");
      });
    }
    if (settingsItem) {
      settingsItem.addEventListener("click", function () {
        closeProfileMenu();
        showToast("Settings isn't part of this demo yet.");
      });
    }

    var logoutBtn = document.getElementById("logout-button");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        var proceed = true;
        if (window.__cjConfirmLeave) {
          proceed = window.__cjConfirmLeave("log out");
        }
        if (!proceed) return;
        closeProfileMenu();
        clearSession();
        window.location.href = "login.html";
      });
    }
  }

  function buildAppFooter() {
    var host = document.getElementById("app-footer");
    if (!host) return;
    host.innerHTML =
      '<p>Local demo. Data is stored only in this browser.</p><span class="tiny">CHOOMIES / V.01</span>';
  }

  function guardRoute(currentPage) {
    if (PROTECTED_PAGES.indexOf(currentPage) === -1) return true;
    var session = getSession();
    if (!session) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page") || "";
    ensureSeed();

    if (!guardRoute(page)) return;

    if (page === "index" || page === "login" || page === "register") {
      buildPublicHeader(page);
    } else {
      buildAppHeader(page);
      buildAppFooter();
    }
    renderIcons(document);
  });

  /* ---------- expose shared API ---------- */

  window.CJ = {
    keys: KEYS,
    isStorageAvailable: function () {
      return storageAvailable;
    },
    showStorageWarning: showStorageWarning,
    showToast: showToast,
    text: text,
    setText: setText,
    renderIcons: renderIcons,
    generateId: generateId,
    getTasks: getTasks,
    saveTasks: saveTasks,
    getEntries: getEntries,
    saveEntries: saveEntries,
    getContacts: getContacts,
    saveContacts: saveContacts,
    getThreads: getThreads,
    saveThreads: saveThreads,
    getPosts: getPosts,
    savePosts: savePosts,
    getIconHTML: function (name) {
      return ICONS[name] || "";
    },
    getSession: getSession,
    setSession: setSession,
    clearSession: clearSession,
    todayKey: todayKey,
    toKey: toKey,
    fromKey: fromKey,
    isLeapYear: isLeapYear,
    daysInMonth: daysInMonth,
    buildMonthGrid: buildMonthGrid,
    formatLongDate: formatLongDate,
    monthNames: MONTH_NAMES,
    weekdayLabels: WEEKDAY_LABELS,
  };
})();
