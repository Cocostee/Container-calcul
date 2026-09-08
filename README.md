# Chargement de conteneurs — calcul et plan 3D

Application web qui répartit un lot de colis sur des palettes, puis les palettes
dans **plusieurs conteneurs**, et rend le plan de chargement en 3D.

Un projet est une **expédition**, pas un conteneur : le calcul répartit le lot
sur autant de conteneurs qu'il en faut, et n'en laisse aucun colis à quai.

```
                    ┌──────────────────────────────────────────┐
  fichier de        │  1. le lot        2. la flotte           │
  commande   ─────► │     les colis        les conteneurs      │
  (CSV / XLSX)      │     à expédier       et leurs palettes   │
                    │                                          │
                    │              3. le plan                  │
                    │        palettes montées, conteneurs       │
                    │        remplis, vue 3D par conteneur      │
                    └──────────────────────────────────────────┘
```

---

## Sommaire

| Document | Contenu |
| --- | --- |
| **Ce fichier** | démarrage, structure, commandes |
| [`docs/domaine.md`](docs/domaine.md) | le modèle métier et les règles qui le tiennent |
| [`docs/algorithme.md`](docs/algorithme.md) | palettisation, remplissage, extension, recommandations |
| [`docs/api.md`](docs/api.md) | les points d'entrée HTTP, un par un |
| [`docs/front.md`](docs/front.md) | architecture du front, thème, traductions |
| [`docs/configuration.md`](docs/configuration.md) | tailles de référence, variables, ports |
| [`docs/tests.md`](docs/tests.md) | ce qui est couvert et comment le lancer |

---

## Démarrage

Une seule dépendance : Docker.

```bash
docker compose up --build
```

| Service | Adresse |
| --- | --- |
| Front | <http://localhost:5173> |
| API | <http://localhost:8000> |
| Documentation interactive de l'API | <http://localhost:8000/docs> |
| PostgreSQL | `localhost:5433` |

Le port **5433** vient de `docker-compose.override.yml` : le 5432 est
fréquemment occupé par un PostgreSQL local. La balise `!override` y est
nécessaire — sans elle, Compose *fusionne* les listes de ports et publie les
deux.

Le code des deux services est monté dans les conteneurs : le rechargement à
chaud fonctionne, on n'a pas à reconstruire pour une modification.

---

## Commandes

```bash
# ---- Front -------------------------------------------------------------
docker compose exec frontend npm run test     # 92 tests (vitest)
docker compose exec frontend npm run build    # types + paquet de production
docker compose exec frontend npx eslint src   # style et règles React

# ---- Back --------------------------------------------------------------
docker compose exec backend python -m pytest tests/packing tests/services -q
docker compose exec backend python -m pytest -q   # tout, gabarit compris

# ---- Base --------------------------------------------------------------
docker compose exec db psql -U app_user -d container_app
docker compose down -v                        # repartir d'une base vierge
```

> `docker compose down -v` efface aussi le volume `node_modules` du front.
> Après cette commande : `docker compose exec frontend npm install`.

---

## Structure du dépôt

```
Container-calcul/
├── docker-compose.yml            trois services : front, api, base
├── docker-compose.override.yml   le port de la base, décalé
│
├── api-container/                l'API
│   ├── reference-data.json       ← les tailles de conteneurs et de palettes
│   ├── api_container/
│   │   ├── app/
│   │   │   ├── packing/          le calcul, métier pur (ni HTTP ni base)
│   │   │   ├── services/         orchestration : calculer, persister, conseiller
│   │   │   ├── controllers/      les points d'entrée HTTP
│   │   │   ├── schemas/          les contrats d'entrée et de sortie
│   │   │   ├── models/           les tables
│   │   │   └── repositories/     l'accès aux tables
│   │   └── config/               base de données, serveur
│   └── tests/
│       ├── packing/              le calcul, sans base
│       └── services/             les services, sur SQLite en mémoire
│
└── front-container/              l'interface
    └── src/
        ├── pages/                l'éditeur en trois étapes, l'assistant d'import
        ├── components/           les vues, dont Scene3D pour la 3D
        ├── hooks/                l'état : projet en cours, calcul, recommandations
        ├── theme/                tokens, palette dérivée, thème MUI
        ├── i18n/                 fr · en · es · de
        ├── utils/                lecture des fichiers de commande, formats
        └── types/                les contrats, alignés sur ceux de l'API
```

---

## Ce qu'il faut savoir avant de lire le code

Trois règles métier expliquent l'essentiel des choix. Elles sont détaillées
dans [`docs/domaine.md`](docs/domaine.md), et chacune est tenue par des tests.

1. **Tout voyage sur palette.** Une charge posée libre dans la cale n'est pas
   un cas qu'on manutentionne. Il y a donc toujours un format de palette à
   recommander, et un format qui ne convient pas sort du choix.
2. **Aucun colis ne reste à quai.** Si le lot déborde, le calcul ajoute des
   conteneurs — copies du dernier déclaré — jusqu'à ce que tout soit embarqué.
   Il s'arrête net dès qu'un conteneur de plus ne prendrait rien : un colis
   hors gabarit ne doit pas faire boucler la répartition.
3. **Rien ne dépasse de sa palette, et rien ne se couche.** L'emprise de la
   palette est une limite ferme ; sa hauteur de charge, une simple habitude de
   montage, que la cale relève quand un colis l'exige.

Côté interface, une quatrième règle gouverne l'ergonomie : **le plan suit la
configuration**. Chaque geste sur le lot ou sur la flotte refait le plan dans
le même mouvement — il n'y a pas de bouton « recalculer ».

---

## Conventions

**Langue des commentaires.** Le front est commenté en **français**, l'API en
**anglais**. Ce n'est pas un accident : les commentaires du front parlent d'une
interface rendue en français, tandis que les docstrings de l'API alimentent sa
documentation OpenAPI, lue par des consommateurs quelconques.

**Un commentaire dit pourquoi, pas quoi.** Le code dit ce qu'il fait ; un
commentaire n'existe que pour la raison qu'on ne peut pas lire dans le code —
une contrainte métier, un piège de navigateur, une décision et son motif.

**Pas de nombre magique.** Les cotes de référence sont dans
`reference-data.json`, les valeurs de l'interface dans `src/theme/tokens.ts`,
le reste dans `src/utils/constants.ts`.
