# L'API

Base : `http://localhost:8000/api`
Documentation interactive, à jour par construction : <http://localhost:8000/docs>

Toutes les longueurs sont en **centimètres**, tous les poids en
**kilogrammes**. Les identifiants de projet sont des UUID ; ceux des tailles de
référence sont des chaînes lisibles (`20ft-standard`, `europe-epal`).

---

## Les tailles de référence

### `GET /container-types`
### `GET /palette-types`

Les tailles disponibles, telles que le fichier de configuration les définit
(voir [`docs/configuration.md`](configuration.md)).

```json
[
  {
    "id": "20ft-standard",
    "name": "Conteneur 20 pieds standard",
    "length_cm": 589.0,
    "width_cm": 235.0,
    "height_cm": 239.0,
    "max_weight_kg": 28230.0
  }
]
```

Une palette porte deux hauteurs qu'il ne faut pas confondre :

| Champ | Sens |
| --- | --- |
| `height_cm` | la hauteur du **plancher** de la palette (14,4 cm) |
| `default_load_height_cm` | la hauteur de charge **habituelle** — un défaut de montage, pas une limite |

---

## Les projets

### `GET /projects`

La liste allégée, pour l'écran d'accueil : identifiant, nom, dates, et de quoi
afficher un aperçu.

### `POST /projects`

Crée un projet avec son lot et sa flotte.

```json
{
  "name": "Commande A2000123",
  "packages": [
    {
      "palette_type_id": null,
      "label": "A2000123",
      "length_cm": 120, "width_cm": 80, "height_cm": 93,
      "weight_kg": 897.6,
      "quantity": 6,
      "stackable": true,
      "rotatable": true
    }
  ],
  "containers": [
    {
      "container_type_id": "20ft-standard",
      "container_custom_dims": null,
      "pallet_type_id": "europe-epal"
    }
  ]
}
```

`container_custom_dims` ne vaut quelque chose que si `container_type_id` est
`null` — un conteneur aux cotes libres.

### `GET /projects/{id}`

Le projet complet : son lot, sa flotte, et son dernier plan calculé
(`last_result`, `null` si aucun calcul n'a eu lieu).

### `PUT /projects/{id}`

**Remplace** le lot et la flotte. Même corps que la création.

C'est un remplacement, pas une fusion : le front envoie l'état complet à
chaque enregistrement. L'assistant d'import s'en sert pour recalculer un
projet déjà créé au lieu d'en créer un second.

### `DELETE /projects/{id}`

Supprime le projet et tout ce qui s'y rattache. Réponse `204`, sans corps.

---

## Le calcul

### `POST /projects/{id}/optimize`

Répartit les colis dans les conteneurs et **enregistre** le plan.

```json
{
  "packages": [ { "instance_id": "…", "length_cm": 120, "…": "…" } ],
  "containers": [
    {
      "id": "uuid-du-conteneur-ou-null",
      "container": { "name": "20 pieds", "length_cm": 589, "…": "…" },
      "pallet": {
        "id": "europe-epal",
        "label": "Palette Europe (EPAL)",
        "length_cm": 120, "width_cm": 80,
        "base_height_cm": 14.4,
        "max_load_height_cm": 100,
        "max_weight_kg": 1500
      }
    }
  ],
  "auto_extend": true
}
```

| Champ | Rôle |
| --- | --- |
| `containers[].id` | l'identifiant du conteneur enregistré, ou `null` pour un conteneur que le client vient d'ajouter |
| `containers[].pallet` | `null` signifie **explicitement** « charges déjà montées » : elles entrent dans la cale telles quelles |
| `auto_extend` | ajoute des copies du dernier conteneur jusqu'à ce que le quai soit vide, et les enregistre sur le projet |

La réponse :

```json
{
  "fill_rate_volume": 0.61,
  "fill_rate_weight": 0.44,
  "unplaced_package_count": 0,
  "containers": [
    {
      "container_id": "…",
      "position": 1,
      "name": "20 pieds 1",
      "container": { "…": "…" },
      "pallet_type_id": "europe-epal",
      "pallet_label": "Palette Europe (EPAL)",
      "pallets": [
        {
          "id": "container-1-pallet-1",
          "label": "Palette Europe (EPAL) 1",
          "length": 120, "width": 80, "height": 107.4,
          "base_height": 14.4,
          "weight_kg": 897.6,
          "package_count": 1,
          "fill_rate_volume": 0.93,
          "packages": [ { "package_id": "…", "x": 0, "y": 0, "z": 0, "…": "…" } ]
        }
      ],
      "placements": [ { "palette_instance_id": "…", "x": 0, "y": 0, "z": 0, "…": "…" } ],
      "fill_rate_volume": 0.61,
      "used_weight": 16156.8
    }
  ]
}
```

Deux niveaux de placement, et c'est voulu :

- `placements` situe **les palettes dans la cale** ;
- `pallets[].packages` situe **les colis sur leur palette**.

Un conteneur de charges déjà montées a un tableau `pallets` vide : il n'y a
pas de palette à décrire, les placements sont ceux des charges elles-mêmes.

Les taux de remplissage de l'expédition sont **pondérés par le volume** de
chaque conteneur — la moyenne décrit l'expédition, pas une moyenne de
pourcentages.

Erreurs : `404` si le projet n'existe pas, `422` si aucun conteneur n'est
déclaré (un plan de chargement a besoin d'au moins un conteneur).

### `GET /projects/{id}/result`

Le dernier plan enregistré, sans recalculer. `404` si aucun calcul n'a eu lieu.

---

## Les recommandations de taille

### `GET /projects/{id}/size-advice`

| Paramètre | Défaut | Rôle |
| --- | --- | --- |
| `pallet_type_id` | absent | compare les conteneurs avec ce format |
| `palletize` | `true` | `false` dit **explicitement** « aucune palette » |

### `POST /size-advice`

La même chose pour un lot qui n'est pas encore un projet — l'assistant d'import
doit conseiller une taille avant que le projet existe.

```json
{ "packages": [ { "instance_id": "l1", "…": "…" } ],
  "pallet_type_id": "europe-epal",
  "palletize": true }
```

La réponse, dans les deux cas :

```json
{
  "containers": [
    {
      "container_type_id": "20ft-standard",
      "name": "Conteneur 20 pieds standard",
      "containers_needed": 4,
      "unplaced_package_count": 0,
      "fill_rate_volume": 0.61,
      "recommended": false
    }
  ],
  "pallets": [
    {
      "pallet_type_id": "europe-epal",
      "name": "Palette Europe (EPAL)",
      "pallets_needed": 72,
      "unplaced_package_count": 0,
      "recommended": true
    }
  ]
}
```

À lire attentivement :

- `containers_needed: 0` signifie **« cette taille ne peut rien embarquer »**,
  ce qui n'est pas la même chose que « une seule suffit ».
- `unplaced_package_count` est le nombre de colis qui resteraient à quai
  **quel que soit le nombre de conteneurs**. Une taille qui en laisse n'est
  jamais recommandée tant qu'une autre embarque tout.
- Il y a **toujours** un format de palette recommandé : tout voyage sur
  palette.
- `palletize: false` compare les conteneurs sur des charges déjà montées.
  Sans ce drapeau, un `pallet_type_id` absent voudrait dire « choisis pour
  moi » et le chiffre annoncé ne serait pas celui du plan.

---

## Santé

### `GET /health`

État de l'application et connectivité de la base.

### `GET /ready`

Sonde simple, sans accès à la base.

---

## Forme des erreurs

```json
{ "error": { "status": "Not Found", "code": 404, "detail": "Project '…' not found" } }
```

Le front ramène ce corps à un simple message dans `src/api/client.ts`, pour que
les hooks le remontent sans rien savoir du transport.
