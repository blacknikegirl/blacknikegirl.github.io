// ===================================
// Drawing Application - JavaScript
// ===================================

// Canvas and Context Setup
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements - Toolbar Controls
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushSizeValue = document.getElementById('brushSizeValue');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const brushBtn = document.getElementById('brushBtn');
const eraserBtn = document.getElementById('eraserBtn');
const lineCapCheckbox = document.getElementById('lineCap');

// Drawing State Variables
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let currentTool = 'brush'; // Track current tool: 'brush' or 'eraser'

// History Management for Undo/Redo
let history = [];
let historyStep = -1;
const MAX_HISTORY = 50; // Limit history to prevent memory issues

/**
 * Save current canvas state to history
 */
function saveState() {
    // Remove any redo steps if user draws after undo
    history = history.slice(0, historyStep + 1);
    
    // Add new state
    history.push(canvas.toDataURL());
    historyStep++;
    
    // Limit history size
    if (history.length > MAX_HISTORY) {
        history.shift();
        historyStep--;
    }
}

/**
 * Restore canvas from a specific history state
 * @param {number} step - The history step to restore
 */
function restoreState(step) {
    if (step < 0 || step >= history.length) return;
    
    const img = new Image();
    img.src = history[step];
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
}

/**
 * Undo last drawing action (Ctrl+Z)
 */
function undo() {
    if (historyStep > 0) {
        historyStep--;
        restoreState(historyStep);
    }
}

/**
 * Redo last undone action (Ctrl+Y)
 */
function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        restoreState(historyStep);
    }
}

// Initialize Canvas
function initCanvas() {
    // Set canvas background to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Set initial brush properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize.value;
    ctx.strokeStyle = colorPicker.value;
}

// ===================================
// Mouse Drawing Events
// ===================================

/**
 * Handle mouse button press - start drawing
 * @param {MouseEvent} e - Mouse event
 */
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    isDrawing = true;
    
    // Start a new path
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
});

/**
 * Handle mouse movement - draw lines
 * @param {MouseEvent} e - Mouse event
 */
canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Set drawing mode based on current tool
    if (currentTool === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorPicker.value;
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)'; // Opacity for eraser
    }
    
    // Draw line from last position to current position
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    // Update last position
    lastX = currentX;
    lastY = currentY;
});

/**
 * Handle mouse button release - stop drawing
 */
canvas.addEventListener('mouseup', () => {
    if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
        saveState(); // Save state after drawing completes
    }
});

/**
 * Handle mouse leaving canvas - stop drawing
 */
canvas.addEventListener('mouseleave', () => {
    isDrawing = false;
    ctx.beginPath();
});

// ===================================
// Touch Support for Mobile Devices
// ===================================

/**
 * Handle touch start - begin drawing on touch devices
 * @param {TouchEvent} e - Touch event
 */
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    lastX = touch.clientX - rect.left;
    lastY = touch.clientY - rect.top;
    isDrawing = true;
    
    // Start a new path
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
});

/**
 * Handle touch movement - draw on touch devices
 * @param {TouchEvent} e - Touch event
 */
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    const currentX = touch.clientX - rect.left;
    const currentY = touch.clientY - rect.top;
    
    // Set drawing mode based on current tool
    if (currentTool === 'brush') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorPicker.value;
    } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)'; // Opacity for eraser
    }
    
    // Draw line from last position to current position
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    // Update last position
    lastX = currentX;
    lastY = currentY;
});

/**
 * Handle touch end - stop drawing on touch devices
 */
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (isDrawing) {
        isDrawing = false;
        ctx.beginPath();
        saveState(); // Save state after drawing completes
    }
});

// ===================================
// Toolbar Controls - Event Listeners
// ===================================

/**
 * Color picker change event - update brush color and switch to brush mode
 */
colorPicker.addEventListener('change', (e) => {
    ctx.strokeStyle = e.target.value;
    setTool('brush');
});

colorPicker.addEventListener('input', (e) => {
    ctx.strokeStyle = e.target.value;
    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'source-over'; // Preview brush while color picking
    }
});

/**
 * Brush size change event - update line width
 */
brushSize.addEventListener('input', (e) => {
    const size = e.target.value;
    ctx.lineWidth = size;
    brushSizeValue.textContent = size + 'px';
});

/**
 * Line cap checkbox - toggle smooth round edges
 */
lineCapCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    } else {
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
    }
});

/**
 * Toggle tool between brush and eraser
 */
function setTool(tool) {
    currentTool = tool;
    
    // Update button states and cursor
    if (tool === 'brush') {
        brushBtn.classList.add('active');
        eraserBtn.classList.remove('active');
        canvas.classList.remove('eraser-mode');
        ctx.globalCompositeOperation = 'source-over';
    } else if (tool === 'eraser') {
        brushBtn.classList.remove('active');
        eraserBtn.classList.add('active');
        canvas.classList.add('eraser-mode');
        ctx.globalCompositeOperation = 'destination-out';
    }
}

/**
 * Eraser button - toggle eraser mode
 */
eraserBtn.addEventListener('click', () => {
    if (currentTool === 'eraser') {
        // Switch back to brush
        setTool('brush');
    } else {
        // Switch to eraser
        setTool('eraser');
    }
});

/**
 * Brush button - toggle back to brush mode
 */
brushBtn.addEventListener('click', () => {
    if (currentTool !== 'brush') {
        setTool('brush');
    }
});

/**
 * Clear Canvas button - remove all drawings
 */
clearBtn.addEventListener('click', () => {
    // Confirm before clearing
    if (confirm('Are you sure you want to clear the canvas?')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveState(); // Save cleared state to history
    }
});

/**
 * Save Drawing button - download as PNG
 */
saveBtn.addEventListener('click', () => {
    // Create a link element for downloading
    const link = document.createElement('a');
    
    // Convert canvas to image data URL
    const imageData = canvas.toDataURL('image/png');
    
    // Set link properties
    link.href = imageData;
    link.download = 'drawing_' + new Date().getTime() + '.png';
    
    // Trigger download
    link.click();
});

// ===================================
// Keyboard Shortcuts
// ===================================

/**
 * Handle keyboard shortcuts for undo/redo
 */
document.addEventListener('keydown', (e) => {
    // Ctrl+Z or Cmd+Z on Mac - Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }
    
    // Ctrl+Y or Ctrl+Shift+Z - Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    }
});

// ===================================
// Initialization
// ===================================

/**
 * Initialize the application when page loads
 */
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    
    // Set initial brush properties from UI
    ctx.strokeStyle = colorPicker.value;
    ctx.lineWidth = brushSize.value;
    
    // Update brush size display
    brushSizeValue.textContent = brushSize.value + 'px';
    
    // Set line cap style
    if (lineCapCheckbox.checked) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    
    // Save initial blank canvas state for undo
    saveState();
});