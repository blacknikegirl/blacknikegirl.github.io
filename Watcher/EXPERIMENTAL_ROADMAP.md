# Experimental Roadmap

This project should feel like a playful movement lab, not just a camera demo.

## Vision

Build an app that feels alive:
- It sees movement clearly.
- It reacts with sound and visuals instantly.
- It invites creativity (custom sounds, themes, gestures, game loops).

## Phase 1 - Fast Creative Wins (1 to 2 days)

### 1) User Sound Upload
Behavior goal:
- Users can swap direction sounds without touching code.

Implementation:
- Add 4 upload inputs (up/down/left/right).
- Read files with URL.createObjectURL and store in memory.
- Fall back to /sounds/*.wav if no custom upload is set.

Success check:
- User uploads a new sound and immediately hears it on movement.

### 2) Theme Modes (Dark / Neon)
Behavior goal:
- The app mood changes instantly.

Implementation:
- Add theme toggle button.
- Use data-theme on body and CSS variables.
- Save selected theme in localStorage.

Success check:
- Reload keeps selected theme and all UI colors switch cleanly.

### 3) Sensitivity Control
Behavior goal:
- Users can tune whether the app is strict or energetic.

Implementation:
- Add sliders for motion threshold, smoothing, cooldown.
- Bind slider values to live detection constants.
- Show current values in UI.

Success check:
- Users can make detection calmer or more reactive in real time.

### 4) Movement History Panel
Behavior goal:
- Show the app remembers recent movement patterns.

Implementation:
- Keep last 30 events: direction + timestamp + strength.
- Render as a small list or timeline.

Success check:
- History updates live and drops oldest items automatically.

## Phase 2 - Interactive Experience Layer (2 to 4 days)

### 5) Movement Animations
Behavior goal:
- Movement leaves expressive visual traces.

Implementation:
- Add animated streaks/ripples per direction.
- Scale animation intensity by motion strength.

Success check:
- Strong movement creates stronger visual effects.

### 6) Gesture Support
Behavior goal:
- The app understands short motion phrases.

Implementation:
- Track recent directions in a short rolling buffer.
- Match patterns like left->up or up->down->up.
- Trigger a special sound/flash for matched gesture.

Success check:
- At least 3 gestures trigger reliably.

### 7) Background Music (Adaptive)
Behavior goal:
- Ambient layer feels connected to movement.

Implementation:
- Add looping music track with gain node.
- Raise music intensity for high movement density.
- Lower intensity when scene is still.

Success check:
- Music smoothly follows activity level.

### 8) Capture Movement Snapshots
Behavior goal:
- Save key moments from live interaction.

Implementation:
- On strong event, capture frame to canvas image.
- Save image + direction + time in gallery.

Success check:
- User can review and download snapshots.

## Phase 3 - Playful Systems (3 to 6 days)

### 9) Game Mode: Guess the Movement
Behavior goal:
- Turn tracking into a quick reflex game.

Implementation:
- Prompt target direction.
- Timer and score system.
- Streak multipliers for accurate fast responses.

Success check:
- Full game loop: start, rounds, score, restart.

### 10) Multiplayer Mode (2 Cameras)
Behavior goal:
- Two players can react and compete/cooperate.

Implementation:
- Two camera streams (if available) or camera + remote stream.
- Split-screen UI and per-player scoring.
- Co-op and versus rules.

Success check:
- Both players tracked independently with clear feedback.

## Suggested Build Order

1. Sensitivity control
2. User sound upload
3. Theme toggle
4. Movement history
5. Movement animations
6. Gesture support
7. Snapshot capture
8. Adaptive background music
9. Game mode
10. Multiplayer mode

## Technical Notes

- Keep reaction loop lightweight: detect -> classify -> react in under one frame.
- Preload audio whenever possible for immediate playback.
- Avoid heavy per-frame DOM updates; prefer canvas and class toggles.
- Keep fallback behavior always available when custom assets fail.

## Definition of "Feels Alive"

A feature is successful when:
- Response appears immediate (visual + sound).
- Direction feels intentional, not random.
- User can personalize behavior without code edits.
- The app encourages repeated play, not one-time testing.
