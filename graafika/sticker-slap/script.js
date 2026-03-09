// Sticker Slap - Random stickers appear at click with random rotation

const stickers = ['😀', '🎉', '🚀', '⭐', '💥', '🎨', '🎭', '🎪', '🌈', '💫', '✨', '🎯'];
const maxStickers = 30;

document.addEventListener('click', (e) => {
    const sticker = document.createElement('div');
    sticker.className = 'sticker';
    sticker.textContent = stickers[Math.floor(Math.random() * stickers.length)];
    
    // Random rotation
    const rotation = Math.random() * 360;
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    
    sticker.style.left = (e.clientX + offsetX) + 'px';
    sticker.style.top = (e.clientY + offsetY) + 'px';
    sticker.style.transform = `rotate(${rotation}deg)`;
    
    document.body.appendChild(sticker);
    
    // Remove sticker after animation
    setTimeout(() => {
        sticker.remove();
    }, 3000);
    
    // Limit number of stickers on screen
    const allStickers = document.querySelectorAll('.sticker');
    if (allStickers.length > maxStickers) {
        allStickers[0].remove();
    }
});
