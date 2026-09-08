# Configuration

---

## Les tailles de conteneurs et de palettes

**`api-container/reference-data.json`**

C'est le point d'entrée pour changer une taille : on édite le fichier, on
redémarre le service, la base suit.

```bash
docker compose restart backend
```

Le fichier est monté dans le conteneur Docker (`./api-container:/app`), donc
éditable depuis le poste, sans reconstruire l'image.

### Ce qu'on peut faire

| Geste | Comment | Effet |
| --- | --- | --- |
| **Ajouter** une taille | une entrée avec un `id` nouveau | insérée en base |
| **Modifier** une taille | changer ses valeurs, garder son `id` | la ligne existante est mise à jour |
| **Retirer** une taille | supprimer son entrée | ⚠️ la ligne **reste** en base |

Le point de vigilance est le troisième. Retirer une entrée du fichier n'efface
pas la ligne : des projets enregistrés s'y réfèrent, et la supprimer troue leur
historique. La taille cesse simplement d'être mise à jour. Pour la faire
disparaître de l'application, il faut repartir d'une base vierge :

```bash
docker compose down -v && docker compose up
```

### Les champs

```json
{
  "containers": [
    { "id": "20ft-standard", "name": "Conteneur 20 pieds standard",
      "length_cm": 589, "width_cm": 235, "height_cm": 239,
      "max_weight_kg": 28230 }
  ],
  "pallets": [
    { "id": "europe-epal", "name": "Palette Europe (EPAL)",
      "length_cm": 120, "width_cm": 80,
      "height_cm": 14.4,
      "default_load_height_cm": 100,
      "max_weight_kg": 1500 }
  ]
}
```

Longueurs en centimètres, poids en kilogrammes.

Les deux hauteurs d'une palette, qu'il ne faut pas confondre :

- **`height_cm`** — la hauteur de son **plancher** ;
- **`default_load_height_cm`** — la hauteur de charge **habituelle**. C'est une
  hauteur de montage, pas une limite : la cale du conteneur la relève quand un
  colis l'exige. Voir
  [`docs/domaine.md`](domaine.md#règle-3--rien-ne-dépasse-rien-ne-se-couche).

### Ce qui se passe quand le fichier est fautif

Trois garde-fous, tous éprouvés par `tests/services/test_seed_service.py` :

| Situation | Comportement |
| --- | --- |
| Une entrée invalide (cote nulle ou négative, `id` ou `name` manquant, valeur non numérique) | **ignorée**, signalée dans les journaux ; les autres passent |
| Le fichier est absent, illisible, ou n'est pas du JSON | retour aux tailles livrées, avec un avertissement |
| Une section ne laisse rien d'exploitable | retour aux tailles livrées pour **cette** section |

Le serveur démarre dans tous les cas. Une taille de référence fautive ne doit
pas empêcher l'application de tourner.

Les journaux disent ce qui s'est passé :

```
Reference container 'mauvais' ignored: 'length_cm' must be positive.
Reference seed complete from /app/reference-data.json (0 new, 1 updated).
```

---

## Variables d'environnement

### Backend

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | dans `docker-compose.yml` | connexion PostgreSQL |
| `CONTAINER_REFERENCE_FILE` | `/app/reference-data.json` | chemin du fichier de tailles |
| `FASTAPI_USE_REDIS` | `false` | Redis, non utilisé par cette application |

### Frontend

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000` | base des appels à l'API |

---

## Ports

| Service | Hôte | Conteneur |
| --- | --- | --- |
| Front | 5173 | 5173 |
| API | 8000 | 8000 |
| PostgreSQL | **5433** | 5432 |

Le décalage de la base vient de `docker-compose.override.yml` : le 5432 est
souvent déjà pris par un PostgreSQL local.

```yaml
services:
  db:
    ports: !override
      - "5433:5432"
```

La balise `!override` est **nécessaire**. Sans elle, Compose *fusionne* les
listes de ports et publie les deux, ce qui échoue si le 5432 est occupé.

---

## L'identité visuelle

**`front-container/src/theme/tokens.ts`**, bloc `brand` — un seul endroit.

```ts
export const brand = {
  primary: '#0e5a6b',   // l'action : boutons, liens, focus
  accent:  '#c86a08',   // l'avancement : jalons, jauges, marque
  fontText: "'Archivo', 'Segoe UI', system-ui, sans-serif",
  displayWidth: 112,    // largeur des titres, en % de l'axe wdth d'Archivo
  radiusScale: 1,       // 0.6 anguleux · 1 équilibré · 1.6 doux
}
```

Changer `primary` recalcule toute la famille — survol, voile, trait, encre
lisible — en garantissant les seuils de contraste. Détails dans
[`docs/front.md`](front.md#le-thème).

La police est chargée depuis Google Fonts dans `front-container/index.html` :
en changer demande donc de toucher aussi ce lien.

Le thème par défaut est le **clair** (`DEFAULT_COLOR_SCHEME` dans le même
fichier) ; la bascule est mémorisée par navigateur.

---

## La langue

`fr` par défaut, puis `en`, `es`, `de`. Le choix se fait dans la barre du haut
et se mémorise (`localStorage`, clé `container-calcul.locale`). À défaut de
choix mémorisé, la langue du navigateur s'applique, avec le français en
dernier recours.

Ajouter une langue : créer `src/i18n/xx.ts` typé `Messages`, l'ajouter à
`LOCALES` et à `LOCALE_LABELS` dans `I18nContext.ts`, puis au registre de
`I18nProvider.tsx`. Le compilateur signalera chaque clé manquante, et
`translate.test.ts` vérifiera les marqueurs et les pluriels.
