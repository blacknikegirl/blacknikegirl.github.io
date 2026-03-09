// Magnetic Buttons Effect - Buttons are attracted to the cursor

const buttons = document.querySelectorAll('.magnetic-btn');
const magneticDistance = 150; // Distance at which button starts to be attracted

document.addEventListener('mousemove', (e) => {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        const buttonX = rect.left + rect.width / 2;
        const buttonY = rect.top + rect.height / 2;
        
        // Calculate distance between mouse and button
        const distance = Math.sqrt(
            Math.pow(mouseX - buttonX, 2) + 
            Math.pow(mouseY - buttonY, 2)
        );
        
        if (distance < magneticDistance) {
            // Calculate direction from button to mouse
            const angle = Math.atan2(mouseY - buttonY, mouseX - buttonX);
            
            // Calculate force based on distance
            const force = (magneticDistance - distance) / magneticDistance;
            
            // Move button towards cursor
            const moveX = Math.cos(angle) * force * 30;
            const moveY = Math.sin(angle) * force * 30;
            
            button.style.transform = `translate(${moveX}px, ${moveY}px)`;
        } else {
            button.style.transform = 'translate(0, 0)';
        }
    });
});

// Return button to original position when leaving
document.addEventListener('mouseleave', () => {
    buttons.forEach(button => {
        button.style.transform = 'translate(0, 0)';
    });
});

// Button click animation
buttons.forEach(button => {
    button.addEventListener('click', (e) => {
        // Create ripple effect
        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.position = 'absolute';
        ripple.style.width = size + 'px';
        ripple.style.height = size + 'px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.5)';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.style.pointerEvents = 'none';
        ripple.style.animation = 'ripple 0.6s ease-out';
        
        button.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple animation
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
