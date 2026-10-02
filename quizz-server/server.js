require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookie = require('cookie');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // généré avec generate-hash.js
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-moi-en-prod';

if (!ADMIN_PASSWORD_HASH) {
  console.error('ERREUR : ADMIN_PASSWORD_HASH manquant dans .env (lance "node generate-hash.js TonMotDePasse")');
  process.exit(1);
}

const app = express();
app.use(express.urlencoded({ extended: false }));

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 jours
});
app.use(sessionMiddleware);

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.redirect('/login');
}

// --- Connexion ---
app.get('/login', (req, res) => {
  if (req.session && req.session.loggedIn) return res.redirect('/admin');
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USER && bcrypt.compareSync(password || '', ADMIN_PASSWORD_HASH)) {
    req.session.loggedIn = true;
    req.session.username = username;
    return res.redirect('/admin');
  }
  res.redirect('/login?error=1');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Panneau admin (protégé) ---
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'panel.html'));
});

// --- Page publique (viewers) ---
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// --- WebSocket : un canal admin (authentifié), plusieurs canaux viewers (publics) ---
const wss = new WebSocketServer({ noServer: true });

let adminSockets = new Set();
let viewerSockets = new Set();
let lastState = null; // dernier état connu, envoyé aux nouveaux viewers qui se connectent en cours de partie

server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/ws/admin') {
    // Vérifie la session via le cookie présent dans la requête d'upgrade
    sessionMiddleware(req, {}, () => {
      if (!req.session || !req.session.loggedIn) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        adminSockets.add(ws);
        ws.on('close', () => adminSockets.delete(ws));
        ws.on('message', (data) => {
          lastState = data.toString();
          for (const viewer of viewerSockets) {
            if (viewer.readyState === 1) viewer.send(lastState);
          }
        });
      });
    });
  } else if (pathname === '/ws/viewer') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      viewerSockets.add(ws);
      if (lastState) ws.send(lastState);
      ws.on('close', () => viewerSockets.delete(ws));
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT} (admin: /admin, viewers: /)`);
});
