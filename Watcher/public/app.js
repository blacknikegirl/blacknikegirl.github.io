const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const overlayCtx = overlay.getContext("2d");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const testSoundBtn = document.getElementById("testSoundBtn");

const statusText = document.getElementById("statusText");
const directionText = document.getElementById("directionText");
const motionText = document.getElementById("motionText");
const audioHint = document.getElementById("audioHint");
const reactionFlash = document.getElementById("reactionFlash");
const reactionArrow = document.getElementById("reactionArrow");
const intensityFill = document.getElementById("intensityFill");

// Settings controls
const effectSpeedAnalysis = document.getElementById("effectSpeedAnalysis");
const effectEcho = document.getElementById("effectEcho");
const effectDiagonal = document.getElementById("effectDiagonal");
const effectCombo = document.getElementById("effectCombo");
const effectVisualBlast = document.getElementById("effectVisualBlast");
const effectIntensity = document.getElementById("effectIntensity");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");

let stream = null;
let animationFrameId = null;
let offCanvas = null;
let offCtx = null;
let previousGray = null;
let previousCentroid = null;
let previousMotionAmount = 0;
let lastDirectionAt = 0;
let smoothedDx = 0;
let smoothedDy = 0;
let candidateDirection = null;
let stableDirectionFrames = 0;
let objectWasVisible = false;
let hasPlayedLostSound = false;
let comboCount = 0;
let lastComboAt = 0;
let lastMotionSpeed = 0;
let maxMotionPixels = 0;

const SAMPLE_W = 160;
const SAMPLE_H = 120;
const PIXEL_THRESHOLD = 16;
const MIN_MOTION_PIXELS = 80;
const DIRECTION_COOLDOWN_MS = 260;
const MOTION_VECTOR_ALPHA = 0.24;
const MIN_AXIS_DELTA = 0.6;
const AXIS_DOMINANCE_RATIO = 1.18;
const STABLE_FRAMES_REQUIRED = 3;
const ARROW_GLYPH = {
  up: "^",
  down: "v",
  left: "<",
  right: ">"
};

let audioContext = null;
let soundsReady = false;
let soundBuffers = {};

// Sound file names are predictable so replacing sounds is easy.
const SOUND_FILE_MAP = {
  up: "sounds/up.wav",
  down: "sounds/down.wav",
  left: "sounds/left.wav",
  right: "sounds/right.wav"
};

const DIRECTION_SOUNDS = {
  left: { freq: 220, type: "sawtooth", duration: 0.2 },
  right: { freq: 660, type: "triangle", duration: 0.2 },
  up: { freq: 880, type: "square", duration: 0.16 },
  down: { freq: 160, type: "sine", duration: 0.26 }
};

function setStatus(text) {
  statusText.textContent = text;
}

async function createAudioContextIfNeeded() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
  }
  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

async function preloadDirectionSounds() {
  if (!audioContext || soundsReady) {
    return;
  }

  const entries = Object.entries(SOUND_FILE_MAP);
  const loaded = {};

  // Preload once so sound reaction feels immediate when movement happens.
  await Promise.all(
    entries.map(async ([direction, filePath]) => {
      try {
        const response = await fetch(filePath, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        loaded[direction] = decoded;
      } catch (error) {
        console.warn(`Sound file failed to load for ${direction}: ${filePath}`);
      }
    })
  );

  soundBuffers = loaded;
  soundsReady = true;
}

function playFallbackTone(direction) {
  const config = DIRECTION_SOUNDS[direction];
  if (!config || !audioContext) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = config.type;
  osc.frequency.setValueAtTime(config.freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.35, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + config.duration + 0.02);
}

function playObjectLostSound() {
  createAudioContextIfNeeded().catch(() => {});
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(110, now);

  gain.gain.setValueAtTime(0.25, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 1.0);
}

function playObjectApproachingSound() {
  createAudioContextIfNeeded().catch(() => {});
  if (!audioContext || audioContext.state !== "running") {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "sawtooth";

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(1600, now + 0.35);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 0.35);
}

function playSpeedAnalysisSound(speed) {
  createAudioContextIfNeeded().catch(() => {});
  if (!audioContext || audioContext.state !== "running" || !effectSpeedAnalysis.checked) {
    return;
  }

  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  const freqBase = 300 + Math.min(speed * 80, 600);

  osc.type = "sine";
  osc.frequency.setValueAtTime(freqBase, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 0.15);
}

function playEchoSound(direction) {
  if (!effectEcho.checked || !audioContext || audioContext.state !== "running") {
    return;
  }

  createAudioContextIfNeeded().catch(() => {});

  const delays = [80, 160, 280];
  const config = DIRECTION_SOUNDS[direction] || { freq: 500 };

  delays.forEach((delay, idx) => {
    setTimeout(() => {
      if (audioContext.state !== "running") return;
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(config.freq * (1 - idx * 0.15), now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15 * (1 - idx * 0.3), now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    }, delay);
  });
}

function playDiagonalSound(dx, dy) {
  if (!effectDiagonal.checked || !audioContext || audioContext.state !== "running") {
    return;
  }

  createAudioContextIfNeeded().catch(() => {});
  const now = audioContext.currentTime;
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc1.type = "square";
  osc2.type = "triangle";

  osc1.frequency.setValueAtTime(300 + Math.abs(dx) * 20, now);
  osc2.frequency.setValueAtTime(400 + Math.abs(dy) * 20, now);

  const mixer = audioContext.createGain();
  osc1.connect(mixer);
  osc2.connect(mixer);
  mixer.connect(gain);
  gain.connect(audioContext.destination);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.12);
  osc2.stop(now + 0.12);
}

function playComboSound() {
  if (!effectCombo.checked || !audioContext || audioContext.state !== "running") {
    return;
  }

  createAudioContextIfNeeded().catch(() => {});
  const now = audioContext.currentTime;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();

  osc.type = "square";

  const freq = 600 + comboCount * 150;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(audioContext.destination);

  osc.start(now);
  osc.stop(now + 0.1);
}

function playDirectionSound(direction) {
  // Some browsers suspend audio context after focus changes, so wake it each time.
  createAudioContextIfNeeded().catch(() => {});
  if (!audioContext || audioContext.state !== "running") {
    if (audioHint) {
      audioHint.textContent = "Click Test Sound once to unlock audio in this browser.";
    }
    return;
  }

  // If a custom sound exists, play it instantly.
  const buffer = soundBuffers[direction];
  if (buffer) {
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.9, audioContext.currentTime);
    source.connect(gain);
    gain.connect(audioContext.destination);
    source.start(audioContext.currentTime);
    return;
  }

  // If no file is available yet, still react with a fallback tone.
  playFallbackTone(direction);
}

function setReactiveStatus(direction) {
  if (!direction) {
    return;
  }

  setStatus(`I see it: ${direction}`);
}

function triggerVisualReaction(direction) {
  if (!reactionFlash || !reactionArrow) {
    return;
  }

  reactionArrow.textContent = ARROW_GLYPH[direction] || "*";

  reactionFlash.classList.remove("is-active", "approaching", "echo", "combo");
  reactionArrow.classList.remove("is-active");

  void reactionFlash.offsetWidth;

  if (effectVisualBlast.checked && comboCount > 2) {
    reactionFlash.classList.add("is-active", "combo");
  } else if (effectVisualBlast.checked) {
    reactionFlash.classList.add("is-active");
  } else {
    reactionFlash.classList.add("is-active");
  }

  reactionArrow.classList.add("is-active");
}

function rgbaToGray(data) {
  const gray = new Uint8ClampedArray(SAMPLE_W * SAMPLE_H);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[j] = (r * 0.299 + g * 0.587 + b * 0.114) | 0;
  }
  return gray;
}

function chooseDirection(dx, dy) {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < MIN_AXIS_DELTA && absY < MIN_AXIS_DELTA) {
    return null;
  }

  if (absX >= absY * AXIS_DOMINANCE_RATIO && absX >= MIN_AXIS_DELTA) {
    return dx > 0 ? "right" : "left";
  }

  if (absY >= absX * AXIS_DOMINANCE_RATIO && absY >= MIN_AXIS_DELTA) {
    return dy > 0 ? "down" : "up";
  }

  return null;
}

function smoothDirection(rawDirection) {
  if (!rawDirection) {
    candidateDirection = null;
    stableDirectionFrames = 0;
    return null;
  }

  if (candidateDirection === rawDirection) {
    stableDirectionFrames += 1;
  } else {
    candidateDirection = rawDirection;
    stableDirectionFrames = 1;
  }

  if (stableDirectionFrames >= STABLE_FRAMES_REQUIRED) {
    return candidateDirection;
  }

  return null;
}

function detectMotion(currentGray) {
  if (!previousGray) {
    previousGray = currentGray;
    return null;
  }

  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < SAMPLE_H; y += 1) {
    for (let x = 0; x < SAMPLE_W; x += 1) {
      const idx = y * SAMPLE_W + x;
      const diff = Math.abs(currentGray[idx] - previousGray[idx]);
      if (diff > PIXEL_THRESHOLD) {
        count += 1;
        sumX += x;
        sumY += y;
      }
    }
  }

  previousGray = currentGray;

  // Update intensity bar
  if (effectIntensity.checked && intensityFill) {
    const maxPixels = SAMPLE_H * SAMPLE_W;
    const intensityPct = Math.min((count / maxPixels) * 200, 100);
    intensityFill.style.width = intensityPct + "%";
  }

  const sensitivity = parseInt(sensitivitySlider.value) / 100;
  const adjustedThreshold = MIN_MOTION_PIXELS * sensitivity;

  if (count < adjustedThreshold) {
    if (objectWasVisible && !hasPlayedLostSound) {
      playObjectLostSound();
      hasPlayedLostSound = true;
    }
    objectWasVisible = false;
    comboCount = 0;
    previousCentroid = null;
    previousMotionAmount = count;
    smoothedDx *= 0.7;
    smoothedDy *= 0.7;
    candidateDirection = null;
    stableDirectionFrames = 0;
    return { count, centroid: null, direction: null };
  }

  // Detect if object is approaching
  if (previousMotionAmount > 0 && count > previousMotionAmount * 1.5) {
    playObjectApproachingSound();
  }

  objectWasVisible = true;
  hasPlayedLostSound = false;

  // Track max for speed analysis
  maxMotionPixels = Math.max(maxMotionPixels, count);

  const centroid = {
    x: sumX / count,
    y: sumY / count
  };

  let direction = null;
  if (previousCentroid) {
    const dx = centroid.x - previousCentroid.x;
    const dy = centroid.y - previousCentroid.y;

    smoothedDx = smoothedDx * (1 - MOTION_VECTOR_ALPHA) + dx * MOTION_VECTOR_ALPHA;
    smoothedDy = smoothedDy * (1 - MOTION_VECTOR_ALPHA) + dy * MOTION_VECTOR_ALPHA;

    const speed = Math.sqrt(smoothedDx * smoothedDx + smoothedDy * smoothedDy);
    lastMotionSpeed = speed;

    const instantDirection = chooseDirection(smoothedDx, smoothedDy);
    direction = smoothDirection(instantDirection);

    // Play diagonal sound if significant diagonal movement
    const diagonalThreshold = 0.8;
    const isDiagonal = Math.abs(smoothedDx) > diagonalThreshold && Math.abs(smoothedDy) > diagonalThreshold;
    if (isDiagonal) {
      playDiagonalSound(smoothedDx, smoothedDy);
    }
  }

  previousCentroid = centroid;
  previousMotionAmount = count;

  return { count, centroid, direction };
}

function drawOverlay(motionInfo) {
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);

  if (!motionInfo || !motionInfo.centroid) {
    return;
  }

  const scaleX = overlay.width / SAMPLE_W;
  const scaleY = overlay.height / SAMPLE_H;

  overlayCtx.strokeStyle = "#4dd0e1";
  overlayCtx.lineWidth = 3;
  overlayCtx.beginPath();
  overlayCtx.arc(motionInfo.centroid.x * scaleX, motionInfo.centroid.y * scaleY, 14, 0, Math.PI * 2);
  overlayCtx.stroke();
}

function processFrame() {
  // Each frame: detect motion, then react with sound + visuals if direction is clear.
  offCtx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
  const imageData = offCtx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
  const gray = rgbaToGray(imageData.data);
  const motionInfo = detectMotion(gray);

  if (motionInfo) {
    motionText.textContent = String(motionInfo.count);
    drawOverlay(motionInfo);

    if (motionInfo.direction) {
      const now = performance.now();
      if (now - lastDirectionAt > DIRECTION_COOLDOWN_MS) {
        lastDirectionAt = now;
        directionText.textContent = motionInfo.direction;
        setReactiveStatus(motionInfo.direction);
        playDirectionSound(motionInfo.direction);
        triggerVisualReaction(motionInfo.direction);

        // New effects
        if (effectSpeedAnalysis.checked) {
          playSpeedAnalysisSound(lastMotionSpeed);
        }

        if (effectEcho.checked) {
          playEchoSound(motionInfo.direction);
        }

        // Combo system
        if (effectCombo.checked) {
          const timeSinceLastCombo = now - lastComboAt;
          if (timeSinceLastCombo < 800) {
            comboCount += 1;
          } else {
            comboCount = 1;
          }
          lastComboAt = now;

          if (comboCount > 2) {
            playComboSound();
            setStatus(`🔥 COMBO x${comboCount}`);
          }
        }
      }
    }
  }

  animationFrameId = window.requestAnimationFrame(processFrame);
}

async function startCamera() {
  try {
    await createAudioContextIfNeeded();
    await preloadDirectionSounds();
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment"
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    offCanvas = document.createElement("canvas");
    offCanvas.width = SAMPLE_W;
    offCanvas.height = SAMPLE_H;
    offCtx = offCanvas.getContext("2d", { willReadFrequently: true });

    previousGray = null;
    previousCentroid = null;
    previousMotionAmount = 0;
    smoothedDx = 0;
    smoothedDy = 0;
    candidateDirection = null;
    stableDirectionFrames = 0;
    objectWasVisible = false;
    hasPlayedLostSound = false;
    directionText.textContent = "None";
    motionText.textContent = "0";
    setStatus("Watching camera");
    if (audioHint) {
      audioHint.textContent = "Audio ready. Move in front of camera to hear reactions.";
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;

    processFrame();
  } catch (error) {
    setStatus("Camera access failed");
    if (audioHint) {
      audioHint.textContent = "Camera or audio permission failed. Please allow access and retry.";
    }
    console.error(error);
  }
}

function stopCamera() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  video.srcObject = null;
  previousGray = null;
  previousCentroid = null;
  previousMotionAmount = 0;
  smoothedDx = 0;
  smoothedDy = 0;
  candidateDirection = null;
  stableDirectionFrames = 0;
  objectWasVisible = false;
  hasPlayedLostSound = false;
  overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
  setStatus("Stopped");
  directionText.textContent = "None";
  motionText.textContent = "0";
  if (audioHint) {
    audioHint.textContent = "Camera stopped. Press Start Camera to continue.";
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

async function testSound() {
  try {
    await createAudioContextIfNeeded();
    await preloadDirectionSounds();
    playDirectionSound("up");
    if (audioHint) {
      audioHint.textContent = "Test sound played. If still silent, check system/browser volume and output device.";
    }
    setStatus("Audio check complete");
  } catch (error) {
    if (audioHint) {
      audioHint.textContent = "Audio test failed. Try refreshing the page and allowing permissions.";
    }
    console.error(error);
  }
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
testSoundBtn.addEventListener("click", testSound);

// Sensitivity slider
sensitivitySlider.addEventListener("input", (e) => {
  sensitivityValue.textContent = e.target.value + "%";
});
