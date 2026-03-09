// Scroll-Driven Scaling - Elements scale based on scroll position

const boxes = document.querySelectorAll('.scaling-box');

window.addEventListener('scroll', () => {
    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    
    boxes.forEach((box, index) => {
        // Calculate scale based on scroll and box position
        const boxPosition = (index / boxes.length) * 100;
        const distance = Math.abs(scrollPercentage - boxPosition);
        
        // Scale from 0.5 to 1.5
        const scale = 1 + (1 - Math.min(distance / 100, 1)) * 0.5;
        const rotation = distance * 2;
        
        box.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
    });
});

// Trigger initial animation
window.dispatchEvent(new Event('scroll'));
