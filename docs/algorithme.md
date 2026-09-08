# L'algorithme

Le calcul vit dans `api_container/app/packing/` et ne connaît **ni HTTP ni base
de données**. C'est ce qui permet de l'éprouver au test unitaire sans monter
d'infrastructure — les 45 tests de `tests/packing/` tournent en deux secondes.

```
entities.py         les objets : Item, Bin, Placement, Dimensions
extreme_points.py   les points d'ancrage candidats
packer.py           remplir UNE caisse
palletization.py    monter des palettes en série
multi_container.py  répartir sur plusieurs conteneurs
```

Chaque étage n'utilise que celui du dessous.

---

## 1. Remplir une caisse — `packer.py`

Heuristique des **points extrêmes** (*extreme points*), déterministe.

```
1. trier les colis par volume décroissant
2. pour chaque colis :
     a. pour chaque point d'ancrage, pour chaque orientation permise :
          - la caisse contient-elle le colis à cet endroit ?
          - chevauche-t-il un colis déjà posé ?
          - repose-t-il sur le sol ou sur un colis empilable ?
          - le poids total reste-t-il sous la limite ?
     b. retenir la meilleure position (la plus basse, puis la plus proche
        de l'origine)
     c. la poser crée jusqu'à trois nouveaux points d'ancrage,
        sur ses faces libres
3. les colis qu'aucune position n'accueille sont rendus non placés
```

**Déterministe, et c'est voulu.** Le même lot donne le même plan. Un
préparateur qui relance le calcul ne doit pas voir son chargement se
réorganiser.

**Les orientations permises** sont réduites à deux : la position naturelle et
le quart de tour à plat. Voir
[`docs/domaine.md`](domaine.md#règle-3--rien-ne-dépasse-rien-ne-se-couche) —
un colis ne se couche pas.

**Le support.** Un colis ne flotte pas : il repose sur le sol ou sur la face
supérieure d'un colis déclaré empilable, avec un recouvrement suffisant. C'est
cette vérification qui rend le plan physiquement crédible.

---

## 2. Monter des palettes — `palletization.py`

Deux passes, et la seconde existe pour une raison précise.

### Passe 1 — la hauteur habituelle

On remplit une palette après l'autre avec le gabarit de référence
(120 × 80 × 100 pour une EPAL), en envoyant à la suivante ce que la précédente
n'a pas pris. La boucle s'arrête quand une palette ressort vide.

### Passe 2 — la palette montée haut

Reste-t-il des colis ? Si c'est **leur hauteur** qui les a exclus, chacun reçoit
une palette dédiée, montée à sa propre hauteur — dans la limite de ce que la
cale autorise (hauteur intérieure moins plancher de palette).

```
     passe 1                            passe 2
  ┌───────────┐  ┌───────────┐       ┌───────────┐
  │ ▨ ▨ ▨ ▨ ▨ │  │ ▨ ▨       │       │           │
  │ ▨ ▨ ▨ ▨ ▨ │  │ ▨ ▨       │       │     ▓     │  un colis de 115 cm,
  └───────────┘  └───────────┘       │     ▓     │  seul sur sa palette
     100 cm         100 cm           └───────────┘
                                        115 cm
```

**Une seule charge par palette montée haut.** La hauteur cède pour faire
partir cette charge-là, pas pour empiler plus haut que d'habitude.

**Ce qui reste après les deux passes** ne partira jamais dans ce format : son
emprise dépasse la palette, ou son poids la limite. Aucun conteneur
supplémentaire n'y changera rien, et c'est cette information que l'interface
remonte.

---

## 3. Répartir sur plusieurs conteneurs — `multi_container.py`

```
pour chaque conteneur, dans l'ordre :
    ┌─ il palettise le reliquat avec SON format
    ├─ chaque palette garnie devient un colis unique :
    │     emprise = celle de la palette
    │     hauteur  = plancher + charge RÉELLEMENT empilée
    │     poids    = somme des colis
    │     gerbable = seulement si tout ce qu'elle porte l'accepte
    ├─ il charge ces palettes-colis dans sa cale (packer.py)
    └─ les palettes qu'il n'a pas pu charger sont DÉFAITES :
       leurs colis retournent au lot commun
```

**Pourquoi défaire les palettes non chargées.** Le conteneur suivant a
peut-être un autre format de palette. Rendre les colis au lot lui permet de les
palettiser à sa façon — c'est ce qui autorise à mélanger les formats dans une
expédition.

**La hauteur réelle, pas la hauteur maximale.** Une palette à moitié garnie ne
doit pas occuper la place d'une palette pleine ; sa hauteur de colis est celle
de la charge effectivement empilée.

### L'extension automatique

Dans `optimization_service.py`, pas dans le calcul pur :

```
plan ← répartir(conteneurs déclarés)
tant qu'il reste des colis à quai ET moins de 40 conteneurs :
    ajouter une copie du DERNIER conteneur
    nouveau_plan ← répartir(conteneurs + la copie)
    si le reliquat n'a pas diminué :
        retirer la copie et s'arrêter        ← le garde-fou
    plan ← nouveau_plan
```

Les conteneurs ajoutés sont **enregistrés sur le projet**, sinon le plan
afficherait des conteneurs que le projet ignore.

Le garde-fou (« si le reliquat n'a pas diminué ») est ce qui empêche un colis
hors gabarit de faire boucler la répartition.

---

## 4. Recommander une taille — `size_advice_service.py`

Le service simule le lot entier pour **chaque** taille de référence et rend un
chiffre parlant : combien de conteneurs cette taille demanderait, combien de
palettes ce format monterait.

### Le critère

1. le moins de colis laissés à quai ;
2. à égalité, le moins de conteneurs — c'est ce qui pilote la facture de fret ;
3. à égalité encore, le meilleur taux de remplissage.

### La base de comparaison, et le piège qu'elle recèle

Les conteneurs sont comparés **avec le format de palette réellement retenu**.
C'est l'objet du drapeau `palletize`, et il vient d'un vrai défaut :

> `pallet_type_id` absent voulait dire deux choses — « choisis le meilleur pour
> moi » côté serveur, et « aucune palette » côté assistant d'import. Le serveur
> choisissait donc un format pour comparer, puis le calcul tournait sans
> palette. Le chiffre annoncé ne décrivait pas le plan obtenu.

Mesuré sur 80 colis de 115 × 75 × 115 :

| base de comparaison | 20 pieds | conteneur « optimisé » |
| --- | --- | --- |
| palettisé | 4 | 40 pieds High Cube |
| sans palette | 3 | 40 pieds standard |

Deux réponses différentes pour le même lot. Le drapeau rend l'intention
explicite, et les tests la figent.

### Ce qu'une recommandation ne fait jamais

Recommander une taille qui laisse des colis à quai **tant qu'une autre embarque
tout**. Une suggestion ne doit pas mener à un plan incomplet.

---

## Lecture d'un fichier de commande

`front-container/src/utils/cesiImport.ts`, côté navigateur — le fichier ne
transite pas par le serveur.

```
1. détecter le format : CSV (séparateur deviné : ; , ou tabulation) ou XLSX
2. exiger les colonnes CDEXENT, PALXENT, PALETTE_DETAIL_2/3/4
3. grouper les lignes par code de commande (CDEXENT)
4. dans chaque commande, regrouper les lignes par gabarit identique
5. répartir le nombre de palettes annoncé (PALXENT) entre les gabarits,
   au prorata de leurs occurrences, plus grand reste d'abord
6. compter et signaler ce qui a été écarté
```

Le lecteur de tableur (`exceljs`) est chargé **à la demande** : il pèse près
d'un mégaoctet, et le paquet initial est déjà lourd de 3D.

Les partis pris de validation — bornes, unités, libellé — sont dans
[`docs/domaine.md`](domaine.md#4-le-fichier-de-commande).
