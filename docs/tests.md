# Les tests

**168 tests** : 76 côté API, 92 côté interface. Ils tournent en quelques
secondes et ne demandent aucune infrastructure — ni PostgreSQL, ni navigateur.

```bash
# API
docker compose exec backend python -m pytest tests/packing tests/services -q

# Interface
docker compose exec frontend npm run test
docker compose exec frontend npm run test:watch   # en continu
```

---

## Ce qui est couvert

### API — 76 tests

| Fichier | Tests | Ce qu'il tient |
| --- | --- | --- |
| `tests/packing/test_packer.py` | 9 | remplir une caisse : bornes, chevauchement, support, poids |
| `tests/packing/test_palletization.py` | 5 | monter des palettes en série, et la palette montée haut |
| `tests/packing/test_multi_container.py` | 20 | la répartition, ses invariants, ses refus |
| `tests/services/test_seed_service.py` | 18 | le fichier de configuration : lecture, validation, écriture |
| `tests/services/test_size_advice_service.py` | 11 | les recommandations et leur base de comparaison |
| `tests/services/test_optimization_service.py` | 13 | l'extension automatique, la persistance, le plan rendu |

### Interface — 92 tests

| Fichier | Tests | Ce qu'il tient |
| --- | --- | --- |
| `utils/cesiImport.test.ts` | 16 | la lecture d'un fichier de commande, et ses refus |
| `i18n/translate.test.ts` | 17 | pluriels, marqueurs, cohérence des quatre langues |
| `theme/palette.test.ts` | 24 | les contrastes WCAG, mesurés sur les deux thèmes |
| `hooks/useProjectEditor.test.ts` | 23 | les gestes rendent leur liste ; calcul et enregistrement la reprennent |
| `components/PaletteTable.test.tsx` | 12 | la liste des colis : sémantique, contraintes, totaux, formats |

---

## Le fond de session, côté API

Les services ont besoin d'une base. Plutôt que de dépendre du PostgreSQL de la
pile, `tests/services/conftest.py` monte une **SQLite en mémoire** : les
modèles n'emploient que des types portables (`Uuid` et `JSON` de SQLAlchemy),
donc le schéma se crée tel quel.

Deux fixtures :

- **`db`** — une session sur une base neuve, refermée après le test ;
- **`references`** — les tailles habituelles, volontairement réduites à ce qui
  sert : deux conteneurs très différents, et deux palettes dont une trop petite
  pour un colis de 120 × 80. C'est ce dernier cas qui a révélé le plus de
  défauts.

Chaque test part d'une base vide : aucun ordre d'exécution à respecter.

---

## Les invariants que les tests figent

Ce ne sont pas des tests de couverture, mais des règles qu'on a d'abord vues
enfreintes. Chacune porte, dans son nom, ce qu'elle empêche de revenir.

### Le chargement

| Invariant | Test |
| --- | --- |
| Ajouter un conteneur ne rebat pas les cartes des précédents | `test_ajouter_un_conteneur_ne_change_pas_le_chargement_des_precedents` |
| Un colis ne part jamais deux fois | `test_aucun_colis_n_est_charge_deux_fois` |
| Un colis plus haut que la hauteur de charge part quand même | `test_un_colis_plus_haut_que_la_hauteur_de_charge_part_quand_meme` |
| Un colis plus large que la palette reste à quai | `test_un_colis_plus_large_que_la_palette_reste_a_quai` |
| Une palette montée ne se couche pas | `test_une_palette_montee_ne_se_couche_pas` |
| Aucun colis ne dépasse de sa palette | `test_aucun_colis_ne_depasse_de_sa_palette` |
| Une palette de charges non gerbables ne se gerbe pas | `test_une_palette_de_charges_non_gerbables_ne_se_gerbe_pas` |
| La hauteur relevée ne sert qu'à une charge | `test_la_palette_montee_haut_ne_porte_qu_une_charge` |
| Un colis hors gabarit ne fait pas boucler l'extension | `test_un_colis_hors_gabarit_ne_fait_pas_boucler_l_extension` |

Deux tests reproduisent le cas rencontré en production — des colis de 120 × 80
face à une palette de 116,5 × 116,5 — parce qu'il a produit à lui seul trois
défauts distincts.

### Les recommandations

| Invariant | Test |
| --- | --- |
| Un format de palette est toujours recommandé | `test_un_format_de_palette_est_toujours_recommande` |
| Même quand aucun n'embarque tout | `test_un_format_est_recommande_meme_quand_aucun_n_embarque_tout` |
| Une taille qui laisse à quai n'est pas recommandée | `test_une_taille_qui_laisse_a_quai_n_est_pas_recommandee` |
| Le format choisi change le compte de conteneurs | `test_le_format_de_palette_choisi_change_le_compte_de_conteneurs` |

### La configuration

| Invariant | Test |
| --- | --- |
| Éditer le fichier atteint la base | `test_l_amorcage_met_a_jour_une_taille_deja_presente` |
| L'amorçage est rejouable sans effet | `test_l_amorcage_est_rejouable_sans_effet` |
| Une entrée fautive n'emporte pas les autres | `test_une_entree_fautive_est_ecartee_sans_emporter_les_autres` |
| Une taille retirée du fichier reste en base | `test_une_taille_retiree_du_fichier_reste_en_base` |

### L'interface

| Invariant | Test |
| --- | --- |
| Chaque geste rend la liste obtenue | `les gestes sur le lot`, `les gestes sur la flotte` |
| L'enregistrement part de la liste fournie, pas de l'état | `envoie la flotte fournie plutôt que celle de l'état` |
| Les quatre langues portent les mêmes clés et marqueurs | `les quatre dictionnaires` |
| Chaque clé au pluriel a ses deux formes | `déclare les deux formes de chaque clé au pluriel` |
| Chaque encre tient son seuil sur **toutes** les surfaces | `palette clair`, `palette sombre` |
| La liste des colis reste un tableau pour l'assistance | `reste un tableau pour les technologies d'assistance` |

---

## Trois tests qui ont trouvé quelque chose

Ils méritent d'être cités : ils n'ont pas confirmé le code, ils l'ont corrigé.

**`palette.test.ts`** a mesuré trois encres du thème clair à **3,95:1** au lieu
des 4,5:1 annoncés. Elles étaient dérivées contre la surface blanche, alors que
la surface la plus sombre est le pire cas. Une affirmation faite au fil du
projet s'est révélée fausse à la mesure.

**`translate.test.ts`** a trouvé une clé au pluriel **sans son singulier** :
avec exactement 1, l'utilisateur voyait la clé brute. L'audit qui a suivi en a
révélé sept autres affichant « 1 conteneurs chargés ».

**`test_un_colis_plus_haut_que_la_hauteur_de_charge_part_quand_meme`** a
d'abord échoué en affirmant l'inverse : la version précédente du test encodait
le comportement fautif — un colis trop haut restait à quai. C'est le test qu'il
a fallu corriger, pas le code.

---

## Ce qui n'est pas couvert

À dire franchement :

- **Les contrôleurs HTTP** ne sont pas testés de bout en bout. Les services
  qu'ils appellent le sont, mais le passage par FastAPI ne l'est pas.
- **La 3D** n'est pas testée. Un rendu WebGL demande un navigateur, et l'appareillage
  coûterait plus que ce qu'il rapporterait ici.
- **Le parcours complet** (importer, puis calculer, puis consulter le plan) n'a
  pas de test de bout en bout. Il a été vérifié à la main, mais rien ne
  l'empêche de régresser.
- **Les tests du gabarit** (`tests/unit`, `tests/integration`) échouent : ils
  éprouvent Redis et le CLI de `fastapi-mvc`, que cette application n'utilise
  pas. C'est pourquoi les commandes ci-dessus ciblent `tests/packing` et
  `tests/services`.
