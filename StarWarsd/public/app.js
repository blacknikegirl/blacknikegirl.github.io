// Global state
let allData = [];
let currentCategory = 'characters';
let favorites = new Set();
let isDarkTheme = true;
let currentPage = 1;
let itemsPerPage = 9;

// Custom droid sample data
const customDroids = [
    {
        id: 'droid-1',
        name: 'XR-11',
        category: 'droids',
        description: 'Advanced reconnaissance droid with enhanced sensor arrays and autonomous navigation capabilities.'
    },
    {
        id: 'droid-2',
        name: 'K2-Mini',
        category: 'droids',
        description: 'Compact multifunctional droid perfect for confined spaces and precision tasks.'
    },
    {
        id: 'droid-3',
        name: 'D-Volt',
        category: 'droids',
        description: 'Energized power-core droid designed for electrical systems and power distribution.'
    },
    {
        id: 'droid-4',
        name: 'Astro-X',
        category: 'droids',
        description: 'Futuristic astromech droid with quantum computing processor and deep space communication.'
    },
    {
        id: 'droid-5',
        name: 'R4-Zen',
        category: 'droids',
        description: 'Calm and meditative protocol droid specializing in diplomatic communication and conflict resolution.'
    }
];

// UI references
const UI = {
    sidebar: null,
    sidebarClose: null,
    menuToggle: null,
    cardsGrid: null,
    loadingEl: null,
    errorEl: null,
    navItems: null,
    prevBtn: null,
    nextBtn: null,
    pageInfo: null,
    statusText: null,
    totalCount: null,
    cardsPerPage: null,
    themeToggle: null,
    backToTop: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    loadThemePreference();
    loadFavorites();
    setupEventListeners();
    fetchDataFromAPI();
});

// Initialize UI references
function initializeUI() {
    UI.sidebar = document.getElementById('sidebar');
    UI.sidebarClose = document.getElementById('sidebarClose');
    UI.menuToggle = document.getElementById('menuToggle');
    UI.cardsGrid = document.getElementById('cardsGrid');
    UI.loadingEl = document.getElementById('loading');
    UI.errorEl = document.getElementById('error');
    UI.navItems = document.querySelectorAll('.nav-item');
    UI.prevBtn = document.getElementById('prevBtn');
    UI.nextBtn = document.getElementById('nextBtn');
    UI.pageInfo = document.getElementById('pageInfo');
    UI.statusText = document.getElementById('statusText');
    UI.totalCount = document.getElementById('totalCount');
    UI.cardsPerPage = document.getElementById('cardsPerPage');
    UI.themeToggle = document.getElementById('themeToggle');
    UI.backToTop = document.getElementById('backToTop');
}

// Setup all event listeners
function setupEventListeners() {
    // Navigation items
    UI.navItems.forEach(item => {
        item.addEventListener('click', () => {
            const category = item.getAttribute('data-category');
            setActiveNavItem(category);
            currentCategory = category;
            currentPage = 1;
            fetchDataFromAPI();
            closeSidebarMobile();
        });
    });

    // Sidebar mobile menu
    if (UI.menuToggle) {
        UI.menuToggle.addEventListener('click', () => {
            UI.sidebar.classList.toggle('open');
        });
    }

    if (UI.sidebarClose) {
        UI.sidebarClose.addEventListener('click', closeSidebarMobile);
    }

    // Theme toggle
    if (UI.themeToggle) {
        UI.themeToggle.addEventListener('click', toggleTheme);
    }

    // Pagination
    if (UI.prevBtn) {
        UI.prevBtn.addEventListener('click', goToPreviousPage);
    }
    if (UI.nextBtn) {
        UI.nextBtn.addEventListener('click', goToNextPage);
    }

    // Items per page dropdown
    if (UI.cardsPerPage) {
        UI.cardsPerPage.addEventListener('change', (e) => {
            itemsPerPage = parseInt(e.target.value);
            currentPage = 1;
            renderCards();
        });
    }

    // Back to top button
    if (UI.backToTop) {
        UI.backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Show/hide back to top button
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            UI.backToTop.classList.add('show');
        } else {
            UI.backToTop.classList.remove('show');
        }
    });
}

// Set active navigation item
function setActiveNavItem(category) {
    UI.navItems.forEach(item => {
        if (item.getAttribute('data-category') === category) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Close sidebar on mobile
function closeSidebarMobile() {
    if (window.innerWidth <= 768) {
        UI.sidebar.classList.remove('open');
    }
}

// Render cards based on current filters and pagination
function renderCards() {
    UI.cardsGrid.innerHTML = '';

    // Filter data by category
    let filteredData = allData.filter(item => {
        const itemCategory = getItemCategory(item);
        return itemCategory === currentCategory;
    });

    if (filteredData.length === 0) {
        UI.cardsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
                <i class="fas fa-inbox" style="font-size: 3rem; color: rgba(255, 23, 68, 0.3); margin-bottom: 16px; display: block;"></i>
                <p style="color: var(--text-secondary);">No items found in this category</p>
            </div>
        `;
        updatePaginationState(0, 0);
    } else {
        // Calculate pagination
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const paginatedData = filteredData.slice(startIdx, endIdx);

        // Render cards
        paginatedData.forEach(item => {
            const card = createCard(item);
            UI.cardsGrid.appendChild(card);
        });

        // Update pagination
        updatePaginationState(currentPage, totalPages);
    }

    // Update status text
    updateStatusText(filteredData.length);
}

// Create card element
function createCard(item) {
    const card = document.createElement('div');
    card.className = 'card';
    
    const title = item.name || 'Unknown';
    const description = item.description || 'No description available';
    const image = item.image || null;
    const itemId = item.id || `${title}-${Date.now()}`;
    const isFavorite = favorites.has(itemId);

    card.innerHTML = `
        <div class="card-image-container">
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy">` : '<div class="card-image-placeholder"><i class="fas fa-image"></i></div>'}
        </div>
        <div class="card-content">
            <h3 class="card-title">${escapeHtml(title)}</h3>
            <p class="card-description">${escapeHtml(truncateText(description, 100))}</p>
            <div class="card-meta">
                <span class="meta-tag">${escapeHtml(getItemCategory(item))}</span>
            </div>
        </div>
    `;

    return card;
}

// Get category from item
function getItemCategory(item) {
    if (item.category) return item.category;
    if (item.birth_year) return 'characters';
    if (item.climate) return 'locations';
    if (item.classification) return 'species';
    if (item.model) return 'vehicles';
    return 'unknown';
}

// Fetch data from API
async function fetchDataFromAPI() {
    try {
        showLoading();
        hideError();

        const category = currentCategory || 'characters';
        const response = await fetch(`/api?category=${category}`);

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        let apiData = normalizeData(data);

        if (category === 'droids') {
            allData = apiData.filter(item => getItemCategory(item) === 'droids').concat(customDroids);
        } else {
            allData = apiData;
        }

        if (allData.length === 0 && category === 'droids') {
            allData = customDroids;
        }

        if (UI.totalCount) {
            UI.totalCount.textContent = allData.length;
        }

        hideLoading();
        renderCards();

    } catch (error) {
        hideLoading();
        showError(error.message);
        
        // Use custom droids as fallback if API fails
        allData = customDroids;
        renderCards(currentCategory);
        
        // Show error message
        console.warn('API fetch failed, using sample data:', error.message);
        showError(`Failed to load data: ${error.message}`);
    }
}

// Normalize API response to consistent format
function normalizeData(apiResponse) {
    let items = [];
    
    // Handle different API response structures
        showError(error.message);
    }
}

// Normalize API data
function normalizeData(apiResponse) {
    let items = [];

    if (Array.isArray(apiResponse)) {
        items = apiResponse;
    } else if (apiResponse && typeof apiResponse === 'object') {
        if (apiResponse.results) items = apiResponse.results;
        else if (apiResponse.data) items = apiResponse.data;
        else if (apiResponse.items) items = apiResponse.items;
        else {
            const values = Object.values(apiResponse).filter(v => typeof v === 'object' && v !== null);
            items = values.length > 0 ? values : [];
        }
    }

    return Array.isArray(items) ? items : [];
}

// Get item category
function getItemCategory(item) {
    if (!item) return 'other';

    if (item.category) return item.category.toLowerCase();
    if (item.type) return item.type.toLowerCase();

    // Check for droid characteristics
    const name = (item.name || '').toLowerCase();
    const droidPatterns = ['r2-d2', 'c-3po', 'r5-d4', 'ig-88', 'bb-8', 'k-2so', 'chopper', 'l3-37', 'astromech', 'protocol', 'droid'];
    if (droidPatterns.some(p => name.includes(p))) return 'droids';

    // Detect by properties
    if (item.height || item.hair_color || item.skin_color) return 'characters';
    if (item.climate || item.gravity) return 'locations';
    if (item.classification || item.language) return 'species';
    if (item.model || item.manufacturer) return 'vehicles';

    return 'other';
}

// Show loading
function showLoading() {
    if (UI.loadingEl) UI.loadingEl.classList.remove('hidden');
    if (UI.errorEl) UI.errorEl.classList.add('hidden');
}

// Hide loading
function hideLoading() {
    if (UI.loadingEl) UI.loadingEl.classList.add('hidden');
}

// Show error
function showError(message) {
    if (UI.errorEl) {
        UI.errorEl.textContent = message;
        UI.errorEl.classList.remove('hidden');
    }
}

// Hide error
function hideError() {
    if (UI.errorEl) UI.errorEl.classList.add('hidden');
}

// Update pagination state
function updatePaginationState(currentPageNum, totalPages) {
    if (UI.prevBtn) UI.prevBtn.disabled = currentPageNum <= 1;
    if (UI.nextBtn) UI.nextBtn.disabled = currentPageNum >= totalPages || totalPages === 0;
    if (UI.pageInfo) UI.pageInfo.textContent = `Page ${currentPageNum}`;
}

// Update status text
function updateStatusText(itemCount) {
    if (UI.statusText) {
        const cat = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
        UI.statusText.textContent = `Showing ${cat} (${itemCount} items) - Page ${currentPage}`;
    }
}

// Go to next page
function goToNextPage() {
    let filteredData = allData.filter(item => getItemCategory(item) === currentCategory);
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    if (currentPage < totalPages) {
        currentPage++;
        renderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Go to previous page
function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        renderCards();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Toggle theme
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    saveThemePreference();
}

// Apply theme
function applyTheme() {
    if (isDarkTheme) {
        document.body.classList.remove('light-theme');
        if (UI.themeToggle) UI.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.add('light-theme');
        if (UI.themeToggle) UI.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// Save theme
function saveThemePreference() {
    localStorage.setItem('starWarsTheme', isDarkTheme ? 'dark' : 'light');
}

// Load theme
function loadThemePreference() {
    const saved = localStorage.getItem('starWarsTheme');
    if (saved) {
        isDarkTheme = saved === 'dark';
    } else {
        isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme();
}

// Save favorites
function saveFavorites() {
    localStorage.setItem('starWarsFavorites', JSON.stringify(Array.from(favorites)));
}

// Load favorites
function loadFavorites() {
    const saved = localStorage.getItem('starWarsFavorites');
    if (saved) {
        favorites = new Set(JSON.parse(saved));
    }
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

// Truncate text
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
