// PAC-MAN GAME - Full Rewrite

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const livesDisplay = document.getElementById('lives');
const messageBox = document.getElementById('messageBox');

// Game states
let gameIsRunning = false;
let gameOverFlag = false;
let levelCompleteFlag = false;
let frameCount = 0;
const GAME_SPEED = 8; // Update every N frames (higher = slower)

// Game data
let score = 0;
let level = 1;
let lives = 3;
let maze = [];
let pellets = [];
let powerUps = [];

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

// Input
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (e.code === 'Space') {
        e.preventDefault();
        if (!gameIsRunning) startGame();
    }
});

document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Game Loop
function gameLoop() {
    frameCount++;
    
    if (frameCount % GAME_SPEED === 0) {
        update();
    }
    
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (!gameIsRunning) return;
    
    // Handle input
    if (keys['ArrowUp'] && maze[pacman.y - 1]?.[pacman.x] === 0) {
        pacman.nextDirX = 0; pacman.nextDirY = -1;
    }
    if (keys['ArrowDown'] && maze[pacman.y + 1]?.[pacman.x] === 0) {
        pacman.nextDirX = 0; pacman.nextDirY = 1;
    }
    if (keys['ArrowLeft'] && maze[pacman.y]?.[pacman.x - 1] === 0) {
        pacman.nextDirX = -1; pacman.nextDirY = 0;
    }
    if (keys['ArrowRight'] && maze[pacman.y]?.[pacman.x + 1] === 0) {
        pacman.nextDirX = 1; pacman.nextDirY = 0;
    }
    
    // Move pacman
    if (maze[pacman.y + pacman.nextDirY]?.[pacman.x + pacman.nextDirX] === 0) {
        pacman.dirX = pacman.nextDirX;
        pacman.dirY = pacman.nextDirY;
    }
    
    if (maze[pacman.y + pacman.dirY]?.[pacman.x + pacman.dirX] === 0) {
        pacman.x += pacman.dirX;
        pacman.y += pacman.dirY;
    }
    
    // Move ghosts
    ghosts.forEach(ghost => {
        if (Math.random() < 0.01) {  // Reduced from 0.02
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const valid = dirs.filter(d => maze[ghost.y + d[1]]?.[ghost.x + d[0]] === 0);
            if (valid.length) {
                const d = valid[Math.floor(Math.random() * valid.length)];
                ghost.dx = d[0]; ghost.dy = d[1];
            }
        }
        
        let nx = ghost.x + ghost.dx;
        let ny = ghost.y + ghost.dy;
        if (maze[ny]?.[nx] === 0) {
            ghost.x = nx; ghost.y = ny;
        } else {
            // Try alternative direction
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            const valid = dirs.filter(d => maze[ghost.y + d[1]]?.[ghost.x + d[0]] === 0);
            if (valid.length) {
                const d = valid[Math.floor(Math.random() * valid.length)];
                ghost.dx = d[0]; ghost.dy = d[1];
                ghost.x += ghost.dx;
                ghost.y += ghost.dy;
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
            ghosts.forEach(g => g.vulnerable = true);
            setTimeout(() => ghosts.forEach(g => g.vulnerable = false), 5000);
            return false;
        }
        return true;
    });
    
    // Ghost collision
    ghosts.forEach(ghost => {
        if (ghost.x === pacman.x && ghost.y === pacman.y) {
            if (ghost.vulnerable) {
                score += 200;
                ghost.x = 13; ghost.y = 11;
            } else {
                lives--;
                if (lives <= 0) {
                    gameIsRunning = false;
                    messageBox.textContent = '💀 GAME OVER! Score: ' + score;
                    messageBox.className = 'game-over';
                } else {
                    pacman.x = 1; pacman.y = 1;
                    pacman.dirX = 0; pacman.dirY = 0;
                }
            }
        }
    });
    
    // Level complete
    if (pellets.length === 0 && powerUps.length === 0) {
        gameIsRunning = false;
        messageBox.textContent = '🎉 LEVEL COMPLETE! Press SPACEBAR for next level';
        messageBox.className = 'level-complete';
        level++;
    }
    
    // Update display
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    levelDisplay.textContent = level;
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
    
    // Draw pacman with smooth mouth animation
    ctx.fillStyle = '#FFFF00';
    ctx.shadowColor = 'rgba(255, 255, 0, 0.5)';
    ctx.shadowBlur = 10;
    
    const mouthSize = Math.abs(Math.sin(pacman.mouthAngle)) * 0.45;
    const pacmanX = pacman.x * 20 + 10;
    const pacmanY = pacman.y * 20 + 10;
    const pacmanRadius = 8;
    
    // Calculate rotation based on direction
    let rotationAngle = 0;
    if (pacman.dirX === 1) rotationAngle = 0;
    if (pacman.dirX === -1) rotationAngle = Math.PI;
    if (pacman.dirY === 1) rotationAngle = Math.PI / 2;
    if (pacman.dirY === -1) rotationAngle = -Math.PI / 2;
    
    ctx.save();
    ctx.translate(pacmanX, pacmanY);
    ctx.rotate(rotationAngle);
    
    ctx.beginPath();
    ctx.arc(0, 0, pacmanRadius, mouthSize, Math.PI * 2 - mouthSize);
    ctx.lineTo(0, 0);
    ctx.fill();
    
    ctx.restore();
    ctx.shadowColor = 'transparent';
    
    // Draw ghosts with better animation
    ghosts.forEach((ghost, idx) => {
        const ghostX = ghost.x * 20;
        const ghostY = ghost.y * 20;
        const ghostColor = ghost.vulnerable ? '#0088FF' : ghost.color;
        
        ctx.fillStyle = ghostColor;
        ctx.shadowColor = ghostColor;
        ctx.shadowBlur = 8;
        
        // Ghost body
        ctx.beginPath();
        ctx.arc(ghostX + 10, ghostY + 8, 8, Math.PI, 0);
        ctx.lineTo(ghostX + 18, ghostY + 16);
        ctx.lineTo(ghostX + 2, ghostY + 16);
        ctx.closePath();
        ctx.fill();
        
        // Ghost bottom wave
        ctx.beginPath();
        ctx.moveTo(ghostX + 2, ghostY + 16);
        for (let i = 0; i < 4; i++) {
            ctx.quadraticCurveTo(
                ghostX + 4 + i * 4,
                ghostY + 18 + (i % 2) * 2,
                ghostX + 6 + i * 4,
                ghostY + 16
            );
        }
        ctx.closePath();
        ctx.fill();
        
        // Ghost eyes
        const eyeOffset = Math.sin(frameCount * 0.03) * 1.5;
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(ghostX + 6, ghostY + 8 + eyeOffset, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ghostX + 14, ghostY + 8 + eyeOffset, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Ghost pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(ghostX + 6, ghostY + 9 + eyeOffset, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ghostX + 14, ghostY + 9 + eyeOffset, 1.2, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.shadowColor = 'transparent';
}

function startGame() {
    gameIsRunning = true;
    gameOverFlag = false;
    levelCompleteFlag = false;
    messageBox.textContent = '';
    messageBox.className = '';
    
    createMaze();
    createPellets();
    createGhosts();
}

function createMaze() {
    maze = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1],
        [1,0,1,1,0,1,1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,0,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,1,0,1,1,0,1],
        [1,0,0,0,0,1,0,0,0,0,0,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,1],
        [1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1,1,1,1,1,1],
        [1,1,1,1,0,1,1,1,1,0,1,1,0,1,1,0,1,1,0,1,0,1,1,1,1,1,1,1],
        [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,1],
        [1,1,1,1,0,1,0,1,1,0,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,0,1,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
}

function createPellets() {
    pellets = [];
    powerUps = [];
    maze.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell === 0 && !(x === pacman.x && y === pacman.y)) {
                if (Math.random() > 0.95) {
                    powerUps.push({x, y});
                } else {
                    pellets.push({x, y});
                }
            }
        });
    });
}

function createGhosts() {
    ghosts = [
        {x:13, y:11, dx:1, dy:0, color:'#FF0000', vulnerable:false},
        {x:12, y:12, dx:-1, dy:0, color:'#FFB8FF', vulnerable:false},
        {x:13, y:12, dx:0, dy:1, color:'#00FFFF', vulnerable:false},
        {x:14, y:12, dx:0, dy:-1, color:'#FFB847', vulnerable:false}
    ];
}

// Start the game
messageBox.textContent = 'Press SPACEBAR to start!';
gameLoop();
