# IMPROVEMENT-PLAN.md — Plan d'amélioration : chaque item = une PR

**Date : 2026-11-01** · Base : `FEATURE-MATRIX.md` (croisement phBot v20.1.6 × SBot v2.3.28 ×
état du dépôt), audits pets A1/A2, précédents internes (mall live-proven, stall, quêtes 1.8.x).
Chaque fiche ci-dessous est autoportante : données d'origine, état actuel vérifié, contenu,
contrat à vérifier, tests, risques. On traite les PR **dans l'ordre du tableau**, une à la fois.

Conventions : **Taille** S (< ½ j) / M (½–2 j) / L (plus) · **Cible** `upstream` (PR générique,
candidate au dépôt nixxane) ou `fork` (couche team / spécifique) · **Dep** dépendances ·
**Spike** = vérification préalable lecture seule (`../opensro` read-only, bundles déployés
`/assets/*.js`, sondes `SROLean` read-only ; **jamais** d'action sur compte live sans autorisation).

---

## 0. Règles d'ingénierie globales (le « meilleur de ce qu'on a appris »)

Chaque PR DOIT respecter — extraits d'AGENTS.md + leçons des dumps et des releases passées :

1. **Confirmation serveur = succès.** Jamais « dispatch ≡ succès » : loot exige gain
   inventaire/or, réparation exige usure améliorée, scroll exige snapshot accepté, achat exige
   l'item. Aucun opcode/contrat deviné : vérifier dans le client/serveur d'OpenSRO d'abord.
2. **Pas d'ID de transaction dans les réponses natives** → ne jamais renvoyer une opération
   acceptée/non résolue (précédent `Town.checkScroll`, 3 tentatives max puis échec explicite).
3. **Catalogues consommables** : max observé (`seenMax`, précédent potions pet #63) ;
   **marchands** : skip-if-not-sold (précédent HGP #57-60), jamais d'achat en boucle.
4. **Jamais le bouton Confirm** de la fenêtre « session ended » ; déconnexions uniquement par
   le chemin `lean-session` existant.
5. **Un détour d'obstacle possède le mouvement** jusqu'à fin ou libération ; pas de téléport,
   pas de reset de pose. Toute nouvelle automatisation de déplacement passe par les modules
   existants (`Town`, `WalkBack`, navigation) — jamais de `Cmd.move` direct hors de leur tour.
6. **Services indépendants** : le pickup pet ne pause pas le combat ; le party ne dépend pas de
   la chasse ; toute nouvelle règle/condition respecte les lifecycle resets (stop/start,
   déconnexion, changement de personnage).
7. **Réglages par personnage** préfixe `sroBotLean:v1:` ; migrations **additives** uniquement ;
   ne jamais casser un réglage sauvegardé.
8. **Limites de débit + refus** via la couche `Cmd` existante (refus = backoff, expiration).
9. **Tests des chemins d'échec** (checklist AGENTS) : état manquant, transaction en cours,
   expiration, commande dupliquée, déconnexion/reset, fonctionnalité désactivée.
   **Matrice de tests = messages d'erreur phBot** (`ReverseBot/features/*.txt`).
10. **Honnêteté d'évidence** dans `notes/<version>.md` : dire ce qui n'est testé qu'en
    simulation vs vérifié en live.
11. UI : libellés anglais courts ; pas de retour des panneaux full-assistant (radar, chat, GM).
12. Build avant tests : `python3 build-lean.py` → `node --check` → `node lean.test.cjs` →
    `git diff --check` ; bump des **deux** versions dans `build-lean.py` ; `git add` explicite.

---

## 1. Tableau récapitulatif (ordre de traitement recommandé)

| # | PR | Priorité | Taille | Cible | Dep | Résumé | Statut |
|---|---|---|---|---|---|---|---|
| PR-01 | Scheduler retour & déconnexion | P0 | M | upstream | — | `return_at`, top-of-hour, retour-puis-déconnexion | à faire |
| PR-07 | Vendre l'excès de potions | P1 | S | upstream | — | quick win trivial | **PR nixxane #82 (2026-11-01)** |
| PR-02 | Moteur de conditions (noyau) | P0 | L | upstream | PR-01 | règles `when → do`, vocabulaire fermé | à faire |
| PR-03 | Presets protection | P1 | S-M | upstream | PR-02 | joueur attaquant / statut PK → stop/déconnexion | à faire |
| PR-08 | Alarmes sonores par événement & unique | P1 | S-M | upstream | — | extension des `tones` (58 clés SBot) | à faire |
| PR-04 | Cure des pets (états anormaux) | P1 | M | upstream | spike | audit A2 ; le perso est déjà couvert upstream | à faire (réduite) |
| PR-05 | Achat Grass of Life | P1 | S | upstream | — | audit A1 ; `buygol` au stable-keeper | à faire (sonde vendeur d'abord) |
| PR-06 | Zerk : conditions SBot complémentaires | P2 | S | upstream | spike | combat déjà upstream ; encerclé/esprit/potion | à faire (réduite) |
| PR-09 | Alchimie : Proof/Awake + éléments | P1 | M | upstream | spike | reste de P1-7 | à faire |
| PR-10 | Smart Town | P1 | M | upstream | — | composer la course aux services utiles | à faire |
| PR-18 | Watchdog « aucun mouvement serveur » | P2 | S | upstream | PR-02 | règle + action stop/déconnexion | à faire |
| PR-20 | Retour si non ressuscité | P2 | S-M | fork+upstream | — | `return_if_not_resd` (team claims) | à faire |
| PR-21 | noXp → spot suivant | P2 | S | upstream | — | migration de zone de chasse | **PR nixxane #83 (2026-11-01)** |
| PR-14 | Skills de vitesse/bruit au walkback | P2 | S | upstream | — | `wcastspeed/noise` SBot | **PR nixxane #84 (2026-11-01)** (mode buff « walk ») |
| PR-22 | Conditions d'arrêt du lure | P2 | S | upstream | — | joueurs/PTG proches, attente au centre | **PR nixxane #85 (2026-11-01)** (joueurs 30 m + budget de pulls) |
| PR-17 | Pet organize | P2 | S-M | upstream | — | combine + transferts pet↔sac |
| PR-13 | Auto-use scrolls (11 types) | P2 | S-M | upstream | spike | xp/sxp/stat scrolls |
| PR-12 | Switch d'arme CH en rotation | P2 | M | upstream | — | `skills:switch*` SBot |
| PR-15 | Party matching : recherche/adhésion | P2 | M | fork | — | `partymatching_*` SBot |
| PR-11 | Guild storage | P2 | M-L | upstream | spike live | quotas + or + verrou |
| PR-19 | Quêtes événement/quenquentes | P2 | M | upstream | PR-01, spike | offre réelle OpenSRO | à faire |
| PR-16 | Union party | P3 | M | upstream | spike | existe côté OpenSRO ? | à faire |
| PR-23 | Mieux équipé automatiquement | P1 | M | upstream | — | vraies stats + remplacé stocké | **PR nixxane #86 (2026-11-01)** |

Explorations conditionnelles (pas de PR avant vérification) : §4. Exclusions définitives : §5.

---

## 2. Fiches détaillées

### PR-01 — Scheduler de retour et de déconnexion { P0 · M · upstream · dep: — }

**Données d'origine**
- phBot (domaine RETURN, 50 clés) : `return_at` (+`return_at_stop` : stoppe le bot au lieu de
  retourner), `return_before_next_hour` + `return_before_next_hour_minutes` (« Returns to town
  X minutes before the next hour rolls over » — conçu pour les quêtes événement),
  `return_and_disconnect` + `_minutes` ; messages : « Town: Waiting [%0] seconds before
  disconnecting », « Disconnected (last return reason: %0) », « Returning to town due to %0 ».
- SBot (`safecon`) : `disconnect`, `disconnect_time`, `disconnecttown` (retourner en ville
  avant de couper), `disconnectscrollback` (scroll de retour avant de couper, même hors ville).

**État actuel (vérifié)** : `Town.reason()` couvre déjà sac/pet/potions/munitions/arme/durabilité/
noXp/`town.every` (équiv. `return_every`). Aucune heure fixe, aucun alignement top-of-hour,
aucune déconnexion programmée. `lean-session` sait couper proprement (jamais Confirm).

**Contenu**
- Réglages : `town.returnAt { on, hhmm, stop }` (une fois par jour) ;
  `town.beforeHour { on, minutes }` (déclenche à HH:60-minutes, re-latché après le retour) ;
  `session.disconnect { mode: off|at|afterReturn, hhmm, scrollBack, townFirst }`.
- `Town.reason()` += 3 triggers (même canal que les existants) ; la déconnexion passe par
  `Session` **après** fin de course en ville (ou timeout avec raison explicite) ; `scrollBack`
  réutilise le chemin scroll existant (`sentScroll/checkScroll`, 3 tentatives).
- UI : 3 lignes dans la page Town ; message de raison court (« scheduled return »,
  « scheduled disconnect ») ; latch par jour (pas de re-déclenchement en boucle).

**Tests (échecs)** : passage de minuit ; latch une seule fois/jour ; désactivation à chaud ;
`afterReturn` attend la fin de course (course bloquée → timeout + raison) ; jamais de double
scroll ; reset des latchs au stop/start et changement de personnage ; migration additive.

**Risques** : timezone = horloge locale de la page (documenter) ; interaction avec autostart.
**Vérification** : sim (horloge injectée) + un passage manuel live.
**Débloque** : PR-19 (quêtes événement), hand-over multi-persos ([[multichar-team-goal]]).

---

### PR-07 — Vendre l'excès de potions { P1 · S · upstream · dep: — }

**Données** : phBot `sell_excess_potions` ; messages « Sell: Selling Excess [%0] » (variantes
par marchand Blacksmith/Grocery/Herbalist/Jupiter/Valuables). SBot : rien (équivalent implicite
via quotas d'achat).

**État actuel** : la vente en ville existe (règles par item), les achats existent (seuils) ;
rien ne vend le surplus de consommables régénérés par les achats.

**Contenu** : réglage `town.sellExcess { on, keep }` ; pendant l'étape de vente, pour chaque
type effectivement racheté par restock (HP/MP/vigueurs/grains, via `refObjId`), vendre
`possédé − keep` ; respecter `CanSell` (déjà garanti) ; message « Sold N surplus potions ».

**Tests** : keep respecté par type ; rien à vendre → étape sautée ; refus partiel de vente ;
ne jamais vendre les pills/grass/scrolls (listés ailleurs) ; feature off par défaut.

---

### PR-02 — Moteur de conditions (noyau) { P0 · L · upstream · dep: PR-01 (événements horaires) }

**Données d'origine**
- phBot domaine CONDITION : 46 messages d'actions observées — changer script / profil / rayon /
  pick radius / training area (+ « Walking to new training area », échec « Could not create a
  path to the new training area »), équiper/retirer job suit, spawn/terminer transport, lancer
  un skill (sur cible), inviter/exclure party/guild/academy, nommer party leader, exécuter un
  script, enable/disable/abandon quest, fin de buff ; clé `condition_execute_during_script`.
- phBot événements plugin : `EVENT_UNIQUE_SPAWN`, `EVENT_HUNTER_SPAWN`, `EVENT_THIEF_SPAWN`,
  `EVENT_TRANSPORT_DIED`, `EVENT_PLAYER_ATTACKING`, `EVENT_RARE_DROP`, `EVENT_ITEM_DROP`,
  `EVENT_DIED`, `EVENT_ALCHEMY_FINISHED`, `EVENT_GM_SPAWNED`, `EVENT_LEVEL_UP`.
- SBot `emerg` : `emerg_hp[_pc]`, `emerg_att[_type]`, `emerg_castwalking`, `emerg_tf[_no]`.

**État actuel** : aucun moteur de règles ; tous les domaines d'action existent déjà comme
modules indépendants (c'est l'argument de faisabilité de PHBOT-PORTING).

**Contenu — vocabulaire FERMÉ v1 (JSON, par personnage)**
- Événements : `timer` (every N min), `hpBelow/mpBelow` (pct), `buffMissing` (skill),
  `playerNearby` (données `playerAlert`), `uniqueNotice` (notice division/fork intel),
  `levelUp`, `itemBelow` (refObjId, n), `goldBelow`, `death`, `alchemyFinished`, `noXp` (min),
  `scheduledTime` (via PR-01).
- Actions : `stopHunt`, `startHunt`, `returnToTown` (raison), `disconnectAfterTown`,
  `castSkill` (skillId), `playTone` (kind), `logNote` (texte court).
  (Vocabulaire v2 dans des PR suivantes : `setHuntRadius`, `setLevelSpot`, `equipBuffGearSet`,
  `endBuff`, `abandonQuest`, `enable/disableQuest` — pas avant que v1 soit mergé.)
- Règle : `{ on, when{...}, do{...}, cooldownSec, duringTown: skip|allow }` (équivalent
  `condition_execute_during_script` : par défaut skip pendant une course en ville).
- Nouveau module `lean-conditions.js` : évaluation sur le tick du contrôleur, idempotente,
  cooldown par règle, **aucun mouvement direct** (une action de déplacement délègue à
  `Town`/`WalkBack`), reset lifecycle complet, désactivé par défaut.
- UI : page Rules (liste, 2 dropdowns + champs selon type, test « dry-run » dans le log).

**Tests (matrice = messages d'erreur phBot)** : règle invalide ignorée + log ; cooldown ;
état monde manquant (pas de world) ; doublons ; pendant course (skip) ; reset stop/start ;
migration additive ; feature off = zéro effet mesurable.

**Risques** : croissance du vocabulaire → refuser les actions non listées ; jamais d'actions
asynchrones non annulables. **Vérification** : sim exhaustif.

---

### PR-03 — Presets de protection { P1 · S-M · upstream · dep: PR-02 }

**Données** : phBot `EVENT_PLAYER_ATTACKING`, `EVENT_GM_SPAWNED`, onglet protection
(disconnect auto, retour si PK) ; SBot `extra:dconpk`, `dconpink`, `dcongm[bot]`,
`stopongmbot`, `ignoregmintown`, alarmes `gotmurderer/gotpink/murdererspawned`.

**État actuel** : détections ✅ (`playerAlert`, hostilité team) mais **aucune action
automatique**.

**Contenu** : 3 règles pré-construites (off par défaut) posées via PR-02 :
`player-attacks-me → stopHunt + playTone` ; `murderer-status → returnToTown + disconnectAfterTown`
(le statut PK/meurtrier doit exister dans l'état joueur — à vérifier au spike) ;
`gm-spawn` → **gated** : signal fiable d'admin sur OpenSRO à démontrer avant d'activer
(sinon on ne livre pas la règle).

**Tests** : déclenchement unique (pas de spam par joueur) ; jamais de déconnexion pendant un
scroll non confirmé ; règle off ; reset. **Vérification** : sim (+ live observation si joueur
hostile croisé).

---

### PR-08 — Alarmes sonores par événement et par unique { P1 · S-M · upstream (+hook fork) }

**Données**
- SBot `alarms` (32 clés) : `attacked`, `died`, `gmspawned`, `gotmurderer`, `gotpink`, `pm`,
  `pmgm`, `hunter`, `thief`, `trader`, `murdererspawned` + `_path` (fichier son perso chacun).
- SBot `uniques` (26 clés) : `ce/ci/ds/is/ly/ro/ka/ki/me/by/tg/ur` + `range`, `_alarm/_path`
  **par unique**.
- SBot alchimie (8) : `alchemy_plussuccess/plusfailed/plusgoalreached/finished/itemvanished`.
- phBot : onglets notifications + sound, `EVENT_*`.

**État actuel (vérifié)** : `Settings.tones` = `{ 'pet-full', 'sox' }` seulement (WebAudio,
notes+gap) ; `playerAlert` ; fork : tracker d'uniques à fenêtres de respawn + notices division.

**Contenu** : étendre la map `tones` : kinds `player-attacking`, `died`, `level-up`,
`alchemy-success/fail/goal`, `unique` (défaut) + **surcharge par codename d'unique** ;
UI : éditeur par kind (notes/gap + bouton test), défaut = silence sauf existants ; branchement :
chemin playerAlert existant, fin de run Alchemy, progression level (stats), notices uniques
(fork : depuis l'intel team ; upstream : depuis la notice division si exposée).
Pas de fichiers sons (WebAudio uniquement, pas de dépendance CDN).

**Tests** : debounce (1 ton par événement, cooldown) ; audio context après geste utilisateur
(précédent existant) ; kind inconnu ignoré ; migration additive.

---

### PR-04 — Cure des pets (états anormaux) { P1 · M · upstream · dep: spike }

> **Corrigé 2026-11-01** : la moitié « personnage » de cette PR existe **déjà upstream**
> (`potion.cure` activé par défaut + restock de la Special Universal Pill small, ref 58 —
> vu en traitant les quick wins). La PR est réduite au cure des **pets**.

**Données** : SBot `attpetautoabnormal` (pet d'attaque) ; `autoabnormalstate_transport`
(niche, hors scope v1). lean : `lean-items.js` groupe déjà `ITEM_ETC_CURE_*` → « pill »
(pour le loot) et le personnage s'auto-soigne déjà.

**Spike (lecture seule, bloquant)** : dans `../opensro` + bundles déployés — les pets
portent-ils des états anormaux visibles côté client, et quelle item les soigne. Si non
exposé → **PR abandonnée** (le dire explicitement dans ce fichier).

**Contenu** : réglage `pet.cure { on }` ; utiliser la pill/cure pet quand un état anormal
est observé sur le pet d'attaque ; confirmation = l'état disparaît (jamais le dispatch) ;
limite de tentatives + backoff.

**Tests** : pas d'état → rien ; état sans item → message ; état persistant après 2 usages →
stop + tone (pas de burn en boucle) ; canal pet indépendant du combat ; migration additive.

**Réf. audit** : pet-management-audit A2.

---

### PR-05 — Achat de Grass of Life { P1 · S · upstream · dep: — }

**Données** : SBot `shop:buygol`, `goltype/golnumber` (achat au stable-keeper) ; lean : la
revive en ville existe (`Town.grass()`, `revivePet`, collar réutilisé, state-3 jamais invoqué).

**Spike (léger)** : le stable-keeper vend-il du grass sur OpenSRO ? (sondage catalogue live
read-only, précédent `mall-catalog-live-2026-10-31.json` ; sinon skip-if-not-sold suffira).

**Contenu** : réglage `revivePet.keep { n }` ; pendant la course en ville, acheter du grass
jusqu'à n (le stable-keeper est déjà dans les données de villes si présent) ; priorité
inchangée : revive d'abord si le pet est mort.

**Tests** : déjà n en sac → skip ; non vendu → skip + message unique ; achat confirmé par
gain d'item ; n'interrompt pas les autres étapes.

**Réf. audit** : A1.

---

### PR-06 — Zerk : conditions SBot complémentaires { P2 · S · upstream · dep: spike }

> **Corrigé 2026-11-01** : le zerk **en combat** existe déjà upstream (`Combat.berserk` :
> jauge pleine + classes de monstres cochées, mode strong). Ne restent que les variantes
> SBot hors combat — priorité abaissée à P2.

**Données** : SBot `partyserk` : `zerkcond` (condition d'emploi), `zerkcornered` +
`zerkcorneredval` (encerclé par ≥ N monstres), `zerkspirit` + `zerkspirit_exclusive`
(réserver l'esprit de groupe), `zerkpotion`.

**Spike (bloquant)** : commande d'activation hors combat + confirmation d'effet. Sinon abandon.

**Contenu** : réglage `hunt.zerk { mode: off|attacked|cornered, cornerMobs, spiritKeep }` ;
déclenchement quand jauge pleine + condition, **hors** ciblage normal ; confirmation
d'effet ; jamais pendant course en ville/détour ; cooldown.

**Tests** : jauge absente → no-op ; comptage « encerclé » (ennemis à portée) ; mode spirit
keep (ne pas consommer si réservé groupe) ; reset lifecycle.

---

### PR-09 — Alchimie : pierres Proof/Awake + éléments→pierres { P1 · M · upstream · dep: spike }

**Données** : phBot « Alchemy: No proof stone found for item [%0] », « Could not find awaken
stone for [%0] », « Creating stones from [%0] » (éléments destroyer/void… → pierres),
« Alchemy: Stopping completely because [%0] has been destroyed ». Déjà couvert : elixirs,
lucky/steady/immortal/astral, poudre, cible +N par attribut, limite de tentatives.

**Spike** : les items Proof/Awake et les éléments existent-ils dans les données d'items
d'OpenSRO ? (catalogue ; sondage live read-only.)

**Contenu** : `alchemy.use.proof/awake` + `stones.proof/awake` (même motif que luck/steady/…) ;
**arrêt net si item détruite** (message + statut d'échec du run) ; option `alchemy.elements
{ on }` : transformer les éléments en pierres quand la file est vide (même confirmation que
les autres opérations alchimie).

**Tests** : pierre absente → skip + message ; destruction → arrêt immédiat ; cible toujours
honorée ; éléments insuffisants → message.

---

### PR-10 — Smart Town { P1 · M · upstream · dep: — }

**Données** : phBot « Smart Town: Visiting %0 », « Smart Town: Could not generate a path to
  the %0 NPC, using the town script » (fallback), « Town: Unknown location… script could not
  be found ». SBot : rien (NPCs codés par ville).

**État actuel** : la course en ville suit une séquence fixe (vendor/smith/storage/gate +
restock par marchand) quel que soit le motif du retour.

**Contenu** : calculer les **services utiles** depuis la raison du retour + travail en attente
(listes d'achat > keep, liste de vente non vide, quota storage dépassé, usure > 0, déficit
grass/pills, pet plein) → sauter les arrêts inutiles ; **fallback** : tout arrêt échoué
retombe sur la séquence complète ; stats de course (« Skipped smith: nothing to repair »).

**Risques** : complexité de `Town` (avertissement PHBOT-PORTING) → implémenter comme un filtre
de plan en entrée de course, pas comme des branches dispersées.

**Tests** : chaque motif → sous-ensemble attendu ; échec d'arrêt → fallback complet ; tous
services utiles → séquence inchangée (non-régression) ; feature off par défaut.

---

### PR-18 — Watchdog « aucun mouvement confirmé par le serveur » { P2 · S · upstream · dep: PR-02 }

**Données** : phBot « No movement confirmed by the server within %0 minutes, disconnected » ;
`move_to_region/end`.

**État actuel** : antistuck (progrès kills/XP/or) + stall watchdog des marcheurs — il manque la
variante « couper la session ».

**Contenu** : règle PR-02 pré-construite : `noServerMovement(N min) → stopHunt + playTone`
(défault), action `disconnectAfterTown` en option ; ne se déclenche jamais pendant une course
en ville ou un détenu par un détour (mouvement possédé).

**Tests** : mouvement repris → reset ; marche vs chasse ; town en cours → skip ; cooldown.

---

### PR-20 — Retour si non ressuscité après N minutes { P2 · S-M · fork+upstream · dep: — }

**Données** : phBot `return_if_not_resd` + `return_if_not_resd_minutes` ; SBot
`backtown:backnores/backnorestime`.

**Spike (léger)** : sémantique mort sur OpenSRO — fenêtre d'acceptation de résurrection,
possibilité de scroll/revive en état mort, interaction avec les claims de résurrection team.

**Contenu** : réglage `resurrect.waitBeforeReturn { minutes }` ; à la mort : attendre une
résurrection (module existant + claims team), sinon basculer sur le chemin de sortie existant
(scroll de résurrection/retour selon contrat vérifié). Fork : compter les claims team dans
l'attente.

**Tests** : rés arrivée à N-1 → pas de retour ; pas de claim → retour à N ; feature off ;
mort en ville → jamais.

---

### PR-21 — noXp → migration vers le spot suivant { P2 · S · upstream · dep: — }

**Données** : phBot « changing training area because you have not been attacked within %0
minutes » (migration automatique de zone). lean : `town.noXp` retourne en ville ;
`lean-levelspot` sait changer de spot par niveau.

**Contenu** : option `town.noXp.action = town | nextSpot` ; `nextSpot` = spot de niveau
supérieur suivant dans la liste levelSpots + marche (via WalkBack) ; si aucun spot suivant ou
échec de chemin → retour en ville (fallback existant).

**Tests** : pas de spot suivant → town ; chemin échoue → town ; marche pendant détenu par
déton → attendre ; latch anti-oscillation (pas de ping-pong entre spots).

---

### PR-14 — Skills de vitesse/bruit pendant le walk-back { P2 · S · upstream · dep: — }

**Données** : SBot `walkback` : `wcastall/wcastspeed/wcastnoise` (phase marche), `pcast*`
(party), `fcast*` (fellow), `castnoise`, `horse`, `usefellowpet`. lean : `lean-speed-scroll`
couvre déjà la vitesse (scroll starter natif +100 %/1 h, jamais un payant).

**Contenu** : réglage `walkback.castSkill { skillId }` — lancer le skill configuré (vitesse ou
« noise ») au départ du walk-back, relance sur cooldown, arrêt à l'arrivée ; jamais pendant un
détour obstacle ni une course en ville (ownership du mouvement).

**Tests** : skill absent/plus appris → no-op silencieux ; arrivée → stop ; cooldown respecté.

---

### PR-22 — Conditions d'arrêt du lure { P2 · S · upstream · dep: — }

**Données** : SBot `training:lure*` (~20 clés) dont `lurestopplayer(+count)` (joueur proche),
`lurestopptg(+count)`, `lurestopsp(+name)` (spawnpoint précis), `lurestop(count)`,
`lurecenterwait(+time)` (attente au centre), `lureusehs`. lean : `lean-lure.js` (orienté
party) sans conditions d'arrêt riches.

**Contenu** : réglages lure : `stopOnPlayer { radius, count }`, `stopAfter { lures }`,
`centerWait { seconds }` ; arrêt propre = rendre le mouvement, pas un stop sec.

**Tests** : joueur entre dans le rayon → stop et reprise après purge ; compteurs ; feature off.

---

### PR-17 — Pet organize (combine + transferts) { P2 · S-M · upstream · dep: — }

**Données** : phBot « Pet: Combining [%0] », « Pet: Moved %0 items to your inventory »,
« Pet: Moved %0 items, skipped %1 that changed », « Pet: Moved %0 of %1 selected items - your
inventory is full », « Pet: Organize finished - %0 combined, %1 moved », « Inventory: Moving
[%0] to your pick pet ».

**État actuel** : transferts liés à la course en ville existent (`petClearable`) ; pas de
combine ni d'organisation autonome.

**Contenu** : étape d'attente en ville : combiner les stacks du pet, déplacer pet→sac selon les
règles de loot (staging vente/stockage), jamais pendant le combat ; chaque transfert confirmé
par l'état d'inventaire ; skip des items qui changent entre-temps (précédent phBot).

**Tests** : rien à combiner ; sac plein → arrêt propre + message ; item changé → skip ;
capacité/propriété vérifiées (règles AGENTS) ; indépendance combat préservée.

---

### PR-13 — Auto-use des scrolls (11 types) { P2 · S-M · upstream · dep: spike }

**Données** : SBot `shop:autouse_*` — **11 types** : `xp, sxp, str, int, hp, mp, sc, ss, hit,
dodging, trigger`.

**Spike** : lesquels de ces scrolls existent dans le catalogue OpenSRO (sondage read-only).
Ne livrer que ce qui existe.

**Contenu** : réglages `scrolls.autoUse { <type>: bool }` ; utilisation quand l'item est en
sac et l'effet absent/expriré (confirmation d'effet, pas de double emploi) ; jamais pendant
course en ville.

**Tests** : item absent → no-op ; effet déjà actif → pas de double ; refus → backoff ; off.

---

### PR-12 — Switch d'arme CH en rotation { P2 · M · upstream · dep: — }

**Données** : SBot `skills` : `switchon`, `switchpos` (position du switch), `switchdelay`,
`switch_type`, `ch_switch_mainweap` (arme principale CH), `switch_castlast` (dernier skill
avant switch), `switch_reequip_shield` (rééquiper le bouclier).

**État actuel** : l'arme secondaire + bouclier sont protégés du loot mais jamais switchés en
combat ; `lean-buff-gear` sait équiper/déséquiper (primitive réutilisable).

**Contenu** : réglages `skills.switch { enabled, secondary, reequipShield, castLast, delayMs }` ;
rotation : après `castLast` (ou fin de cycle), switche vers l'arme secondaire et retour ;
réutilise la primitive d'équip de buff-gear ; jamais vendre/stocker/dropper les items protégés
(déjà garanti) ; échec de switch → rester sur l'arme courante + message.

**Tests** : secondaire absente → pas de switch ; switch échoué → backoff ; interaction avec
buff-gear (ordre des équipements) ; reset lifecycle.

---

### PR-15 — Party matching : recherche et adhésion { P2 · M · fork · dep: — }

**Données** : SBot `extra:partymatching_enable/levelfrom/levelto/acceptonlylist/
acceptdisable/readd` (+ `_title`) ; phBot onglet party (config d'acceptation).

**État actuel (fork)** : approbation des candidatures corrélationnées à l'annonce du main
(auto-recrutement) — pas de recherche/adhésion à des annonces tierces.

**Contenu** : réglages `party.matching { search: off|auto, levelFrom/To, titleFilter,
acceptOnly, rejoinOnKick }` ; parcours des pages du board (paging déjà connu du fork), filtre,
adhésion, re-adhésion unique après exclusion avec backoff ; jamais pendant qu'on est en party.

**Tests** : aucune annonce ; annonce expirée/stale ; kick → une re-adhésion max ; en party →
no-op ; wire du board déjà validé côté fork.

---

### PR-11 — Guild storage { P2 · M-L · upstream · dep: spike LIVE }

**Données**
- phBot (36 messages) : « Guild Storage: Storing item [%0] (keeping %1 / surplus %1) »,
  « Returning extra [%0] (keeping %1) », « Combining [%0] », « Could not take [%0], skipping »,
  « Guild storage is being accessed by [%0] » (**verrou**), « Purchasing %0 [%1] »,
  « Storing [%0] gold ».
- SBot : `guildstorage_storeexcess/takegold/threshold/keepgold`, `disableguildstorage`.

**Spike (bloquant, LIVE read-only)** : extraire le contrat wire du guild storage depuis le
jeu live (précédent stall : le live est **en avance** sur le checkout `../opensro` — vérifier
les bundles déployés `/assets/*.js`). Sans contrat vérifié, pas de PR.

**Contenu** : réglages `town.guildStorage { on, keepQuotas, goldKeep }` ; étape après le
warehouse dans la course en ville ; verrou occupé → attente/backoff/abandon propre ;
confirmations serveur pour chaque mouvement (dépôt, retrait, or).

**Condition** : une guilde réellement utilisée par l'équipe — sinon différer.

**Tests** : verrou ; quotas ; capacité ; refus partiel ; or seul ; feature off.

---

### PR-19 — Quêtes événement / quotidiennes horaires { P2 · M · upstream · dep: PR-01 + spike }

**Données** : phBot `quest_event` + « Event Quest: Accepting quest [%0] / Getting quest
reward / Exiting NPC / Finished », cas spécial **Treasure Box** (« Could not find Treasure Box
quest in [%0] »), cas d'usage documenté `return_before_next_hour` = Genie Lamp quotidienne ;
SBot `autoquest:aq_scrollallfinished` (tout finir puis scroll), `ae_num`, `aq_concurrent_tp`,
`attendance` (récompense de présence — sémantique à identifier au spike).

**Spike (bloquant)** : quels événements/quenquentes OpenSRO fait réellement tourner
(observation live read-only du journal des quêtes sur plusieurs jours).

**Contenu** : fenêtres horaires posées sur PR-01 (avant top-of-hour) ; dans la course
déclenchée : accepter/rendre les quêtes d'événement via le module quête existant (picker,
marqueurs, récompenses) ; `aq_scrollallfinished` ≈ option « finir puis rentrer ».

**Tests** : aucun événement actif → no-op ; quête déjà faite ; NPC introuvable → skip + log ;
ne pas casser le sélecteur de quêtes (non-régression 1.2.199).

---

### PR-16 — Union party { P3 · M · upstream · dep: spike }

**Données** : phBot `union_party`, « Union Party: Inviting [%0] to the union party » ;
SBot `partyserk:autouptacc/autouptaccall/autouptinv/autouptinvmember/autoupttype` (+ listes).
**Spike bloquant** : union party existe-t-il côté OpenSRO (source du jeu) ? Sinon abandon.

**Contenu** : sur le modèle party existant : invitations/exclusions/acceptation par liste.
**Tests** : idem party (échecs wire, stale, doublons).

---

### PR-23 — Mieux équipé automatiquement { P1 · M · upstream · **LIVRÉE : PR nixxane #86 (2026-11-01, spec B)** }

> **2026-11-01 (soir)** : spécifiée avec l'utilisateur puis livrée en une PR, directement en
> mode B (pas de v1 suggestion) : « comme phBot, mais sur les vraies stats ». Nouveau module
> `lean-equip.js` — au warehouse pendant le trip : un équipement porté de la même famille dont
> les **vraies stats** (formules `itemTooltipStats` du client : roll min~max dans `variance`
> 5 bits/stat, part par `+`, blues connus bornés) battent le porté de ≥ 2 % est équipé ; le
> remplacé part au warehouse, **jamais vendu** (garde anti-vente). Armes comparées sur l'attaque
> dominante du porté (un build physique ne prend jamais une lame magique) ; anneaux/ boucles :
> remplacement du plus faible des deux. Jamais touchés : primaire/secondaire/bouclier choisis,
> buff-sets, arme d'alchimie, Keep, tooltip incomplet ou niveau requis inconnu/non atteint,
> durabilité 0 ; refus du jeu → skip session ; ne peut jamais arrêter le trip. Tests : 668 verts.

**Données** : phBot « Equip: Equipping better item [%0] », « [%0] is the better item (%1 vs %2
stats) », sources storage/pet, avatars/job items (ces deux dernières restent hors périmètre).

---

## 3. Ordre de traitement et jalons

- **Jalon A (P0)** : PR-01 → PR-07 → PR-02 (le noyau conditions rend ensuite tout le reste
  plus petit).
- **Jalon B (P1)** : PR-03, PR-08, PR-04/05/06/09/10 (chacune précédée de son spike).
- **Jalon C (P2)** : PR-18 → PR-20 → PR-21 → PR-14 → PR-22 → PR-17 → PR-13 → PR-12 → PR-15 →
  PR-11 → PR-19.
- **Jalon D (P3/conditionnel)** : PR-16, PR-23, §4.
- Parallèle (hors de ce plan) : volet team multi-persos = `docs/TEAM.md` (bus → intel →
  arbiter → coordination → missions) ; les PR-01/PR-02/PR-08/PR-20 servent aussi ce volet.

## 4. Explorations conditionnelles (pas de PR avant vérification)

| Sujet | Data source | Verrou à lever |
|---|---|---|
| Fellow pet (HP/rés/satiété/revive instantané) | SBot `usefellowpet`, `buyfellowhp/res/sat`, `fellowpetreviveinst[num]`, `fellowpetrecallspintown`, `fellow*` | les fellows existent-ils sur OpenSRO ? |
| Cheval (nourriture/HP/achat) | SBot `feedhorse`, `horsehp`, `buyhorse` | usage réel + contrat |
| Attendance (récompense de présence) | SBot `shop:attendance` | existe côté OpenSRO ? |
| Académie | phBot (22 messages) | existe côté OpenSRO + usage |
| Exchange joueur (timeout) | SBot | besoin faible (stall couvre) |
| Tri inventaire/storage | phBot `sortInventory/sortStorage` | niche |
| Maintien de summons | phBot `monster_summon_maintain[_count]` | usage réel |
| Quêtes job cape / ROC | SBot job cape, `egypt_cheapest`, `rocviasam`, `samviaconst` | contenu OpenSRO |
| Buff cancel | phBot « Canceling buff [%0] » | vocabulary v2 de PR-02 |
| Navmesh phBot | dossier ReverseBot/NAVMESH-ANALYSIS.md | clé introuvable ; clipper natif supérieur — abandonné |

## 5. Exclusions définitives (rappel, cf. FEATURE-MATRIX §D)

Anti-cheat officiel (X-Trap, HackShield, captcha), clientless/gateway/OAuth Innova, proxy
local/SOCKS, multiclient, monétisation (BTC, abonnements), plugins Python, LLM, chat complet,
PvP ciblé, Manager distant, minimap CDN, bricolages client (`infzoom`, `destealth`), Forgotten
World / Magic POP / taxi, invitations de masse guild/académie, tout contournement de détection.

## 6. Workflow par PR (répété à chaque item)

1. **Spike** éventuel (lecture seule : `../opensro`, bundles déployés, sondes `SROLean`).
   Conclusion écrite dans cette fiche avant d'écrire du code.
2. **Test de régression qui échoue** sur le build courant (AGENTS §How to work).
3. Implémentation dans le module source (jamais les fichiers générés) ; règle 0 §0.
4. `python3 build-lean.py` → `node --check` → `node lean.test.cjs` → `git diff --check`.
5. `notes/<version>.md` (dire ce qui est sim-only) + bump des deux versions.
6. `git add` explicite (sources + tests + notes + 2 générés) ; commit ; PR (upstream via fork,
   ou fork pour la couche team). Pas de push sans accord. Pas de release manuelle d'un PR mergé
   (automatisé par `.github/workflows/release.yml`).
7. Mettre à jour le **statut** dans le tableau §1 de ce fichier.

## 7. Statuts

- 2026-11-01 (soir 2) — **auto-equip livré (spec B avec l'utilisateur)** : PR-23 →
  **PR nixxane #86** « Town trips wear carried gear with better real stats and store the
  replaced piece » — nouveau `lean-equip.js`, comparaison sur les formules de stats du client
  (rolls `variance` + `+` + blues bornés), arme à l'attaque dominante du porté, remplacé
  déposé au warehouse et jamais vendu, protections complètes, 668 tests verts, sim-only.
- 2026-11-01 (soir) — **4 quick wins livrées, une PR chacune, vers nixxane** :
  PR-07 → **#82** (vente de l'excès de fournitures), PR-21 → **#83** (noXp → spot de
  niveau suivant), PR-14 → **#84** (buffs maintenus au walk-back, mode « Hunting and
  walk-back »), PR-22 → **#85** (lure : arrêt joueurs à 30 m + budget de pulls).
  Toutes : défaut off/inchangé, tests d'intégration verts (667), sim-only.
- Corrections d'état après vérification code : pills cure **personnage** déjà upstream
  (`potion.cure` + restock ref 58) → PR-04 réduite au cure pet ; zerk **combat** déjà
  upstream (`Combat.berserk`) → PR-06 réduite aux conditions SBot, P2.
- Tout le reste : **à faire**. Cochées/màj ici au fur et à mesure.
