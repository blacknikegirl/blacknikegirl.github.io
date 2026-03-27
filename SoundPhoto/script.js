const imageInput = document.getElementById('imageInput');
const dropArea = document.getElementById('dropArea');
const imageCanvas = document.getElementById('imageCanvas');
const ctx = imageCanvas.getContext('2d');
const analyzeBtn = document.getElementById('analyzeBtn');
const status = document.getElementById('status');
const objectLabel = document.getElementById('objectLabel');
const averageColor = document.getElementById('averageColor');
const paletteLabel = document.getElementById('palette');
const tempoLabel = document.getElementById('tempoLabel');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const downloadJsonBtn = document.getElementById('downloadJsonBtn');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const visCtx = visualizerCanvas.getContext('2d');
const genrePreset = document.getElementById('genrePreset');
const reverbSlider = document.getElementById('reverb');
const delaySlider = document.getElementById('delay');
const pitchShiftSlider = document.getElementById('pitchShift');
const energySlider = document.getElementById('energy');
const regenerateBtn = document.getElementById('regenerateBtn');
const downloadImageBtn = document.getElementById('downloadImageBtn');

let model = null;
let modelError = false;
let palette = [];
let lastState = null;
let lastAnalysis = null;
let audioCtx = null;
let masterGain = null;
let analyzer = null;
let sourceIn = null;
let isPlaying = false;
let playerInterval = null;
let composition = [];

const colorThief = new ColorThief();
const smallCanvas = document.createElement('canvas');
const smallCtx = smallCanvas.getContext('2d');
function getImageData(img) {
  const maxSize = 640;
  let w = img.width;
  let h = img.height;
  if (w > maxSize || h > maxSize) {
    const ratio = Math.min(maxSize / w, maxSize / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  imageCanvas.width = w;
  imageCanvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

async function loadModel() {
  if (model || modelError) return;

  status.textContent = 'Status: loading MobileNet model...';
  try {
    model = await mobilenet.load();
    status.textContent = 'Status: model ready';
  } catch (err) {
    console.warn('MobileNet load failed', err);
    modelError = true;
    status.textContent = 'Status: model load failed, using fallback detector';
  }
}

function prepareSmallCanvas(sourceCanvas) {
  const targetSize = 224;
  smallCanvas.width = targetSize;
  smallCanvas.height = targetSize;
  smallCtx.clearRect(0, 0, targetSize, targetSize);
  smallCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, targetSize, targetSize);
  return smallCanvas;
}

async function classifyImage(sourceCanvas) {
  if (model && !modelError) {
    const reduced = prepareSmallCanvas(sourceCanvas);
    try {
      return await model.classify(reduced);
    } catch (err) {
      console.warn('classify failed, falling back', err);
      modelError = true;
    }
  }
  return [{ className: fallbackObjectName(sourceCanvas), probability: 0.3 }];
}

function fallbackObjectName(sourceCanvas) {
  const data = sourceCanvas.getContext('2d').getImageData(0, 0, sourceCanvas.width, sourceCanvas.height).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4 * 10) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  const avgR = r / (data.length / (4 * 10));
  const avgG = g / (data.length / (4 * 10));
  const avgB = b / (data.length / (4 * 10));
  if (avgR > 180 && avgG > 180 && avgB > 180) return 'bright sky';
  if (avgG > avgR && avgG > avgB) return 'forest';
  if (avgR > avgG && avgR > avgB) return 'sunset';
  return 'abstract art';
}

function computeAverageColor(imageData, step = 4) {
  let r = 0, g = 0, b = 0, count = 0;
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  return { r, g, b };
}

function rgbToHex(c) { return '#' + ((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1); }

function getBrightness(color) { return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255; }

function edgeDensity(imageData, step = 6) {
  let edges = 0;
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const i = (y * w + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const neighbors = [
        (data[i - 4] + data[i - 3] + data[i - 2]) / 3,
        (data[i + 4] + data[i + 5] + data[i + 6]) / 3,
        (data[i - w * 4] + data[i - w * 4 + 1] + data[i - w * 4 + 2]) / 3,
        (data[i + w * 4] + data[i + w * 4 + 1] + data[i + w * 4 + 2]) / 3,
      ];
      const diff = (Math.abs(lum - neighbors[0]) + Math.abs(lum - neighbors[1]) + Math.abs(lum - neighbors[2]) + Math.abs(lum - neighbors[3])) / 4;
      if (diff > 18) edges++;
    }
  }
  return edges / ((w / step) * (h / step));
}

function getScaleNotes(root = 60, scaleType = 'major', length = 8) {
  const scales = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
  };
  const pattern = scales[scaleType] || scales.major;
  const notes = [];
  for (let i = 0; i < length; i++) {
    const octave = Math.floor(i / pattern.length);
    notes.push(root + octave * 12 + pattern[i % pattern.length]);
  }
  return notes;
}

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function mapColorToNote(color, index) {
  const hue = Math.atan2(Math.sqrt(3) * (color.g - color.b), 2 * color.r - color.g - color.b) * 180 / Math.PI;
  const pitch = Math.round((hue + 360) % 360 / 360 * 24);
  return 48 + pitch + index;
}

function dynamicInstrument(objectName) {
  const mapping = {
    'keyboard': 'square', 'piano': 'triangle', 'guitar': 'sine', 'truck': 'sawtooth', 'dog': 'square', 'cat': 'triangle', 'flower': 'sine'
  };
  for (let key in mapping) if (objectName.toLowerCase().includes(key)) return mapping[key];
  return 'sine';
}

function generateComposition(detectedObject, avgColor, paletteColors, brightness, edgeRatio, seedVal = Math.random()) {
  const genre = genrePreset.value;
  const baseRoot = 36 + Math.round(brightness * 30);

  const genreSpecs = {
    ambient: { scale: 'major', tempo: 45 + Math.round(brightness * 30), instrument: 'sine', swing: 0.05, durationBase: 0.32, drums: 'sparse', bass: 'pad' },
    dubstep: { scale: 'minor', tempo: 120 + Math.round(brightness * 30), instrument: 'sawtooth', swing: 0, durationBase: 0.12, drums: 'house', bass: 'wobble' },
    jazz: { scale: 'harmonic', tempo: 85 + Math.round(brightness * 30), instrument: 'triangle', swing: 0.2, durationBase: 0.24, drums: 'swing', bass: 'walking' },
    chiptune: { scale: 'pentatonic', tempo: 130 + Math.round(brightness * 35), instrument: 'square', swing: 0, durationBase: 0.1, drums: 'chiptune', bass: 'square' },
    cinematic: { scale: 'harmonic', tempo: 58 + Math.round(brightness * 24), instrument: 'sawtooth', swing: 0.04, durationBase: 0.38, drums: 'orchestral', bass: 'cello' },
    lofi: { scale: 'minor', tempo: 60 + Math.round(brightness * 25), instrument: 'triangle', swing: 0.15, durationBase: 0.28, drums: 'lofi', bass: 'warm' },
    rock: { scale: 'minor', tempo: 90 + Math.round(brightness * 35), instrument: 'sawtooth', swing: 0.08, durationBase: 0.18, drums: 'rock', bass: 'punch' },
    orchestral: { scale: 'major', tempo: 55 + Math.round(brightness * 20), instrument: 'triangle', swing: 0.03, durationBase: 0.4, drums: 'orchestral', bass: 'strings' },
    trap: { scale: 'minor', tempo: 132 + Math.round(brightness * 38), instrument: 'square', swing: 0.28, durationBase: 0.14, drums: 'trap', bass: 'sub' },
    ethnic: { scale: 'pentatonic', tempo: 70 + Math.round(brightness * 30), instrument: 'sine', swing: 0.1, durationBase: 0.22, drums: 'ethnic', bass: 'ethnic' }
  };

  const spec = genreSpecs[genre] || genreSpecs.ambient;
  const root = baseRoot + (detectedObject.length % 6) + Math.round(seedVal * 4);
  const chord = getScaleNotes(root, spec.scale, 10);
  const objectOscType = dynamicInstrument(detectedObject) || spec.instrument;
  const beatStrength = Math.max(2, Math.round(edgeRatio * 24));
  const speed = spec.tempo;

  // **MELODY TRACK**
  const sequence = [];
  for (let i = 0; i < 38; i++) {
    const seedPattern = Math.sin(seedVal * 100 + i) * 0.5 + 0.5;
    const step = (i + Math.round(seedPattern * 3)) % chord.length;
    const patternIndex = (i % 4);
    const pitchOffset = Math.floor(i / chord.length) * 12;
    let note = chord[step] + pitchOffset;

    if (genre === 'dubstep' && i % 8 === 7) note -= 12 + Math.round(seedVal * 5);
    if (genre === 'trap' && i % 3 !== 0) note -= 5 + Math.round(seedVal * 2);
    if (genre === 'rock' && patternIndex === 3) note += 7 + Math.round(seedVal * 3);

    const mappingOffset = mapColorToNote({ r: paletteColors[i % paletteColors.length][0], g: paletteColors[i % paletteColors.length][1], b: paletteColors[i % paletteColors.length][2] }, i);    

    sequence.push({
      midi: note,
      velocity: Math.min(1, 0.25 + seedVal * 0.7) * Number(energySlider.value) * (genre === 'lofi' ? 0.85 : 1),
      duration: spec.durationBase + (patternIndex / 10) + seedVal * 0.06,
      instrument: genre === 'ethnic' ? 'sine' : objectOscType,
      dynamicNote: mappingOffset,
      rhythmicHit: (i % beatStrength === 0),
      swing: spec.swing * (i % 2 === 0 ? -1 : 1) * 0.01,
      track: 'melody'
    });
  }

  // **DRUM TRACK** (genre-specific patterns)
  const drums = [];
  const drumPatterns = {
    sparse: [0.4, 0.3, 0.2, 0.1],
    house: [0.9, 0.2, 0.7, 0.2, 0.9, 0.2, 0.7, 0.2],
    swing: [0.8, 0.1, 0.6, 0.2, 0.7, 0.15],
    chiptune: [0.7, 0.25, 0.6, 0.2, 0.8],
    orchestral: [0.5, 0.3, 0.4, 0.25],
    lofi: [0.6, 0.25, 0.5, 0.2],
    rock: [0.9, 0.3, 0.8, 0.3, 0.9, 0.3],
    trap: [0.9, 0.2, 0.3, 0.2, 0.9, 0.2, 0.3, 0.7, 0.2, 0.3, 0.2, 0.8],
    ethnic: [0.7, 0.2, 0.5, 0.3, 0.7]
  };
  const pattern = drumPatterns[spec.drums] || drumPatterns.sparse;

  for (let i = 0; i < 76; i++) {
    const patIdx = i % pattern.length;
    const vel = pattern[patIdx];
    if (vel > 0.15) {
      drums.push({
        midi: 36 + Math.round(Math.sin(seedVal * 50 + i) * 3),
        velocity: vel * 0.8,
        duration: 0.06,
        instrument: 'square',
        track: 'drums'
      });
    }
  }

  // **BASS TRACK** (genre-specific bass line)
  const bass = [];
  const bassRoot = root - 12;
  const bassChord = [bassRoot, bassRoot + 5, bassRoot + 7, bassRoot + 12];
  for (let i = 0; i < 38; i++) {
    const bassStep = i % 4;
    let bassNote = bassChord[bassStep];
   
    if (spec.bass === 'wobble') {
      bassNote += Math.round(Math.sin(i * 0.5) * 3);
    } else if (spec.bass === 'walking') {
      bassNote += (i % 2) * 2;
    } else if (spec.bass === 'sub') {
      bassNote = bassRoot + (i % 3 === 0 ? 0 : 5);
    }

    bass.push({
      midi: bassNote,
      velocity: 0.4 + seedVal * 0.2,
      duration: spec.durationBase + 0.06,
      instrument: spec.bass === 'strings' ? 'sine' : 'sawtooth',
      track: 'bass'
    });
  }

  return {
    object: detectedObject,
    avgColor,
    palette: paletteColors,
    tempo: speed,
    beats: beatStrength,
    sequence,
    drums,
    bass,
    genre,
    reverb: reverbSlider.value,
    delay: delaySlider.value,
    pitch: pitchShiftSlider.value,
    energy: energySlider.value,
    genreSwing: spec.swing
  };
}

function createReverbBuffer(duration = 2, decay = 2, sampleRate = 44100) {
  const length = sampleRate * duration;
  const impulse = audioCtx.createBuffer(2, length, sampleRate);
  for (let i = 0; i < 2; i++) {
    const channel = impulse.getChannelData(i);
    for (let j = 0; j < length; j++) {
      channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
    }
  }
  return impulse;
}

function scheduleAudio(comp) {
  if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(audioCtx.destination);
  }
  if (!analyzer) {
    analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 2048;
    analyzer.connect(masterGain);
  }

  const reverb = audioCtx.createConvolver();
  reverb.buffer = createReverbBuffer(2, 2, audioCtx.sampleRate);
  const reverbGain = audioCtx.createGain();
  reverbGain.gain.value = parseFloat(comp.reverb);
  reverb.connect(reverbGain);
  reverbGain.connect(masterGain);

  const delay = audioCtx.createDelay(1);
  delay.delayTime.value = parseFloat(comp.delay);
  const delayGain = audioCtx.createGain();
  delayGain.gain.value = 0.4;
  delay.connect(delayGain);
  delayGain.connect(masterGain);

  const schedule = () => {
    const interval = 60 / comp.tempo;
    const now = audioCtx.currentTime;

    // Play melody
    comp.sequence.forEach((noteInfo, i) => {
      const swing = (noteInfo.swing || 0) * 0.01;
      const start = now + i * interval * 0.25 + swing;
      const osc = audioCtx.createOscillator();
      osc.type = noteInfo.instrument || 'sine';
      const freq = midiToFreq(noteInfo.midi);
      osc.frequency.value = freq;
      const env = audioCtx.createGain();
      env.gain.setValueAtTime(0.001, start);
      env.gain.exponentialRampToValueAtTime(Math.min(1, noteInfo.velocity * 0.3), start + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, start + noteInfo.duration);

      const noteFilter = audioCtx.createBiquadFilter();
      noteFilter.type = 'lowpass';
      noteFilter.frequency.value = 800 + (Math.random() * 2000);

      osc.connect(noteFilter);
      noteFilter.connect(env);
      env.connect(analyzer);
      noteFilter.connect(reverb);
      noteFilter.connect(delay);

      osc.start(start);
      osc.stop(start + noteInfo.duration + 0.1);
    });

    // Play drums
    if (comp.drums && comp.drums.length) {
      comp.drums.forEach((drumNote, i) => {
        const start = now + i * interval * 0.125;
        const osc = audioCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = midiToFreq(drumNote.midi) * 4;
        const env = audioCtx.createGain();
        env.gain.setValueAtTime(drumNote.velocity, start);
        env.gain.exponentialRampToValueAtTime(0.001, start + drumNote.duration);

        osc.connect(env);
        env.connect(analyzer);

        osc.start(start);
        osc.stop(start + drumNote.duration);
      });
    }

    // Play bass
    if (comp.bass && comp.bass.length) {
      comp.bass.forEach((bassNote, i) => {
        const start = now + i * interval * 0.25;
        const osc = audioCtx.createOscillator();
        osc.type = bassNote.instrument || 'sawtooth';
        osc.frequency.value = midiToFreq(bassNote.midi);
        const env = audioCtx.createGain();
        env.gain.setValueAtTime(0.001, start);
        env.gain.exponentialRampToValueAtTime(bassNote.velocity * 0.4, start + 0.02);
        env.gain.exponentialRampToValueAtTime(0.001, start + bassNote.duration);

        const bassFilter = audioCtx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 400;

        osc.connect(bassFilter);
        bassFilter.connect(env);
        env.connect(analyzer);
        bassFilter.connect(reverb);

        osc.start(start);
        osc.stop(start + bassNote.duration + 0.1);
      });
    }
  };

  schedule();
  isPlaying = true;
  playBtn.textContent = 'Playing...';

  playerInterval = setInterval(() => {
    if (!isPlaying) return;
    schedule();
  }, (60 / comp.tempo) * 1000 * 8);

  drawVisualizer();
}

function stopAudio() {
  if (!audioCtx) return;
  if (playerInterval) clearInterval(playerInterval);
  isPlaying = false;
  playBtn.textContent = 'Play';
  status.textContent = 'Status: stopped';
  if (audioCtx.state !== 'closed') {
    audioCtx.suspend();
  }
}

function drawVisualizer() {
  if (!analyzer) return;
  requestAnimationFrame(drawVisualizer);
  const bufferLength = analyzer.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyzer.getByteTimeDomainData(dataArray);

  visCtx.fillStyle = '#000';
  visCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

  visCtx.lineWidth = 2;
  visCtx.strokeStyle = '#40ff90';
  visCtx.beginPath();

  const sliceWidth = visualizerCanvas.width * 1.0 / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * visualizerCanvas.height / 2;
    if (i === 0) {
      visCtx.moveTo(x, y);
    } else {
      visCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  visCtx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2);
  visCtx.stroke();

  for (let p = 0; p < 10; p++) {
    const idx = Math.floor(Math.random() * bufferLength);
    const r = dataArray[idx] / 255;
    visCtx.fillStyle = `rgba(175,${Math.floor(80+r*175)},${Math.floor(255-r*150)},0.35)`;
    visCtx.beginPath();
    visCtx.arc(Math.random() * visualizerCanvas.width, Math.random() * visualizerCanvas.height, r * 15, 0, 2*Math.PI);
    visCtx.fill();
  }
}

function saveSong() {
  if (!lastState) {
    status.textContent = 'Status: generate first';
    return;
  }
  localStorage.setItem('photoMusicDJ', JSON.stringify(lastState));
  status.textContent = 'Status: saved to localStorage';
}

function loadSong() {
  const raw = localStorage.getItem('photoMusicDJ');
  if (!raw) {
    status.textContent = 'Status: no saved song';
    return;
  }
  const loaded = JSON.parse(raw);
  lastState = loaded;
  applyStateToUI(loaded);
  status.textContent = 'Status: loaded from localStorage';
}

function applyStateToUI(state) {
  objectLabel.textContent = state.object;
  averageColor.textContent = rgbToHex(state.avgColor);
  paletteLabel.textContent = state.palette.map(c => `rgb(${c.join(',')})`).join(', ');
  tempoLabel.textContent = state.tempo;
  genrePreset.value = state.genre || 'ambient';
  reverbSlider.value = state.reverb || 0.15;
  delaySlider.value = state.delay || 0.1;
  pitchShiftSlider.value = state.pitch || 0;
  energySlider.value = state.energy || 1;
}

function downloadJSON() {
  if (!lastState) { status.textContent = 'Status: generate first'; return; }
  const blob = new Blob([JSON.stringify(lastState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'photo-music-composition.json';
  a.click();
  URL.revokeObjectURL(url);
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return view;
}

async function downloadWav() {
  if (!lastState) { status.textContent = 'Status: generate first'; return; }
  const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
  const offlineCtx = new OfflineAudioContext(2, sampleRate * 10, sampleRate);
  const master = offlineCtx.createGain();
  master.gain.value = 0.8; master.connect(offlineCtx.destination);

  const reverb = offlineCtx.createConvolver();
  reverb.buffer = createReverbBuffer(1.5, 2, sampleRate);
  const reverbgain = offlineCtx.createGain(); reverbgain.gain.value = parseFloat(lastState.reverb);
  reverb.connect(reverbgain); reverbgain.connect(master);

  const delay = offlineCtx.createDelay(1); delay.delayTime.value = parseFloat(lastState.delay);
  const delaygain = offlineCtx.createGain(); delaygain.gain.value = 0.4; delay.connect(delaygain); delaygain.connect(master);

  const interval = 60 / lastState.tempo;
 
  // Render melody
  lastState.sequence.forEach((n, i) => {
    const swing = (n.swing || 0) * 0.01;
    const noteStart = i * interval * 0.25 + swing;
    const osc = offlineCtx.createOscillator(); osc.type = n.instrument || 'sine'; osc.frequency.value = midiToFreq(n.midi);
    const env = offlineCtx.createGain();
    env.gain.setValueAtTime(0.001, noteStart);
    env.gain.exponentialRampToValueAtTime(Math.min(1, n.velocity * 0.3), noteStart + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, noteStart + n.duration);
    const filter = offlineCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 800 + Math.random() * 2000;
    osc.connect(filter); filter.connect(env); env.connect(master); filter.connect(reverb); filter.connect(delay);
    osc.start(noteStart); osc.stop(noteStart + n.duration + 0.03);
  });

  // Render drums
  if (lastState.drums && lastState.drums.length) {
    lastState.drums.forEach((d, i) => {
      const drumStart = i * interval * 0.125;
      const osc = offlineCtx.createOscillator(); osc.type = 'square'; osc.frequency.value = midiToFreq(d.midi) * 4;
      const env = offlineCtx.createGain();
      env.gain.setValueAtTime(d.velocity, drumStart);
      env.gain.exponentialRampToValueAtTime(0.001, drumStart + d.duration);
      osc.connect(env); env.connect(master);
      osc.start(drumStart); osc.stop(drumStart + d.duration);
    });
  }

  // Render bass
  if (lastState.bass && lastState.bass.length) {
    lastState.bass.forEach((b, i) => {
      const bassStart = i * interval * 0.25;
      const osc = offlineCtx.createOscillator(); osc.type = b.instrument || 'sawtooth'; osc.frequency.value = midiToFreq(b.midi);
      const env = offlineCtx.createGain();
      env.gain.setValueAtTime(0.001, bassStart);
      env.gain.exponentialRampToValueAtTime(b.velocity * 0.4, bassStart + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, bassStart + b.duration);
      const filter = offlineCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 400;
      osc.connect(filter); filter.connect(env); env.connect(master); filter.connect(reverb);
      osc.start(bassStart); osc.stop(bassStart + b.duration + 0.03);
    });
  }

  const render = await offlineCtx.startRendering();
  const left = render.getChannelData(0);
  const right = render.getChannelData(1);
  const interleaved = new Float32Array(left.length * 2);
  for (let i = 0, j = 0; i < left.length; i++) {
    interleaved[j++] = left[i]; interleaved[j++] = right[i];
  }
  const wav = encodeWAV(interleaved, render.sampleRate);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'photo-music.wav'; a.click(); URL.revokeObjectURL(url);
}

function makeAudioContext() {
  if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function regenerateMelody() {
  if (!lastAnalysis) { status.textContent = 'Status: analyze image first'; return; }
  stopAudio();
 
  const seed = Math.random();
  composition = generateComposition(lastAnalysis.object, lastAnalysis.avgColor, lastAnalysis.palette, lastAnalysis.brightness, lastAnalysis.edgeRatio, seed);
  lastState = composition;
  status.textContent = 'Status: new melody generated - click Play';
}

function downloadImage() {
  if (!imageCanvas) { status.textContent = 'Status: no image'; return; }
  imageCanvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'photo-music-image.png';
    a.click();
    URL.revokeObjectURL(url);
    status.textContent = 'Status: image downloaded';
  });
}

analyzeBtn.addEventListener('click', async () => {
  if (!dropArea.dataset.imageLoaded) { status.textContent = 'Status: no image loaded'; return; }
  await loadModel();

  status.textContent = 'Status: analyzing image...';
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';

  try {
    const imgData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
    const avg = computeAverageColor(imgData, 5);
    averageColor.textContent = rgbToHex(avg);

    if (window.ColorThief && imageCanvas.width && imageCanvas.height) {
      try {
        palette = colorThief.getPalette(imageCanvas, 5);
      } catch (e) {
        console.warn('ColorThief failed, using fallback palette', e);
        palette = [ [avg.r, avg.g, avg.b] ];
      }
    } else {
      palette = [ [avg.r, avg.g, avg.b] ];
    }

    paletteLabel.textContent = palette.map(c => `rgb(${c.join(',')})`).join(', ');
    const brightness = getBrightness(avg);
    const edgeRatio = edgeDensity(imgData, 8);

    const temp = Math.round(60 + brightness * 140);
    tempoLabel.textContent = temp;

    const predictions = await classifyImage(imageCanvas);
    const detected = predictions && predictions.length > 0 ? predictions[0].className : 'unknown';
    objectLabel.textContent = detected;

    lastAnalysis = { object: detected, avgColor: avg, palette, brightness, edgeRatio };
    composition = generateComposition(detected, avg, palette, brightness, edgeRatio);
    lastState = composition;
    status.textContent = 'Status: composition ready';
  } catch (error) {
    console.error('Analyze failed', error);
    status.textContent = 'Status: analyze failed: ' + (error.message || error);
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze & Generate Music';
  }
});

playBtn.addEventListener('click', () => {
  if (!composition) { status.textContent = 'Status: generate first'; return; }
  if (isPlaying) return;
  makeAudioContext();
  scheduleAudio(composition);
});

stopBtn.addEventListener('click', stopAudio);
saveBtn.addEventListener('click', saveSong);
loadBtn.addEventListener('click', loadSong);
downloadJsonBtn.addEventListener('click', downloadJSON);
downloadWavBtn.addEventListener('click', downloadWav);
regenerateBtn.addEventListener('click', regenerateMelody);
downloadImageBtn.addEventListener('click', downloadImage);

imageInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = function() {
      getImageData(img);
      dropArea.dataset.imageLoaded = 'true';
      status.textContent = 'Status: image loaded';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('hover'); });
dropArea.addEventListener('dragleave', () => { dropArea.classList.remove('hover'); });
dropArea.addEventListener('drop', e => {
  e.preventDefault(); dropArea.classList.remove('hover');
  const file = e.dataTransfer.files[0];
  if (!file) return;
  imageInput.files = e.dataTransfer.files;
  const changeEv = new Event('change');
  imageInput.dispatchEvent(changeEv);
});

// Initial instructions / handling
status.textContent = 'Status: ready - upload an image.';
loadModel().catch(() => { /* ignore startup fail */ });
