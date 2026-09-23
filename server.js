const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
const types = {webp: 'image/webp', png: 'image/png'};
http.createServer((req, res) => {
  const img = /^\/img\/([a-z0-9-]+)\.(webp|png)$/.exec(req.url.split('?')[0]);
  if (img) {
    const file = path.join(__dirname, 'img', img[1] + '.' + img[2]);
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {'Content-Type': types[img[2]], 'Cache-Control': 'public, max-age=2592000'});
    return res.end(fs.readFileSync(file));
  }
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(fs.readFileSync('graphic-factor-v2.html'));
}).listen(port, '0.0.0.0');
console.log('Server running on port ' + port);
