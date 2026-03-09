// Z-Index Shuffle - Click elements to bring them to front

const shuffleBoxes = document.querySelectorAll('.shuffle-box');
let maxZIndex = 100;

shuffleBoxes.forEach(box => {
    box.addEventListener('click', () => {
        maxZIndex++;
        box.style.zIndex = maxZIndex;
        
        // Add visual feedback
        box.classList.add('active');
        setTimeout(() => box.classList.remove('active'), 300);
    });
});
