// Shake to Clear - Detect mouse shaking motion

let lastX = 0;
let shakeCount = 0;
let shakeThreshold = 5; // pixels
let shakeWindow = [];
const SHAKE_SENSITIVITY = 50; // milliseconds

document.addEventListener('mousemove', (e) => {
    const currentX = e.clientX;
    const deltaX = Math.abs(currentX - lastX);
    
    // Record shake
    shakeWindow.push({
        x: currentX,
        time: Date.now()
    });
    
    // Remove old entries (older than 500ms)
    shakeWindow = shakeWindow.filter(entry => Date.now() - entry.time < 500);
    
    // Check for rapid left-right motion
    if (shakeWindow.length > 2) {
        let reverse_count = 0;
        for (let i = 1; i < shakeWindow.length; i++) {
            const direction1 = shakeWindow[i].x - shakeWindow[i - 1].x;
            if (i > 1) {
                const direction2 = shakeWindow[i - 1].x - shakeWindow[i - 2].x;
                if ((direction1 > 0 && direction2 < 0) || (direction1 < 0 && direction2 > 0)) {
                    if (Math.abs(direction1) > shakeThreshold) {
                        reverse_count++;
                    }
                }
            }
        }
        
        // If enough reversals detected, trigger shake effect
        if (reverse_count >= 4) {
            triggerShakeEffect();
            shakeWindow = [];
        }
    }
    
    lastX = currentX;
});

function triggerShakeEffect() {
    const elements = document.querySelectorAll('.element');
    elements.forEach(element => {
        if (!element.classList.contains('falling')) {
            setTimeout(() => {
                element.classList.add('falling');
            }, Math.random() * 100);
        }
    });
}
