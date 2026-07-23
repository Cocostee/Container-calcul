# Spécification — Application de chargement de conteneurs (3D Bin Packing)

## 1. Vue d'ensemble

Application web permettant de :

1. Choisir un type de conteneur (20 pieds, 40 pieds, etc.)
2. Ajouter des palettes (types prédéfinis, dimensions modifiables)
3. Lancer un algorithme d'optimisation de placement (bin packing 3D)
4. Visualiser le résultat en 3D
5. Sauvegarder / recharger des projets de chargement

**Stack :**

- Front : Vite + React + TypeScript + react-three-fiber (Three.js)
- Back : Python + FastAPI (architecture MVC, généré via `fastapi-mvc`) + algorithme de bin packing 3D
- Base de données : PostgreSQL
- Orchestration : Docker Compose

**Exigence transversale — Clean Code :**
Voir section 10 pour les règles de code propre et de séparation des responsabilités à respecter côté front comme côté back (aucune logique dans les vues, découpage par responsabilité, nommage explicite).

---

## 2. Architecture générale

```
┌─────────────────────┐        HTTP/JSON        ┌──────────────────────┐
│   Front (Vite/React)│ ───────────────────────▶ │   API (FastAPI)      │
│   Port 5173 (dev)    │ ◀─────────────────────── │   Port 8000           │
└─────────────────────┘                          └──────────┬────────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │   PostgreSQL          │
                                                   │   Port 5432            │
                                                   └──────────────────────┘
```

Trois services Docker : `frontend`, `backend`, `db`, reliés par un `docker-compose.yml` avec un réseau interne. Le front appelle l'API via une variable d'env `VITE_API_URL`.

---

## 3. Modèle de données

### 3.1 ContainerType (type de conteneur, référentiel figé)

| Champ         | Type   | Exemple                       |
| ------------- | ------ | ----------------------------- |
| id            | string | `20ft-standard`               |
| name          | string | "Conteneur 20 pieds standard" |
| length_cm     | float  | 589                           |
| width_cm      | float  | 235                           |
| height_cm     | float  | 239                           |
| max_weight_kg | float  | 28230                         |

Types à précharger en base au démarrage (seed) :

- 20 pieds standard (Dry)
- 40 pieds standard (Dry)
- 40 pieds High Cube
- 45 pieds High Cube
- Possibilité d'ajouter un conteneur "personnalisé" (dimensions libres)

### 3.2 PaletteType (référentiel de palettes)

| Champ                  | Type   | Exemple                                |
| ---------------------- | ------ | -------------------------------------- |
| id                     | string | `europe-epal`                          |
| name                   | string | "Palette Europe (EPAL)"                |
| length_cm              | float  | 120                                    |
| width_cm               | float  | 80                                     |
| height_cm              | float  | 14.4 (palette seule)                   |
| default_load_height_cm | float  | 100 (hauteur de chargement par défaut) |
| max_weight_kg          | float  | 1500                                   |

Types à précharger :

- Palette Europe / EPAL (120×80)
- Palette Standard US (120×100)
- Palette Australienne (116.5×116.5)
- Demi-palette (80×60)
- Palette personnalisée (dimensions libres)

### 3.3 Project (un projet de chargement = sauvegarde)

| Champ                 | Type                                       |
| --------------------- | ------------------------------------------ |
| id                    | UUID                                       |
| name                  | string                                     |
| created_at            | datetime                                   |
| updated_at            | datetime                                   |
| container_type_id     | FK vers ContainerType                      |
| container_custom_dims | JSON (nullable, si conteneur personnalisé) |

### 3.4 PaletteInstance (une palette ajoutée dans un projet)

| Champ           | Type                                                                    |
| --------------- | ----------------------------------------------------------------------- |
| id              | UUID                                                                    |
| project_id      | FK                                                                      |
| palette_type_id | FK (nullable si dimensions custom)                                      |
| label           | string (ex: "Palette 1", éditable)                                      |
| length_cm       | float (modifiable même si issu d'un type)                               |
| width_cm        | float                                                                   |
| height_cm       | float                                                                   |
| weight_kg       | float                                                                   |
| quantity        | int (nombre de palettes identiques, pour éviter de dupliquer la saisie) |
| stackable       | bool (peut être empilée)                                                |
| rotatable       | bool (peut pivoter dans le calcul)                                      |

### 3.5 PlacementResult (résultat du calcul, lié à un projet)

| Champ            | Type                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| id               | UUID                                                                              |
| project_id       | FK                                                                                |
| computed_at      | datetime                                                                          |
| fill_rate_volume | float (% volume rempli)                                                           |
| fill_rate_weight | float (% poids utilisé)                                                           |
| unplaced_count   | int (palettes n'ayant pas pu être placées)                                        |
| placements       | JSON — liste de `{palette_instance_id, x, y, z, length, width, height, rotation}` |

---

## 4. Spécification Frontend

### 4.1 Structure générale de l'écran

```
┌───────────┬─────────────────────────────────────────────┐
│           │  Barre du haut : nom du projet / Enregistrer  │
│  SIDEBAR  ├─────────────────────────────────────────────┤
│           │                                                │
│  - Nouveau│           VUE 3D (react-three-fiber)          │
│    projet │                                                │
│  - Liste  │                                                │
│    projets│                                                │
│    sauvés │                                                │
│           ├─────────────────────────────────────────────┤
│           │  Panneau résultats : taux remplissage,         │
│           │  palettes non placées, bouton "Recalculer"     │
└───────────┴─────────────────────────────────────────────┘
```

### 4.2 Sidebar

- **Section "Projets"** : liste des projets sauvegardés (nom + date), clic → charge le projet en lecture/édition.
- **Bouton "Nouveau projet"** → réinitialise l'interface.
- **Section "Configuration du conteneur"** :
  - Menu déroulant `Type de conteneur` (20ft / 40ft / 40ft HC / 45ft HC / Personnalisé)
  - Si "Personnalisé" sélectionné → 3 champs numériques (longueur, largeur, hauteur) + poids max
- **Section "Ajouter une palette"** :
  - Menu déroulant `Type de palette` (Europe, US, Australienne, Demi-palette, Personnalisée)
  - Champs pré-remplis automatiquement selon le type choisi, mais **modifiables** :
    - Longueur (cm), Largeur (cm), Hauteur de chargement (cm), Poids (kg)
    - Quantité (nombre de palettes identiques)
    - Cases à cocher : "Empilable", "Rotation autorisée"
  - Bouton "Ajouter au projet"

### 4.3 Liste des palettes du projet

Sous la sidebar ou dans un panneau latéral droit rétractable : tableau éditable des palettes ajoutées (label, dimensions, poids, quantité), avec possibilité de :

- Modifier chaque ligne inline
- Dupliquer une ligne
- Supprimer une ligne

### 4.4 Bouton principal "Calculer le chargement"

Envoie la configuration complète (conteneur + palettes) à l'API `/optimize`, affiche un état de chargement, puis reçoit le `PlacementResult` et l'affiche en 3D.

### 4.5 Vue 3D

- Rendu du conteneur en fil de fer (wireframe) semi-transparent, aux dimensions exactes.
- Chaque palette rendue comme un cube coloré (couleur par type de palette, ou dégradé selon l'ordre de placement).
- Contrôles caméra : orbite, zoom, pan (via `OrbitControls` de `@react-three/drei`).
- Au survol/clic d'une palette dans la vue 3D → tooltip avec ses dimensions, poids, label.
- Bouton "Vue de dessus / Vue isométrique / Vue face" pour des angles prédéfinis.

### 4.6 Panneau résultats

- Taux de remplissage volumique (%) et pondéral (%) — barres de progression.
- Liste des palettes non placées (si le conteneur est saturé), avec alerte visuelle.
- Bouton "Recalculer" (si modification après un premier calcul).

### 4.7 Enregistrement / consultation

- Bouton "Enregistrer" → sauvegarde projet + résultat de placement en base via l'API.
- Depuis la sidebar, clic sur un projet existant → recharge configuration + dernière vue 3D calculée (sans recalcul automatique, avec option "Recalculer").

### 4.8 Arborescence des fichiers front (`front-container`, Vite + React + TS)

Règle stricte : **aucune logique métier ou logique d'appel API dans les composants/pages** (fichiers `.tsx` = affichage uniquement). Toute logique va dans `hooks/`, tout appel réseau dans `api/`, tout typage dans `types/`, toute fonction utilitaire pure dans `utils/`.

```
front-container/
├── public/
├── src/
│   ├── api/                        # UNIQUEMENT les appels HTTP (aucune logique)
│   │   ├── client.ts                # instance axios/fetch configurée (base URL, intercepteurs)
│   │   ├── containerTypes.api.ts    # getContainerTypes()
│   │   ├── paletteTypes.api.ts      # getPaletteTypes()
│   │   └── projects.api.ts          # getProjects(), getProject(id), createProject(), optimize()
│   │
│   ├── types/                       # Interfaces / types partagés, alignés sur les schémas API
│   │   ├── container.types.ts       # ContainerType, ContainerConfig
│   │   ├── palette.types.ts         # PaletteType, PaletteInstance
│   │   ├── project.types.ts         # Project
│   │   └── placement.types.ts       # PlacementResult, Placement
│   │
│   ├── hooks/                       # Toute la logique (état, orchestration API, calculs)
│   │   ├── useContainerTypes.ts     # fetch + cache des types de conteneurs
│   │   ├── usePaletteTypes.ts       # fetch + cache des types de palettes
│   │   ├── useProjects.ts           # liste, création, suppression de projets
│   │   ├── useProjectEditor.ts      # état du projet en cours d'édition (conteneur + palettes)
│   │   └── useOptimization.ts       # appel optimize() + gestion loading/erreur/résultat
│   │
│   ├── context/                     # Contextes React globaux (ex: projet actif, thème)
│   │   └── ProjectContext.tsx
│   │
│   ├── components/                  # Composants purement présentationnels (props in, JSX out)
│   │   ├── ui/                      # Composants atomiques réutilisables (button, input, select...)
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   ├── NumberInput/
│   │   │   ├── Select/
│   │   │   ├── Checkbox/
│   │   │   ├── Table/
│   │   │   ├── Badge/
│   │   │   └── Spinner/
│   │   ├── Sidebar/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ContainerSelector.tsx
│   │   │   └── PaletteForm.tsx
│   │   ├── PaletteTable.tsx
│   │   ├── ResultsPanel.tsx
│   │   └── Scene3D/
│   │       ├── Scene.tsx
│   │       ├── ContainerMesh.tsx
│   │       └── PaletteMesh.tsx
│   │
│   ├── pages/                       # Assemblage des composants via les hooks, pas de logique propre
│   │   └── EditorPage.tsx
│   │
│   ├── router/
│   │   └── AppRouter.tsx
│   │
│   ├── utils/                       # Fonctions pures (formatage, conversions, calculs simples)
│   │   ├── formatVolume.ts
│   │   └── colorByPaletteType.ts
│   │
│   ├── assets/
│   ├── App.tsx                      # branchement router + providers, pas de logique
│   ├── App.css
│   ├── main.tsx
│   └── index.css
│
├── index.html
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── eslint.config.js
├── vite.config.ts
└── Dockerfile
```

**Exemple de séparation attendue :**

- `PaletteForm.tsx` (component) : reçoit `values`, `onChange`, `onSubmit` en props, affiche le formulaire. Ne fait aucun `fetch`, ne connaît pas l'API.
- `useProjectEditor.ts` (hook) : détient l'état du formulaire, appelle `projects.api.ts` pour sauvegarder, expose `values`, `onChange`, `onSubmit` à la page.
- `EditorPage.tsx` (page) : appelle `useProjectEditor()`, passe les valeurs retournées aux composants. Aucune règle métier écrite ici.

---

## 5. Spécification API (FastAPI)

### 5.1 Endpoints

| Méthode | Route                     | Description                                                               |
| ------- | ------------------------- | ------------------------------------------------------------------------- |
| GET     | `/container-types`        | Liste des types de conteneurs prédéfinis                                  |
| GET     | `/palette-types`          | Liste des types de palettes prédéfinies                                   |
| POST    | `/projects`               | Créer un projet                                                           |
| GET     | `/projects`               | Liste des projets sauvegardés                                             |
| GET     | `/projects/{id}`          | Détail d'un projet (conteneur + palettes + dernier résultat)              |
| PUT     | `/projects/{id}`          | Mettre à jour un projet (config conteneur + palettes)                     |
| DELETE  | `/projects/{id}`          | Supprimer un projet                                                       |
| POST    | `/projects/{id}/optimize` | Lance le calcul de placement, retourne et sauvegarde le `PlacementResult` |
| GET     | `/projects/{id}/result`   | Récupère le dernier résultat calculé                                      |

### 5.2 Exemple de payload `POST /projects/{id}/optimize`

Requête (le body contient l'état courant, pas encore forcément sauvegardé) :

```json
{
  "container": {
    "length_cm": 1203,
    "width_cm": 235,
    "height_cm": 239,
    "max_weight_kg": 26500
  },
  "palettes": [
    {
      "instance_id": "p1",
      "length_cm": 120,
      "width_cm": 80,
      "height_cm": 100,
      "weight_kg": 400,
      "quantity": 10,
      "stackable": true,
      "rotatable": true
    }
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
    {
      "palette_instance_id": "p1-0",
      "x": 0,
      "y": 0,
      "z": 0,
      "length": 120,
      "width": 80,
      "height": 100,
      "rotation": 0
    }
  ]
}
```

### 5.3 Arborescence des fichiers backend (`api-container`, généré via `fastapi-mvc`, pattern MVC)

Règle stricte : **les controllers ne contiennent aucune logique métier** (ils valident l'entrée via un schéma, appellent un service, retournent la sortie). Toute la logique va dans `services/`, tout l'accès aux données dans `models/` (+ `repositories/` si besoin), tout le contrat d'API dans `schemas/`.

```
api-container/
├── .github/
├── api_container/
│   ├── app/
│   │   ├── controllers/            # Vue = routes FastAPI. Validation + appel service. Rien d'autre.
│   │   │   ├── container_types_controller.py
│   │   │   ├── palette_types_controller.py
│   │   │   └── projects_controller.py
│   │   │
│   │   ├── models/                 # Modèle = entités SQLAlchemy (persistance)
│   │   │   ├── container_type.py
│   │   │   ├── palette_type.py
│   │   │   ├── project.py
│   │   │   ├── palette_instance.py
│   │   │   └── placement_result.py
│   │   │
│   │   ├── schemas/                # Contrats Pydantic (requêtes/réponses), pas de logique
│   │   │   ├── container_schema.py
│   │   │   ├── palette_schema.py
│   │   │   ├── project_schema.py
│   │   │   └── placement_schema.py
│   │   │
│   │   ├── services/               # Logique métier (règles, orchestration, calculs)
│   │   │   ├── project_service.py       # CRUD projet, orchestration sauvegarde
│   │   │   ├── optimization_service.py  # appelle le packer, construit le PlacementResult
│   │   │   └── seed_service.py          # peuplement des référentiels au démarrage
│   │   │
│   │   ├── packing/                # Algorithme, isolé du reste (aucune dépendance FastAPI/DB)
│   │   │   ├── packer.py                # heuristique Extreme Point
│   │   │   ├── extreme_points.py        # gestion des points d'ancrage
│   │   │   └── entities.py              # objets métier purs (Item, Bin, Placement)
│   │   │
│   │   ├── repositories/           # Accès DB isolé des services (requêtes SQLAlchemy)
│   │   │   ├── project_repository.py
│   │   │   └── reference_repository.py
│   │   │
│   │   ├── middlewares/
│   │   ├── exceptions/             # exceptions métier custom + handlers FastAPI
│   │   └── container.py            # injection de dépendances (DI container)
│   │
│   ├── cli/                        # commandes (ex: seed manuel, migration)
│   ├── config/                     # settings, variables d'environnement
│   ├── __init__.py
│   ├── __main__.py
│   ├── version.py
│   └── wsgi.py
│
├── build/
├── charts/                         # Helm charts (déploiement k8s, optionnel)
├── docs/
├── manifests/                      # manifests k8s (optionnel)
├── tests/
│   ├── controllers/
│   ├── services/
│   └── packing/
├── .dockerignore
├── .fastapi-mvc.yml
├── .gitignore
├── CHANGELOG.md
├── Dockerfile
├── LICENSE
├── Makefile
├── pyproject.toml
├── README.md
└── Vagrantfile
```

**Flux d'une requête (exemple `POST /projects/{id}/optimize`) :**

1. `projects_controller.py` reçoit la requête, la valide via `schemas/project_schema.py`.
2. Le controller appelle `services/optimization_service.py`.
3. Le service récupère les données via `repositories/project_repository.py`, construit les objets métier (`packing/entities.py`), appelle `packing/packer.py`.
4. Le service sauvegarde le résultat via le repository, retourne un objet formaté selon `schemas/placement_schema.py`.
5. Le controller renvoie la réponse HTTP — il n'a manipulé aucune règle métier lui-même.

---

## 6. Spécification de l'algorithme

**Approche retenue : heuristique Extreme Point avec tri par volume décroissant + rotations.**

Raisons : le bin packing 3D est NP-difficile ; à l'échelle d'un conteneur (quelques dizaines à centaines de palettes), cette heuristique donne un très bon compromis qualité/temps de calcul (résultat en millisecondes à quelques secondes), contrairement à un solveur exact (MILP) qui devient injouable au-delà d'une trentaine d'items.

**Étapes :**

1. Explosion des `quantity` en items individuels.
2. Tri des items par volume décroissant (puis par plus grande dimension en cas d'égalité).
3. Initialisation d'une liste de points d'ancrage (`extreme points`) avec un seul point à l'origine `(0,0,0)`.
4. Pour chaque item :
   - Tester chaque orientation autorisée (si `rotatable=true`, jusqu'à 6 orientations ; sinon 1).
   - Tester chaque point d'ancrage disponible.
   - Vérifier les contraintes : ne dépasse pas les bords du conteneur, pas de chevauchement avec un item déjà placé, poids cumulé ≤ poids max, respect de la règle d'empilement (`stackable`).
   - Choisir le placement qui minimise l'espace perdu (heuristique de score, ex : hauteur du point le plus bas, puis profondeur, puis largeur — "deepest bottom left").
   - Si aucun placement valide n'est trouvé → item marqué "non placé".
   - Mettre à jour la liste des points d'ancrage (ajout de nouveaux points sur les faces libres de l'item placé, suppression des points désormais invalides).
5. Une fois tous les items traités, calcul des taux de remplissage volumique et pondéral.

**Amélioration possible (V2)** : passer plusieurs fois avec des tris différents (par longueur, par largeur, par poids) et garder le meilleur résultat, ou ajouter du recuit simulé par-dessus pour affiner. Non nécessaire en V1.

---

## 7. Docker

### 7.1 `docker-compose.yml`

```yaml
services:
  frontend:
    build: ./front
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    volumes:
      - ./front:/app
      - /app/node_modules

  backend:
    build: ./back
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://app_user:app_password@db:5432/container_app
    depends_on:
      - db
    volumes:
      - ./back:/app

  db:
    image: postgres:16
    environment:
      - POSTGRES_USER=app_user
      - POSTGRES_PASSWORD=app_password
      - POSTGRES_DB=container_app
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

### 7.2 `back/Dockerfile`

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### 7.3 `front/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

---

## 8. Roadmap de développement suggérée

1. **Socle technique** : docker-compose fonctionnel, FastAPI qui répond "hello world", front Vite qui affiche une page vide, connexion DB.
2. **Référentiels** : seed des types de conteneurs/palettes, endpoints GET associés, menus déroulants front.
3. **Gestion de projet** : CRUD projet + palettes (sans algo, sans 3D) — juste formulaires + tableau.
4. **Algorithme** : implémentation du packer, endpoint `/optimize`, test avec des données factices (retour console/JSON avant la 3D).
5. **Vue 3D** : affichage conteneur + palettes à partir du JSON de résultat.
6. **Sauvegarde / rechargement** : persister les résultats, recharger un projet existant.
7. **Finitions** : gestion des palettes non placées, alertes poids/volume, responsive, styles.

---

## 9. Clean Code — règles à respecter partout

### 9.1 Principes généraux

- Un fichier = une responsabilité. Si un fichier fait plus de ~150-200 lignes ou mélange plusieurs préoccupations, le découper.
- Nommage explicite et cohérent (anglais dans le code, ex: `getProjectById`, pas `getPjt`).
- Pas de "magic numbers" : les constantes (dimensions par défaut, seuils) vont dans des fichiers `constants.ts` / `constants.py` dédiés.
- Typage strict partout (TypeScript en mode strict côté front, type hints Python + Pydantic côté back).
- Gestion d'erreurs explicite (pas de `try/except` ou `try/catch` silencieux) : erreurs métier typées, remontées proprement jusqu'à l'utilisateur.

### 9.2 Front — séparation stricte

| Dossier       | Contient                                       | Ne contient JAMAIS                           |
| ------------- | ---------------------------------------------- | -------------------------------------------- |
| `components/` | JSX + props typées, purement présentationnel   | fetch, useEffect métier, logique de calcul   |
| `pages/`      | Assemblage de composants via des hooks         | logique métier directe                       |
| `hooks/`      | État, effets, orchestration, appels à `api/`   | JSX                                          |
| `api/`        | Fonctions d'appel HTTP typées (entrée/sortie)  | état React, logique métier                   |
| `types/`      | Interfaces/types partagés                      | code exécutable                              |
| `utils/`      | Fonctions pures, sans état, sans effet de bord | appels réseau, JSX                           |
| `context/`    | Partage d'état global React                    | logique métier complexe (déléguer à un hook) |

Un composant se teste en lui passant des props ; un hook se teste indépendamment du rendu ; une fonction `api/` se teste en mockant `fetch`.

### 9.2bis Composants UI atomiques obligatoires

Aucun élément d'interface brut (`<button>`, `<input>`, `<select>`, `<textarea>`, `<checkbox>`, badge, spinner, etc.) n'est écrit directement dans une page ou un composant métier. Chaque élément de base est isolé dans un composant UI réutilisable, typé, sans logique métier — uniquement des props (`value`, `onChange`, `disabled`, `variant`, etc.).

```
src/components/ui/
├── Button/
│   ├── Button.tsx
│   └── Button.types.ts
├── Input/
│   ├── Input.tsx
│   └── Input.types.ts
├── NumberInput/          # champs dimensions/poids (avec unité affichée)
│   └── NumberInput.tsx
├── Select/
│   └── Select.tsx
├── Checkbox/
│   └── Checkbox.tsx
├── Table/
│   └── Table.tsx
├── Badge/
│   └── Badge.tsx
└── Spinner/
    └── Spinner.tsx
```

Règles :

- Les composants métier (`components/Sidebar/PaletteForm.tsx`, etc.) **composent** ces éléments UI, ils ne redéfinissent jamais un `<button>` ou `<input>` en dur.
- Chaque composant UI a ses props définies dans un fichier `.types.ts` associé (pas de logique métier dedans, juste la forme des props).
- Le style (couleurs, espacements) suit les tokens définis une seule fois (variables CSS ou thème), jamais de valeurs codées en dur répétées dans chaque composant.
- Exemple : `PaletteForm.tsx` utilise `<NumberInput label="Longueur (cm)" value={...} onChange={...} />` et `<Button onClick={onSubmit}>Ajouter</Button>`, jamais `<input type="number" .../>` directement.

### 9.3 Back — pattern MVC strict (`fastapi-mvc`)

| Couche          | Responsabilité                                   | Ne contient JAMAIS                                                                 |
| --------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `controllers/`  | Validation d'entrée, appel service, réponse HTTP | requêtes SQL, règles métier, calculs                                               |
| `services/`     | Logique métier, orchestration                    | requêtes SQL directes (passer par `repositories/`), code FastAPI (`Request`, etc.) |
| `repositories/` | Requêtes SQLAlchemy, accès DB                    | règles métier                                                                      |
| `models/`       | Définition des tables (ORM)                      | logique                                                                            |
| `schemas/`      | Contrats Pydantic (validation/sérialisation)     | logique                                                                            |
| `packing/`      | Algorithme pur (aucune dépendance FastAPI/DB)    | accès DB, code HTTP                                                                |

L'algorithme (`packing/`) doit rester totalement indépendant du framework web et de la base de données, afin d'être testable isolément (tests unitaires sur des cas de bin packing sans lancer l'API ni une DB).

### 9.4 Tests

- Front : tests unitaires sur `hooks/` et `utils/` (Vitest), tests de rendu sur les composants critiques.
- Back : tests unitaires sur `packing/` (cas de placement connus), tests sur `services/` (mock des repositories), tests d'intégration légers sur les `controllers/` (client de test FastAPI).

---

## 10. Installation & dépendances front

Commandes à lancer dans `front-container/` (après `npm create vite@latest`) :

```bash
cd front-container

# 3D
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three

# Routing
npm install react-router-dom

# Appels HTTP
npm install axios

# Formulaires (validation propre des dimensions/poids, hors des composants)
npm install react-hook-form zod @hookform/resolvers

# Lint / clean code
npm install -D eslint-plugin-react-hooks eslint-plugin-jsx-a11y

# Tests (unitaires hooks/utils + rendu composants, cf. 9.4)
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

| Librairie                           | Rôle                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `three` + `@react-three/fiber`      | Moteur 3D et binding React                                                  |
| `@react-three/drei`                 | Helpers 3D prêts à l'emploi (`OrbitControls`, `Html` pour tooltips, `Text`) |
| `react-router-dom`                  | Navigation entre pages (`/projects`, `/projects/:id`)                       |
| `axios`                             | Client HTTP typé, intercepteurs, base URL via `VITE_API_URL`                |
| `react-hook-form` + `zod`           | Validation des formulaires dans les hooks, pas dans les composants          |
| `vitest` + `@testing-library/react` | Tests unitaires/rendu, natif avec Vite                                      |

Script à ajouter dans `package.json` :

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

---

## 11. Points à clarifier avec toi avant de coder

- Le calcul doit-il gérer l'empilement de palettes différentes les unes sur les autres (piles hétérogènes), ou uniquement le rangement côte à côte sur un seul niveau ?
- Faut-il gérer plusieurs conteneurs dans un même projet (répartir un lot de palettes sur plusieurs conteneurs) ou un conteneur = un projet ?
- Authentification utilisateur nécessaire (multi-utilisateurs) ou usage local/mono-utilisateur pour l'instant ?
