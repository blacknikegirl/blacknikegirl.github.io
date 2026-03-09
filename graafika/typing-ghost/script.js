// Typing Ghost - Letters appear with delay and slide in from below

const typingArea = document.getElementById('typingArea');

typingArea.addEventListener('input', (e) => {
    const text = e.currentTarget.textContent;
    const lastChar = text[text.length - 1];
    
    // Remove the last character to re-add with animation
    e.currentTarget.textContent = text.slice(0, -1);
    
    // Create ghost letter span
    const ghostLetter = document.createElement('span');
    ghostLetter.className = 'ghost-letter';
    ghostLetter.textContent = lastChar;
    
    // Add slight delay
    ghostLetter.style.animationDelay = '0.1s';
    
    // Append to typing area
    e.currentTarget.appendChild(ghostLetter);
    
    // After animation, convert to regular text
    setTimeout(() => {
        const content = e.currentTarget.innerHTML;
        e.currentTarget.innerHTML = content.replace(/<span class="ghost-letter" style="animation-delay: 0.1s;">(.+?)<\/span>/g, '$1');
    }, 600);
});

// Make sure we can see the cursor
typingArea.addEventListener('focus', () => {
    if (typingArea.textContent === '') {
        typingArea.innerHTML = '';
    }
});
