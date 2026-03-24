// ============================================
// DOM ELEMENTS
// ============================================
const loadCatsBtn = document.getElementById('loadCatsBtn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const showFavoritesBtn = document.getElementById('showFavoritesBtn');
const showRandomCatBtn = document.getElementById('showRandomCatBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const searchInput = document.getElementById('searchInput');
const catsContainer = document.getElementById('catsContainer');
const statusMessage = document.getElementById('statusMessage');
const catModal = document.getElementById('catModal');
const closeModalBtn = document.getElementById('closeModal');
const modalFavoriteBtn = document.getElementById('modalFavoriteBtn');

// ============================================
// CONSTANTS
// ============================================
const FAVORITES_STORAGE_KEY = 'purr-favorites';
const THEME_STORAGE_KEY = 'purr-theme';
const apiUrl = window.location.protocol === 'file:' 
  ? 'http://localhost:3000/api/cats' 
  : '/api/cats';
const customCatImages = [
  '/figma-cats/cat-1.svg',
  '/figma-cats/cat-2.svg',
  '/figma-cats/cat-3.svg',
  '/figma-cats/cat-4.svg',
  '/figma-cats/cat-5.svg',
];

// ============================================
// STATE
// ============================================
let allCats = [];
let isFavoritesView = false;
let searchQuery = '';
let currentPage = 1;
let currentModalCat = null;
const pageSize = 10;

// ============================================
// THEME MANAGEMENT
// ============================================
function getSavedTheme() {
  return window.localStorage.getItem(THEME_STORAGE_KEY) || 'light';
}

function applyTheme(theme) {
  const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', normalizedTheme);
  const icon = themeToggleBtn.querySelector('.theme-icon');
  if (icon) {
    icon.textContent = normalizedTheme === 'dark' ? '☀️' : '🌙';
  }
}

function initializeTheme() {
  applyTheme(getSavedTheme());
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  applyTheme(nextTheme);
}

// ============================================
// FAVORITES MANAGEMENT
// ============================================
function getCatId(cat) {
  return `${cat.name}|${cat.origin}|${cat.life_span}`;
}

function readFavorites() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
}

function isFavorite(cat) {
  const catId = getCatId(cat);
  return readFavorites().some((favoriteCat) => getCatId(favoriteCat) === catId);
}

function toggleFavorite(cat) {
  const favorites = readFavorites();
  const catId = getCatId(cat);
  const existingIndex = favorites.findIndex((favoriteCat) => getCatId(favoriteCat) === catId);

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
    saveFavorites(favorites);
    return false;
  }

  favorites.push(cat);
  saveFavorites(favorites);
  return true;
}

// ============================================
// MODAL MANAGEMENT
// ============================================
function openModal(cat) {
  currentModalCat = cat;
  
  // Populate modal content
  document.getElementById('modalCatName').textContent = cat.name || 'Unknown';
  document.getElementById('modalCatOrigin').textContent = cat.origin || 'Unknown';
  document.getElementById('modalCatLifespan').textContent = `${cat.life_span || 'Unknown'} years`;
  document.getElementById('modalCatTemperament').textContent = cat.temperament || 'Unknown';
  document.getElementById('modalCatDescription').textContent = cat.description || 
    'This is a wonderful cat breed with unique characteristics.';
  
  // Set image
  const modalImage = document.getElementById('modalCatImage');
  modalImage.src = cat.imageUrl || '/figma-cats/cat-1.svg';
  modalImage.alt = cat.name || 'Cat breed';
  
  // Update favorite button
  updateModalFavoriteButton();
  
  // Show modal
  catModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  catModal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  currentModalCat = null;
}

function updateModalFavoriteButton() {
  if (!currentModalCat) return;
  
  const isFav = isFavorite(currentModalCat);
  modalFavoriteBtn.classList.toggle('active', isFav);
  modalFavoriteBtn.textContent = isFav ? '❤️ Remove from Favorites' : '♡ Add to Favorites';
}

// ============================================
// UI STATE MANAGEMENT
// ============================================
function updateFavoritesButton() {
  showFavoritesBtn.classList.toggle('active', isFavoritesView);
  showFavoritesBtn.innerHTML = isFavoritesView 
    ? `<span>📚 All Cats</span>` 
    : `<span>❤️ Favorites</span>`;
}

function updateLoadMoreButton() {
  if (isFavoritesView || searchQuery.trim()) {
    loadMoreBtn.classList.add('hidden');
  } else {
    loadMoreBtn.classList.remove('hidden');
  }
}

function getCurrentCatsSource() {
  return isFavoritesView ? readFavorites() : allCats;
}

function getFilteredCats(cats) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (!normalizedQuery) {
    return cats;
  }

  return cats.filter((cat) => (cat?.name || '').toLowerCase().includes(normalizedQuery));
}

function renderActiveView() {
  const sourceCats = getCurrentCatsSource();
  const filteredCats = getFilteredCats(sourceCats);
  renderCats(filteredCats);
}

// ============================================
// STATUS MESSAGES
// ============================================
function setStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = 'status-message show';
  
  setTimeout(() => {
    statusMessage.classList.remove('show');
  }, 3500);
}

function setLoadingState(isLoading) {
  loadCatsBtn.disabled = isLoading;
  const loader = loadCatsBtn.querySelector('.loader');
  const span = loadCatsBtn.querySelector('span:first-child');
  
  if (isLoading) {
    loader?.classList.remove('hidden');
    span.textContent = 'Loading...';
  } else {
    loader?.classList.add('hidden');
    span.textContent = 'Load All Cats';
  }
}

function setLoadMoreState(isLoading) {
  loadMoreBtn.disabled = isLoading;
  loadMoreBtn.textContent = isLoading ? '⏳ Loading...' : 'Load More';
}

// ============================================
// API OPERATIONS
// ============================================
function buildCatsApiUrl(page, limit) {
  const query = `page=${page}&limit=${limit}`;
  return apiUrl.includes('?') ? `${apiUrl}&${query}` : `${apiUrl}?${query}`;
}

async function fetchCatsPage(page, limit) {
  const response = await fetch(buildCatsApiUrl(page, limit));

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const cats = await response.json();
  return Array.isArray(cats) ? cats : [];
}

// ============================================
// CAT RENDERING
// ============================================
function getRandomCustomImage() {
  const index = Math.floor(Math.random() * customCatImages.length);
  return customCatImages[index];
}

function renderCats(cats) {
  catsContainer.innerHTML = '';

  if (!Array.isArray(cats) || cats.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">🐱</div>
      <h3>${isFavoritesView ? 'No Favorites Yet' : 'No Cats Found'}</h3>
      <p>
        ${isFavoritesView 
          ? 'Click the heart icon on any cat to save it to your favorites.' 
          : 'Adjust your search or load more cats to see results.'}
      </p>
    `;
    catsContainer.appendChild(emptyState);
    return;
  }

  cats.forEach((cat, index) => {
    // Skip incomplete records
    if (!cat.name || !cat.origin || !cat.life_span || !cat.imageUrl) {
      return;
    }

    const card = document.createElement('div');
    card.className = 'cat-card';
    card.style.animationDelay = `${index * 50}ms`;

    const imageContainer = document.createElement('div');
    imageContainer.className = 'cat-card-image';

    const image = document.createElement('img');
    image.src = cat.imageUrl;
    image.alt = cat.name;
    image.dataset.originalSrc = cat.imageUrl;

    // Favorite badge
    const favoriteBadge = document.createElement('button');
    favoriteBadge.className = 'favorite-badge';
    favoriteBadge.innerHTML = '♡';
    if (isFavorite(cat)) {
      favoriteBadge.classList.add('active');
      favoriteBadge.innerHTML = '❤️';
    }

    favoriteBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasAdded = toggleFavorite(cat);
      favoriteBadge.classList.toggle('active');
      favoriteBadge.innerHTML = wasAdded ? '❤️' : '♡';
      
      if (isFavoritesView) {
        renderActiveView();
      }

      setStatus(wasAdded ? '❤️ Added to favorites!' : '💔 Removed from favorites');
    });

    imageContainer.appendChild(image);
    imageContainer.appendChild(favoriteBadge);

    // Card content
    const content = document.createElement('div');
    content.className = 'cat-card-content';

    const title = document.createElement('h3');
    title.className = 'cat-card-name';
    title.textContent = cat.name;

    const meta = document.createElement('div');
    meta.className = 'cat-card-meta';

    const originMeta = document.createElement('div');
    originMeta.className = 'cat-card-meta-item';
    originMeta.innerHTML = `<span class="meta-label">From:</span> ${cat.origin}`;

    const lifeMeta = document.createElement('div');
    lifeMeta.className = 'cat-card-meta-item';
    lifeMeta.innerHTML = `<span class="meta-label">Lives:</span> ${cat.life_span} years`;

    meta.appendChild(originMeta);
    meta.appendChild(lifeMeta);

    if (cat.description) {
      const description = document.createElement('p');
      description.className = 'cat-card-description';
      description.textContent = cat.description;
      content.appendChild(description);
    }

    content.appendChild(title);
    content.appendChild(meta);

    card.appendChild(imageContainer);
    card.appendChild(content);

    // Click to open modal
    card.addEventListener('click', () => {
      openModal(cat);
    });

    catsContainer.appendChild(card);
  });
}

// ============================================
// CAT LOADING OPERATIONS
// ============================================
async function loadCats() {
  setLoadingState(true);
  setStatus('🐱 Loading magnificent cats...');

  try {
    const cats = await fetchCatsPage(1, pageSize);

    if (!Array.isArray(cats) || cats.length === 0) {
      throw new Error('No cat data available');
    }

    currentPage = 1;
    allCats = cats;
    isFavoritesView = false;
    updateFavoritesButton();
    updateLoadMoreButton();
    renderActiveView();
    setStatus('✨ Cats loaded successfully!');
  } catch (error) {
    const helpText = window.location.protocol === 'file:'
      ? ' Make sure to start the server with "npm start" and open http://localhost:3000.'
      : '';
    setStatus(`❌ Could not load cats. ${error.message}.${helpText}`);
  } finally {
    setLoadingState(false);
  }
}

async function loadMoreCats() {
  if (isFavoritesView) {
    setStatus('⚠️ Switch to All Cats to load more');
    return;
  }

  setLoadMoreState(true);
  setStatus('📚 Loading more cats...');

  try {
    const nextPage = currentPage + 1;
    const newCats = await fetchCatsPage(nextPage, pageSize);

    if (newCats.length === 0) {
      setStatus('🏁 You\'ve reached the end of our cat collection!');
      return;
    }

    const existingIds = new Set(allCats.map((cat) => getCatId(cat)));
    const uniqueNewCats = newCats.filter((cat) => !existingIds.has(getCatId(cat)));

    if (uniqueNewCats.length === 0) {
      currentPage = nextPage;
      setStatus('🔄 No new unique cats found');
      return;
    }

    allCats = [...allCats, ...uniqueNewCats];
    currentPage = nextPage;

    if (searchQuery.trim()) {
      renderActiveView();
    } else {
      renderCats([...getFilteredCats(allCats)]);
    }

    setStatus('✨ More cats loaded!');
  } catch (error) {
    setStatus(`❌ Could not load more cats. ${error.message}`);
  } finally {
    setLoadMoreState(false);
  }
}

function showRandomCat() {
  const sourceCats = getCurrentCatsSource();
  const filteredCats = getFilteredCats(sourceCats);

  if (!Array.isArray(filteredCats) || filteredCats.length === 0) {
    setStatus('🔍 No cats available to randomly select from');
    renderCats([]);
    return;
  }

  const randomIndex = Math.floor(Math.random() * filteredCats.length);
  const randomCat = filteredCats[randomIndex];

  openModal(randomCat);
  setStatus('🎲 Showing a random cat!');
}

// ============================================
// EVENT LISTENERS
// ============================================

// Main buttons
loadCatsBtn.addEventListener('click', loadCats);
loadMoreBtn.addEventListener('click', loadMoreCats);
showRandomCatBtn.addEventListener('click', showRandomCat);

// Favorites toggle
showFavoritesBtn.addEventListener('click', () => {
  isFavoritesView = !isFavoritesView;
  updateFavoritesButton();
  updateLoadMoreButton();
  renderActiveView();
  const message = isFavoritesView 
    ? '😺 Showing your favorite cats' 
    : '📚 Showing all cats';
  setStatus(message);
});

// Search input
searchInput.addEventListener('input', (event) => {
  searchQuery = event.target.value || '';
  updateLoadMoreButton();
  renderActiveView();
});

// Theme toggle
themeToggleBtn.addEventListener('click', toggleTheme);

// Modal controls
closeModalBtn.addEventListener('click', closeModal);

// Close modal when clicking outside
catModal.addEventListener('click', (e) => {
  if (e.target === catModal) {
    closeModal();
  }
});

// Modal favorite button
modalFavoriteBtn.addEventListener('click', () => {
  if (!currentModalCat) return;
  
  const wasAdded = toggleFavorite(currentModalCat);
  updateModalFavoriteButton();

  if (isFavoritesView) {
    renderActiveView();
  }

  setStatus(wasAdded ? '❤️ Added to favorites!' : '💔 Removed from favorites');
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !catModal.classList.contains('hidden')) {
    closeModal();
  }
});

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();
  updateFavoritesButton();
  updateLoadMoreButton();
});
