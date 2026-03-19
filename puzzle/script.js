// Global variables
let originalImage = null;
let imageLoaded = false;
let puzzlePieces = [];
let assemblySlots = [];
let correctAssembly = [];
let draggedPiece = null;
let offsetX = 0;
let offsetY = 0;
let selectedGridSize = 3;

// Constants
let GRID_SIZE = 3;
let PIECE_SIZE = 200;
let CANVAS_SIZE = GRID_SIZE * PIECE_SIZE;
let TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
let selectedShape = 'square'; // Track selected shape (square, triangle, polygon)

// DOM Elements
const uploadBtn = document.getElementById('uploadBtn');
const imageInput = document.getElementById('imageInput');
const cutBtn = document.getElementById('cutBtn');
const originalCanvas = document.getElementById('originalCanvas');
const assemblyField = document.getElementById('assemblyField');
const storage = document.getElementById('storage');
const successMessage = document.getElementById('successMessage');
const title = document.getElementById('title');

// Camera elements
const cameraBtn = document.getElementById('cameraBtn');
const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const captureBtn = document.getElementById('captureBtn');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const cameraCanvas = document.getElementById('cameraCanvas');

// Ghost Image elements
const viewBtn = document.getElementById('viewBtn');
const ghostImageContainer = document.getElementById('ghostImageContainer');
const snapSound = document.getElementById('snapSound');

// Background Music elements
const backgroundMusic = document.getElementById('backgroundMusic');
const musicPlayBtn = document.getElementById('musicPlayBtn');
const volumeSlider = document.getElementById('volumeSlider');
let selectedMusic = localStorage.getItem('selectedMusic') || 'none';
let musicIsPlaying = false;
let audioContext = null;
let masterGainNode = null;
let musicOscillators = [];
let musicGainNodes = [];

let cameraStream = null;
let ghostImageCanvas = null;
let snapThreshold = 0; // will be set based on PIECE_SIZE
let lockedPieces = new Set(); // Track correctly placed pieces

// Timer and Leaderboard variables
let puzzleStartTime = null;
let isTimerRunning = false;
let timerInterval = null;
let leaderboardRecords = JSON.parse(localStorage.getItem('puzzleRecords')) || [];
const maxRecords = 10; // Keep top 10 records

// Event Listeners
uploadBtn.addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', handleImageUpload);
cutBtn.addEventListener('click', cutImageIntoPuzzles);
cameraBtn.addEventListener('click', openCamera);
captureBtn.addEventListener('click', capturePhoto);
closeCameraBtn.addEventListener('click', closeCamera);
viewBtn.addEventListener('click', toggleGhostImage);

// Difficulty Level Selectors
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        difficultyBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Update grid size
        selectedGridSize = parseInt(btn.dataset.grid);
        updateGridSize(selectedGridSize);
    });
});

// Shape Level Selectors
const shapeBtns = document.querySelectorAll('.shape-btn');
shapeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        shapeBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Update shape
        selectedShape = btn.dataset.shape;
    });
});

// Background Music Selectors
const musicBtns = document.querySelectorAll('.music-btn');
musicBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Stop current music if any
        if (musicIsPlaying) {
            stopBackgroundMusic();
        }
        
        // Remove active class from all buttons
        musicBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        // Update selected music
        selectedMusic = btn.dataset.music;
        localStorage.setItem('selectedMusic', selectedMusic);
        
        // Reset play button
        musicPlayBtn.textContent = '▶ Play';
        musicPlayBtn.classList.remove('playing');
        musicIsPlaying = false;
    });
});

// Music Play/Pause Button
musicPlayBtn.addEventListener('click', () => {
    if (selectedMusic === 'none') {
        alert('Please select a music track first');
        return;
    }
    
    if (musicIsPlaying) {
        stopBackgroundMusic();
        musicPlayBtn.textContent = '▶ Play';
        musicPlayBtn.classList.remove('playing');
    } else {
        startBackgroundMusic(selectedMusic);
        musicPlayBtn.textContent = '⏸ Pause';
        musicPlayBtn.classList.add('playing');
    }
});

// Volume Control
volumeSlider.addEventListener('input', (e) => {
    const volumePercent = e.target.value / 100;
    
    // Control master gain node volume for Web Audio API
    if (masterGainNode && musicIsPlaying) {
        masterGainNode.gain.value = volumePercent * 0.5; // Scale to 0-50% to prevent clipping
    }
    
    // Also control HTML audio element if used
    backgroundMusic.volume = volumePercent;
    
    // Save to localStorage
    localStorage.setItem('musicVolume', e.target.value);
    
    // Update gradient
    const percent = e.target.value + '%';
    volumeSlider.style.background = `linear-gradient(to right, #ff6b6b 0%, #ff6b6b ${percent}, #555 ${percent}, #555 100%)`;
});

// Leaderboard Button
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
const clearLeaderboardBtn = document.getElementById('clearLeaderboardBtn');

leaderboardBtn.addEventListener('click', () => {
    leaderboardModal.style.display = 'flex';
    updateLeaderboardDisplay();
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.style.display = 'none';
});

clearLeaderboardBtn.addEventListener('click', () => {
    clearLeaderboard();
});

// Close modal when clicking outside
leaderboardModal.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) {
        leaderboardModal.style.display = 'none';
    }
});

// Set initial grid size
updateGridSize(selectedGridSize);

// Set initial music selection from localStorage
musicBtns.forEach(btn => {
    if (btn.dataset.music === selectedMusic) {
        btn.classList.add('active');
    }
});

// Set initial volume
const initialVolume = localStorage.getItem('musicVolume') || 30;
volumeSlider.value = initialVolume;
backgroundMusic.volume = initialVolume / 100;
const percent = initialVolume + '%';
volumeSlider.style.background = `linear-gradient(to right, #ff6b6b 0%, #ff6b6b ${percent}, #555 ${percent}, #555 100%)`;

// Update Grid Size and Canvas
function updateGridSize(gridSize) {
    GRID_SIZE = gridSize;
    PIECE_SIZE = Math.max(50, Math.floor(600 / gridSize));
    CANVAS_SIZE = GRID_SIZE * PIECE_SIZE;
    TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
    
    // Set snap threshold based on piece size (30% of piece size)
    snapThreshold = PIECE_SIZE * 0.3;
    
    // Update canvas dimensions
    originalCanvas.width = CANVAS_SIZE;
    originalCanvas.height = CANVAS_SIZE;
    // Redraw image if already uploaded
    if (originalImage && imageLoaded) {
        const ctx = originalCanvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
}

// Handle Image Upload
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            imageLoaded = true;
            cutBtn.disabled = false;
            viewBtn.disabled = false;
            
            // Draw original image on canvas
            const canvas = originalCanvas;
            const ctx = canvas.getContext('2d');
            canvas.width = CANVAS_SIZE;
            canvas.height = CANVAS_SIZE;
            ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Camera Functions
function openCamera() {
    cameraModal.style.display = 'flex';
    
    // Request camera access
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
    })
    .then(stream => {
        cameraStream = stream;
        cameraVideo.srcObject = stream;
    })
    .catch(err => {
        alert('Unable to access camera: ' + err.message);
        closeCamera();
    });
}

function capturePhoto() {
    // Set canvas size to match video
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    
    // Draw video frame to canvas
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0);
    
    // Convert canvas to image
    cameraCanvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                imageLoaded = true;
                cutBtn.disabled = false;
                viewBtn.disabled = false;
                
                // Draw original image on canvas
                const canvas = originalCanvas;
                const ctx = canvas.getContext('2d');
                canvas.width = CANVAS_SIZE;
                canvas.height = CANVAS_SIZE;
                ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                
                // Close camera modal
                closeCamera();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(blob);
    });
}

function closeCamera() {
    cameraModal.style.display = 'none';
    
    // Stop camera stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Toggle Ghost Image (Hint)
function toggleGhostImage() {
    if (!ghostImageContainer) return;
    
    ghostImageContainer.classList.toggle('visible');
    
    // Update button appearance
    if (ghostImageContainer.classList.contains('visible')) {
        viewBtn.style.backgroundColor = '#00ff00';
        viewBtn.style.color = '#000';
    } else {
        viewBtn.style.backgroundColor = '';
        viewBtn.style.color = '';
    }
}

// Cut Image into Puzzles
function cutImageIntoPuzzles() {
    if (!originalImage || !imageLoaded) return;

    // Start timer for leaderboard
    startPuzzleTimer();

    // Clear previous pieces
    puzzlePieces = [];
    correctAssembly = [];
    assemblySlots = [];
    storage.innerHTML = '';
    assemblyField.innerHTML = '';
    lockedPieces.clear(); // Clear locked pieces tracking
    
    // Hide ghost image when starting new puzzle
    ghostImageContainer.classList.remove('visible');
    viewBtn.style.backgroundColor = '';
    viewBtn.style.color = '';

    // Create a temporary canvas to extract pixel data
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Scale image to CANVAS_SIZE x CANVAS_SIZE
    tempCanvas.width = CANVAS_SIZE;
    tempCanvas.height = CANVAS_SIZE;
    tempCtx.drawImage(originalImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Create ghost image canvas for hint
    ghostImageCanvas = document.createElement('canvas');
    ghostImageCanvas.width = CANVAS_SIZE;
    ghostImageCanvas.height = CANVAS_SIZE;
    const ghostCtx = ghostImageCanvas.getContext('2d');
    ghostCtx.drawImage(originalImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Clear previous ghost image
    ghostImageContainer.innerHTML = '';
    ghostImageContainer.appendChild(ghostImageCanvas);
    ghostImageContainer.classList.remove('visible');

    // Create puzzle pieces
    let pieceIndex = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            // Extract piece data as canvas
            const pieceCanvas = document.createElement('canvas');
            pieceCanvas.width = PIECE_SIZE;
            pieceCanvas.height = PIECE_SIZE;
            const pieceCtx = pieceCanvas.getContext('2d');

            // Draw the piece from the full image
            pieceCtx.drawImage(
                tempCanvas,
                col * PIECE_SIZE,
                row * PIECE_SIZE,
                PIECE_SIZE,
                PIECE_SIZE,
                0,
                0,
                PIECE_SIZE,
                PIECE_SIZE
            );

            // Store piece info
            const pieceData = {
                index: pieceIndex,
                row: row,
                col: col,
                imageData: pieceCanvas.toDataURL()
            };

            puzzlePieces.push(pieceData);
            correctAssembly.push(pieceData);
            pieceIndex++;
        }
    }

    // Shuffle pieces
    puzzlePieces = shuffleArray([...puzzlePieces]);

    // Set grid template columns/rows based on grid size
    assemblyField.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${PIECE_SIZE}px)`;
    assemblyField.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${PIECE_SIZE}px)`;

    // Create assembly slots
    for (let i = 0; i < TOTAL_PIECES; i++) {
        const slot = document.createElement('div');
        slot.className = 'assembly-slot';
        
        // Add shape classes to assembly slots
        if (selectedShape === 'triangle') {
            slot.classList.add('triangle');
        } else if (selectedShape === 'polygon') {
            slot.classList.add('polygon');
        }
        
        slot.dataset.row = Math.floor(i / GRID_SIZE);
        slot.dataset.col = i % GRID_SIZE;
        slot.dataset.index = i;
        slot.style.width = `${PIECE_SIZE}px`;
        slot.style.height = `${PIECE_SIZE}px`;
        slot.ondragover = handleDragOver;
        slot.ondrop = handleDropOnSlot;
        slot.ondragleave = handleDragLeave;
        slot.ondragstart = handleDragStart;
        slot.ondragend = handleDragEnd;
        assemblyField.appendChild(slot);
        assemblySlots.push({
            element: slot,
            occupiedBy: null
        });
    }

    // Add pieces to storage
    displayPiecesInStorage();
}

// Display Pieces in Storage
function displayPiecesInStorage() {
    storage.innerHTML = '';
    // Calculate storage piece size (roughly 1/2 of assembly piece size)
    const storagePieceSize = Math.max(60, Math.floor(PIECE_SIZE * 0.5));
    
    puzzlePieces.forEach((piece, index) => {
        const pieceEl = document.createElement('div');
        pieceEl.className = 'puzzle-piece';
        pieceEl.draggable = true;
        pieceEl.dataset.index = piece.index;
        pieceEl.style.width = `${storagePieceSize}px`;
        pieceEl.style.height = `${storagePieceSize}px`;
        
        // Apply shape class
        if (selectedShape === 'triangle') {
            pieceEl.classList.add('triangle');
        } else if (selectedShape === 'polygon') {
            pieceEl.classList.add('polygon');
        }

        const img = document.createElement('img');
        img.src = piece.imageData;
        pieceEl.appendChild(img);

        // Drag events
        pieceEl.addEventListener('dragstart', handleDragStart);
        pieceEl.addEventListener('dragend', handleDragEnd);

        storage.appendChild(pieceEl);
    });
}

// Shuffle array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Drag and Drop Handlers
function handleDragStart(e) {
    // Try to get puzzle piece first
    let piece = e.target.closest('.puzzle-piece');
    
    // If not a puzzle piece, check if it's an assembly slot with content
    if (!piece) {
        const slot = e.target.closest('.assembly-slot');
        if (slot && slot.dataset.occupiedBy) {
            // Don't allow dragging locked pieces
            if (slot.classList.contains('locked')) {
                e.preventDefault();
                return;
            }
            piece = slot;
        }
    }
    
    if (!piece) return;
    
    draggedPiece = piece;
    draggedPiece.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', draggedPiece.innerHTML);
}

function handleDragEnd(e) {
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
    }
    draggedPiece = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.target.style.backgroundColor = '#1a4d5f';
    e.target.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.5)';
}

function handleDragLeave(e) {
    if (e.target.classList.contains('assembly-slot')) {
        e.target.style.backgroundColor = '';
        e.target.style.boxShadow = '';
    }
}

function handleDropOnSlot(e) {
    e.preventDefault();
    if (!draggedPiece) return;

    const slot = e.target.closest('.assembly-slot');
    if (!slot) return;

    // Clear hover effect
    slot.style.backgroundColor = '';
    slot.style.boxShadow = '';

    // Get piece index from dragged piece
    const pieceIndex = parseInt(draggedPiece.dataset.index);
    const slotIndex = parseInt(slot.dataset.index);

    // Check if dragging from storage or from an assembly slot
    const isFromStorage = draggedPiece.parentElement.id === 'storage';    
    // Try snap-to-grid for pieces from storage
    if (isFromStorage) {
        const snapTarget = applySnapToGrid(pieceIndex, slot);
        if (snapTarget) {
            slot = snapTarget;
            // Play snap sound
            playSnapSound();
            // Visual feedback for snap
            slot.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
            setTimeout(() => {
                slot.style.boxShadow = '';
            }, 300);
        }
    }    
    if (isFromStorage) {
        // Place piece from storage to slot
        const img = draggedPiece.querySelector('img');
        
        // If slot is occupied, move that piece back to storage
        if (slot.dataset.occupiedBy) {
            const occupiedPieceIndex = parseInt(slot.dataset.occupiedBy);
            const occupiedPiece = correctAssembly.find(p => p.index === occupiedPieceIndex);
            
            const storagePiece = document.createElement('div');
            storagePiece.className = 'puzzle-piece';
            
            // Add shape classes to displaced piece
            if (selectedShape === 'triangle') {
                storagePiece.classList.add('triangle');
            } else if (selectedShape === 'polygon') {
                storagePiece.classList.add('polygon');
            }
            
            storagePiece.draggable = true;
            storagePiece.dataset.index = occupiedPieceIndex;
            
            const storagePieceSize = Math.max(60, Math.floor(PIECE_SIZE * 0.5));
            storagePiece.style.width = `${storagePieceSize}px`;
            storagePiece.style.height = `${storagePieceSize}px`;
            
            const occupiedImg = slot.querySelector('img');
            storagePiece.appendChild(occupiedImg.cloneNode(true));
            
            storagePiece.addEventListener('dragstart', handleDragStart);
            storagePiece.addEventListener('dragend', handleDragEnd);
            
            storage.appendChild(storagePiece);
        }
        
        // Add piece to slot
        slot.innerHTML = '';
        slot.appendChild(img.cloneNode(true));
        slot.classList.add('occupied');
        slot.dataset.occupiedBy = pieceIndex;
        
        // Check if piece is in correct position and lock it
        if (isCorrectPlacement(pieceIndex, slot)) {
            lockPiece(slot, pieceIndex);
        }
        
        // Remove piece from storage
        draggedPiece.remove();
    } else {
        // Dragging from one slot to another
        const fromSlot = draggedPiece.closest('.assembly-slot');
        
        if (fromSlot === slot) return; // Same slot, no action
        
        // Get piece index and image
        const pieceIndex = parseInt(fromSlot.dataset.occupiedBy);
        const img = draggedPiece.querySelector('img');
        
        // Unlock source slot
        fromSlot.classList.remove('locked');
        fromSlot.style.cursor = 'grab';
        lockedPieces.delete(pieceIndex);
        
        // If target slot is occupied, swap or move to storage
        if (slot.dataset.occupiedBy) {
            const occupiedPieceIndex = parseInt(slot.dataset.occupiedBy);
            const occupiedImg = slot.querySelector('img');
            
            // Unlock target slot if it was locked
            slot.classList.remove('locked');
            slot.style.cursor = 'grab';
            lockedPieces.delete(occupiedPieceIndex);
            
            // Put occupied piece in source slot
            fromSlot.innerHTML = '';
            fromSlot.appendChild(occupiedImg.cloneNode(true));
            fromSlot.classList.add('occupied');
            fromSlot.dataset.occupiedBy = occupiedPieceIndex;
            
            // Check if swapped piece is now in correct position
            if (isCorrectPlacement(occupiedPieceIndex, fromSlot)) {
                lockPiece(fromSlot, occupiedPieceIndex);
            }
        } else {
            // Clear source slot
            fromSlot.innerHTML = '';
            fromSlot.classList.remove('occupied');
            delete fromSlot.dataset.occupiedBy;
        }
        
        // Put dragged piece in target slot
        slot.innerHTML = '';
        slot.appendChild(img.cloneNode(true));
        slot.classList.add('occupied');
        slot.dataset.occupiedBy = pieceIndex;
        
        // Check if piece is in correct position and lock it
        if (isCorrectPlacement(pieceIndex, slot)) {
            lockPiece(slot, pieceIndex);
        }
    }

    // Check if puzzle is complete
    checkCompletion();
}

// Timer Functions
function startPuzzleTimer() {
    puzzleStartTime = Date.now();
    isTimerRunning = true;
    
    // Show current record display
    const recordDisplay = document.getElementById('currentRecordDisplay');
    if (recordDisplay) {
        recordDisplay.style.display = 'flex';
    }
    
    // Clear any existing interval
    if (timerInterval) clearInterval(timerInterval);
    
    // Update timer display every 10ms for smooth animation
    timerInterval = setInterval(updateCurrentRecordDisplay, 10);
}

function updateCurrentRecordDisplay() {
    if (!puzzleStartTime || !isTimerRunning) return;
    
    const elapsed = (Date.now() - puzzleStartTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = (elapsed % 60).toFixed(2);
    
    const recordTimer = document.getElementById('recordTimer');
    if (recordTimer) {
        recordTimer.textContent = `${minutes}:${seconds.padStart(5, '0')}`;
    }
    
    // Update best record time
    updateBestRecordDisplay();
}

function updateBestRecordDisplay() {
    const bestRecordElement = document.getElementById('bestRecordTime');
    if (!bestRecordElement) return;
    
    if (leaderboardRecords.length === 0) {
        bestRecordElement.textContent = '-';
    } else {
        const bestTime = leaderboardRecords[0].time; // Already sorted, so index 0 is best
        const minutes = Math.floor(bestTime / 60);
        const seconds = (bestTime % 60).toFixed(2);
        bestRecordElement.textContent = `${minutes}:${seconds.padStart(5, '0')}`;
    }
}

function stopPuzzleTimer() {
    if (!puzzleStartTime || !isTimerRunning) return null;
    isTimerRunning = false;
    
    // Clear timer interval
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // Hide current record display
    const recordDisplay = document.getElementById('currentRecordDisplay');
    if (recordDisplay) {
        recordDisplay.style.display = 'none';
    }
    
    const completionTime = (Date.now() - puzzleStartTime) / 1000; // Convert to seconds
    return parseFloat(completionTime.toFixed(2)); // Round to 2 decimals
}

// Leaderboard Functions
function saveLeaderboardRecord(time) {
    const gridSize = GRID_SIZE;
    const difficulty = gridSize === 3 ? 'Easy (3x3)' : gridSize === 4 ? 'Normal (4x4)' : gridSize === 5 ? 'Hard (5x5)' : 'Expert (10x10)';
    
    const record = {
        time: time,
        difficulty: difficulty,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    };
    
    // Add record to array
    leaderboardRecords.push(record);
    
    // Sort by time (ascending) and keep only top 10
    leaderboardRecords.sort((a, b) => a.time - b.time);
    leaderboardRecords = leaderboardRecords.slice(0, maxRecords);
    
    // Save to localStorage
    localStorage.setItem('puzzleRecords', JSON.stringify(leaderboardRecords));
    
    // Update leaderboard display
    updateLeaderboardDisplay();
}

function getFormattedTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function updateLeaderboardDisplay() {
    const leaderboardTable = document.getElementById('leaderboardTable');
    if (!leaderboardTable) return;
    
    // Clear existing rows except header
    const tbody = leaderboardTable.querySelector('tbody');
    if (tbody) {
        tbody.innerHTML = '';
        
        // Add records
        leaderboardRecords.forEach((record, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${getFormattedTime(record.time)}</td>
                <td>${record.difficulty}</td>
                <td>${record.date}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function clearLeaderboard() {
    if (confirm('Are you sure you want to clear all leaderboard records?')) {
        leaderboardRecords = [];
        localStorage.removeItem('puzzleRecords');
        updateLeaderboardDisplay();
    }
}

// Check if Puzzle is Complete
function checkCompletion() {
    let correct = true;
    let allFilled = true;
    
    // Check all slots
    for (let i = 0; i < TOTAL_PIECES; i++) {
        const slot = assemblySlots[i].element;
        const occupiedBy = slot.dataset.occupiedBy;
        
        if (!occupiedBy) {
            allFilled = false;
            break;
        }
        
        // Check if piece in slot is correct for that position
        const pieceInSlot = correctAssembly.find(p => p.index === parseInt(occupiedBy));
        const expectedPiece = correctAssembly[i];
        
        if (pieceInSlot.row !== expectedPiece.row || pieceInSlot.col !== expectedPiece.col) {
            correct = false;
        }
    }

    if (allFilled && correct) {
        showSuccess();
    }
}

// Show Success Message
function showSuccess() {
    // Stop timer and save record
    const completionTime = stopPuzzleTimer();
    if (completionTime) {
        saveLeaderboardRecord(completionTime);
    }
    
    successMessage.classList.add('show');
    createFireworks();
    // Hide success message after 3 seconds
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}

// Create Particle Fireworks Effect
function createFireworks() {
    const particleCount = 80;
    const colors = ['#00d4ff', '#ff6b6b', '#ffff00', '#00ff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random starting position (center of screen)
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight / 2;
        
        // Random angle and velocity
        const angle = (Math.random() * Math.PI * 2);
        const velocity = 5 + Math.random() * 10;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 8 + Math.random() * 12;
        
        // Set random rotation
        const rotation = Math.random() * 360;
        
        particle.style.left = startX + 'px';
        particle.style.top = startY + 'px';
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.backgroundColor = color;
        particle.style.boxShadow = `0 0 ${size}px ${color}`;
        particle.style.transform = `rotate(${rotation}deg)`;
        particle.style.position = 'fixed';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1000';
        
        document.body.appendChild(particle);
        
        // Animate particle
        let x = startX;
        let y = startY;
        let vx_current = vx;
        let vy_current = vy;
        let gravity = 0.3;
        let life = 1;
        let duration = 2500; // milliseconds
        let startTime = Date.now();
        
        function animateParticle() {
            let elapsed = Date.now() - startTime;
            let progress = elapsed / duration;
            
            if (progress >= 1) {
                particle.remove();
                return;
            }
            
            // Physics simulation
            x += vx_current;
            y += vy_current;
            vy_current += gravity;
            
            // Apply friction
            vx_current *= 0.98;
            vy_current *= 0.98;
            
            // Update position
            particle.style.left = x + 'px';
            particle.style.top = y + 'px';
            
            // Fade out
            particle.style.opacity = Math.max(0, 1 - progress);
            
            // Rotate particle
            let currentRotation = rotation + progress * 720;
            particle.style.transform = `rotate(${currentRotation}deg)`;
            
            requestAnimationFrame(animateParticle);
        }
        
        animateParticle();
    }
}

// Add shake animation to CSS dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Generate snap sound using Web Audio API
function generateSnapSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const duration = 0.1;
    const frequency = 800;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Play snap sound
function playSnapSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 0.1;
        const frequency = 800;
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch(e) {
        // Audio context not available
    }
}

// Play CHPONK sound (bass impact) - for correct placement
function playCHPONKSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        const duration = 0.35;
        
        // Create bass oscillator
        const osc1 = audioContext.createOscillator();
        const osc2 = audioContext.createOscillator();
        const gain = audioContext.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioContext.destination);
        
        // Main bass frequency sweep (150Hz down to 80Hz)
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(150, now);
        osc1.frequency.exponentialRampToValueAtTime(80, now + duration);
        
        // Secondary harmonic for "voiced" quality (225Hz down to 120Hz)
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(225, now);
        osc2.frequency.exponentialRampToValueAtTime(120, now + duration);
        
        // Louder volume envelope
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    } catch(e) {
        // Audio context not available
    }
}

// Background Music Generation
function startBackgroundMusic(musicType) {
    if (musicType === 'none') return;
    
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume audio context if it's suspended (common on some browsers)
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create master gain node if it doesn't exist
        if (!masterGainNode) {
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
        }
        
        // Set initial volume from slider
        const volumePercent = volumeSlider.value / 100;
        masterGainNode.gain.value = volumePercent * 0.5; // Scale to 0-50% to prevent clipping
        
        // Stop any existing music
        stopBackgroundMusic();
        
        // Set flag BEFORE generating music (important!)
        musicIsPlaying = true;
        
        // Generate appropriate music
        switch(musicType) {
            case 'ambient':
                generateAmbientMusic();
                break;
            case 'upbeat':
                generateUpbeatMusic();
                break;
            case 'classical':
                generateClassicalMusic();
                break;
            case 'lofi':
                generateLofiMusic();
                break;
            case 'electronic':
                generateElectronicMusic();
                break;
        }
    } catch(e) {
        console.error('Error starting background music:', e);
    }
}

function stopBackgroundMusic() {
    // Stop all oscillators
    musicOscillators.forEach(osc => {
        try {
            osc.stop();
        } catch(e) {}
    });
    musicOscillators = [];
    musicGainNodes = [];
    musicIsPlaying = false;
}

function generateAmbientMusic() {
    const base = [130.81, 146.83, 164.81]; // C3, D3, E3 (bass notes)
    const melody = [261.63, 293.66, 329.63, 349.23, 392.00]; // C4-G4
    const harmonic = [392.00, 440.00, 493.88]; // G4-B4
    
    let noteSequence = 0;
    
    function playAmbientLayer() {
        if (!musicIsPlaying) return;
        
        // Play base note (very low, long sustain)
        const baseFreq = base[noteSequence % base.length];
        const baseDuration = 8;
        const baseStart = audioContext.currentTime;
        
        const baseOsc = audioContext.createOscillator();
        const baseGain = audioContext.createGain();
        baseOsc.connect(baseGain);
        baseGain.connect(masterGainNode);
        baseOsc.type = 'sine';
        baseOsc.frequency.value = baseFreq;
        baseGain.gain.setValueAtTime(0.08, baseStart);
        baseGain.gain.linearRampToValueAtTime(0.05, baseStart + baseDuration);
        baseOsc.start(baseStart);
        baseOsc.stop(baseStart + baseDuration);
        
        // Play melody note
        const melodyFreq = melody[(noteSequence + Math.floor(Math.random() * 3)) % melody.length];
        const melodyStart = baseStart + 1;
        const melodyDuration = 3.5;
        
        const melodyOsc = audioContext.createOscillator();
        const melodyGain = audioContext.createGain();
        melodyOsc.connect(melodyGain);
        melodyGain.connect(masterGainNode);
        melodyOsc.type = 'sine';
        melodyOsc.frequency.value = melodyFreq;
        melodyGain.gain.setValueAtTime(0, melodyStart);
        melodyGain.gain.linearRampToValueAtTime(0.12, melodyStart + 0.3);
        melodyGain.gain.linearRampToValueAtTime(0.08, melodyStart + 2);
        melodyGain.gain.linearRampToValueAtTime(0, melodyStart + melodyDuration);
        melodyOsc.start(melodyStart);
        melodyOsc.stop(melodyStart + melodyDuration);
        
        // Play harmonic note (high, soft)
        const harmFreq = harmonic[noteSequence % harmonic.length];
        const harmStart = baseStart + 2;
        const harmDuration = 2.5;
        
        const harmOsc = audioContext.createOscillator();
        const harmGain = audioContext.createGain();
        harmOsc.connect(harmGain);
        harmGain.connect(masterGainNode);
        harmOsc.type = 'triangle';
        harmOsc.frequency.value = harmFreq;
        harmGain.gain.setValueAtTime(0, harmStart);
        harmGain.gain.linearRampToValueAtTime(0.08, harmStart + 0.2);
        harmGain.gain.linearRampToValueAtTime(0, harmStart + harmDuration);
        harmOsc.start(harmStart);
        harmOsc.stop(harmStart + harmDuration);
        
        noteSequence++;
        musicOscillators.push(baseOsc, melodyOsc, harmOsc);
        
        // Next sequence every 8 seconds
        setTimeout(playAmbientLayer, 8000);
    }
    
    playAmbientLayer();
}

function generateUpbeatMusic() {
    const chordProgression = [
        [130.81, 164.81, 196.00],  // C major (C3, E3, G3)
        [146.83, 185.00, 220.00],  // D minor (D3, F#3, A3)
        [164.81, 196.00, 246.94],  // E minor (E3, G3, B3)
        [130.81, 164.81, 196.00]   // C major
    ];
    const melody = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // C4-C5
    let barCount = 0;
    
    function playUpbeatBar() {
        if (!musicIsPlaying) return;
        
        const currentChord = chordProgression[barCount % 4];
        const beatTime = 0.25; // 16th note
        
        // Kick drum pattern (beats 1, 2.5, 3.5)
        [0, 2.5, 3.5].forEach((beatPos) => {
            const kickStart = audioContext.currentTime + beatPos * beatTime;
            const kickOsc = audioContext.createOscillator();
            const kickGain = audioContext.createGain();
            kickOsc.connect(kickGain);
            kickGain.connect(masterGainNode);
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(150, kickStart);
            kickOsc.frequency.exponentialRampToValueAtTime(60, kickStart + 0.1);
            kickGain.gain.setValueAtTime(0.3, kickStart);
            kickGain.gain.exponentialRampToValueAtTime(0, kickStart + 0.1);
            kickOsc.start(kickStart);
            kickOsc.stop(kickStart + 0.1);
            musicOscillators.push(kickOsc);
        });
        
        // Bass chord (whole bar)
        currentChord.forEach((freq, idx) => {
            const bassStart = audioContext.currentTime;
            const bassOsc = audioContext.createOscillator();
            const bassGain = audioContext.createGain();
            bassOsc.connect(bassGain);
            bassGain.connect(masterGainNode);
            bassOsc.type = idx === 0 ? 'sine' : 'triangle';
            bassOsc.frequency.value = freq;
            bassGain.gain.setValueAtTime(0.08 - idx * 0.02, bassStart);
            bassGain.gain.linearRampToValueAtTime(0.06 - idx * 0.02, bassStart + 4 * beatTime);
            bassOsc.start(bassStart);
            bassOsc.stop(bassStart + 4 * beatTime);
            musicOscillators.push(bassOsc);
        });
        
        // Melodic progression (plays every 2 beats)
        for (let i = 0; i < 8; i += 2) {
            const melodyStart = audioContext.currentTime + i * beatTime;
            const melodyFreq = melody[(barCount * 2 + i) % melody.length];
            const melodyOsc = audioContext.createOscillator();
            const melodyGain = audioContext.createGain();
            melodyOsc.connect(melodyGain);
            melodyGain.connect(masterGainNode);
            melodyOsc.type = 'square';
            melodyOsc.frequency.value = melodyFreq;
            melodyGain.gain.setValueAtTime(0.15, melodyStart);
            melodyGain.gain.exponentialRampToValueAtTime(0.05, melodyStart + 1.5 * beatTime);
            melodyOsc.start(melodyStart);
            melodyOsc.stop(melodyStart + 1.5 * beatTime);
            musicOscillators.push(melodyOsc);
        }
        
        barCount++;
        // Next bar (4 beats = 1 second)
        setTimeout(playUpbeatBar, 1000);
    }
    
    playUpbeatBar();
}

function generateClassicalMusic() {
    const scale = [264, 297, 330, 352, 396, 440, 495, 528]; // C Major scale
    const bassScale = [132, 148.5, 165, 176, 198, 220, 247.5, 264]; // One octave lower
    
    // Classical melody phrase (like a minuet)
    const melodyPhrase1 = [0, 1, 2, 3, 2, 1, 0, 7, 6, 5, 4, 3, 2];
    const melodyPhrase2 = [2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0, 1, 2];
    const phrases = [melodyPhrase1, melodyPhrase2];
    
    let phraseIndex = 0;
    
    function playClassicalPhrase() {
        if (!musicIsPlaying) return;
        
        const currentPhrase = phrases[phraseIndex % 2];
        const noteDuration = 0.5;
        let delay = 0;
        
        // Play background harmony (lower notes, sustained)
        const harmonyFreqs = [bassScale[0], bassScale[2], bassScale[4]]; // I, III, V
        harmonyFreqs.forEach((freq, idx) => {
            const harmStart = audioContext.currentTime;
            const harmOsc = audioContext.createOscillator();
            const harmGain = audioContext.createGain();
            harmOsc.connect(harmGain);
            harmGain.connect(masterGainNode);
            harmOsc.type = 'sine';
            harmOsc.frequency.value = freq;
            harmGain.gain.setValueAtTime(0.06, harmStart);
            harmGain.gain.linearRampToValueAtTime(0.04, harmStart + currentPhrase.length * noteDuration);
            harmOsc.start(harmStart);
            harmOsc.stop(harmStart + currentPhrase.length * noteDuration);
            musicOscillators.push(harmOsc);
        });
        
        // Play main melody
        currentPhrase.forEach((noteIdx, idx) => {
            const noteStart = audioContext.currentTime + delay;
            const frequency = scale[noteIdx];
            
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(masterGainNode);
            osc.type = 'triangle';
            osc.frequency.value = frequency;
            
            // Smooth envelope
            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.16, noteStart + 0.05);
            gain.gain.linearRampToValueAtTime(0.12, noteStart + noteDuration * 0.7);
            gain.gain.linearRampToValueAtTime(0, noteStart + noteDuration + 0.1);
            
            osc.start(noteStart);
            osc.stop(noteStart + noteDuration + 0.1);
            musicOscillators.push(osc);
            
            delay += noteDuration + 0.1;
        });
        
        phraseIndex++;
        // Loop phrase with breathing room
        setTimeout(playClassicalPhrase, delay * 1000 + 500);
    }
    
    playClassicalPhrase();
}

// Lofi Hip-Hop Music
function generateLofiMusic() {
    const chords = [
        [130.81, 164.81, 196.00],  // Cmaj7
        [146.83, 185.00, 220.00],  // Dm7
        [164.81, 207.65, 246.94],  // Em7
        [130.81, 164.81, 196.00]   // Cmaj7
    ];
    
    let barIndex = 0;
    
    function playLofiBar() {
        if (!musicIsPlaying) return;
        
        const chordFreqs = chords[barIndex % 4];
        const barDuration = 2000; // 2 seconds per bar
        const beatTime = 250; // quarter note
        
        // Soft, warm bass
        chordFreqs.forEach((freq, idx) => {
            const bassStart = audioContext.currentTime;
            const bassOsc = audioContext.createOscillator();
            const bassGain = audioContext.createGain();
            bassOsc.connect(bassGain);
            bassGain.connect(masterGainNode);
            bassOsc.type = idx === 0 ? 'sine' : 'sine';
            bassOsc.frequency.value = freq;
            bassGain.gain.setValueAtTime(0.05, bassStart);
            bassGain.gain.linearRampToValueAtTime(0.04, bassStart + barDuration / 1000);
            bassOsc.start(bassStart);
            bassOsc.stop(bassStart + barDuration / 1000);
            musicOscillators.push(bassOsc);
        });
        
        // Lofi drum beat pattern (kick, snare, kick, kick snare)
        const kickTimes = [0, 0.5, 1, 1.5]; // beats
        const snareTimes = [0.5, 1.5]; // beats
        
        kickTimes.forEach(beat => {
            const kickStart = audioContext.currentTime + beat * beatTime / 1000;
            const kickOsc = audioContext.createOscillator();
            const kickGain = audioContext.createGain();
            kickOsc.connect(kickGain);
            kickGain.connect(masterGainNode);
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(120, kickStart);
            kickOsc.frequency.exponentialRampToValueAtTime(40, kickStart + 0.15);
            kickGain.gain.setValueAtTime(0.25, kickStart);
            kickGain.gain.exponentialRampToValueAtTime(0, kickStart + 0.15);
            kickOsc.start(kickStart);
            kickOsc.stop(kickStart + 0.15);
            musicOscillators.push(kickOsc);
        });
        
        // Snare (high-frequency noise simulation)
        snareTimes.forEach(beat => {
            const snareStart = audioContext.currentTime + beat * beatTime / 1000;
            const snareOsc = audioContext.createOscillator();
            const snareGain = audioContext.createGain();
            snareOsc.connect(snareGain);
            snareGain.connect(masterGainNode);
            snareOsc.type = 'triangle';
            snareOsc.frequency.value = 200 + Math.random() * 100;
            snareGain.gain.setValueAtTime(0.15, snareStart);
            snareGain.gain.exponentialRampToValueAtTime(0, snareStart + 0.1);
            snareOsc.start(snareStart);
            snareOsc.stop(snareStart + 0.1);
            musicOscillators.push(snareOsc);
        });
        
        // Gentle melody notes (pentatonic)
        const melodyFreqs = [261.63, 293.66, 329.63, 392.00];
        const melodyStart = audioContext.currentTime + 0.25;
        const melodyFreq = melodyFreqs[barIndex % melodyFreqs.length];
        const melodyOsc = audioContext.createOscillator();
        const melodyGain = audioContext.createGain();
        melodyOsc.connect(melodyGain);
        melodyGain.connect(masterGainNode);
        melodyOsc.type = 'sine';
        melodyOsc.frequency.value = melodyFreq;
        melodyGain.gain.setValueAtTime(0, melodyStart);
        melodyGain.gain.linearRampToValueAtTime(0.08, melodyStart + 0.1);
        melodyGain.gain.linearRampToValueAtTime(0.06, melodyStart + 1.5);
        melodyGain.gain.linearRampToValueAtTime(0, melodyStart + 1.8);
        melodyOsc.start(melodyStart);
        melodyOsc.stop(melodyStart + 1.8);
        musicOscillators.push(melodyOsc);
        
        barIndex++;
        // Next bar
        setTimeout(playLofiBar, barDuration);
    }
    
    playLofiBar();
}

// Electronic/Synth Music
function generateElectronicMusic() {
    const bassLine = [130.81, 146.83, 130.81, 164.81]; // C-D-C-E bass pattern
    const pad = [261.63, 329.63, 392.00]; // C-E-G pad chord
    
    let stepIndex = 0;
    
    function playElectronicStep() {
        if (!musicIsPlaying) return;
        
        const stepDuration = 0.5; // 16th note
        const currentBass = bassLine[stepIndex % bassLine.length];
        
        // Plucky synthé bass (short, punchy)
        const bassStart = audioContext.currentTime;
        const bassOsc = audioContext.createOscillator();
        const bassGain = audioContext.createGain();
        bassOsc.connect(bassGain);
        bassGain.connect(masterGainNode);
        bassOsc.type = 'square';
        bassOsc.frequency.value = currentBass;
        bassGain.gain.setValueAtTime(0.2, bassStart);
        bassGain.gain.exponentialRampToValueAtTime(0.05, bassStart + stepDuration * 0.8);
        bassOsc.start(bassStart);
        bassOsc.stop(bassStart + stepDuration);
        musicOscillators.push(bassOsc);
        
        // Sustained pad (slower attack/release)
        if (stepIndex % 8 === 0) {
            const padStart = audioContext.currentTime;
            pad.forEach((freq, idx) => {
                const padOsc = audioContext.createOscillator();
                const padGain = audioContext.createGain();
                padOsc.connect(padGain);
                padGain.connect(masterGainNode);
                padOsc.type = 'triangle';
                padOsc.frequency.value = freq;
                padGain.gain.setValueAtTime(0, padStart);
                padGain.gain.linearRampToValueAtTime(0.05 - idx * 0.01, padStart + 0.2);
                padGain.gain.linearRampToValueAtTime(0.03 - idx * 0.01, padStart + 3.5);
                padGain.gain.linearRampToValueAtTime(0, padStart + 4);
                padOsc.start(padStart);
                padOsc.stop(padStart + 4);
                musicOscillators.push(padOsc);
            });
        }
        
        // Hi-hat cymbal simulation (every other step)
        if (stepIndex % 2 === 0) {
            const hatStart = audioContext.currentTime;
            const hatOsc = audioContext.createOscillator();
            const hatGain = audioContext.createGain();
            hatOsc.connect(hatGain);
            hatGain.connect(masterGainNode);
            hatOsc.type = 'square';
            hatOsc.frequency.value = 8000 + Math.random() * 2000;
            hatGain.gain.setValueAtTime(0.1, hatStart);
            hatGain.gain.exponentialRampToValueAtTime(0, hatStart + 0.05);
            hatOsc.start(hatStart);
            hatOsc.stop(hatStart + 0.05);
            musicOscillators.push(hatOsc);
        }
        
        stepIndex++;
        // Next step
        setTimeout(playElectronicStep, stepDuration * 1000);
    }
    
    playElectronicStep();
}

// Calculate distance between two points
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Find correct slot for a piece
function findCorrectSlot(pieceIndex) {
    const piece = correctAssembly.find(p => p.index === pieceIndex);
    if (!piece) return null;
    
    // Calculate the correct slot based on row and col
    const slotIndex = piece.row * GRID_SIZE + piece.col;
    return assemblySlots[slotIndex];
}

// Check if a piece is in its correct position
function isCorrectPlacement(pieceIndex, slot) {
    const piece = correctAssembly.find(p => p.index === pieceIndex);
    if (!piece) return false;
    
    const slotRow = parseInt(slot.dataset.row);
    const slotCol = parseInt(slot.dataset.col);
    
    return piece.row === slotRow && piece.col === slotCol;
}

// Lock a correctly placed piece
function lockPiece(slot, pieceIndex) {
    slot.classList.add('locked');
    slot.style.cursor = 'not-allowed';
    lockedPieces.add(pieceIndex);
    playCHPONKSound();
}

// Add snap-to-grid magnet effect
function applySnapToGrid(draggingPieceIndex, targetSlot) {
    // Find correct slot for the piece being dragged
    const correctSlot = findCorrectSlot(draggingPieceIndex);
    
    if (!correctSlot || correctSlot.element === targetSlot) return null;
    
    // Calculate distance from target slot to correct slot
    const targetRect = targetSlot.getBoundingClientRect();
    const correctRect = correctSlot.element.getBoundingClientRect();
    
    const distance = calculateDistance(
        targetRect.left,
        targetRect.top,
        correctRect.left,
        correctRect.top
    );
    
    // If close enough to correct position, snap to it
    if (distance < snapThreshold) {
        return correctSlot.element;
    }
    
    return null;
}

// Add drag event handlers to storage area
storage.ondragover = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    storage.style.backgroundColor = '#333';
    storage.style.borderColor = '#ff6b6b';
};

storage.ondragleave = (e) => {
    if (e.target === storage) {
        storage.style.backgroundColor = '';
        storage.style.borderColor = '';
    }
};

storage.ondrop = (e) => {
    e.preventDefault();
    storage.style.backgroundColor = '';
    storage.style.borderColor = '';
    
    if (!draggedPiece) return;
    
    // Check if dragging from an assembly slot
    const fromSlot = draggedPiece.closest('.assembly-slot');
    if (fromSlot) {
        const pieceIndex = parseInt(fromSlot.dataset.occupiedBy);
        const piece = correctAssembly.find(p => p.index === pieceIndex);
        
        if (piece) {
            // Create new storage piece
            const storagePiece = document.createElement('div');
            storagePiece.className = 'puzzle-piece';
            
            // Add shape classes
            if (selectedShape === 'triangle') {
                storagePiece.classList.add('triangle');
            } else if (selectedShape === 'polygon') {
                storagePiece.classList.add('polygon');
            }
            
            storagePiece.draggable = true;
            storagePiece.dataset.index = pieceIndex;
            
            const storagePieceSize = Math.max(60, Math.floor(PIECE_SIZE * 0.5));
            storagePiece.style.width = `${storagePieceSize}px`;
            storagePiece.style.height = `${storagePieceSize}px`;
            
            const img = fromSlot.querySelector('img');
            if (img) {
                storagePiece.appendChild(img.cloneNode(true));
            }
            
            storagePiece.addEventListener('dragstart', handleDragStart);
            storagePiece.addEventListener('dragend', handleDragEnd);
            
            storage.appendChild(storagePiece);
            
            // Clear the assembly slot
            fromSlot.innerHTML = '';
            fromSlot.classList.remove('occupied');
            delete fromSlot.dataset.occupiedBy;
            
            // Check completion
            checkCompletion();
        }
    }
};

// Initialize assembly field on load
document.addEventListener('DOMContentLoaded', () => {
    // Create initial empty slots if needed
    console.log('Pixel Puzzle initialized and ready!');
    
    // Generate snap sound
    generateSnapSound();
    
    // Load and display leaderboard records on page load
    updateLeaderboardDisplay();
    
    // Display best record time on page load
    updateBestRecordDisplay();
});
