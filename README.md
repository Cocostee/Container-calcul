# Application de Chargement de Conteneurs (3D Bin Packing)

Application web permettant d'optimiser le placement de palettes dans un conteneur de
transport : choix du conteneur, ajout de palettes, calcul automatique du chargement
(bin packing 3D), visualisation 3D interactive, et sauvegarde/rechargement de projets.

---

## Sommaire

- [1. Vue d'ensemble](#1-vue-densemble)
- [2. Stack technique](#2-stack-technique)
- [3. Architecture générale](#3-architecture-générale)
- [4. Démarrage rapide](#4-démarrage-rapide)
- [5. Structure du dépôt](#5-structure-du-dépôt)
- [6. Backend — `api-container`](#6-backend--api-container)
- [7. Frontend — `front-container`](#7-frontend--front-container)
- [8. Modèle de données](#8-modèle-de-données)
- [9. API REST](#9-api-rest)
- [10. L'algorithme d'optimisation](#10-lalgorithme-doptimisation)
- [11. Règles de clean code](#11-règles-de-clean-code)
- [12. Accessibilité (RGAA/WCAG)](#12-accessibilité-rgaawcag)
- [13. Tests](#13-tests)
- [14. Décisions & écarts notables](#14-décisions--écarts-notables)

---

## 1. Vue d'ensemble

L'application permet de :

1. Choisir un type de conteneur (20', 40', 40' HC, 45' HC ou dimensions personnalisées).
2. Ajouter des palettes (types prédéfinis ou sur mesure, dimensions/poids/quantité modifiables).
3. Lancer un algorithme d'optimisation de placement (bin packing 3D).
4. Visualiser le résultat en 3D (conteneur en fil de fer + palettes colorées).
5. Sauvegarder / recharger des projets de chargement.

---

## 2. Stack technique

| Couche          | Technologies                                                             |
| --------------- | ------------------------------------------------------------------------ |
| **Frontend**    | Vite + React 19 + TypeScript (strict), react-three-fiber / drei (Three.js), axios, react-router, zod |
| **Backend**     | Python 3.11 + FastAPI (pattern MVC, scaffold `fastapi-mvc`), SQLAlchemy 2.0, Pydantic v1 |
| **Algorithme**  | Heuristique *Extreme Point*, en Python pur (aucune dépendance FastAPI/DB) |
| **Base**        | PostgreSQL 16                                                            |
| **Orchestration** | Docker Compose (3 services : `frontend`, `backend`, `db`)              |
| **Tests**       | Pytest (backend, algo), Vitest disponible (front)                        |

---

## 3. Architecture générale

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────┐
│  Frontend (Vite)    │ ───────────────────────▶ │   API (FastAPI)      │
│  React + r3f        │ ◀─────────────────────── │   MVC + packing      │
│  Port 5173          │      VITE_API_URL        │   Port 8000          │
└─────────────────────┘                          └──────────┬───────────┘
                                                             │ SQLAlchemy
                                                             ▼
                                                  ┌──────────────────────┐
                                                  │   PostgreSQL 16      │
                                                  │   Port 5432          │
                                                  └──────────────────────┘
```

Le front appelle l'API via la variable d'environnement `VITE_API_URL` (base `/api`).
Le backend expose une API REST, applique la logique métier dans des *services*, isole
l'accès DB dans des *repositories*, et délègue le calcul à un module `packing/`
totalement indépendant du web et de la base.

---

## 4. Démarrage rapide

### Prérequis

- Docker + Docker Compose

### Lancer toute la stack

```bash
docker compose up --build
```

| Service   | URL                              | Description                          |
| --------- | -------------------------------- | ------------------------------------ |
| Frontend  | http://localhost:5173            | Interface web                        |
| API       | http://localhost:8000            | API + Swagger UI (racine `/`)        |
| Health    | http://localhost:8000/api/health | Santé API + connexion PostgreSQL     |
| DB        | localhost:5432                   | PostgreSQL (`app_user` / `app_password`) |

Au démarrage, le backend crée automatiquement les tables et **seed** les référentiels
(types de conteneurs et de palettes).

### Commandes utiles

```bash
docker compose up -d            # démarrage en arrière-plan
docker compose logs -f backend  # logs backend
docker compose down             # arrêt
docker compose down -v          # arrêt + suppression du volume DB

# Tests de l'algorithme (dans le conteneur backend)
docker compose exec backend python -m pytest tests/packing -q

# Lint / typecheck / build front (dans le conteneur frontend)
docker compose exec frontend npm run lint
docker compose exec frontend npx tsc -b --noEmit
docker compose exec frontend npm run build
```

### Variables d'environnement

| Variable         | Service  | Valeur par défaut                                             |
| ---------------- | -------- | ------------------------------------------------------------ |
| `VITE_API_URL`   | frontend | `http://localhost:8000`                                      |
| `DATABASE_URL`   | backend  | `postgresql://app_user:app_password@db:5432/container_app`   |
| `FASTAPI_USE_REDIS` | backend | `false`                                                    |
| `CORS_ORIGINS`   | backend  | `http://localhost:5173`, `http://127.0.0.1:5173`             |

---

## 5. Structure du dépôt

```
Projet Container/
├── docker-compose.yml          # orchestration frontend + backend + db
├── README.md
├── CONTEXT.md                  # spécification d'origine du projet
├── api-container/              # Backend FastAPI (voir §6)
└── front-container/            # Frontend Vite/React (voir §7)
```

Le `docker-compose.yml` définit :

- **frontend** : build de `./front-container`, port 5173, monté en volume (hot reload).
- **backend** : build de `./api-container` via `Dockerfile.dev`, port 8000, reload uvicorn.
- **db** : `postgres:16`, port 5432, volume persistant `db_data`, `healthcheck` +
  `depends_on: service_healthy` pour éviter la course au démarrage.

---

## 6. Backend — `api-container`

Généré via `fastapi-mvc`, puis étendu selon un **MVC strict**. Le code applicatif vit
dans le package `api_container/`.

```
api-container/
├── Dockerfile                  # image de production (distroless, généré fastapi-mvc)
├── Dockerfile.dev              # image de développement (hot reload, utilisée par compose)
├── pyproject.toml              # dépendances (Poetry) : fastapi, sqlalchemy, psycopg2, ...
├── api_container/
│   ├── app/
│   │   ├── asgi.py             # fabrique FastAPI : CORS, routes, handlers, startup (create_tables + seed)
│   │   ├── router.py           # APIRouter racine (prefix /api), inclut tous les controllers
│   │   │
│   │   ├── controllers/        # VUES = routes. Validation + appel service + réponse. Aucune logique métier.
│   │   │   ├── container_types_controller.py   # GET /container-types
│   │   │   ├── palette_types_controller.py     # GET /palette-types
│   │   │   ├── projects_controller.py          # CRUD projets + /optimize + /result
│   │   │   ├── health_controller.py            # GET /health (+ ping DB)
│   │   │   └── ready.py                         # GET /ready (scaffold)
│   │   │
│   │   ├── services/           # LOGIQUE MÉTIER + orchestration. Jamais de SQL direct ni de code HTTP.
│   │   │   ├── project_service.py       # CRUD projet, mapping ORM → schémas
│   │   │   ├── optimization_service.py  # construit les entités, appelle le packer, persiste le résultat
│   │   │   ├── reference_service.py     # lecture des référentiels
│   │   │   ├── seed_service.py          # peuplement des référentiels au démarrage
│   │   │   └── health_service.py        # vérification connectivité DB
│   │   │
│   │   ├── repositories/       # ACCÈS DB isolé (requêtes SQLAlchemy). Aucune règle métier.
│   │   │   ├── project_repository.py
│   │   │   └── reference_repository.py
│   │   │
│   │   ├── models/             # ENTITÉS SQLAlchemy (persistance)
│   │   │   ├── container_type.py
│   │   │   ├── palette_type.py
│   │   │   ├── project.py
│   │   │   ├── palette_instance.py
│   │   │   └── placement_result.py
│   │   │
│   │   ├── schemas/            # CONTRATS Pydantic (requêtes/réponses). Aucune logique.
│   │   │   ├── container_schema.py
│   │   │   ├── palette_schema.py
│   │   │   ├── project_schema.py
│   │   │   ├── placement_schema.py
│   │   │   └── health_schema.py
│   │   │
│   │   ├── packing/            # ALGORITHME PUR — aucune dépendance FastAPI/DB (testable seul)
│   │   │   ├── entities.py         # objets métier : Dimensions, Item, Bin, Placement, PackingResult
│   │   │   ├── extreme_points.py   # gestion des points d'ancrage (Extreme Points)
│   │   │   └── packer.py           # heuristique de placement
│   │   │
│   │   ├── exceptions/         # exceptions métier + handlers FastAPI
│   │   │   ├── domain.py           # DomainError, EntityNotFoundError, ValidationDomainError (+ handler)
│   │   │   └── http.py             # HTTPException custom (scaffold)
│   │   │
│   │   ├── views/              # modèles de réponse du scaffold (ready, error)
│   │   └── utils/              # utilitaires scaffold (redis)
│   │
│   ├── config/
│   │   ├── application.py      # settings (Pydantic) : DEBUG, DATABASE_URL, CORS_ORIGINS, ...
│   │   ├── database.py         # engine + SessionLocal + Base + get_db + create_tables
│   │   ├── redis.py            # config redis (scaffold, désactivé)
│   │   └── gunicorn.py         # config gunicorn (prod)
│   │
│   └── cli/                    # commandes CLI (scaffold)
│
└── tests/
    └── packing/
        └── test_packer.py      # tests unitaires de l'algorithme (9 cas)
```

**Flux d'une requête `POST /projects/{id}/optimize`** :

1. `projects_controller.py` reçoit la requête, la valide via `schemas/placement_schema.py`.
2. Le controller appelle `services/optimization_service.py`.
3. Le service récupère le projet via `repositories/project_repository.py`, construit les
   objets métier (`packing/entities.py`), et appelle `packing/packer.py`.
4. Le service persiste le résultat (`PlacementResult`) et le formate selon le schéma.
5. Le controller renvoie la réponse HTTP — sans avoir manipulé la moindre règle métier.

---

## 7. Frontend — `front-container`

Vite + React + TypeScript (mode strict). Règle d'or : **aucune logique métier ni appel
réseau dans les composants** (`.tsx` = affichage). Toute la logique va dans `hooks/`,
tout appel réseau dans `api/`, tout typage dans `types/`, toute fonction pure dans `utils/`.

```
front-container/
├── Dockerfile                  # image dev (node:20-alpine, npm run dev --host)
├── vite.config.ts              # host + polling (hot reload en Docker)
├── package.json
└── src/
    ├── api/                    # UNIQUEMENT les appels HTTP (aucune logique)
    │   ├── client.ts               # instance axios (baseURL = VITE_API_URL + /api, intercepteur d'erreurs)
    │   ├── containerTypes.api.ts   # getContainerTypes()
    │   ├── paletteTypes.api.ts     # getPaletteTypes()
    │   └── projects.api.ts         # getProjects/getProject/create/update/delete/optimize/getResult
    │
    ├── types/                  # interfaces alignées sur les schémas API
    │   ├── container.types.ts
    │   ├── palette.types.ts
    │   ├── project.types.ts
    │   └── placement.types.ts
    │
    ├── hooks/                  # TOUTE la logique (état, orchestration API, calculs)
    │   ├── useContainerTypes.ts    # fetch + cache des conteneurs
    │   ├── usePaletteTypes.ts      # fetch + cache des palettes
    │   ├── useProjects.ts          # liste / suppression / refresh
    │   ├── useProjectEditor.ts     # état du projet édité (conteneur + palettes), save, load, requête d'optimisation
    │   ├── usePaletteForm.ts       # formulaire d'ajout de palette + validation zod
    │   └── useOptimization.ts      # appel optimize() + loading/erreur/résultat
    │
    ├── context/
    │   └── ProjectContext.tsx      # projet actif (coordination sidebar ↔ éditeur)
    │
    ├── components/             # composants PRÉSENTATIONNELS (props in, JSX out)
    │   ├── ui/                     # composants atomiques réutilisables (+ .types.ts chacun)
    │   │   ├── Button/  Input/  NumberInput/  Select/  Checkbox/
    │   │   ├── Table/  Badge/  Spinner/
    │   │   └── ui.css              # styles + tokens des composants UI (définis une seule fois)
    │   ├── Sidebar/
    │   │   ├── ProjectList.tsx
    │   │   ├── ContainerSelector.tsx
    │   │   └── PaletteForm.tsx
    │   ├── PaletteTable.tsx        # tableau éditable des palettes
    │   ├── ResultsPanel.tsx        # taux de remplissage + alerte saturation
    │   └── Scene3D/
    │       ├── Scene.tsx           # Canvas r3f, OrbitControls, vues prédéfinies
    │       ├── ContainerMesh.tsx   # conteneur en fil de fer
    │       └── PaletteMesh.tsx     # palette (boîte colorée + contour + tooltip)
    │
    ├── pages/
    │   └── EditorPage.tsx          # assemble les hooks et les composants (aucune règle métier)
    │
    ├── router/
    │   └── AppRouter.tsx
    │
    ├── utils/                  # fonctions pures
    │   ├── constants.ts            # dimensions par défaut, couleurs, conversions (pas de magic numbers)
    │   ├── formatVolume.ts         # formatVolume / formatPercent
    │   └── colorByPaletteType.ts   # couleur déterministe par groupe de palettes
    │
    ├── App.tsx                 # providers + router (aucune logique)
    ├── App.css                 # layout (dashboard de cartes)
    ├── index.css               # tokens globaux + base + accessibilité
    └── main.tsx
```

**Flux d'une optimisation côté front** :
`EditorPage` (bouton) → `useOptimization` (état) → `api/projects.api.ts` (HTTP) → API →
résultat renvoyé au hook → affiché par `Scene3D` (3D) et `ResultsPanel` (taux).

---

## 8. Modèle de données

| Entité              | Champs principaux                                                                 |
| ------------------- | --------------------------------------------------------------------------------- |
| **ContainerType**   | `id` (str), `name`, `length_cm`, `width_cm`, `height_cm`, `max_weight_kg`         |
| **PaletteType**     | `id` (str), `name`, `length_cm`, `width_cm`, `height_cm`, `default_load_height_cm`, `max_weight_kg` |
| **Project**         | `id` (UUID), `name`, `created_at`, `updated_at`, `container_type_id` (FK, nullable), `container_custom_dims` (JSON, nullable) |
| **PaletteInstance** | `id` (UUID), `project_id` (FK), `palette_type_id` (FK, nullable), `label`, `length_cm`, `width_cm`, `height_cm`, `weight_kg`, `quantity`, `stackable`, `rotatable` |
| **PlacementResult** | `id` (UUID), `project_id` (FK), `computed_at`, `fill_rate_volume`, `fill_rate_weight`, `unplaced_count`, `placements` (JSON) |

**Référentiels seedés au démarrage** :

- Conteneurs : 20' standard, 40' standard, 40' High Cube, 45' High Cube.
- Palettes : Europe (EPAL), Standard US, Australienne, Demi-palette.

---

## 9. API REST

Toutes les routes sont préfixées par `/api`. Documentation interactive (Swagger) sur
`http://localhost:8000/`.

| Méthode | Route                       | Description                                             |
| ------- | --------------------------- | ------------------------------------------------------- |
| GET     | `/container-types`          | Liste des types de conteneurs                           |
| GET     | `/palette-types`            | Liste des types de palettes                             |
| POST    | `/projects`                 | Créer un projet                                         |
| GET     | `/projects`                 | Liste des projets sauvegardés                           |
| GET     | `/projects/{id}`            | Détail d'un projet (conteneur + palettes + dernier résultat) |
| PUT     | `/projects/{id}`            | Mettre à jour un projet                                 |
| DELETE  | `/projects/{id}`            | Supprimer un projet                                     |
| POST    | `/projects/{id}/optimize`   | Lancer le calcul, retourner **et** sauvegarder le résultat |
| GET     | `/projects/{id}/result`     | Récupérer le dernier résultat calculé                   |
| GET     | `/health`                   | Santé API + connectivité PostgreSQL                     |

### Exemple — `POST /projects/{id}/optimize`

Requête :

```json
{
  "container": { "length_cm": 1203, "width_cm": 235, "height_cm": 239, "max_weight_kg": 26500 },
  "palettes": [
    { "instance_id": "p1", "length_cm": 120, "width_cm": 80, "height_cm": 100,
      "weight_kg": 400, "quantity": 10, "stackable": true, "rotatable": true }
  ]
}
```

Réponse :

```json
{
  "fill_rate_volume": 0.81,
  "fill_rate_weight": 0.63,
  "unplaced_count": 1,
  "placements": [
    { "palette_instance_id": "p1-0", "x": 0, "y": 0, "z": 0,
      "length": 120, "width": 80, "height": 100, "rotation": 0 }
  ]
}
```

Les erreurs métier sont renvoyées en JSON structuré (ex. `404` :
`{"error":{"code":404,"message":"Project '...' not found","status":"NOT_FOUND"}}`).

---

## 10. L'algorithme d'optimisation

### Le problème

Ranger des palettes dans un conteneur pour occuper au mieux l'espace est un problème de
**bin packing 3D**, connu pour être **NP-difficile** : le nombre de dispositions
possibles explose avec le nombre de palettes. Trouver l'optimum absolu devient
impossible en temps raisonnable au-delà d'une trentaine d'items.

### L'approche retenue : heuristique *Extreme Point*

Une **heuristique** construit une très bonne solution rapidement, sans garantir
l'optimum. Ici : **points extrêmes** (Extreme Point) + **tri par volume décroissant** +
**rotations**.

**Convention de coordonnées** (`packing/entities.py`) :

- `x` = longueur (profondeur), `y` = largeur, `z` = hauteur (gravité selon `-z`).
- Chaque position est le coin arrière-bas-gauche de la boîte.

### Fonctionnement, étape par étape (`packing/packer.py`)

1. **Explosion des quantités** — une ligne « 10 palettes » devient 10 items individuels.
2. **Tri par volume décroissant** — départage par la plus grande dimension.
3. **Point d'ancrage initial** — un seul point, à l'origine `(0, 0, 0)`.
4. **Placement de chaque item** :
   - tester chaque **orientation** autorisée (jusqu'à 6 si `rotatable`, sinon 1) ;
   - tester chaque **point d'ancrage** disponible ;
   - vérifier les **contraintes** (voir ci-dessous) ;
   - retenir le placement de meilleur **score « deepest-bottom-left »** :
     minimiser `z`, puis `x`, puis `y` ;
   - si aucun placement valide → item marqué **non placé** ;
   - **mettre à jour les points d'ancrage** : ajouter jusqu'à 3 nouveaux points sur les
     faces libres de la boîte (droite, côté, dessus), retirer le point consommé et ceux
     désormais invalides (`packing/extreme_points.py`).
5. **Taux de remplissage** — calcul du remplissage volumique et pondéral.

### Contraintes gérées

| Contrainte           | Règle                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| Limites du conteneur | La boîte ne dépasse aucune paroi.                                             |
| Non-chevauchement    | Pas d'intersection avec une boîte déjà placée (test AABB avec ε).            |
| Poids maximal        | La somme des poids ≤ capacité du conteneur.                                  |
| Empilement           | Un item à `z > 0` n'est valide que si (a) l'item est `stackable`, (b) sa base est **entièrement supportée** par des faces supérieures à cette hauteur, (c) **tous** les porteurs sont `stackable`. Sinon : plancher uniquement. |
| Rotation             | Les items `rotatable` testent leurs orientations axiales (dé-doublonnées).    |

### Indicateurs de sortie (`PackingResult`)

- `fill_rate_volume` — part du volume occupée.
- `fill_rate_weight` — part de la capacité de poids utilisée.
- `unplaced_ids` / `unplaced_count` — items non chargés (conteneur saturé).
- `placements` — position, dimensions et rotation de chaque item placé.

### Pistes d'amélioration (V2)

Passer plusieurs fois avec des tris différents (longueur, largeur, poids) et garder le
meilleur, ou ajouter une phase de recuit simulé. Non nécessaire en V1.

---

## 11. Règles de clean code

### Frontend — séparation stricte

| Dossier       | Contient                                       | Ne contient jamais                         |
| ------------- | ---------------------------------------------- | ------------------------------------------ |
| `components/` | JSX + props typées, purement présentationnel   | fetch, logique de calcul                   |
| `pages/`      | Assemblage de composants via des hooks         | logique métier directe                     |
| `hooks/`      | État, effets, orchestration, appels à `api/`   | JSX                                        |
| `api/`        | Fonctions d'appel HTTP typées                  | état React, logique métier                 |
| `types/`      | Interfaces / types partagés                    | code exécutable                            |
| `utils/`      | Fonctions pures, sans effet de bord            | appels réseau, JSX                         |

- **Aucun `<button>`/`<input>`/`<select>` brut** hors de `components/ui/` : chaque
  élément de base est un composant atomique typé (avec son `.types.ts`).
- Tokens de style (couleurs, espacements, rayons, ombres) définis **une seule fois**
  (`index.css` + `ui.css`).
- TypeScript **strict**, pas de magic numbers (`utils/constants.ts`).

### Backend — MVC strict

| Couche          | Responsabilité                                | Ne contient jamais                         |
| --------------- | --------------------------------------------- | ------------------------------------------ |
| `controllers/`  | Validation d'entrée, appel service, réponse   | requêtes SQL, règles métier                |
| `services/`     | Logique métier, orchestration                 | SQL direct (→ repositories), code FastAPI  |
| `repositories/` | Requêtes SQLAlchemy                           | règles métier                              |
| `models/`       | Tables ORM                                     | logique                                    |
| `schemas/`      | Contrats Pydantic                             | logique                                    |
| `packing/`      | Algorithme pur                                | accès DB, code HTTP                        |

---

## 12. Accessibilité (RGAA/WCAG)

- Texte de base **16px**, contrôles ≥ 1rem, interligne confortable.
- Contrastes ≥ 4,5:1 pour le texte, ≥ 3:1 pour les bordures de champs.
- **Focus clavier visible** partout (`:focus-visible`, contour 3px).
- Cibles cliquables **44px** minimum, cases à cocher agrandies.
- Respect de `prefers-reduced-motion` (animations réduites).
- Libellés associés à chaque champ, alerte de saturation avec `role="alert"`.

---

## 13. Tests

- **Backend / algorithme** : `tests/packing/test_packer.py` — 9 cas couvrant placement
  simple, item trop grand, remplissage complet, limite de poids, rotation, empilement,
  support (non-flottement).

  ```bash
  docker compose exec backend python -m pytest tests/packing -q
  ```

- **Frontend** : Vitest + Testing Library disponibles ; `npm run lint`, `tsc -b` et
  `npm run build` doivent passer sans erreur.

---

## 14. Décisions & écarts notables

- **Dossiers `front-container` / `api-container`** retenus (arborescences de la spec),
  le `docker-compose.yml` pointe vers ces noms.
- **`Dockerfile.dev`** ajouté côté backend pour le workflow de développement (hot reload) ;
  le `Dockerfile` de production (distroless, généré par `fastapi-mvc`) est conservé.
- **`react-hook-form` retiré** : il déclenchait une violation des *Rules of Hooks* avec
  React 19 dans ce projet. Remplacé par un hook contrôlé (`usePaletteForm`) validé par
  **zod** — la validation reste hors des composants.
- **Règle d'empilement / mono-conteneur / sans authentification** : choix V1 (voir §10).

---

*Projet réalisé selon la spécification `CONTEXT.md`.*
