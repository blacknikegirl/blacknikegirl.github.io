// Hover Glitch Effect - Images shake and change color on hover

const glitchImages = document.querySelectorAll('.glitch-img');

glitchImages.forEach(img => {
    img.addEventListener('mouseenter', () => {
        img.classList.add('glitching');
    });
    
    img.addEventListener('mouseleave', () => {
        img.classList.remove('glitching');
    });
});
