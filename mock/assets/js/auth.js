/*
 * auth.js — demo login and registration.
 * Both pages share the #auth-form / #auth-error / password-toggle markup;
 * behavior branches on document.body.dataset.page.
 */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    wirePasswordToggles();

    if (page === "login") {
      wireLoginForm();
      wireDemoAccess();
    } else if (page === "register") {
      wireRegisterForm();
    }
  });

  function wirePasswordToggles() {
    var toggles = document.querySelectorAll('[data-toggle="password"]');
    toggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var field = btn.previousElementSibling;
        if (!field) return;
        var showing = field.type === "text";
        field.type = showing ? "password" : "text";
        btn.textContent = showing ? "SHOW" : "HIDE";
        btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
      });
    });
  }

  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(message) {
    var el = document.getElementById("auth-error");
    if (el) el.textContent = message || "";
  }

  function wireLoginForm() {
    var form = document.getElementById("auth-form");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      showError("");
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;

      if (!email || !password) {
        showError("Email and password are both required.");
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        showError("Enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        showError("Password must be at least 8 characters.");
        return;
      }

      var displayName = email.split("@")[0];
      var saved = window.CJ.setSession(displayName, email);
      if (!saved) {
        showError("Could not start a session — browser storage is unavailable.");
        return;
      }
      window.location.href = "planner.html";
    });
  }

  function wireDemoAccess() {
    var btn = document.getElementById("demo-access");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var saved = window.CJ.setSession("Runner", "");
      if (!saved) {
        showError("Could not start a demo session — browser storage is unavailable.");
        return;
      }
      window.location.href = "planner.html";
    });
  }

  function wireRegisterForm() {
    var form = document.getElementById("auth-form");
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      showError("");
      var name = document.getElementById("display-name").value.trim();
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var confirm = document.getElementById("confirm-password").value;

      if (!name || !email || !password || !confirm) {
        showError("All fields are required.");
        return;
      }
      if (!EMAIL_PATTERN.test(email)) {
        showError("Enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        showError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        showError("Passwords do not match.");
        return;
      }

      var saved = window.CJ.setSession(name, email);
      if (!saved) {
        showError("Could not start a session — browser storage is unavailable.");
        return;
      }
      window.location.href = "planner.html";
    });
  }
})();
