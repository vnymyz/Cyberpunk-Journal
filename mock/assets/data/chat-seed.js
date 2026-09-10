/*
 * chat-seed.js — static demo data for the Chat feature: contacts and
 * example conversations. Plain data only, no logic — common.js turns
 * this into real seed records (ids, timestamps) on first run.
 *
 * tint: which palette color a contact's dummy avatar tile uses
 * (crimson | cyan | yellow | selected). No real photos — this is an
 * offline local demo, so avatars are colored initial tiles instead.
 */
window.CJ_CHAT_SEED = {
  contacts: [
    { id: "contact_nova", name: "Nova Reyes", status: "online", unread: 0, tint: "crimson" },
    { id: "contact_dax", name: "Dax Kestrel", status: "dnd", unread: 0, tint: "yellow" },
    { id: "contact_silas", name: "Silas Bram", status: "online", unread: 1, tint: "cyan" },
    { id: "contact_wren", name: "Wren Okafor", status: "offline", unread: 0, tint: "selected" },
    { id: "contact_iris", name: "Iris Calder", status: "offline", unread: 0, tint: "crimson" },
    { id: "contact_rhea", name: "Rhea Solano", status: "online", unread: 0, tint: "cyan" },
    { id: "contact_marcus", name: "Marcus Vale", status: "dnd", unread: 0, tint: "crimson" },
    { id: "contact_yuki", name: "Yuki Tanaka", status: "offline", unread: 0, tint: "yellow" },
    { id: "contact_priya", name: "Priya Desh", status: "online", unread: 2, tint: "selected" },
    { id: "contact_kaito", name: "Kaito Fujimori", status: "offline", unread: 0, tint: "cyan" },
    { id: "contact_elena", name: "Elena Vosk", status: "online", unread: 1, tint: "crimson" },
    { id: "contact_omar", name: "Omar Nasri", status: "dnd", unread: 0, tint: "yellow" },
    { id: "contact_sable", name: "Sable Cross", status: "offline", unread: 0, tint: "selected" },
    { id: "contact_theo", name: "Theo Marchetti", status: "online", unread: 0, tint: "cyan" },
    { id: "contact_zara", name: "Zara Okonkwo", status: "offline", unread: 0, tint: "crimson" },
  ],

  /* Each message: from ("me" | "them"), text, and minutesAgo (how long
     before "now" it was sent — common.js converts this to a real
     timestamp once, at first seed). */
  threads: {
    contact_nova: [
      { from: "them", text: "hey, you still up for tomorrow?", minutesAgo: 40 },
      { from: "me", text: "yeah, count me in", minutesAgo: 38 },
      { from: "them", text: "bet. talk soon.", minutesAgo: 37 },
      { from: "them", text: "actually, bring the notes too", minutesAgo: 20 },
    ],
    contact_silas: [
      { from: "them", text: "got a sec?", minutesAgo: 12 },
      { from: "them", text: "need a hand with something", minutesAgo: 11 },
    ],
    contact_rhea: [
      { from: "me", text: "how'd the pitch go?", minutesAgo: 300 },
      { from: "them", text: "better than expected, honestly", minutesAgo: 298 },
      { from: "them", text: "they want a follow-up next week", minutesAgo: 297 },
      { from: "me", text: "that's huge, congrats", minutesAgo: 295 },
      { from: "me", text: "drinks to celebrate?", minutesAgo: 294 },
      { from: "them", text: "obviously. friday?", minutesAgo: 290 },
    ],
    contact_priya: [
      { from: "them", text: "quick one — did you push the update yet?", minutesAgo: 25 },
      { from: "them", text: "no rush, just checking before I start testing", minutesAgo: 24 },
    ],
    contact_elena: [
      { from: "them", text: "made it back okay, thanks for the ride", minutesAgo: 9 },
    ],
  },
};
