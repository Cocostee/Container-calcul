# Le modèle métier

Ce document explique ce que l'application manipule et **pourquoi** elle le
manipule ainsi. Les règles qui suivent ont toutes été apprises à l'usage :
chacune a d'abord été enfreinte, et le défaut qui en résultait est cité.

---

## 1. Les objets

```
Projet ─── une expédition
  │
  ├── PackageLine[]        le lot : ce qu'il y a à expédier
  │     colis identiques regroupés par ligne (cotes, poids, quantité)
  │
  ├── ProjectContainer[]   la flotte : où le lot peut aller
  │     un conteneur = une taille + un format de palette + un rang
  │
  └── PlacementResult      le plan calculé, un par calcul, le dernier fait foi
```

### Un projet est une expédition, pas un conteneur

C'est le changement structurant du projet. À l'origine, un projet portait un
conteneur unique ; importer un fichier de quatre commandes créait donc quatre
projets, ce qui n'a aucun sens pour un préparateur : il expédie **une**
commande, dans autant de conteneurs qu'il en faut.

Conséquences : le lot appartient au projet, pas au conteneur — c'est le calcul
qui le répartit. Et chaque conteneur porte **son** format de palette, ce qui
permet de mélanger les formats dans une même expédition.

### Le rang d'un conteneur compte

Le remplissage est séquentiel : le conteneur 1 se sert d'abord, le 2 reprend ce
qui reste. Ce n'est pas un détail d'implémentation mais une propriété qu'on
veut : **ajouter un conteneur à la fin ne rebat pas les cartes des
précédents**. Un plan qui changerait entièrement à chaque ajout serait
inexploitable — le préparateur a déjà commencé à charger.

---

## 2. Les trois règles du chargement

### Règle 1 — Tout voyage sur palette

Une charge posée libre dans la cale n'est pas un cas qu'on manutentionne.

**Ce que ça implique.** Il y a **toujours** un format de palette à
recommander, même quand aucun n'embarque la totalité du lot : on conseille
alors celui qui laisse le moins de colis à quai. Et un format qui ne peut pas
porter les colis **sort du choix** — le proposer pour annoncer ensuite que
tout reste à quai ne renseigne personne.

**Le défaut d'origine.** Quand aucun format n'embarquait tout, le service ne
recommandait rien ; l'absence de recommandation était interprétée plus loin
comme « alors on charge en vrac », et les conteneurs étaient comparés sur des
charges libres. L'application conseillait un plan impossible.

**Les garde-fous du sélecteur**, pour que la règle n'enferme personne :

- on ne bloque un format que **si un autre convient** ;
- le format **déjà retenu** reste toujours accessible, sinon un projet
  enregistré avec un format devenu inadapté afficherait un sélecteur vide ;
- un format écarté est **toujours accompagné de sa raison**, jamais grisé en
  silence.

### Règle 2 — Aucun colis ne reste à quai

Si le lot déborde, le calcul ajoute des conteneurs, copies du dernier déclaré,
jusqu'à ce que tout soit embarqué.

**Où il s'arrête.** Dès qu'un conteneur de plus ne prendrait rien. Sans cette
condition, un colis hors gabarit ferait boucler la répartition à l'infini ; un
plafond de 40 conteneurs sert de dernier filet.

**Ce qu'on en dit à l'utilisateur.** L'extension est annoncée : « un conteneur
a été ajouté de lui-même, copié du dernier déclaré ». Il est copié faute de
savoir de quel matériel on dispose — l'utilisateur peut donc changer sa taille,
et le plan s'y adapte.

**La tension avec la suppression.** Supprimer un conteneur nécessaire
déclenche l'extension, qui le remet. Plutôt que de laisser croire que la
suppression n'a rien fait, le plan l'explique : « conteneur rétabli :
l'expédition ne tient pas sans lui ».

### Règle 3 — Rien ne dépasse, rien ne se couche

Deux limites, de nature très différente :

| Limite | Nature | Peut-elle céder ? |
| --- | --- | --- |
| **L'emprise** de la palette (120 × 80) | physique | jamais |
| **La hauteur de charge** de référence (100 cm) | habitude de montage | oui, jusqu'à la cale |

**La hauteur cède.** `default_load_height_cm` porte son nom : c'est un défaut.
La vraie limite est la hauteur intérieure du conteneur, moins le plancher de la
palette. Un colis de 110 cm doit donc partir sur une palette montée plus haut,
et non rester à quai.

**Le défaut d'origine.** La hauteur de référence était traitée comme une
limite absolue : un colis de 110 cm n'était palettisable par **aucun** format,
et comme tout doit voyager sur palette, il restait à quai pour toujours — quel
que soit le nombre de conteneurs ajoutés.

**Mais la hauteur ne cède qu'une fois.** Une palette montée haut ne porte
qu'**une seule** charge : la hauteur se relève pour faire partir cette
charge-là, pas comme licence à empiler plus haut que d'habitude. Sans cette
précision, deux colis de 120 cm se retrouvaient empilés à 240 cm de charge.

**Rien ne se couche.** Une charge accepte le quart de tour à plat, jamais la
bascule sur le flanc. Coucher un carton gagnerait de la place, mais la face
porteuse change, l'étiquette se retrouve dessous, et le plan ne se manutentionne
pas.

**Le défaut d'origine.** Avec six orientations libres, le calcul mettait des
colis de 120 × 80 **debout** (120 cm de haut) pour les faire tenir sur une
palette de 116,5 × 116,5, puis les empilait par deux — 240 cm de charge. De la
place gagnée, un plan inexécutable, et ce plan-là gagnait la comparaison des
formats.

### Règle 3 bis — Le gerbage se transmet

Une palette ne se gerbe que si **tout** ce qu'elle porte accepte d'avoir
quelque chose au-dessus. Le drapeau du colis remonte à la palette qu'il forme ;
sans cela, la case « empilable » ne voulait rien dire dans un plan palettisé.

---

## 3. Les cas qui restent impossibles

Ils sont impossibles pour de bonnes raisons, et l'application le dit au lieu de
les contourner.

| Situation | Ce que fait l'application |
| --- | --- |
| Un colis dont l'emprise dépasse tous les formats | Aucun format n'est proposé comme convenable ; le plan explique que c'est **la palette** qui bloque et propose celui qui passe |
| Aucun format ne peut porter le lot | Le choix reste ouvert, faute de mieux, et le plan renvoie aux dimensions des colis |
| Un colis plus grand que la cale | L'extension s'arrête, le reliquat est annoncé, et le plan dit que c'est **la taille du conteneur** qui bloque |

La distinction entre les deux derniers cas a demandé un correctif : le plan
disait « changez la taille des conteneurs » alors que le coupable était le
format de palette. Ajouter des conteneurs ne pouvait rien y changer.

---

## 4. Le fichier de commande

L'entrée que l'application ne maîtrise pas. Voir
[`docs/algorithme.md`](algorithme.md#lecture-dun-fichier-de-commande) pour la
mécanique ; ici, les partis pris :

- **Une ligne douteuse est écartée en le disant**, jamais devinée. Les rejets
  sont comptés et affichés (« 3 lignes aux dimensions inexploitables »).
- **Les cotes sont bornées à 300 cm.** Au-delà, la valeur est presque
  toujours en millimètres — une erreur de source, pas un colis géant.
  ⚠️ Un fichier entièrement en millimètres verrait donc **toutes** ses lignes
  rejetées. C'est volontaire : mieux vaut un refus net qu'un plan faux.
- **Le poids se devine, avec une règle explicite** : au-delà de 2,5 tonnes,
  c'est nécessairement des grammes ; en dessous, des kilos. Les fichiers
  mélangent les deux unités.
- **Le libellé est le code de commande, rien de plus.** Les cotes ont leur
  colonne dans le tableau ; les répéter dans le libellé le rendait illisible.
