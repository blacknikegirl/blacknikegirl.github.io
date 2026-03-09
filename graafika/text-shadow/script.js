// Text Shadow Follow - Heading shadow follows cursor in opposite direction

const heading = document.getElementById('followHeading');

document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    
    // Shadow moves opposite to cursor
    const shadowX = -x * 30;
    const shadowY = -y * 30;
    
    heading.style.textShadow = `
        ${shadowX}px ${shadowY}px 30px rgba(0, 0, 0, 0.3),
        ${shadowX/2}px ${shadowY/2}px 15px rgba(255, 107, 107, 0.2)
    `;
});
