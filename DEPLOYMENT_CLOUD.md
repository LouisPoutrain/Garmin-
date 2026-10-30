# ☁️ Guide de Déploiement Cloud 24/7 — Garmin Duo Coach

Ce guide permet de déployer l'application **Garmin Duo Coach** dans le Cloud pour que **Clara et Louis puissent y accéder 24h/24 et 7j/7**, depuis leur smartphone (iPhone/Android) ou ordinateur, **sans avoir besoin de laisser le Mac allumé à la maison**.

---

## 🏗️ Architecture Cloud

```text
┌────────────────────────────────────────────────────────────────────────┐
│                          INTERNET / 4G / 5G                            │
│           iPhone Clara                             iPhone Louis        │
│    (Accès direct ?athlete=clara)                (Accès vue Duo)        │
└──────────────────┬──────────────────────────────────────┬──────────────┘
                   │                                      │
                   ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   HÉBERGEMENT CLOUD (Render / Fly / VPS)               │
│                                                                        │
│   🔒 PinAuthMiddleware : Code PIN secret à 4 chiffres (ex: 2027)       │
│                                                                        │
│   ⚡ FastAPI / Starlette Server (Port 5050 / dynamique)                │
│      ├── Télémétrie Sportive React/TypeScript (compilée)               │
│      ├── Moteur Physiologique Déterministe (VDOT, Polarisation 80/20) │
│      ├── RAG ChromaDB (24 fiches de doctrine d'entraînement)           │
│      └── LLM Coach Intelligent (Gemini / Anthropic / OpenAI)           │
│                                                                        │
│   💾 Volume Persistant (/app/data)                                     │
│      ├── SQLite DB (Mémoires relationnelles, logs de synergie duo)     │
│      └── ChromaDB Store                                                │
│                                                                        │
│   🔑 Restauration Automatique des Tokens Garmin                        │
│      ├── GARMIN_TOKENS_BASE64       ──► ~/.garminconnect (Louis)       │
│      └── GARMIN_CLARA_TOKENS_BASE64 ──► ~/.garminconnect_clara (Clara) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Étape Préalable : Obtenir vos variables secrètes en 1 commande

Sur votre Mac, dans le dossier du projet, exécutez le script d'export automatique :

```bash
uv run python scripts/export_cloud_tokens.py
```

Le script va afficher directement dans votre terminal vos variables prêtes à copier-coller :
- `GARMIN_TOKENS_BASE64` (Jetons de session de Louis)
- `GARMIN_CLARA_TOKENS_BASE64` (Jetons de session de Clara)
- `COACH_AUTH_PIN` (Code PIN à 4 chiffres pour protéger l'accès du couple)
- `GEMINI_API_KEY` (Votre clé API pour le LLM)

---

## 🌟 Option A : Déploiement en 5 minutes sur Render.com (Recommandé)

Render est la solution la plus simple avec interface graphique et support natif Docker.

1. **Créer un compte :** Rendez-vous sur [render.com](https://render.com) et connectez-vous avec votre compte GitHub.
2. **Nouveau Service :**
   - Cliquez sur **New +** -> **Blueprint**.
   - Sélectionnez votre repository : `LouisPoutrain/Garmin-`.
   - Render va détecter automatiquement le fichier [`render.yaml`](file:///Users/poutrainlouis/Code/garmin_mcp/render.yaml) à la racine du projet.
3. **Renseigner les Variables d'Environnement :**
   Dans le formulaire de déploiement, collez les valeurs fournies par le script :
   - `GARMIN_TOKENS_BASE64`
   - `GARMIN_CLARA_TOKENS_BASE64`
   - `GEMINI_API_KEY`
   - `COACH_AUTH_PIN` : Choisissez un code PIN secret pour vous deux (ex : `2027` ou `4050`).
4. **Lancer :** Cliquez sur **Apply**.
   - Render va compiler le frontend React et lancer le conteneur Python.
   - En 3 minutes, votre application est en ligne avec une URL HTTPS sécurisée :  
     `https://garmin-duo-coach.onrender.com`

---

## ⚡ Option B : Déploiement sur Fly.io (Ultra Rapide, Serveurs à Paris)

Fly.io héberge vos conteneurs au plus près de vous (datacenter de Paris `cdg`).

1. **Installer le CLI Fly :**
   ```bash
   brew install flyctl
   fly auth login
   ```
2. **Créer le volume persistant pour les données :**
   ```bash
   fly volumes create coach_data --region cdg --size 1
   ```
3. **Configurer les secrets :**
   ```bash
   fly secrets set \
     GARMIN_TOKENS_BASE64="<votre_token_louis>" \
     GARMIN_CLARA_TOKENS_BASE64="<votre_token_clara>" \
     GEMINI_API_KEY="<votre_cle_gemini>" \
     COACH_AUTH_PIN="2027"
   ```
4. **Déployer :**
   ```bash
   fly deploy
   ```

---

## 🐳 Option C : Auto-hébergement sur VPS ou NAS (Docker Compose)

Si vous avez un VPS (Hetzner, OVH, DigitalOcean) ou un NAS Synology :

1. Clonez le repo sur le serveur :
   ```bash
   git clone https://github.com/LouisPoutrain/Garmin-.git
   cd Garmin-
   ```
2. Créez votre fichier `.env` avec les valeurs fournies par `export_cloud_tokens.py`.
3. Lancez le service en arrière-plan :
   ```bash
   docker compose up -d --build
   ```

---

## 📱 Utilisation par Clara sur son Smartphone

Une fois votre URL Cloud active (par exemple `https://garmin-duo-coach.onrender.com`) :

1. **Lien direct à envoyer à Clara :**
   ```text
   https://garmin-duo-coach.onrender.com/?athlete=clara
   ```
2. **Déverrouillage :**
   - À sa première connexion, l'écran de sécurité lui demande le **Code PIN** (ex: `2027`).
   - Une fois entré, le navigateur enregistre un cookie sécurisé valable 1 an : elle n'aura plus jamais besoin de le retaper sur son téléphone.
3. **Installation comme application native (PWA) :**
   - Dans Safari sur son iPhone, elle appuie sur l'icône **Partager** -> **« Sur l'écran d'accueil »**.
   - L'application s'ajoute à son écran avec le logo Garmin Duo et s'ouvre en **plein écran sans aucune barre d'adresse**.
