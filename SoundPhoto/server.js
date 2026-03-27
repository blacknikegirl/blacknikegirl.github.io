const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const baseDir = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const requestHandler = (req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const sanitizedPath = path.normalize(urlPath).replace(/^\.+/, '');
  const filePath = path.join(baseDir, sanitizedPath);

  if (!filePath.startsWith(baseDir)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.end('Not Found');
      } else {
        res.statusCode = 500;
        res.end('Server Error');
      }
      return;
    }

    const ext = path.extname(filePath);
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.end(data);
  });
};

http.createServer(requestHandler).listen(port, () => {
  console.log(`Photo Music DJ server running at http://localhost:${port}`);
});