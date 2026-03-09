// Cursor Trail Effect - Geometric shapes follow the cursor and fade out

const demoArea = document.querySelector('.demo-area');
const shapes = ['circle', 'square', 'triangle'];
const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

// Create trail particle
function createTrailParticle(x, y) {
    const particle = document.createElement('div');
    particle.className = 'trail-particle';
    
    // Random shape
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const size = Math.random() * 15 + 5; // 5-20px
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';
    
    // Create shape based on type
    if (shape === 'circle') {
        particle.style.borderRadius = '50%';
        particle.style.background = color;
    } else if (shape === 'square') {
        particle.style.background = color;
        particle.style.transform = `rotate(${Math.random() * 45}deg)`;
    } else if (shape === 'triangle') {
        particle.style.width = 0;
        particle.style.height = 0;
        particle.style.borderLeft = size / 2 + 'px solid transparent';
        particle.style.borderRight = size / 2 + 'px solid transparent';
        particle.style.borderBottom = size + 'px solid ' + color;
    }
    
    demoArea.appendChild(particle);
    
    // Animate and fade out
    let opacity = 1;
    let scale = 1;
    const duration = 600; // ms
    const startTime = Date.now();
    
    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;
        
        if (progress >= 1) {
            particle.remove();
            return;
        }
        
        opacity = 1 - progress;
        scale = 1 + progress * 0.5;
        
        particle.style.opacity = opacity;
        particle.style.transform = `scale(${scale}) rotate(${progress * 360}deg)`;
        
        requestAnimationFrame(animate);
    };
    
    animate();
}

// Track mouse movement
demoArea.addEventListener('mousemove', (e) => {
    const rect = demoArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Create particle every few pixels
    if (Math.random() > 0.7) {
        createTrailParticle(x, y);
    }
});

demoArea.addEventListener('mouseleave', () => {
    // Clean up particles when leaving
    const particles = demoArea.querySelectorAll('.trail-particle');
    particles.forEach(p => p.remove());
});
