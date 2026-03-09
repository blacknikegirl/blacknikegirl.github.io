const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const brushBtn = document.getElementById("brush");
const eraserBtn = document.getElementById("eraser");
const undoBtn = document.getElementById("undo");
const redoBtn = document.getElementById("redo");
const clearCanvasBtn = document.getElementById("clearCanvas");
const saveDrawingBtn = document.getElementById("saveDrawing");

const gallery = document.getElementById("gallery");
const previewWindow = document.getElementById("previewWindow");
const previewImg = document.getElementById("previewImg");
const closePreviewBtn = document.getElementById("closePreview");

const colorButtons = document.querySelectorAll(".colorBtn");

let drawing = false;
let currentColor = "black";
let currentTool = "brush";
let history = [];
let historyStep = -1;

// ---------- Drawing ----------
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseleave", stopDraw);
canvas.addEventListener("mousemove", draw);

function startDraw(e){
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

function stopDraw(){
  if(drawing){
    drawing = false;
    ctx.beginPath();
    saveState();
  }
}

function draw(e){
  if(!drawing) return;
  ctx.lineWidth = brushSize.value;
  ctx.lineCap = "round";

  if(currentTool === "brush"){
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = currentColor;
  } else if(currentTool === "eraser"){
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  }

  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
}

// ---------- History ----------
function saveState(){
  historyStep++;
  history = history.slice(0, historyStep);
  history.push(canvas.toDataURL());
}

function restoreState(step){
  const img = new Image();
  img.src = history[step];
  img.onload = () => {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(img,0,0);
  }
}

undoBtn.onclick = () => {
  if(historyStep > 0){
    historyStep--;
    restoreState(historyStep);
  }
};

redoBtn.onclick = () => {
  if(historyStep < history.length - 1){
    historyStep++;
    restoreState(historyStep);
  }
};

// ---------- Tools ----------
colorPicker.addEventListener("change", () => {
  currentColor = colorPicker.value;
  currentTool = "brush";
  setActiveTool();
});

colorButtons.forEach(btn => btn.addEventListener("click", () => {
  currentColor = btn.dataset.color;
  currentTool = "brush";
  setActiveTool();
}));

brushBtn.onclick = () => {
  currentTool = "brush";
  setActiveTool();
};

eraserBtn.onclick = () => {
  currentTool = "eraser";
  setActiveTool();
};

function setActiveTool(){
  if(currentTool === "brush"){
    brushBtn.classList.add("active");
    eraserBtn.classList.remove("active");
  } else {
    eraserBtn.classList.add("active");
    brushBtn.classList.remove("active");
  }
}

// ---------- Canvas controls ----------
clearCanvasBtn.onclick = () => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  saveState();
};

// ---------- Gallery ----------
function loadGallery(){
  const saved = JSON.parse(localStorage.getItem("drawGallery") || "[]");
  saved.forEach(src => addImageToGallery(src, false));
}

function saveGallery(){
  const images = Array.from(document.querySelectorAll("#gallery img")).map(img => img.src);
  localStorage.setItem("drawGallery", JSON.stringify(images));
}

saveDrawingBtn.onclick = () => {
  const image = canvas.toDataURL();
  addImageToGallery(image, true);
};

function addImageToGallery(src, save=true){
  const box = document.createElement("div");
  box.className = "imageBox";

  const img = document.createElement("img");
  img.src = src;
  img.onclick = () => openPreview(src);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.className = "deleteBtn";
  deleteBtn.onclick = (e) => {
    e.stopPropagation();
    box.remove();
    saveGallery();
    closePreview();
  }

  box.appendChild(img);
  box.appendChild(deleteBtn);
  gallery.appendChild(box);

  if(save) saveGallery();
}

// ---------- Preview ----------
function openPreview(src){
  previewImg.src = src;
  previewWindow.style.display = "flex";
}

function closePreview(){
  previewWindow.style.display = "none";
}

closePreviewBtn.onclick = closePreview;

// ---------- Init ----------
saveState();
loadGallery();
setActiveTool();