// PAC-MAN GAME - Full Rewrite with Enhanced UI

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const messageBox = document.getElementById('messageBox');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const gameModal = document.getElementById('gameModal');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalButton = document.getElementById('modalButton');

// Game states
let gameIsRunning = false;
let gamePaused = false;
let gameOverFlag = false;
let levelCompleteFlag = false;
let frameCount = 0;
const GAME_SPEED = 8; // Update every N frames (higher = slower)

// Game data
let score = 0;
let lives = 3;
let maze = [];
let pellets = [];
let powerUps = [];
const MAZE_WIDTH = 40;  // 800px / 20px per tile
const MAZE_HEIGHT = 25; // 500px / 20px per tile

// Player
const pacman = {
    x: 1, y: 1,
    dirX: 0, dirY: 0,
    nextDirX: 0, nextDirY: 0,
    mouthAngle: 0,
    lastX: 1,
    lastY: 1
};

// Ghosts
let ghosts = [];

// Load sprite images
const pacmanImage = new Image();
pacmanImage.src = 'Pacman.png';
const ghostImages = [];
for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `ghost${i}.png`;
    ghostImages.push(img);
}

// Input
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameIsRunning && !gamePaused) startGame();
        else if (gamePaused) resumeGame();
    }
    if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        togglePause();
    }
});

document.addEventListener('keyup', (e) => { 
    keys[e.key.toLowerCase()] = false; 
});

// Button event listeners
startButton.addEventListener('click', () => {
    if (!gameIsRunning && !gamePaused) {
        startGame();
    } else if (gamePaused) {
        resumeGame();
    }
});

pauseButton.addEventListener('click', togglePause);

modalButton.addEventListener('click', () => {
    hideModal();
    score = 0;
    lives = 3;
    startGame();
});

function gameLoop() {
    frameCount++;
    
    if (frameCount % GAME_SPEED === 0) {
        if (gameIsRunning && !gamePaused) {
            update();
        }
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function togglePause() {
    if (!gameIsRunning) return;
    gamePaused = !gamePaused;
    updateButtonStates();
    if (gamePaused) {
        messageBox.textContent = '⏸ GAME PAUSED - Press P or PAUSE to resume';
        messageBox.style.color = '#FFD700';
        pauseButton.textContent = '▶ RESUME';
    } else {
        messageBox.textContent = '';
        pauseButton.textContent = '⏸ PAUSE';
    }
}

function resumeGame() {
    if (!gamePaused) return;
    gamePaused = false;
    messageBox.textContent = '';
    updateButtonStates();
    pauseButton.textContent = '⏸ PAUSE';
}

function updateButtonStates() {
    if (gameIsRunning && !gamePaused) {
        startButton.style.background = 'linear-gradient(135deg, #FFD700, #FFA500)';
        startButton.textContent = '⏸ PAUSE';
        pauseButton.textContent = '⏸ PAUSE';
    } else {
        startButton.style.background = 'linear-gradient(135deg, #00FF00, #00CC00)';
        startButton.textContent = '▶ START GAME';
        pauseButton.textContent = '⏸ PAUSE';
    }
}

function update() {
    if (!gameIsRunning) return;
    
    // Handle input - immediately try requested direction
    let requestedX = pacman.x;
    let requestedY = pacman.y;
    
    if (keys['w']) requestedY = pacman.y - 1;
    if (keys['s']) requestedY = pacman.y + 1;
    if (keys['a']) requestedX = pacman.x - 1;
    if (keys['d']) requestedX = pacman.x + 1;
    
    // Try to move to requested position
    if (requestedX >= 0 && requestedX < MAZE_WIDTH && 
        requestedY >= 0 && requestedY < MAZE_HEIGHT &&
        maze[requestedY] && maze[requestedY][requestedX] === 0) {
        pacman.x = requestedX;
        pacman.y = requestedY;
    }
    
    // Move ghosts with edge-wrap
    ghosts.forEach(ghost => {
        if (Math.random() < 0.01) {
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const valid = dirs.filter(d => {
                let ty = ghost.y + d[1];
                let tx = ghost.x + d[0];
                // Handle wrap-around for validation
                if (tx < 0) tx += MAZE_WIDTH;
                if (tx >= MAZE_WIDTH) tx -= MAZE_WIDTH;
                if (ty < 0) ty += MAZE_HEIGHT;
                if (ty >= MAZE_HEIGHT) ty -= MAZE_HEIGHT;
                return maze[ty]?.[tx] === 0;
            });
            if (valid.length) {
                const d = valid[Math.floor(Math.random() * valid.length)];
                ghost.dx = d[0]; ghost.dy = d[1];
            }
        }
        
        let nx = ghost.x + ghost.dx;
        let ny = ghost.y + ghost.dy;
        
        // Edge-wrap for ghosts
        if (nx < 0) nx += MAZE_WIDTH;
        if (nx >= MAZE_WIDTH) nx -= MAZE_WIDTH;
        if (ny < 0) ny += MAZE_HEIGHT;
        if (ny >= MAZE_HEIGHT) ny -= MAZE_HEIGHT;
        
        if (maze[ny]?.[nx] === 0) {
            ghost.x = nx; ghost.y = ny;
        } else {
            // Try alternative direction
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const valid = dirs.filter(d => {
                let ty = ghost.y + d[1];
                let tx = ghost.x + d[0];
                if (tx < 0) tx += MAZE_WIDTH;
                if (tx >= MAZE_WIDTH) tx -= MAZE_WIDTH;
                if (ty < 0) ty += MAZE_HEIGHT;
                if (ty >= MAZE_HEIGHT) ty -= MAZE_HEIGHT;
                return maze[ty]?.[tx] === 0;
            });
            if (valid.length) {
                const d = valid[Math.floor(Math.random() * valid.length)];
                ghost.dx = d[0]; ghost.dy = d[1];
                nx = ghost.x + ghost.dx;
                ny = ghost.y + ghost.dy;
                if (nx < 0) nx += MAZE_WIDTH;
                if (nx >= MAZE_WIDTH) nx -= MAZE_WIDTH;
                if (ny < 0) ny += MAZE_HEIGHT;
                if (ny >= MAZE_HEIGHT) ny -= MAZE_HEIGHT;
                ghost.x = nx; ghost.y = ny;
            }
        }
    });
    
    // Check pellet collision
    pellets = pellets.filter(p => {
        if (p.x === pacman.x && p.y === pacman.y) {
            score += 10;
            return false;
        }
        return true;
    });
    
    // Check powerup collision
    powerUps = powerUps.filter(p => {
        if (p.x === pacman.x && p.y === pacman.y) {
            score += 50;
            ghosts.forEach(g => {
                g.vulnerable = true;
                g.vulnerableTime = 300; // 300 frames = ~37 seconds at 8fps
            });
            return false;
        }
        return true;
    });
    
    // Update ghost vulnerability timers
    ghosts.forEach(ghost => {
        if (ghost.vulnerable && ghost.vulnerableTime) {
            ghost.vulnerableTime--;
            if (ghost.vulnerableTime <= 0) {
                ghost.vulnerable = false;
            }
        }
    });
    
    // Ghost collision
    ghosts.forEach(ghost => {
        if (ghost.x === pacman.x && ghost.y === pacman.y) {
            if (ghost.vulnerable) {
                // Always eat vulnerable ghosts
                score += 200;
                ghost.x = 20; 
                ghost.y = 22;
                ghost.immunity = 30; // 30 frames of immunity
                ghost.vulnerable = false;
            } else if (!ghost.immunity) {
                // Only die if ghost doesn't have immunity (not vulnerable and not recently eaten)
                lives--;
                if (lives <= 0) {
                    gameIsRunning = false;
                    gamePaused = false;
                    showGameOverModal();
                } else {
                    pacman.x = 1; pacman.y = 1;
                    pacman.dirX = 0; pacman.dirY = 0;
                }
            }
        }
        
        // Reduce immunity counter
        if (ghost.immunity) {
            ghost.immunity--;
        }
    });
    
    // Level complete
    if (pellets.length === 0 && powerUps.length === 0) {
        gameIsRunning = false;
        gamePaused = false;
        showLevelCompleteModal();
    }
    
    // Update display
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
}

function render() {
    // Always animate mouth (smooth animation every frame)
    pacman.mouthAngle = (frameCount * 0.02) % (Math.PI * 2);
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw maze
    ctx.fillStyle = '#0066FF';
    ctx.lineWidth = 1;
    maze.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 1) {
                ctx.fillRect(x * 20 + 1, y * 20 + 1, 18, 18);
            }
        });
    });
    
    // Draw pellets
    ctx.fillStyle = '#FFB897';
    pellets.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * 20 + 10, p.y * 20 + 10, 2.5, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw powerups (pulsing animation)
    const pulseSize = 5 + Math.sin(frameCount * 0.05) * 2;
    ctx.fillStyle = '#FFD700';
    powerUps.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x * 20 + 10, p.y * 20 + 10, pulseSize, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw pacman sprite
    if (pacmanImage.complete && pacmanImage.naturalHeight !== 0) {
        const pacmanX = pacman.x * 20 + 2;
        const pacmanY = pacman.y * 20 + 2;
        
        ctx.save();
        ctx.translate(pacmanX + 8, pacmanY + 8);
        
        // Rotate based on direction
        if (pacman.dirX === 1) ctx.rotate(0);
        else if (pacman.dirX === -1) ctx.rotate(Math.PI);
        else if (pacman.dirY === 1) ctx.rotate(Math.PI / 2);
        else if (pacman.dirY === -1) ctx.rotate(-Math.PI / 2);
        
        ctx.drawImage(pacmanImage, -8, -8, 16, 16);
        ctx.restore();
    } else {
        // Fallback if image not loaded
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc(pacman.x * 20 + 10, pacman.y * 20 + 10, 8, 0.3, Math.PI * 2 - 0.3);
        ctx.lineTo(pacman.x * 20 + 10, pacman.y * 20 + 10);
        ctx.fill();
    }
    
    // Draw ghosts with sprites
    ghosts.forEach((ghost, idx) => {
        const ghostImage = ghostImages[idx];
        const ghostX = ghost.x * 20 + 2;
        const ghostY = ghost.y * 20 + 2;
        
        if (ghostImage.complete && ghostImage.naturalHeight !== 0) {
            if (ghost.vulnerable) {
                ctx.globalAlpha = 0.6;
            }
            ctx.drawImage(ghostImage, ghostX, ghostY, 16, 16);
            ctx.globalAlpha = 1.0;
        } else {
            // Fallback if image not loaded
            const ghostColor = ghost.vulnerable ? '#0088FF' : ghost.color;
            ctx.fillStyle = ghostColor;
            ctx.beginPath();
            ctx.arc(ghostX + 8, ghostY + 8, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    ctx.shadowColor = 'transparent';
}

function startGame() {
    gameIsRunning = true;
    gamePaused = false;
    gameOverFlag = false;
    levelCompleteFlag = false;
    messageBox.textContent = '';
    messageBox.className = '';
    hideModal();
    updateButtonStates();
    
    createMaze();
    createPellets();
    createGhosts();
}

function createMaze() {
    // Create larger maze (40x44)
    maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,1,1,0,1,0,0,1,1,0,0,0,1,1,1,0,1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,0,1],
        [1,0,1,1,0,1,1,1,1,1,0,1,0,1,1,1,0,1,0,1,1,1,0,1,0,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1],
        [1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1],
        [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1],
        [1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,0,1,1,1],
        [1,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,0,1],
        [1,0,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
        [1,0,0,0,0,0,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,0,0,0,1,0,1,1,0,0,0,0,1],
        [1,1,1,1,0,1,0,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,0,1,0,1,1,0,1,1,1,1],
        [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,1,1],
        [1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
}

function createPellets() {
    /**
     * EXPLANATION: Correct Pellet Generation Algorithm
     * 
     * Why the current system works:
     * - The maze uses a 2D array where: 1 = WALL, 0 = PATH
     * - We iterate through every cell in the maze
     * - We only create pellets on cells where maze[y][x] === 0 (paths, not walls)
     * - This ensures pellets NEVER appear inside walls
     * 
     * Data Structure: 2D Array (Grid-based)
     * maze[row][column] where row = y, column = x
     * Each cell contains either 1 (wall) or 0 (path)
     * 
     * This is the standard and most efficient approach for grid-based games
     * - Easy to understand
     * - Fast collision detection
     * - Simple boundary checking
     */
    
    pellets = [];
    powerUps = [];
    
    // Iterate through every row and column of the maze
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            // CRITICAL CHECK: Only place pellets on valid path tiles (value 0)
            // This prevents pellets from spawning inside walls (value 1)
            if (maze[y] && maze[y][x] === 0) {
                // Don't place pellet on Pac-Man's starting position
                if (x === pacman.x && y === pacman.y) {
                    continue;
                }
                
                // Determine if this should be a power pellet or regular pellet
                // Reduced to 3% chance for fewer power-ups
                const isPowerPellet = Math.random() < 0.03;
                
                if (isPowerPellet) {
                    powerUps.push({ x, y, type: 'powerup', points: 50 });
                } else {
                    pellets.push({ x, y, type: 'pellet', points: 10 });
                }
            }
        }
    }
    
    // Ensure at least 1 power-up
    if (powerUps.length < 1) {
        for (let i = powerUps.length; i < 1; i++) {
            // Find a random empty pellet location
            if (pellets.length > 0) {
                const idx = Math.floor(Math.random() * pellets.length);
                const p = pellets[idx];
                powerUps.push({ x: p.x, y: p.y, type: 'powerup', points: 50 });
                pellets.splice(idx, 1);
            }
        }
    }
    
    /**
     * IMPROVEMENTS for Classic Pac-Man Pellet System:
     * 
     * 1. PELLET TYPES & SCORING:
     *    - Regular Pellets: 10 points (yellow dots)
     *    - Power Pellets: 50 points (larger dots)
     *    - Store type/points in each pellet object for flexibility
     * 
     * 2. STRATEGIC PLACEMENT:
     *    - Place power pellets at maze corners (high value, tactical)
     *    - Place regular pellets in every walkable space
     *    - This creates risk/reward gameplay
     * 
     * 3. VALIDATION CHECKS:
     *    - Always verify maze[y][x] === 0 before placing
     *    - Check boundaries: 0 <= x < MAZE_WIDTH && 0 <= y < MAZE_HEIGHT
     *    - Exclude Pac-Man starting position
     * 
     * 4. PERFORMANCE TIP:
     *    - Current approach: O(width × height) - very fast
     *    - This is better than random placement + validation checks
     *    - For a 40×25 maze = only 1000 iterations maximum
     */
    
    console.log(`Pellets spawned: ${pellets.length} | Power-ups: ${powerUps.length}`);
}

/**
 * ALTERNATIVE: Strategic Power Pellet Placement
 * 
 * This function provides a more sophisticated approach where:
 * - Regular pellets fill all walkable paths
 * - Power pellets are placed strategically at corners/high-value locations
 * - This creates tactical gameplay opportunities
 * 
 * To use: Call createPelletsStrategic() instead of createPellets()
 */
function createPelletsStrategic() {
    pellets = [];
    powerUps = [];
    
    // First, place regular pellets everywhere walkable
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            if (maze[y] && maze[y][x] === 0) {
                if (x === pacman.x && y === pacman.y) continue;
                pellets.push({ x, y, type: 'pellet', points: 10 });
            }
        }
    }
    
    // Then, place power pellets strategically at corners
    const powerPelletCount = Math.ceil(pellets.length / 50);
    const cornerPositions = findCornerPositions();
    
    for (let i = 0; i < Math.min(powerPelletCount, cornerPositions.length); i++) {
        const { x, y } = cornerPositions[i];
        const index = pellets.findIndex(p => p.x === x && p.y === y);
        if (index !== -1) {
            pellets.splice(index, 1);
            powerUps.push({ x, y, type: 'powerup', points: 50 });
        }
    }
    
    console.log(`Strategic Pellets: ${pellets.length} | Power-ups: ${powerUps.length}`);
}

/**
 * Helper function to find corner/isolated positions
 */
function findCornerPositions() {
    const corners = [];
    
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            if (maze[y] && maze[y][x] === 0) {
                let neighbors = 0;
                if (y > 0 && maze[y-1][x] === 0) neighbors++;
                if (y < MAZE_HEIGHT-1 && maze[y+1][x] === 0) neighbors++;
                if (x > 0 && maze[y][x-1] === 0) neighbors++;
                if (x < MAZE_WIDTH-1 && maze[y][x+1] === 0) neighbors++;
                
                if (neighbors <= 2 && neighbors > 0) {
                    corners.push({ x, y, value: neighbors });
                }
            }
        }
    }
    
    return corners.sort((a, b) => a.value - b.value);
}

function createGhosts() {
    ghosts = [
        {x:20, y:22, dx:1, dy:0, color:'#FF0000', vulnerable:false, immunity:0, vulnerableTime:0},
        {x:19, y:23, dx:-1, dy:0, color:'#FFB8FF', vulnerable:false, immunity:0, vulnerableTime:0},
        {x:20, y:23, dx:0, dy:1, color:'#00FFFF', vulnerable:false, immunity:0, vulnerableTime:0},
        {x:21, y:23, dx:0, dy:-1, color:'#FFB847', vulnerable:false, immunity:0, vulnerableTime:0}
    ];
}

// Modal Helper Functions
function showGameOverModal() {
    modalTitle.textContent = '💀 GAME OVER!';
    modalMessage.textContent = `Final Score: ${score}`;
    modalButton.textContent = '🔄 PLAY AGAIN';
    gameModal.classList.remove('hidden');
    updateButtonStates();
}

function showLevelCompleteModal() {
    modalTitle.textContent = '🎉 LEVEL COMPLETE!';
    modalMessage.textContent = `Score: ${score} | Lives: ${lives}`;
    modalButton.textContent = '➡️  NEXT LEVEL';
    gameModal.classList.remove('hidden');
    updateButtonStates();
}

function hideModal() {
    gameModal.classList.add('hidden');
}

// Initial state
messageBox.textContent = 'Press SPACEBAR or START to begin!';
updateButtonStates();

// Start the game loop
gameLoop();
