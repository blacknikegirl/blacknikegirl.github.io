# Project Structure

This prototype is intentionally small so you can run it quickly.

- /public
  - What it does: Holds everything the browser needs.
- /public/sounds
  - What it does: Direction sounds the app reacts with.
  - Replace files here: up.wav, down.wav, left.wav, right.wav
- /public/index.html
  - What it does: Main UI (camera, hints, visual reaction layer)
- /server.js
  - What it does: Express server that serves the webpage and static files

Behavior summary:
- The camera view runs in the browser.
- Movement direction triggers sound and visual response.
- The app flashes and shows an arrow when it "sees" motion.
