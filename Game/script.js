// Level Configuration
const levelConfig = {
    1: { pairs: 3, time: 10, cols: 3, cardSize: "large" },
    2: { pairs: 4, time: 15, cols: 4, cardSize: "medium" },
    3: { pairs: 5, time: 20, cols: 5, cardSize: "medium" },
    4: { pairs: 6, time: 25, cols: 4, cardSize: "small" },
    5: { pairs: 7, time: 30, cols: 4, cardSize: "small" }
};

// DOM Elements
const nameModal = document.getElementById("nameModal");
const levelModal = document.getElementById("levelModal");
const winModal = document.getElementById("winModal");
const loseModal = document.getElementById("loseModal");
const screamOverlay = document.getElementById("screamOverlay");
const playerNameInput = document.getElementById("playerNameInput");
const newGameBtn = document.getElementById("newGameBtn");
const continueBtn = document.getElementById("continueBtn");
const playerGreeting = document.getElementById("playerGreeting");
const levelDisplay = document.getElementById("levelDisplay");
const currentLevelSpan = document.getElementById("currentLevel");
const cardsContainer = document.getElementById("cardsContainer");
const timeTag = document.querySelector(".time b");
const flipsTag = document.querySelector(".flips b");
const refreshBtn = document.querySelector(".details button");
const levelBtns = document.querySelectorAll(".level-btn");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const homeBtn = document.getElementById("homeBtn");
const tryAgainBtn = document.getElementById("tryAgainBtn");
const homeBtn2 = document.getElementById("homeBtn2");

// Game State
let playerName = "";
let currentLevel = 1;
let maxTime = 30;
let timeLeft = 30;
let flips = 0;
let matchedCard = 0;
let disableDeck = false;
let isPlaying = false;
let cardOne, cardTwo, timer;
let cards = [];

let gameState = {
    playerName: "",
    currentLevel: 1,
    timeLeft: 30,
    flips: 0,
    matchedCard: 0,
    cardStates: []
};

// Generate cards dynamically based on level
function generateCards() {
    cardsContainer.innerHTML = "";
    const config = levelConfig[currentLevel];
    const pairs = config.pairs;
    
    // Create image array with pairs
    let imageArray = [];
    for (let i = 1; i <= pairs; i++) {
        imageArray.push(i, i);
    }
    
    // Shuffle array
    imageArray.sort(() => Math.random() > 0.5 ? 1 : -1);
    
    // Create card elements
    imageArray.forEach((imgNum) => {
        const card = document.createElement("li");
        card.className = "card";
        card.innerHTML = `
            <div class="view front-view">
                <img src="images/icon.png" alt="icon">
            </div>
            <div class="view back-view">
                <img src="images/img-${imgNum}.png" alt="card-img">
            </div>
        `;
        cardsContainer.appendChild(card);
        card.addEventListener("click", flipCard);
    });
    
    // Update cards reference
    cards = document.querySelectorAll(".card");
    updateCardsGrid();
}

// Update grid layout based on level
function updateCardsGrid() {
    const config = levelConfig[currentLevel];
    const cardCount = cards.length;
    
    // Set gap based on card count for pyramid layout
    let gap = "15px";
    cardsContainer.style.gap = gap;
    
    // Set card size class
    cardsContainer.className = `cards level-${currentLevel} size-${config.cardSize}`;
    
    // Adjust wrapper max-width based on level
    const wrapper = document.querySelector(".wrapper");
    if (currentLevel === 1) {
        wrapper.style.maxWidth = "600px";
    } else if (currentLevel === 2) {
        wrapper.style.maxWidth = "700px";
    } else if (currentLevel === 3) {
        wrapper.style.maxWidth = "700px";
    } else if (currentLevel === 4) {
        wrapper.style.maxWidth = "750px";
    } else if (currentLevel === 5) {
        wrapper.style.maxWidth = "800px";
    }
}

// Save game state to localStorage
function saveGameState() {
    gameState.playerName = playerName;
    gameState.currentLevel = currentLevel;
    gameState.timeLeft = timeLeft;
    gameState.flips = flips;
    gameState.matchedCard = matchedCard;
    localStorage.setItem("memoryGameState", JSON.stringify(gameState));
}

// Load game state from localStorage
function loadGameState() {
    const saved = localStorage.getItem("memoryGameState");
    return saved ? JSON.parse(saved) : null;
}

// Check if there's a saved game
function checkSavedGame() {
    const saved = loadGameState();
    if (saved && saved.playerName) {
        continueBtn.style.display = "inline-block";
        return true;
    }
    return false;
}

// Handle new game
function startNewGame() {
    playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Please enter your name!");
        return;
    }
    localStorage.removeItem("memoryGameState");
    nameModal.style.display = "none";
    levelModal.style.display = "flex";
    playerGreeting.textContent = `Welcome, ${playerName}! Select your level:`;
}

// Handle continue game
function continueGame() {
    const saved = loadGameState();
    if (!saved) {
        alert("No saved game found!");
        return;
    }
    
    playerName = saved.playerName;
    currentLevel = saved.currentLevel;
    timeLeft = saved.timeLeft;
    flips = saved.flips;
    matchedCard = saved.matchedCard;
    
    // Remove previous level class and add current one
    document.body.className = document.body.className.replace(/level-\d/, '');
    document.body.classList.add(`level-${currentLevel}`);
    
    nameModal.style.display = "none";
    levelModal.style.display = "none";
    playerGreeting.textContent = `Welcome back, ${playerName}!`;
    levelDisplay.style.display = "inline";
    currentLevelSpan.textContent = currentLevel;
    
    initializeGameFromSavedState();
}

// Handle level selection
function selectLevel(level) {
    currentLevel = level;
    const config = levelConfig[level];
    maxTime = config.time;
    timeLeft = config.time;
    
    // Remove previous level class and add new one
    document.body.className = document.body.className.replace(/level-\d/, '');
    document.body.classList.add(`level-${level}`);
    
    levelModal.style.display = "none";
    playerGreeting.textContent = `Welcome, ${playerName}! Level ${currentLevel}`;
    levelDisplay.style.display = "inline";
    currentLevelSpan.textContent = currentLevel;
    
    timeTag.innerText = timeLeft;
    flipsTag.innerText = 0;
    
    generateCards();
    saveGameState();
}

// Initialize game from saved state
function initializeGameFromSavedState() {
    generateCards();
    const config = levelConfig[currentLevel];
    maxTime = config.time;
    
    timeTag.innerText = timeLeft;
    flipsTag.innerText = flips;
    
    if (timeLeft > 0) {
        isPlaying = true;
        timer = setInterval(initTimer, 1000);
    }
}

function initTimer() {
    if(timeLeft <= 0) {
        clearInterval(timer);
        isPlaying = false;
        showScreamAndLose();
        return;
    }
    timeLeft--;
    timeTag.innerText = timeLeft;
    saveGameState();
}

function flipCard(event) {
    const clickedCard = event.target.closest(".card");
    
    if(!isPlaying) {
        isPlaying = true;
        timer = setInterval(initTimer, 1000);
    }
    if(clickedCard !== cardOne && !disableDeck && timeLeft > 0) {
        flips++;
        flipsTag.innerText = flips;
        clickedCard.classList.add("flip");
        if(!cardOne) {
            cardOne = clickedCard;
            saveGameState();
            return;
        }
        cardTwo = clickedCard;
        disableDeck = true;
        let cardOneImg = cardOne.querySelector(".back-view img").src,
        cardTwoImg = cardTwo.querySelector(".back-view img").src;
        matchCards(cardOneImg, cardTwoImg);
    }
}

function matchCards(img1, img2) {
    if(img1 === img2) {
        matchedCard++;
        const config = levelConfig[currentLevel];
        
        if(matchedCard === config.pairs && timeLeft > 0) {
            clearInterval(timer);
            isPlaying = false;
            
            // Show beautiful win modal
            showWinModal();
            return;
        }
        
        cardOne.removeEventListener("click", flipCard);
        cardTwo.removeEventListener("click", flipCard);
        cardOne = cardTwo = "";
        saveGameState();
        return disableDeck = false;
    }

    setTimeout(() => {
        cardOne.classList.add("shake");
        cardTwo.classList.add("shake");
    }, 400);

    setTimeout(() => {
        cardOne.classList.remove("shake", "flip");
        cardTwo.classList.remove("shake", "flip");
        cardOne = cardTwo = "";
        disableDeck = false;
        saveGameState();
    }, 1200);
}

function shuffleCard() {
    const config = levelConfig[currentLevel];
    maxTime = config.time;
    timeLeft = config.time;
    flips = matchedCard = 0;
    cardOne = cardTwo = "";
    clearInterval(timer);
    isPlaying = false;
    
    timeTag.innerText = timeLeft;
    flipsTag.innerText = flips;
    disableDeck = false;

    generateCards();
    saveGameState();
}

// Show beautiful win modal
function showWinModal() {
    const config = levelConfig[currentLevel];
    document.getElementById("winPlayerName").textContent = playerName;
    document.getElementById("completedLevel").textContent = currentLevel;
    document.getElementById("completedFlips").textContent = flips;
    document.getElementById("completedTime").textContent = timeLeft;
    
    // Play victory sound
    const victorySound = new Audio();
    victorySound.volume = 1.0; // Max volume
    victorySound.src = "sounds/victory.mp3";
    
    victorySound.play().catch(err => {
        // Try alternative format if MP3 fails
        victorySound.src = "sounds/victory.wav";
        victorySound.play().catch(e => console.log("Victory sound not available"));
    });
    
    // Update button text for last level
    if (currentLevel === 5) {
        nextLevelBtn.textContent = "🏆 Game Complete!";
        nextLevelBtn.disabled = true;
        nextLevelBtn.style.opacity = "0.6";
    } else {
        nextLevelBtn.textContent = `Continue to Level ${currentLevel + 1}`;
        nextLevelBtn.disabled = false;
        nextLevelBtn.style.opacity = "1";
    }
    
    winModal.style.display = "flex";
}

// Show scream image and play sound
function showScreamAndLose() {
    // Show scream overlay
    screamOverlay.style.display = "flex";
    
    // Play scream sound with maximum volume
    const screamSound = new Audio();
    screamSound.volume = 1.0; // Max volume
    
    // Try MP3 first, fallback to WAV or OGG
    screamSound.src = "sounds/scream.mp3";
    
    // When audio is loadable, play it
    screamSound.oncanplay = () => {
        screamSound.play().catch(err => console.log("Autoplay might be blocked", err));
    };
    
    // Try to play immediately (might fail due to browser autoplay restrictions)
    screamSound.play().catch(err => {
        console.log("Scream sound blocked by browser autoplay policy");
        // Try alternative format if MP3 fails
        screamSound.src = "sounds/scream.wav";
        screamSound.play().catch(e => console.log("Sound not available"));
    });
    
    // Show lose modal after 2.5 seconds
    setTimeout(() => {
        screamOverlay.style.display = "none";
        showLoseModal();
    }, 2500);
}

// Show lose modal
function showLoseModal() {
    document.getElementById("losePlayerName").textContent = playerName;
    document.getElementById("loseLevel").textContent = currentLevel;
    
    loseModal.style.display = "flex";
}

// Retry current level
function retryLevel() {
    const config = levelConfig[currentLevel];
    maxTime = config.time;
    timeLeft = config.time;
    flips = 0;
    matchedCard = 0;
    cardOne = cardTwo = "";
    disableDeck = isPlaying = false;
    
    // Ensure level class is set
    document.body.className = document.body.className.replace(/level-\d/, '');
    document.body.classList.add(`level-${currentLevel}`);
    
    timeTag.innerText = timeLeft;
    flipsTag.innerText = flips;
    
    loseModal.style.display = "none";
    generateCards();
    saveGameState();
}

// Go to next level
function goToNextLevel() {
    if (currentLevel < 5) {
        currentLevel++;
        const nextConfig = levelConfig[currentLevel];
        maxTime = nextConfig.time;
        timeLeft = nextConfig.time;
        flips = 0;
        matchedCard = 0;
        cardOne = cardTwo = "";
        disableDeck = isPlaying = false;
        
        // Remove previous level class and add new one
        document.body.className = document.body.className.replace(/level-\d/, '');
        document.body.classList.add(`level-${currentLevel}`);
        
        timeTag.innerText = timeLeft;
        flipsTag.innerText = flips;
        currentLevelSpan.textContent = currentLevel;
        
        winModal.style.display = "none";
        generateCards();
        saveGameState();
    } else {
        alert(`🏆 GAME COMPLETE! ${playerName}, you've mastered all 5 levels!`);
        goHome();
    }
}

// Go home / restart
function goHome() {
    clearInterval(timer);
    localStorage.removeItem("memoryGameState");
    winModal.style.display = "none";
    loseModal.style.display = "none";
    screamOverlay.style.display = "none";
    levelModal.style.display = "none";
    nameModal.style.display = "flex";
    playerNameInput.value = "";
    currentLevel = 1;
    flips = 0;
    matchedCard = 0;
    timeLeft = 10;
    timeTag.innerText = "0";
    flipsTag.innerText = "0";
    isPlaying = false;
    disableDeck = false;
    
    // Remove level class from body
    document.body.className = document.body.className.replace(/level-\d/, '');
}

// Add listener for Enter key in name input
playerNameInput.addEventListener("keypress", (e) => {
    if(e.key === "Enter") {
        startNewGame();
    }
});

// Event listeners for buttons
newGameBtn.addEventListener("click", startNewGame);
continueBtn.addEventListener("click", continueGame);
refreshBtn.addEventListener("click", shuffleCard);
nextLevelBtn.addEventListener("click", goToNextLevel);
homeBtn.addEventListener("click", goHome);
tryAgainBtn.addEventListener("click", retryLevel);
homeBtn2.addEventListener("click", goHome);

// Level selection buttons
levelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        const level = parseInt(btn.dataset.level);
        selectLevel(level);
    });
});

// Initialize on page load
window.addEventListener("load", () => {
    if (checkSavedGame()) {
        playerNameInput.value = loadGameState().playerName;
        continueBtn.style.display = "inline-block";
    }
    nameModal.style.display = "flex";
});