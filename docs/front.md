# L'interface

Vite · React 19 · TypeScript strict · MUI surchargé · react-three-fiber

---

## Le parcours

```
  /                       la liste des projets
  /imports/new            l'assistant d'import, en trois temps
  /projects/:id/steps/1   le lot : les colis à expédier
  /projects/:id/steps/2   la flotte : les conteneurs et leurs palettes
  /projects/:id/steps/3   le plan : un conteneur à la fois, en 3D
```

`src/router/AppRouter.tsx` filtre les URL : il tient les adresses invalides
hors de l'éditeur, et l'étape 3 renvoie à l'étape 2 tant qu'aucun plan n'existe.

---

## Le principe qui gouverne l'ergonomie

> **Le plan suit la configuration.**

Chaque geste sur le lot ou sur la flotte — ajouter, modifier, dupliquer,
supprimer, importer un fichier — refait le plan **dans le même mouvement**. Il
n'y a pas de bouton « recalculer » : un bouton qui relance tout laisserait
croire qu'il faut le presser pour être à jour, et il défaisait les réglages
qu'on venait de faire à la main.

### Comment c'est tenu, et le piège qu'il a fallu désamorcer

Chaque geste de `useProjectEditor` **rend la liste obtenue** :

```ts
const containers = editor.updateContainer(clientId, { container_type_id: '40ft' })
await handleCalculate(true, { containers })   // ← la liste voulue, pas l'état
```

C'est nécessaire parce que dans un même gestionnaire d'événement, l'état React
vaut encore sa valeur précédente. Le défaut d'origine :

> le calcul partait bien de la nouvelle liste, mais **l'enregistrement** relisait
> l'état — donc l'ancienne — puis la réponse d'enregistrement rechargeait les
> brouillons par-dessus. La modification était calculée, puis effacée sous les
> yeux de l'utilisateur.

D'où `EditorOverrides` : `save()` et `buildOptimizeRequest()` acceptent tous
deux `{ packages?, containers? }`. Un seul chemin sert les deux, ce qui empêche
l'oubli d'un côté seulement. `useProjectEditor.test.ts` fige la règle.

**Conséquence à connaître :** l'enregistrement régénère les identifiants de
brouillon. Un geste sur la liste rend donc toujours le formulaire à l'ajout,
faute de quoi une modification en cours pointerait sur une ligne disparue.

---

## L'état

Aucune bibliothèque de gestion d'état : des hooks, un par responsabilité.

| Hook | Rôle |
| --- | --- |
| `useProjectEditor` | le projet en cours : lot, flotte, enregistrement, requête de calcul |
| `useOptimization` | le calcul et son état ; `didExtend` dit s'il faut recharger le projet |
| `useSizeAdvice` | les recommandations ; l'état retient à quoi elles appartiennent et n'expose rien de périmé |
| `usePaletteForm` | le formulaire du rail, qui sert **à la fois** à ajouter et à modifier |
| `useProjects`, `useContainerTypes`, `usePaletteTypes` | les listes, chargées une fois |

`usePaletteForm` sert les deux usages à dessein : ce sont les mêmes champs et la
même validation, deux formulaires auraient fini par diverger. `editingId` dit
lequel des deux est en cours.

---

## Le thème

**Un seul point de réglage** : `src/theme/tokens.ts`, bloc `brand`.

```ts
export const brand = {
  primary: '#0e5a6b',    // l'action : boutons, liens, focus
  accent:  '#c86a08',    // l'avancement : jalons, jauges, marque
  fontText: "'Archivo', …",
  radiusScale: 1,        // 0.6 anguleux · 1 équilibré · 1.6 doux
}
```

Tout en découle : la palette, le thème MUI, les variables CSS.

### Les couleurs sont calculées, pas écrites

`src/theme/palette.ts` dérive chaque rôle de la teinte de marque, avec
`darkenUntil` / `lightenUntil` qui **assombrissent jusqu'à atteindre un
contraste mesuré**. Les seuils viennent du WCAG 2.1 : 4,5:1 pour du texte,
3:1 pour un élément non textuel.

Le point important : chaque encre est mesurée contre la surface **la plus
sombre** sur laquelle elle peut tomber. Un contraste calculé sur le fond le
plus clair passe le contrôle en laissant le cas réel illisible — c'est
exactement ce qui était arrivé à trois encres du thème clair, mesuré à 3,95:1
au lieu de 4,5. `palette.test.ts` mesure les deux thèmes, rôle par rôle.

En JavaScript et non en CSS (`color-mix()`) : le rendu est alors identique
partout, sans dépendre du support du navigateur.

### Le chemin des tokens

```
tokens.ts  ─►  palette.ts  ─►  createAppTheme.ts   (thème MUI)
                          └─►  cssVariables.ts     (--color-*, --space-*, …)
                                      │
                                      ▼
                            App.css, ui.css, base.css
```

Une valeur n'est **jamais** écrite deux fois. `--control-row` en est
l'illustration : la hauteur d'une rangée de contrôles vaut `layout.tap`, la
même valeur que le `minHeight` que le thème donne aux boutons. Deux constantes
voisines mais distinctes (42 et 44) produisaient un décalage de deux pixels,
invisible au raisonnement et visible à l'œil.

### MUI surchargé

MUI fournit le comportement et l'accessibilité ; l'apparence vient
entièrement du thème. Deux partis pris :

- le *ripple* est désactivé — il appartient au langage Material, pas au nôtre ;
- les libellés de champ sont **statiques** au-dessus du champ, non flottants.

`StyledEngineProvider injectFirst` place les styles de MUI avant les nôtres,
pour que le CSS des pages puisse ajuster sans lutter.

> **Un essai retiré.** Les coins ont été un temps des *squircles*
> (superellipses découpées en `clip-path`). La silhouette obligeait à porter le
> fond et la bordure sur deux pseudo-éléments sous le contenu, et l'ombre à
> passer en `drop-shadow` : beaucoup de machinerie pour un rendu qui ne valait
> pas la peine. `theme/surface.ts` en garde la trace.

---

## Les traductions

`src/i18n/` — quatre langues : **fr · en · es · de**.

`fr.ts` fait référence, et `export type Messages = typeof fr` **type** les trois
autres : une clé oubliée devient une erreur de compilation. Ce que le type ne
garantit pas, `translate.test.ts` le vérifie :

- aucune clé en trop dans une langue ;
- les mêmes marqueurs `{nom}` partout où le français en a ;
- les deux formes de chaque clé au pluriel.

Ce dernier contrôle a mis au jour une famille de fautes : sept clés appelées
avec un compte n'avaient pas de forme singulière et affichaient « 1 conteneurs
chargés ». Deux autres nommaient leur compte `pallets` au lieu de `count`, ce
qui empêchait le mécanisme d'agir.

**Le pluriel** se limite à singulier/pluriel : les quatre langues gérées ne
distinguent que cela, avec 0 au singulier en français comme en anglais.

**Les nombres** passent par `Intl.NumberFormat` sur la locale choisie —
« 25 672 kg », « 897,6 kg ». Un point décimal dans une interface française est
un tic anglophone.

---

## La 3D

`src/components/Scene3D/` — react-three-fiber, dans un « hublot » sombre : les
seules zones sombres du thème clair.

| Composant | Rôle |
| --- | --- |
| `Scene` | la cale et son chargement, avec la barre de commandes |
| `PalletizationScene` | les palettes montées, écartées les unes des autres |
| `PaletteMesh` | une palette de bois — planches, dés, semelles, et des flèches qui montrent l'entrée des fourches |
| `PalletVolumeMesh` | l'enveloppe transparente d'une palette chargée |
| `PackageMesh` | un colis, dévoilé dans la palette qu'on inspecte |

**Une seule position pour toute l'étape 3.** Le conteneur inspecté en 3D et
celui affiché dans le plan sont le même, changé par les deux flèches du
`MobileStepper`. Un rail que l'on faisait défiler à la main **en plus** des
flèches donnait deux commandes pour un seul état, dont une seule entraînait le
reste de la page — désynchronisation garantie par construction.

**Par défaut** : toutes les palettes, en vue conteneur. C'est la question qu'on
se pose en ouvrant le plan ; isoler une palette ou l'éclater vient après.

---

## Deux choix d'implémentation qui méritent une explication

### La liste des colis est une grille, pas un `<table>`

Une ligne doit être **une** boîte, avec son fond, son trait, ses coins et son
ombre. Assemblée de cellules, l'ombre de chacune se peint **par-dessus** le
fond de sa voisine — les cellules se peignent dans l'ordre du document — et
trace un trait vertical à chaque frontière de colonne. Aucun réglage d'ombre ne
rattrape ça : c'est la structure qu'il faut changer.

Les rôles ARIA (`table`, `rowgroup`, `row`, `columnheader`, `cell`) rendent la
sémantique que les balises portaient. `PaletteTable.test.tsx` le vérifie.

Bénéfice secondaire : les largeurs deviennent contrôlables. Chaque colonne est
un `minmax(plancher, part)` — elle ne descend jamais sous sa largeur utile et
partage le reste en proportion.

### La barre de navigation est `sticky`, pas `fixed`

Les deux flèches sont le geste le plus fréquent d'une étape : elles restent au
bas de l'écran. Mais `fixed` les sortirait du flux et elles recouvriraient la
fin du contenu. En `sticky`, la barre garde sa place, donc rien ne passe
jamais dessous.

Elle n'a pas de fond : ce sont les boutons qui portent une ombre ample et un
fond plein. Un piège au passage — un bandeau transparent en position collante
bloque quand même le clic sur toute la largeur ; il ne capte donc pas le
pointeur, et ses boutons le récupèrent.

---

## Accessibilité

Ce qui est tenu, et vérifiable :

- **contraste** mesuré et testé sur les deux thèmes, seuils WCAG 2.1 ;
- **focus visible** sur tout ce qui se navigue au clavier ;
- `prefers-reduced-motion` respecté — les défilements deviennent des sauts ;
- chaque geste en icône porte un `aria-label` explicite (« Modifier le colis
  A2000123 »), pas seulement une infobulle ;
- les jauges sont des `progressbar` avec leurs valeurs ;
- la langue du document suit la langue choisie, pour la prononciation des
  lecteurs d'écran et la coupure des mots.
