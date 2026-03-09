// Color Splash - Colorful circles appear and grow while mouse button is held

const colors = [
    'rgba(255, 107, 107, 0.6)',   // Red
    '78, 205, 196, 0.6',    // Teal
    'rgba(69, 183, 209, 0.6)',   // Cyan
    'rgba(255, 160, 122, 0.6)',  // Salmon
    'rgba(152, 216, 200, 0.6)',  // Light Teal
    'rgba(247, 220, 111, 0.6)'   // Yellow
];

let isMouseDown = false;
let splashInterval = null;

document.addEventListener('mousedown', (e) => {
    isMouseDown = true;
    splashInterval = setInterval(() => {
        if (isMouseDown) {
            createSplash(e.clientX, e.clientY);
        }
    }, 50);
});

document.addEventListener('mousemove', (e) => {
    if (isMouseDown) {
        // Update position for next splash
        document.addEventListener('mousedown', splashInterval, false);
    }
});

document.addEventListener('mouseup', () => {
    isMouseDown = false;
    clearInterval(splashInterval);
});

function createSplash(x, y) {
    const splash = document.createElement('div');
    splash.className = 'splash-circle';
    
    const size = Math.random() * 40 + 20;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const maxSize = size * 3;
    
    splash.style.left = x + 'px';
    splash.style.top = y + 'px';
    splash.style.width = size + 'px';
    splash.style.height = size + 'px';
    splash.style.background = color;
    splash.style.marginLeft = -(size / 2) + 'px';
    splash.style.marginTop = -(size / 2) + 'px';
    
    document.body.appendChild(splash);
    
    // Grow animation
    let currentSize = size;
    const growInterval = setInterval(() => {
        currentSize += 2;
        
        if (currentSize >= maxSize) {
            clearInterval(growInterval);
            splash.remove();
        } else {
            splash.style.width = currentSize + 'px';
            splash.style.height = currentSize + 'px';
            splash.style.marginLeft = -(currentSize / 2) + 'px';
            splash.style.marginTop = -(currentSize / 2) + 'px';
            
            // Fade out
            splash.style.opacity = 1 - (currentSize - size) / (maxSize - size);
        }
    }, 10);
}
