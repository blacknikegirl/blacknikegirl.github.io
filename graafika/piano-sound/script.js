// Piano Sound - Each key press plays a different frequency

const keyMap = {
    'a': 261.63,  // C
    's': 293.66,  // D
    'd': 329.63,  // E
    'f': 349.23,  // F
    'g': 392.00,  // G
    'h': 440.00,  // A
    'j': 493.88,  // B
    'k': 523.25   // C (higher)
};

function playNote(frequency) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    if (keyMap[key]) {
        e.preventDefault();
        playNote(keyMap[key]);
    }
});
