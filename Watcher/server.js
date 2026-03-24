const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Makes everything in /public visible in the browser.
// Behavior: files in /public/sounds can be reached as /sounds/*.wav.
app.use(express.static(path.join(__dirname, "public")));

// Quick check endpoint so you can confirm the server is alive.
app.get("/api/health", (req, res) => {
  res.json({ ok: true, app: "motion-sound-watcher" });
});

// Sends the main page for any route so this prototype always opens to the app.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log("Motion Sound Watcher prototype is live.");
  console.log(`Open: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
