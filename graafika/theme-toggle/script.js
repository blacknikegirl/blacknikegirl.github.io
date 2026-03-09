// Theme Toggle with Sound

const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Initialize theme
body.classList.add('light');

// Toggle theme
themeToggle.addEventListener('click', () => {
    body.classList.toggle('light');
    body.classList.toggle('dark');
    
    // Play sound effect (create simple beep)
    playSound();
});

function playSound() {
    // Create audio context for sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set sound parameters
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Add theme preference to localStorage
function saveTheme() {
    const theme = body.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

themeToggle.addEventListener('click', saveTheme);

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.classList.remove('light', 'dark');
    body.classList.add(savedTheme);
}

loadTheme();
