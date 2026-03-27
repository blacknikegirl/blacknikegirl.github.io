const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));

// Image cache to avoid repeated API calls
const imageCache = {};

// Fallback image URLs for common items
const fallbackImages = {
  'Sand Crawler': 'https://static.wikia.nocookie.net/starwars/images/6/61/Sandcrawler.jpg',
  'TIE/LN starfighter': 'https://static.wikia.nocookie.net/starwars/images/5/54/TIE_fighter.png',
  'T-16 skyhopper': 'https://static.wikia.nocookie.net/starwars/images/8/8f/T-16_skyhopper.png',
  'AT-AT': 'https://static.wikia.nocookie.net/starwars/images/5/5d/AT-AT.png',
  'AT-ST': 'https://static.wikia.nocookie.net/starwars/images/0/06/AT-ST.png',
  'R2-D2': 'https://static.wikia.nocookie.net/starwars/images/e/eb/ArtooTFA2-Fathead.png/revision/latest?cb=20160103220958',
  'C-3PO': 'https://static.wikia.nocookie.net/starwars/images/5/5f/C-3PO_Fathead.png/revision/latest?cb=20160103220958',
  'R5-D4': 'https://static.wikia.nocookie.net/starwars/images/6/66/R5-D4_Sideshow.png/revision/latest?cb=20160630193903',
  'IG-88': 'https://static.wikia.nocookie.net/starwars/images/c/c6/IG-88Droidography.png/revision/latest?cb=20201110005126',
  'BB-8': 'https://static.wikia.nocookie.net/starwars/images/1/12/BB-8_Headquarters.jpg/revision/latest?cb=20170819043907',
  'K-2SO': 'https://static.wikia.nocookie.net/starwars/images/2/27/K-2SO.png/revision/latest?cb=20171127051425',
};

const droidNamePatterns = ['r2-d2', 'c-3po', 'r5-d4', 'ig-88', 'bb-8', 'k-2so', 'chopper', 'l3-37'];

function isDroidName(name = '') {
  const normalized = String(name).toLowerCase();
  return droidNamePatterns.some(pattern => normalized.includes(pattern));
}

function getSwapiPersonId(url = '') {
  const match = String(url).match(/\/people\/(\d+)\/?$/);
  return match ? match[1] : null;
}

function getDroidImageUrl(item) {
  const fromNameMap = {
    'R2-D2': 'https://starwars-visualguide.com/assets/img/characters/3.jpg',
    'C-3PO': 'https://starwars-visualguide.com/assets/img/characters/2.jpg',
    'R5-D4': 'https://starwars-visualguide.com/assets/img/characters/8.jpg',
    'IG-88': 'https://starwars-visualguide.com/assets/img/characters/23.jpg'
  };

  const name = item?.name || '';
  if (fromNameMap[name]) {
    return fromNameMap[name];
  }

  const personId = getSwapiPersonId(item?.url);
  if (personId && isDroidName(name)) {
    return `https://starwars-visualguide.com/assets/img/characters/${personId}.jpg`;
  }

  return null;
}

// Function to fetch image from Wookiepedia API
async function getWookiepediaImage(itemName) {
  try {
    if (imageCache[itemName]) {
      return imageCache[itemName];
    }

    if (fallbackImages[itemName]) {
      return fallbackImages[itemName];
    }

    const instance = axios.create({
      timeout: 3000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const pageSearchUrl = `https://starwars.fandom.com/api.php?action=query&list=search&srsearch=${encodeURIComponent(itemName)}&srnamespace=0&srlimit=1&format=json`;
    
    const searchResponse = await instance.get(pageSearchUrl);
    
    if (!searchResponse.data.query.search || searchResponse.data.query.search.length === 0) {
      return null;
    }

    const pageTitle = searchResponse.data.query.search[0].title;

    const imageQuery = `https://starwars.fandom.com/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&pithumbsize=350&format=json`;
    
    const imageResponse = await instance.get(imageQuery);
    
    if (imageResponse.data.query && imageResponse.data.query.pages) {
      const pages = Object.values(imageResponse.data.query.pages);
      if (pages.length > 0 && pages[0].thumbnail) {
        const imageUrl = pages[0].thumbnail.source;
        imageCache[itemName] = imageUrl;
        console.log(`✓ Found image for ${itemName}`);
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error(`⚠ Error fetching image for ${itemName}:`, error.message);
    return null;
  }
}

// Function to get image URL for an item
async function getImageUrl(item, category) {
  if (item.image || item.imageUrl) {
    return item.image || item.imageUrl;
  }

  const itemName = item.name || '';
  if (!itemName) return null;

  if (category === 'droids' || isDroidName(itemName)) {
    const droidImage = getDroidImageUrl(item);
    if (droidImage) {
      return droidImage;
    }
  }

  const wookiepediaImage = await getWookiepediaImage(itemName);
  if (wookiepediaImage) {
    return wookiepediaImage;
  }

  return null;
}

// API endpoint to fetch Star Wars data by category
app.get('/api', async (req, res) => {
  try {
    const category = req.query.category || 'vehicles';
    
    const categoryMap = {
      'characters': 'https://swapi.dev/api/people/',
      'creatures': 'https://swapi.dev/api/species/',
      'droids': 'https://swapi.dev/api/people/',
      'locations': 'https://swapi.dev/api/planets/',
      'starships': 'https://swapi.dev/api/starships/',
      'vehicles': 'https://swapi.dev/api/vehicles/',
      'species': 'https://swapi.dev/api/species/',
      'organizations': 'https://swapi.dev/api/people/',
      'all': 'https://swapi.dev/api/people/'
    };
    
    const url = categoryMap[category.toLowerCase()] || categoryMap['vehicles'];
    
    console.log(`Fetching data from: ${url}`);
    const response = await axios.get(url, { timeout: 10000 });
    
    let data = response.data;
    let allResults = data.results || [];
    
    while (data.next) {
      const nextResponse = await axios.get(data.next, { timeout: 10000 });
      data = nextResponse.data;
      allResults = allResults.concat(data.results || []);
    }

    if (category.toLowerCase() === 'droids') {
      allResults = allResults.filter(item => isDroidName(item.name));
    }
    
    console.log(`Fetching images for ${allResults.length} items...`);
    const resultsWithImages = await Promise.all(
      allResults.map(async (item) => {
        let imageUrl = await getImageUrl(item, category);
        
        if (imageUrl) {
          imageUrl = `/image?url=${encodeURIComponent(imageUrl)}&fallback=${encodeURIComponent(item.name || 'Droid')}`;
        } else {
          const itemName = item.name || 'Item';
          imageUrl = `/placeholder?text=${encodeURIComponent(itemName)}`;
        }
        
        return {
          ...item,
          category: category.toLowerCase() === 'droids' ? 'droids' : item.category,
          image: imageUrl
        };
      })
    );
    
    res.json(resultsWithImages);
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch data from Star Wars API',
      message: error.message,
      data: []
    });
  }
});

// Image proxy endpoint
app.get('/image', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'URL parameter required' });
    }

    console.log(`Proxying image: ${imageUrl.substring(0, 60)}...`);
    
    const response = await axios.get(imageUrl, {
      timeout: 8000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Access-Control-Allow-Origin', '*');
    
    res.send(response.data);
  } catch (error) {
    console.error('Error proxying image:', error.message);
    const fallbackText = encodeURIComponent(String(req.query.fallback || 'No Image'));
    res.redirect(`/placeholder?text=${fallbackText}`);
  }
});

// Placeholder image generator
app.get('/placeholder', (req, res) => {
  try {
    const rawText = String(req.query.text || 'Star Wars').slice(0, 32);
    const safeText = rawText.replace(/[&<>"']/g, '');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420" viewBox="0 0 700 420">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#0a1733"/>
      <stop offset="100%" stop-color="#030a1a"/>
    </linearGradient>
  </defs>
  <rect width="700" height="420" fill="url(#bg)"/>
  <rect x="18" y="18" width="664" height="384" rx="16" ry="16" fill="none" stroke="#35578f" stroke-opacity="0.6"/>
  <text x="50%" y="50%" text-anchor="middle" fill="#f2bf2d" font-family="Arial, sans-serif" font-size="34" font-weight="700">${safeText}</text>
  <text x="50%" y="62%" text-anchor="middle" fill="#8ea3c4" font-family="Arial, sans-serif" font-size="16" letter-spacing="2">IMAGE UNAVAILABLE</text>
</svg>`;

    res.set('Content-Type', 'image/svg+xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (error) {
    res.status(500).json({ error: 'Error generating placeholder' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
