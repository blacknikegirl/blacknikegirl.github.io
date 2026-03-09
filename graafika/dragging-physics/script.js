// Dragging Physics - Elements can be dragged with inertia

const draggables = document.querySelectorAll('.draggable');

draggables.forEach(draggable => {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;
    let animationId = null;
    
    draggable.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        lastX = startX;
        lastY = startY;
        lastTime = Date.now();
        
        if (animationId) cancelAnimationFrame(animationId);
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        const deltaTime = Date.now() - lastTime;
        
        currentX += deltaX;
        currentY += deltaY;
        
        velocityX = deltaX / deltaTime;
        velocityY = deltaY / deltaTime;
        
        draggable.style.transform = `translate(${currentX}px, ${currentY}px)`;
        
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = Date.now();
    });
    
    document.addEventListener('mouseup', () => {
        isDragging = false;
        
        // Apply inertia
        applyInertia();
    });
    
    function applyInertia() {
        const friction = 0.95;
        
        const animate = () => {
            velocityX *= friction;
            velocityY *= friction;
            
            if (Math.abs(velocityX) < 0.01 && Math.abs(velocityY) < 0.01) {
                cancelAnimationFrame(animationId);
                return;
            }
            
            currentX += velocityX;
            currentY += velocityY;
            
            draggable.style.transform = `translate(${currentX}px, ${currentY}px)`;
            
            animationId = requestAnimationFrame(animate);
        };
        
        animationId = requestAnimationFrame(animate);
    }
});
