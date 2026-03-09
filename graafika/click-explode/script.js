// Click Explode - Circles explode outward from click point

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#FF85A1', '#00D2D3'];

function createExplosion(x, y) {
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'explosion-particle';
        
        const size = Math.random() * 20 + 10;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = Math.random() * 8 + 4;
        
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.background = color;
        particle.style.boxShadow = `0 0 10px ${color}`;
        
        document.body.appendChild(particle);
        
        // Animate explosion
        const duration = 800;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                particle.remove();
                return;
            }
            
            const moveX = Math.cos(angle) * velocity * progress * 100;
            const moveY = Math.sin(angle) * velocity * progress * 100;
            const scale = 1 - progress * 0.5;
            const opacity = 1 - progress;
            
            particle.style.transform = `translate(${moveX}px, ${moveY}px) scale(${scale})`;
            particle.style.opacity = opacity;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
}

document.addEventListener('click', (e) => {
    createExplosion(e.clientX, e.clientY);
});
