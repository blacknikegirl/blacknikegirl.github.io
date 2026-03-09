// Dynamic Background Gradient - Background color changes based on cursor position

const background = document.querySelector('.background');
const colors = [
    { rgb: '102, 126, 234', hsl: '231, 68%, 66%' },  // Blue
    { rgb: '118, 75, 162', hsl: '267, 39%, 47%' },   // Purple
    { rgb: '255, 107, 107', hsl: '0, 100%, 71%' },   // Red
    { rgb: '78, 205, 196', hsl: '171, 56%, 55%' },   // Teal
    { rgb: '69, 183, 209', hsl: '193, 62%, 54%' },   // Cyan
    { rgb: '255, 160, 122', hsl: '17, 100%, 74%' }   // Salmon
];

document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    
    // Calculate color index based on position
    const colorIndex1 = Math.floor((x / 50) % colors.length);
    const colorIndex2 = Math.floor((y / 50) % colors.length);
    
    const color1 = colors[colorIndex1];
    const color2 = colors[colorIndex2];
    
    // Create dynamic gradient
    const gradient = `linear-gradient(
        ${x + y}deg,
        rgba(${color1.rgb}, 0.8) 0%,
        rgba(${color2.rgb}, 0.8) 100%
    )`;
    
    background.style.background = gradient;
});

// Add smooth animation
const style = document.createElement('style');
style.textContent = `
    .background {
        transition: background 0.3s ease-out;
    }
`;
document.head.appendChild(style);
