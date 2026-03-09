// Custom Cursor Shape - Rotating geometric shape that follows cursor

const canvas = document.getElementById('cursorCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let mouseX = 0;
let mouseY = 0;
let rotation = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function drawCursor() {
    rotation += 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw rotating star cursor
    ctx.save();
    ctx.translate(mouseX, mouseY);
    ctx.rotate((rotation * Math.PI) / 180);
    
    // Draw star
    const points = 6;
    const outerRadius = 12;
    const innerRadius = 5;
    
    ctx.fillStyle = 'rgba(255, 107, 107, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points;
        const x = Math.cos(angle - Math.PI / 2) * radius;
        const y = Math.sin(angle - Math.PI / 2) * radius;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw center circle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    requestAnimationFrame(drawCursor);
}

drawCursor();

// Adjust canvas size on window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
