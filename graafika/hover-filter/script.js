// Hover Filter Swap - Image filters change on hover

const filterImages = document.querySelectorAll('.filter-img');

filterImages.forEach(img => {
    img.addEventListener('mouseenter', () => {
        img.style.filter = 'saturate(200%) contrast(130%)';
    });
    
    img.addEventListener('mouseleave', () => {
        img.style.filter = 'grayscale(100%)';
    });
});
