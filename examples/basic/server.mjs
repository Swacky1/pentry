// A tiny, intentionally-imperfect HTTP server to demo Pentry against.
// Run it with `node server.mjs`, then scan it: `npx pentry scan http://localhost:4000`.
import { createServer } from 'node:http';

const PORT = process.env.PORT ?? 4000;

createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // An "admin" route that *should* require auth but doesn't — Pentry's
  // access-control check will catch this when you mark it `protected`.
  if (url.pathname === '/api/admin') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ users: ['alice', 'bob'], secret: true }));
    return;
  }

  // A search page that reflects input unencoded — reflected-input will flag it.
  if (url.pathname === '/search') {
    const q = url.searchParams.get('q') ?? '';
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<html><body><h1>Results for ${q}</h1></body></html>`);
    return;
  }

  // Home page with no security headers — security-headers will flag several.
  res.writeHead(200, { 'content-type': 'text/html' });
  res.end('<html><body><h1>Demo app</h1></body></html>');
}).listen(PORT, () => {
  console.log(`Demo app listening on http://localhost:${PORT}`);
});
