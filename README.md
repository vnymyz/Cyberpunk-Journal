# Choomies

A cyberpunk-themed personal workspace — planner, journal, to-do/calendar, chat, and a Reddit-style posts feed.

> **Status: mockup phase.** This is a working prototype to nail down features and design before picking a real tech stack. Everything here is vanilla HTML/CSS/JS with `localStorage` on purpose — fast to iterate on, easy to throw away or port piece by piece once the real stack is chosen (framework, backend, database, and real auth are all still undecided).

## What's in it

- **Planner** — a game-menu style hub (hexagon nodes) linking to every feature, with live counts (journal entries, active tasks, unread chats, posts).
- **Journal** — create, edit, search, and delete entries. Unsaved-change warnings before you lose a draft.
- **To-do & calendar** — a monthly calendar with per-day tasks, priorities, filters, and due-date changes that move a task to the right day.
- **Chat** — contacts with presence status, threaded messages with date dividers, poke, and a mock call flow (outgoing/incoming, answer/reject, a 30s missed-call timeout, idle notification).
- **Posts** — a Reddit-style feed: upvote/downvote, nested comment replies, hashtag topics, share/repost, images and video placeholders, edit/delete on your own posts.
- **Auth** — simulated login/register. No real accounts, no passwords stored.

Everything persists to the browser's `localStorage`. First visit seeds a small set of realistic sample data (contacts, tasks, journal entries, posts) so the app doesn't start empty.

## Tech (mockup only — not the final stack)

Plain HTML/CSS/JS — no build step, no package manager, no framework. One shared stylesheet (`assets/css/styles.css`), one shared script (`assets/js/common.js`) handling storage, session, nav, and icons, plus a script per page for its own logic.

The real stack (frontend framework, backend, database, auth) hasn't been decided yet — that comes after the mockup settles.

```
mock/
├── index.html, login.html, register.html      # public pages
├── planner.html, journal.html, todo.html,      # app pages (session required)
│   chat.html, posts.html
└── assets/
    ├── css/styles.css
    ├── js/            # common.js + one script per page
    ├── data/          # static seed data (chat-seed.js, post-seed.js)
    └── favicon.svg
```

## Running it locally

Needs a real HTTP origin (not `file://`) for `localStorage` to work:

```bash
python -m http.server 8000 --directory mock
```

Then open `http://localhost:8000/index.html`.

## Deploying

Static site, no build command needed. On Vercel, set the project's **Root Directory** to `mock/`.

## Limitations

This is a local demo, not a real product:

- No real backend, authentication, or database — everything lives in one browser's `localStorage`.
- No real image/video upload — Posts uses hotlinked Unsplash images and a static video placeholder.
- Calls, shares, and reposts are simulated; nothing leaves the browser.
- Clearing site data / browsing privately starts you over with fresh seed data.
