// Eraser Mode - Elements disappear when cursor passes over them

const erasableArea = document.querySelector('.erasable-area');
const erasableElements = document.querySelectorAll('.erasable-element');
const eraserRadius = 50;

erasableArea.addEventListener('mousemove', (e) => {
    const rect = erasableArea.getBoundingClientRect();
    const eraserX = e.clientX - rect.left;
    const eraserY = e.clientY - rect.top;
    
    erasableElements.forEach(element => {
        if (element.classList.contains('erased')) return;
        
        const elemRect = element.getBoundingClientRect();
        const elemX = elemRect.left - rect.left + elemRect.width / 2;
        const elemY = elemRect.top - rect.top + elemRect.height / 2;
        
        const distance = Math.sqrt(
            Math.pow(eraserX - elemX, 2) + 
            Math.pow(eraserY - elemY, 2)
        );
        
        if (distance < eraserRadius) {
            element.classList.add('erased');
        }
    });
});
