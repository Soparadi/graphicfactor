const http = require('http');
const fs = require('fs');
const path = require('path');
const {pipeline} = require('stream');
const port = process.env.PORT || 3000;
const page = path.join(__dirname, 'graphik-factory.html');
const mediaDir = path.join(__dirname, 'media');
const types = {mp4: 'video/mp4', webm: 'video/webm', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png'};

// Sert un fichier de media/, entier ou par plage (Safari iOS exige les réponses 206 pour lire une vidéo)
function serveMedia(req, res, urlPath) {
  let file;
  try {
    file = path.resolve(mediaDir, '.' + decodeURIComponent(urlPath).slice('/media'.length));
  } catch (e) {
    res.writeHead(400); return res.end();
  }
  if (file.includes('\0') || !file.startsWith(mediaDir + path.sep)) { res.writeHead(403); return res.end(); }
  const type = types[path.extname(file).slice(1).toLowerCase()];
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile() || !type) { res.writeHead(404); return res.end(); }
    const headers = {'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable'};
    let start = 0, end = stat.size - 1, status = 200;
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      if (m[1]) { start = +m[1]; if (m[2]) end = Math.min(+m[2], end); }
      else start = Math.max(stat.size - +m[2], 0);
      if (start > end || start >= stat.size) {
        res.writeHead(416, {'Content-Range': 'bytes */' + stat.size}); return res.end();
      }
      status = 206;
      headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + stat.size;
    }
    headers['Content-Length'] = end - start + 1;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(file, {start, end}), res, () => {});
  });
}

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, {Allow: 'GET, HEAD'}); return res.end(); }
  const urlPath = req.url.split('?')[0];
  if (urlPath.startsWith('/media/')) return serveMedia(req, res, urlPath);
  fs.stat(page, (err, stat) => {
    if (err) { res.writeHead(500); return res.end(); }
    res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Content-Length': stat.size, 'Cache-Control': 'public, max-age=300'});
    if (req.method === 'HEAD') return res.end();
    pipeline(fs.createReadStream(page), res, () => {});
  });
}).listen(port, '0.0.0.0');
console.log('Server running on port ' + port);
