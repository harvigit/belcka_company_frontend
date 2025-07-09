// server.js
const { createServer } = require('http');
const next = require('next');

const app = next({ dev: false, dir: '.' });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res);
  }).listen(3001, () => {
    console.log('> Ready and running on port 3001');
  });
});
