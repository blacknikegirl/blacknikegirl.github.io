const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;
const BREEDS_API_URL = 'https://api.thecatapi.com/v1/breeds';
const IMAGE_BASE_URL = 'https://cdn2.thecatapi.com/images';

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static('public'));

async function isImageAvailable(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      timeout: 8000,
      responseType: 'stream',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Close the stream immediately because we only need availability check.
    response.data.destroy();
    return true;
  } catch {
    return false;
  }
}

app.get('/api/cats', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 20);

    const response = await axios.get(BREEDS_API_URL, {
      timeout: 10000,
    });

    const breeds = Array.isArray(response.data) ? response.data : [];
    const validCats = [];
    const startIndex = (page - 1) * limit;
    const endIndexExclusive = startIndex + limit;

    // Build cards from breed data and keep only records with a working image.
    for (const breed of breeds) {
      const imageId = breed?.reference_image_id;

      if (!imageId) {
        continue;
      }

      const imageUrl = `${IMAGE_BASE_URL}/${imageId}.jpg`;
      const hasImage = await isImageAvailable(imageUrl);

      if (!hasImage) {
        continue;
      }

      validCats.push({
        name: breed.name,
        temperament: breed.temperament,
        origin: breed.origin,
        life_span: breed.life_span,
        imageUrl,
      });

      // We only need records up to this page boundary.
      if (validCats.length >= endIndexExclusive) {
        break;
      }
    }

    const paginatedCats = validCats.slice(startIndex, endIndexExclusive);
    res.status(200).json(paginatedCats);
  } catch (error) {
    const statusCode = error.response?.status || 500;

    res.status(statusCode).json({
      error: 'Failed to fetch cat data',
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
