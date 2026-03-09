// Edge Warp - Pac-Man effect within a bounded field

const warpBox = document.querySelector('.warp-box');
const playground = document.querySelector('.playground');
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Field dimensions (much larger)
const FIELD_WIDTH = 1400;
const FIELD_HEIGHT = 800;
const BOX_SIZE = 60;

// Current position relative to playground
let posX = (FIELD_WIDTH - BOX_SIZE) / 2;
let posY = (FIELD_HEIGHT - BOX_SIZE) / 2;
let targetX = posX;
let targetY = posY;

// Easing factor for smooth movement (much slower)
const EASING = 0.05;

// Initialize position
updatePosition();
warpBox.textContent = '📦';

warpBox.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = warpBox.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const playgroundRect = playground.getBoundingClientRect();
    targetX = e.clientX - playgroundRect.left - dragOffsetX;
    targetY = e.clientY - playgroundRect.top - dragOffsetY;
    
    // Apply easing for smooth movement
    posX += (targetX - posX) * EASING;
    posY += (targetY - posY) * EASING;
    
    // Wrap around field edges (Pac-Man effect)
    const wrapCoordinate = (pos, max) => {
        const range = max + BOX_SIZE;
        while (pos < -BOX_SIZE) pos += range;
        while (pos > max) pos -= range;
        return pos;
    };
    
    posX = wrapCoordinate(posX, FIELD_WIDTH);
    posY = wrapCoordinate(posY, FIELD_HEIGHT);
    
    updatePosition();
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

function updatePosition() {
    warpBox.style.left = posX + 'px';
    warpBox.style.top = posY + 'px';
}
