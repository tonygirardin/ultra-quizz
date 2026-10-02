# Le Super Quizz — serveur

Socle minimal : connexion admin (login + session), relais WebSocket admin → viewers.
Le vrai jeu sera branché sur ce socle à l'étape suivante.

## Installation sur le VPS

```bash
# Récupérer les fichiers (après les avoir envoyés sur le VPS, via scp ou git)
cd quizz-server
npm install

# Générer le hash de ton mot de passe admin
node generate-hash.js "TonMotDePasseSolide"
# -> copie le résultat (commence par $2a$...)

# Configurer
cp .env.example .env
nano .env
# colle le hash généré dans ADMIN_PASSWORD_HASH
# remplace SESSION_SECRET par une longue chaîne aléatoire (ex: openssl rand -hex 32)

# Lancer en permanence avec pm2
pm2 start server.js --name quizz
pm2 save
pm2 startup   # affiche une commande à copier-coller pour que ça redémarre après un reboot du VPS
```

Le serveur écoute sur le port 3000 par défaut (modifiable dans `.env`).

## Tester

- Page viewer (publique) : `http://TON_IP:3000/`
- Connexion admin : `http://TON_IP:3000/login`
- Panneau admin (après connexion) : `http://TON_IP:3000/admin`

Ouvre `/admin` dans un onglet et `/` dans un autre (ou sur un autre appareil). Tape un
texte dans le panneau admin et clique "Envoyer aux viewers" : il doit apparaître
quasi instantanément sur la page viewer.

## Important — non testé par Claude

Ce code n'a pas pu être exécuté par Claude avant livraison : le bac à sable n'a pas
d'accès réseau pour installer les paquets npm (express, ws, bcryptjs...). Le code suit
des patterns standards et documentés (notamment l'intégration express-session + ws
recommandée par la doc officielle de la librairie `ws`), mais teste-le toi-même en
suivant les étapes ci-dessus avant de t'y fier pour un vrai stream. Si quelque chose
ne fonctionne pas, montre-moi le message d'erreur exact (terminal ou console
navigateur) et je corrige.

## Prochaine étape

Une fois ce socle validé de ton côté, on porte le vrai jeu dessus :
- le panneau de contrôle actuel (toute la logique de jeu) vient remplacer `admin/panel.html`,
  en changeant juste les appels `postMessage(...)` en `ws.send(...)`
- la page de diffusion actuelle vient remplacer `public/index.html`, en changeant
  l'écoute `window.addEventListener('message', ...)` en `ws.onmessage`
- les cagnottes/inventaire passent du `localStorage` à un fichier JSON côté serveur

## HTTPS (plus tard, avec un nom de domaine)

Pas indispensable pour tester, mais recommandé avant d'ouvrir le lien aux viewers
en vrai (sinon certains navigateurs bloquent ou avertissent). On ajoutera nginx +
certbot (Let's Encrypt, gratuit) une fois que tu as un domaine pointé vers le VPS.
