# FEATURE-MATRIX.md — Croisement exhaustif phBot × SBot × opensro-bot-lean

**Date : 2026-11-01** · Cible : ce dépôt (fork team 1.8.1 = upstream 1.2.201).

Sources (dossiers d'analyse hors dépôt) :

- **phBot** v20.1.6 (ProjectHax) — image mémoire déchiffrée en Windows Sandbox :
  `Desktop/ReverseBot/` (`FEATURES.md`, `RAPPORT.md`, `features/*.txt` = 4 422 clés de config
  + ~1 500 messages runtime, 38 domaines).
- **SBot** v2.3.28 (Botcave) — dump mémoire partiel + fichiers disque :
  `Desktop/ReverseSBot/` (`RAPPORT.md`, `analysis/config_keys.txt` = 429 clés / 468 mappings
  sur 21 sections, `navdata/` 79 fichiers **décodés intégralement**, 6 283 textes de quêtes).
- **État lean** : vérifié le même jour dans les sources du dépôt (`lean-*.js`, `restock.js`,
  réglages par défaut de `lean-settings.js`), pas en session live.

**Limites d'évidence** (à relire avant tout portage) : les deux bots sont documentés par leurs
chaînes et clés de config, **pas par de la logique décompilée** ; SBot n'a été dumpé qu'avant
login bot (~20 Mo restent chiffrées) ; aucun des deux n'a été observé en trafic réseau réel.
« phBot fait X » / « SBot fait X » = reconstruction informée. Les tests lean simulés ne valent
pas vérification live (précédents : stall = sim-only, mall = live-proven).

Légende état lean : ✅ couvert · 🟡 partiel (écart indiqué) · ❌ absent · ⛔ hors périmètre
(bot natif / serveur officiel, sans équivalent utile pour un userscript) · 🚀 lean va plus loin.

---

## A. Synthèse par domaine

| # | Domaine | phBot | SBot | État lean | Verdict |
|---|---|---|---|---|---|
| 1 | Combat & ciblage | riche | riche | ✅ | conforme |
| 2 | Zone d'entraînement / spots | riche | 3 slots | ✅ (levelSpots) | conforme |
| 3 | Retour en ville (déclencheurs) | 50 clés | 16 clés | 🟡 | P0 : heure fixe + top-of-hour + déconnexion |
| 4 | Ordonnanceur / déconnexion programmée | ✅ | ✅ | 🟡 (`every` seul) | P0 |
| 5 | Navigation / navmesh | chiffré, inutilisable | navdata décodée | 🚀 clipper + navdata intégrée | conforme |
| 6 | Potions / pills / zerk | potions | pills + zerk | 🟡 | pills perso ✅ (upstream) ; zerk combat ✅, conditions SBot restantes |
| 7 | Pets | pick + attack + organize | + fellow + cheval | 🟡 | achat grass, cure pet, organize |
| 8 | Quêtes automatiques | hunt/collect + événement | grille + job + 24 h | ✅/🟡 | scheduler événementiel manquant |
| 9 | Conditions (when → do) | moteur complet | `emerg_*` partiel | ❌ | P0 |
| 10 | Achats / restock | ✅ | le plus riche | ✅/🟡 | grass + pills à ajouter |
| 11 | Stockage / guilde | ✅ | ✅ | 🟡 | guild storage |
| 12 | Vente / stall / exchange | ✅ | ✅ | 🟡 | sell excess |
| 13 | Alchimie | complet | ≤ degré 11 | ✅/🟡 | proof/awake + éléments + alarmes |
| 14 | Trade / caravanes | ✅ | job pet | ✅ | conforme |
| 15 | Party / union / matching | ✅ | ✅ | ✅/🟡 | union party, recherche matching |
| 16 | Trace / suivi / assist | — | ✅ | 🚀 | conforme (fork) |
| 17 | Résurrection | ✅ | ✅ | 🚀 | conforme |
| 18 | Guild storage / académie | ✅ | ✅ (storage) | ❌ | P2 |
| 19 | Scripts / routes | moteur texte | moteur texte | ✅ équivalent data-driven | conforme |
| 20 | Smart Town | ✅ | — | ❌ | P1 |
| 21 | Item mall | malls officiels | — | 🚀 live-proven | conforme |
| 22 | Masteries / stat points | ✅ | — | ✅ | conforme |
| 23 | Scrolls | battle | + auto-use xp/sxp/stat | 🟡 | auto-use élargi |
| 24 | Équipement (buffs/wardrobe/switch) | ✅ | switch CH 2 armes | 🟡 | switch CH |
| 25 | Lure | simple | 20+ clés | 🟡 | conditions d'arrêt |
| 26 | Sons / alarmes | ✅ | par unique (58 clés) | 🟡 (2 tons) | alarmes par événement |
| 27 | Carte / uniques | minimap CDN | — | 🚀 team intel + tracker | conforme |
| 28 | Statistiques / setup | ✅ | ✅ | ✅ | conforme |
| 29 | Chat | ✅ | ✅ filtres | ❌ | non voulu (lean) |
| 30 | Reconnect / login | ✅ | ✅ | ✅ | conforme (client-bound) |
| 31 | Protection / GM / PK | ✅ | ✅ | 🟡 | via conditions (P0) |
| 32 | Watchdogs mouvement | ✅ | — | ✅/🟡 | variante disconnect en P2 |
| 33 | Multi-instances / équipe | Manager distant | sémaphore global | 🚀 relay team | modèle différent, supérieur |
| 34 | Clientless / anti-cheat / monétisation | ✅ | ✅ | ⛔ | rien à porter |

---

## B. Détail par fonctionnalité (données = clés/messages extraits des dumps)

### B1. Combat & ciblage

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Sélection par type/raie de niveaux | `attack_monsters`, `monster_type`, `monster_level_min/max`, `attack_lower_monster_first` | `prefer_c/e/ev/g/p/s/u`, `noattack` | ✅ `hunt.classes`, `levelMin/Max`, `include/exclude` | ordre fin par monstre précis : faible valeur (PHBOT-PORTING) |
| Anti-KS | — | `noks` | ✅ `avoidKs` | — |
| Rayon / distance / cadence | `attack_radius`, `attack_distance`, `attack_rate` | `radius1-3` | ✅ `hunt.radius` | — |
| Retour au centre de zone | « Attack: Walking back to %0, %1 » | — | ✅ | — |
| Imbue | — | `skills:imbue` | ✅ | — |
| Ciblage auto | — | `autoselect` (+ startbot) | ✅ rotation de combat | — |
| S'accrocher au même monstre | — | `sticktomob`, `samemob` (+ `_charname`) | 🟡 l'assist team couvre l'esprit | niche |
| Maintien de summons | `monster_summon_maintain[_count]`, `monster_summon_wait` | — | ❌ | niche, vérifier l'usage réel |
| PvP ciblé / joueurs | `PvP: Attacking [%0]`, onglet `playerattack` | `emerg_att[_type]` | ❌ (détection seulement : `playerAlert`, team hostility) | voulu absent du périmètre lean |
| Attaquer voleurs / statues | `attack_thieves`, `attack_statue_of_justice` (à éviter : refus A*) | — | ❌ | statues : concept absent d'OpenSRO à vérifier |
| Stop après mort | — | `diedstop`, `diedstopval` | ❌ | mineur ; mort → résurrection/walkback déjà gérés |
| Rotation d'attaques configurable | `skill_count/name`, `Cast Skill [%0]` | `skills:skill`, `skilliterate[mob]` | ✅ liste de skills + ordre | — |

### B2. Zone d'entraînement & rotation de spots

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Zone + rayon persistants | `training_area/x/y/z/region/radius` | `trainx1-3`, `radius1-3`, `owntrain*` | ✅ spot de chasse sauvegardé | — |
| Migration par niveau | « changing training area for level [%0] » | — | ✅ `lean-levelspot.js` (liste par niveau, marche au nouveau spot ; upstream #76) | P1-5 **clos** |
| Migration par inactivité | « not been attacked within %0 minutes » | — | 🟡 `town.noXp` (minutes) déclenche le **retour en ville**, pas une migration | variante : proposer le prochain levelspot |
| Plusieurs emplacements | — | `trainplace1-3` + `usereverse1-3` + `scriptdir1-3` (3 spots, scroll/reverse et script par spot) | 🟡 levelSpots ≈ équivalent (un seul comportement de retour) | niche |
| Zone déplacée sur un spawn de quête | `quest_change_training`, « Quest: Creating training area » | — | ❌ délibéré (le journal affiche « targets not around ») | rouvrir si besoin |

### B3. Retour en ville — déclencheurs

`Town.reason()` couvre aujourd'hui : sac plein, pet plein, pet mort (avec grass en sac),
potions, munitions, arme cassée, durabilité (`wear.pct`), pas d'XP (`noXp`), périodique
(`town.every`). Croisement exhaustif :

| Déclencheur | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Sac plein | `return_on_inventory_full` | `backinvfull` | ✅ | — |
| Pet plein | — | — | ✅ `petFull`/`petFree` | — |
| Potions HP/MP | `return_on_hp/mp` | `backhp/mp` + `backhpnum/mpnum` | ✅ `supplies().low` | — |
| Munitions | `return_on_arrows` | `backammo`, `backammonum` | ✅ `ammoSupplies()` | — |
| Arme cassée | — | — | ✅ `broken` | — |
| Durabilité équipement | `return_armor_durability` | `backdura`, `backduralow[w]` | ✅ `wear.on/pct` | — |
| Marteau de réparation (alternative au retour) | — | `backtown:userepairhammer` | ✅ `lean-repair-hammer.js` (succès = usure améliorée, pas le dispatch) | — |
| Mort | `return_on_death`, « Dead: Waiting %0 min » | `backdead` | ✅ (résurrection puis walk-back) | — |
| Périodique | `return_every` + `_minutes` | — | ✅ `town.every.on/minutes` (off par défaut) | — |
| Inactivité | `return_if_not_attacked` | — | ✅ mieux : `noXp` (XP observée) | — |
| Bloqué | `return_if_stuck[_after]` | — | ✅ antistuck (approche détour) | — |
| Heure fixe | `return_at` + `return_at_stop` | — | ❌ | **P0-3** |
| Alignement top-of-hour (quêtes événement) | `return_before_next_hour` + `_minutes` | — | ❌ | **P0-3**, débloque les quêtes événement |
| Retour puis déconnexion | `return_and_disconnect` + `_minutes`, « Town: Waiting %0 seconds before disconnecting » | `disconnect_time`, `disconnecttown`, `disconnectscrollback` | ❌ | **P0-3**, utile hand-over multi-persos |
| Pas ressuscité depuis N min | `return_if_not_resd[_minutes]` | `backnores`, `backnorestime` | ✅ **couvert + amélioré (PR #87, 2026-11-01)** : le bot attend **seulement si un aide vivant est à portée** (pas une minuterie brute), jamais pendant une offre ouverte, accepte les résurrections ; délai réglable `party.reviveWaitS` (défaut 20 s) | — |
| Statut meurtrier / nom rose | `return_murder_status` | `dconpk`, `dconpink` (+ alarmes) | ❌ | fold dans conditions/protection |
| Blocage script | `return_cant_continue_script` | — | ⛔ (pas de scripts texte) | — |
| Énergie de vie | `return_energy_of_life` | — | ⛔ item officiel iSRO | — |

### B4. Navigation & walkback

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Navmesh / pathfinding | navmesh ProjectHax 6 234 fichiers **chiffrés par fichier** (clé dérivée, loader introuvable) ; refus près des Statues de Justice | **navdata décodée intégralement** : zlib + 12 o/nœud + adjacence ; 1 062 557 nœuds / 2 833 548 arêtes, 0 doublon ; monde = 1 composante connexe ; secteurs `round(x/192)+135` / `+92` validés sur Jangan/Donwhang/Hotan/Samarkand/Constantinople ; grottes = espaces séparés | 🚀 clipper natif du jeu (`lean-clipper.js`) **et** navdata SBot intégrée : `navdata-lean/` (53 fichiers convertis par `tools/convert-navdata.py`), index `lean-navdata-index.js`, consommée par `lean-route`, `lean-route-check`, `lean-walkback` | atout SBot **déjà en production** ; bornes = vérité terrain couverture |
| Anti-stuck / obstacles | — | — | 🚀 `lean-antistuck`, détours (`OBSTACLE-RECOVERY.md`) | — |
| Walk-back au spot | — | `walkback` 12 clés : `horse`, `usefellowpet`, `castspeed/castnoise` par phase (w/p/f = walk/party/fellow) | ✅ `lean-walkback.js` (+ navdata) | skills de vitesse/bruit pendant le retour : 🟡 (SpeedScroll ✅ natif ; « noise » ❌ — utile rogue ?) |
| Watchdog « aucun mouvement confirmé → disconnect » | « No movement confirmed by the server within %0 minutes, disconnected » | — | 🟡 antistuck (progrès kills/XP/or) + stall watchdog des marcheurs | variante « déconnecter après X min sans mouvement serveur » → fold conditions |

### B5. Potions, pills, états anormaux, zerk

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Potions HP/MP + délais | autopotions | `autohp/mp` + `hpval/mpval`, `hpdelay/mpdelay` | ✅ | — |
| Vigueurs (HP/MP grain) | ✅ | `autovigor[mp]` + `vigornumber`, `hpgrain/mpgrain` | ✅ | — |
| Pills de purification (états anormaux perso) | — | `autoabstatepill`, `abstatepillnumber/type`, `buyabstatepills`, `abnormalnumber/type` | ✅ **déjà upstream** (corrigé 2026-11-01 : `potion.cure` on par défaut + restock de la Special Universal Pill small ref 58) | reste : cure des **pets** (A2, voir B6) |
| Drugs (anti-debuff lourds) | — | `usedrugs`, `drugnumber/type`, `buydrugs` | ❌ | même chantier que pills |
| État anormal du transport | — | `autoabnormalstate_transport` | ❌ | niche trade |
| Auto-Zerk sous conditions | — | `partyserk` : `zerkcond`, `zerkcornered[vals]`, `zerkspirit[_exclusive]`, `zerkpotion` | 🟡 **combat couvert upstream** (corrigé 2026-11-01 : `Combat.berserk`, jauge pleine + classes de monstres cochées, mode strong) | restent les conditions SBot « encerclé / esprit de groupe / potion » |
| S'asseoir si HP/MP bas | — | `sithp`, `sitmp` | ❌ | niche |

### B6. Pets

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Pickup pet sélectif | pick pet + filtres | `pickup`, `pickpetown/other`, `pickdelay` | 🚀 confirmations serveur, exclusion/propriété/capacité, slot balancing | — |
| Attack pet : invoque/rappel/revive | « Summoning/Recalling/Reviving attack pet », auto-rappel si bloqué | `attpetrevive` | ✅ upstream 1.2.187 | — |
| Kits de soin pet | — | `attpetheal`, `attpethp`, `kitnumber/type`, `buykits` | ✅ `lean-pet-potion.js` (soin à l'échelle du propriétaire, `seenMax`) | — |
| HGP / satiété | — | `autohgp[val]`, `hgptype/number`, `buyhgps` | ✅ 1.2.174 | — |
| Grass of Life : **usage** | — | `buygol`, `goltype/number` | ✅ `lean-town.js` (revive en ville, collar réutilisé, state-3 jamais invoqué) | — |
| Grass of Life : **achat** | — | `buygol` (stable-keeper) | ❌ | **P1** (audit A1) : achat avec skip-if-not-sold |
| Cure pet (états anormaux) | — | `attpetautoabnormal` | ❌ | **P1** (audit A2), même chantier que B5-pills |
| Fellow pet (HP/rés/satiété/revive instantané) | — | `usefellowpet`, `buyfellowhp/res/sat`, `fellowpetreviveinst[num]`, `fellowpetrecallspintown` | ❌ | vérifier si OpenSRO a des fellows avant d'envisager |
| Cheval (nourriture/HP/achat) | — | `feedhorse`, `horsehp`, `buyhorse`, `horsetype/number` | ❌ | niche (monture de walk-back) |
| Organize pet (combine + transferts) | « Pet: Organize finished - %0 combined, %1 moved », « Moved %0 items… » | — | 🟡 transferts town existent (`petClearable`) | P2-12 : combine + moves dédiés |
| Vente/stockage des items du pet | — | `petsell`, `petstore` | ❓ non vérifié | à vérifier dans `restock.js` |

### B7. Quêtes automatiques

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Hunt/collect : accepter → tuer/collecter → rendre | §1.2 FEATURES.md (machine à états complète + messages d'erreur) | grille `autoquest` (QID, cibles, états, répétitions) | ✅ `lean-quest.js` 1.8.0/1.8.1 + upstream 1.2.197-199 (bouton Start, messages d'attente, **sélecteur depuis les données du jeu**) | — (limites assumées : pas de gathering/capture) |
| Choix de récompense | « Choosing reward item [%0] » | options de dialogue | ✅ récompenses directes | — |
| Répétables / abandon | `quest_next/previous` | répétitions, quotidiennes 24 h | ✅ repeatables + abandon | quotidiennes 24 h : à confirmer au sélecteur |
| Quêtes événement horaires | `quest_event`, `return_before_next_hour`, Treasure Box | `attendance` (récompense de présence ?) | ❌ | dépend **P0-3** (scheduler) → P2-10 |
| Quêtes job cape / ROC | — | quêtes job cape ; `egypt_cheapest`, `rocviasam`, `samviaconst` (routage ROC) | ❌ | si OpenSRO les a : extension du sélecteur |
| Relance de quête (`resetcq`, sémantique exacte à confirmer) | — | `extra:resetcq` | ❓ | à documenter si besoin |
| Déplacement de zone sur le spawn | `quest_change_training` | — | ❌ délibéré | — |

### B8. Conditions (règles when → do) & urgences

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Moteur de règles événementielles | 46 messages : changer script/profil/rayon/training area, équiper/retirer job suit, spawn/terminer transport, lancer un skill (sur cible), inviter/exclure party/guild/academy, nommer leader, rayon de pick, exécuter un script, enable/disable/abandon quest, fin de buff ; `condition_execute_during_script` | `emerg_*` : `emerg_hp[_pc]`, `emerg_att[_type]`, `emerg_castwalking`, `emerg_tf[_no]` | ❌ | **P0-2** : vocabulaire d'actions **fermé** (tous les domaines existent déjà en modules), règles JSON, tests = messages d'erreur phBot |
| Politiques de protection (déconnexion/stop) | `EVENT_PLAYER_ATTACKING`, `EVENT_GM_SPAWNED`, disconnect auto | `stopongmbot`, `ignoregmintown`, `dconpk/pink`, `dcongm[bot]` | 🟡 détections ✅ (`playerAlert`, team hostility) ; aucune action automatique | P1-8 **absorbé dans P0-2** (actions : stop, retour, déconnexion) |

### B9. Achats / restock / stockage

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Achats par marchand + seuils | listes Blacksmith/Grocery/Herbalist/Jupiter/Valuables/Equipment, `buy_once` | `shop` 104 clés : HP/MP/vigors/pills/drugs/kits/HGP/**GOL**/horse/ammo/scrolls/`uptscrolls` + variantes `t*` + calcul de coûts | ✅ `restock.js` (confirmations serveur, skip-if-not-sold 🚀) | ajouter grass (B6) et pills (B5) le cas échéant |
| Réessai d'achat sur erreur serveur | — | « 3× » documenté | ✅ (validation transactionnelle) | — |
| Vente avec filtres | `sell_fee/price`, `sell_burned` | ✅ | ✅ (respect `CanSell 0` : quest/event items jamais vendus) | — |
| Vendre l'excès de potions | `sell_excess_potions` | — | ❌ | **P1-9** trivial |
| Stockage (warehouse) avec quotas | « Storing item [%0] (surplus %1) », « Returning extra [%0] (keeping %1) » | `disablestorage` | ✅ (keep/quotas) | — |
| Guild storage | 36 messages : quotas, combining, achat, verrou « accessed by [%0] » | `guildstorage_storeexcess/takegold/threshold/keepgold`, `disableguildstorage` | ❌ | P2-6 : si une guilde est utilisée ; **contrat wire à vérifier live** |
| Tri inventaire/storage | classes `sortInventory`/`sortStorage` | — | ❌ | niche |
| Auto-drop d'items (champ/persistent) | `drop_items[_town]`, `drop_interval`, « Dropping [%0][%1] » | `pickup:enabledrop`, `dropattack` | ✅ règle par item « drop » (pick/store/sell/keep/drop) | — |
| Mieux équipé automatiquement | « Equip: Equipping better item », « %1 vs %2 stats » | — | 🟡→✅ **livré (PR #86, 2026-11-01)** : au warehouse en ville, sur **vraies stats** (formules tooltip du client : rolls `variance` + `+` + blues bornés), arme à l'attaque dominante du porté, remplacé stocké jamais vendu, protections (choisi/buff-sets/alchimie/Keep/tooltip incomplet) ; restent hors périmètre : sources storage/pet, avatars | — |
| Smart Town (composer la course aux services utiles) | « Smart Town: Visiting %0 », fallback script | — (NPC par ville codés en dur) | ❌ | P1-4 : composer depuis `Town.reason()` ; surveiller la complexité de Town |

### B10. Stall & exchange

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Boutique perso (stall) | création, prix/position/slots, « [%0] has purchased [%1] for [%2] » | `autostall` (prix en temps réel) | ✅ `lean-stall.js` — contrat wire vérifié live, **simulé seulement** | prix dynamiques : niche ; **test live toujours en attente** |
| Échange joueur (exchange) | escrow BTC (marketplace) | exchange avec timeout | ❌ (le jeu expose `gp.exchange` ; lean ne l'automatise pas) | P3 : besoin faible (stall couvre la vente) |

### B11. Alchimie

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Elixirs + powder + Lucky/Steady/Immortal/Astral | « No elixirs found », « No lucky powder found »… | degré ≤ 11 | ✅ `lean-alchemy.js` (+ chances générées `gen-alchemy.py`) | — |
| Arrêt à la cible + limite de tentatives | « Achieved maximum [%0] stat » | — | ✅ `alchemy.target/limit` par attribut (cible ≤ 31) | P1-7 en partie **clos** |
| Pierres Proof / Awake | « No proof stone found », « Could not find awaken stone » | — | ❌ | P1-7 : vérifier que les items existent dans les données OpenSRO |
| Éléments → pierres | « Creating stones from [%0] » | — | ❌ | P1-7 |
| Runes de trade | « Trade rune [%0] could not be found » | — | ❌ | niche (items trade) |
| Alarmes sonores résultat | — | 8 clés `alchemy_*_alarm[_path]` (succès/échec/objectif/item disparu) | ❌ (tons : pet-full, sox seulement) | avec B15-alarmes |
| Arrêt si item détruite | « Stopping completely because [%0] has been destroyed » | `vanished`, `vanished_times` | ✅ (échec >0 sur immortel ? vérifier la sémantique exacte au portage de P1-7) | à couvrir par les tests |

### B12. Trade / caravanes / transport

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Acheter → marcher → vendre | « Trade: Starting/Resuming », « Filling transport… %1 star » | job pet (« Merchant Pipe ») | ✅ `lean-trade.js` | — |
| Reprise après coupure / export-import | « Exported %0 trades to %1 » | — | ❓ mineur | — |
| Monture transport : anormal/mort/pouch | — | `emerg_tf`, transport died/pouch full | 🟡 (trade gère son transport) | à vérifier si besoin |

### B13. Party / union / matching / trace / résurrection

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Party auto (invite/exclure/leader) | `party_type/size`, « Inviting/Kicking/Appointing » | `autoptinv[acc][leave]` + listes, `autopttype` | ✅ `lean-party.js` (fork : auto-recrutement du main + approbation des candidatures **corrélationnées** au board matching) | — |
| Recherche/adhésion party matching | — | `partymatching_enable/levelfrom/to/acceptonlylist/readd` | 🟡 approbation ✅ ; recherche/adhésion à des pages tierces ❌ | P2 si l'équipe en use |
| Union party | `union_party`, « Inviting [%0] to the union party » | `autoupt*` (invite/accept/leave, listes) | ❌ | P2 (existe côté OpenSRO ? à vérifier) |
| Buffs/soins de groupe + rayon | `party_buffs`, `party_buff_radius`, « Walking to [%0] for party buff » | `partybuffing:ptbuffrange`, `ptcastfast` | ✅ `lean-support.js` (confirmation d'effet 🚀) | — |
| Suivre un joueur (trace) | — | `tracename`, `tracedist[val]`, `traceai`, `dontfollowmob` | 🚀 `lean-trace.js` : suit un membre (ou le leader), chasse **autour de lui**, hors-zone → retour à son spot | — |
| Assist (attaquer la cible du suivi) | — | `traceattack[radius]`, `tracecb` | ✅ team assist | — |
| Résurrection (liste/backup/groupe/portée) | « Resurrect: Attempting/Walking to… », group resurrect | `autores`, `resskill[_backup/_group]`, `reslist`, `resonlyparty`, `resradius`, `fastres` | 🚀 `lean-resurrect.js` + claims déterministes team | `fastres` niche |
| Zerk de groupe coordonné | — | `zerkspirit_exclusive`, `samemob` | ❌ | voir B5-zerk |

### B14. Guild / académie

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Invitations guild/académie | « Academy: Inviting/Accepting », `radAcademyMatchingAssistant` | — | ❌ | ⛔/P3 : social, pas voulu lean ; académie = existe sur OpenSRO ? |
| Guild storage | voir B9 | ✅ | ❌ | P2-6 |

### B15. Sons / alarmes / notifications / carte

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Tons d'événement | onglets notifications + sound | `alarms` 32 clés : attacked, died, GM, murderer, pink, pm, pmgm, thief, hunter, trader + chemins `.wav` perso | 🟡 `tones` = {pet-full, sox} + `playerAlert` + rapports | **P1** : alarmes par événement (branchées sur team intel) |
| Alarme par unique | `EVENT_UNIQUE_SPAWN` | **26 clés** : `ce/ci/ds/is/ly/ro/ka/ki/me/by/tg/ur` + `range` (+ son par unique) | 🟡 team unique tracker + notices division 🚀 ; **pas de son par unique** | P1 : ton configurable par unique |
| Sons d'alchimie | — | voir B11 | ❌ | avec alarmes |
| Minimap / carte | tuiles CDN 8 019 JPG | — | 🚀 `lean-map.js` (tuiles du jeu) + couche intel team | — |
| Filtres de chat / blocage | onglet chat + filtres par canal | `chat:autoblock`, `chatuserdef`, filtres normal/private/party/guild/union/academy/global, liste anti-spam goldsellers | ❌ **non voulu** (reste lean) | rouvrir seulement si un vrai besoin apparaît |

### B16. Masteries / stat points / scrolls / équipement

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Masteries auto | « Auto Mastery: Leveling up » | — | ✅ `lean-mastery.js` | — |
| Stat points auto | — | — | ✅ `lean-statpoints.js` | — |
| Battle scrolls | — | — | ✅ `lean-scrolls.js` | — |
| Speed scroll | — | — | ✅ `lean-speed-scroll.js` (scroll starter natif +100 %/1 h, jamais un payant) | — |
| Auto-use scrolls étendus | — | `autouse_*` **11 types** : xp, sxp, str, int, hp, mp, sc, ss, hit, dodging, trigger | ❌ | P2 : xp/sxp/stat scrolls (vérifier le catalogue) |
| Buff gear / job suit swap | « Conditions: Equipping job suit » | — | ✅ `lean-buff-gear.js` | — |
| Wardrobe / avatars | « Unequipping avatar item » | — | ✅ `lean-wardrobe.js` | — |
| Switch d'arme CH en combat | — | `skills:switch*` : `switchpos`, `switchon`, `switchdelay`, `ch_switch_mainweap`, `switch_reequip_shield`, `switch_castlast` | ❌ (l'arme secondaire/bouclier est protégée du loot, pas switchée en rotation) | P2 : builds hybrides CH |
| Annulation de buff | « Canceling buff [%0] », `Conditions: Ending buff` | — | ❌ | niche (fold possible dans P0-2) |
| Bricolages client (zoom infini…) | — | `infzoom`, `multiclient`, `destealth` | ⛔ | jamais (userscript propre) |

### B17. Lure

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Auto Lure | « Auto Lure: Walking to %0, %1 » | `training:lure*` **20+ clés** : mode, fichier de coordonnées, skill, stop si X joueurs/PTG/spawn, attente au centre, `lureusehs` | ✅ `lean-lure.js` (orienté party) | 🟡 conditions d'arrêt riches (joueurs proches…) à considérer |

### B18. Scripts / routes / voyages / mall

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Moteur de scripts texte (waypoints + actions, édition en cours, reverse) | `quest,/teleport,/oldtrade,buy/AttackArea2` + 66 messages | scripts versionnés (`npc-teleport`, `teleport(x,y)`), `scriptdir1-3` | ✅ équivalent data-driven : `lean-route.js` + `gen-towns/travel/alchemy.py` | — |
| Téléporteurs / ferries | `teleport_skills`, « Failed to find teleporter » | `npc-teleport` | ✅ `lean-travel.js` | — |
| Item mall | malls Joymax/Gamegami/VTC (silk, burn-only côté compte) | — | 🚀 `lean-mall.js` : achats **prouvés en live** (budget ceiling ; refus 0x80 et poison 10 s simulés seulement) | — |

### B19. Divers bot natif ⛔ (rien à porter)

Clientless (phBot + SBotCL, bascule à chaud), gateway Joymax (file, IP limit) et OAuth
Innova/4game, proxy local 127.0.0.1 + redirection client, SOCKS4/5 (`socks*`), DynOp de SBot
(serveur d'opcodes à jour ; leçon retenue : **table d'opcodes externalisable** si OpenSRO
versionne son protocole), X-Trap/HackShield, captcha (phBot par abonnement ; SBot 3 essais),
sémaphore `Global\SBOT_..._MAX_CONCURRENT_LOGIN` multi-instances (supersédeé par le relay
team : présence, arbiter, fleet console), multiclient, Manager distant, plugins Python, LLM,
marketplace BTC/escrow, abonnements, DoT/DNS et exclusion Defender de l'installeur,
authentification captcha/mot de passe secondaire SQLite (on ne stocke aucun identifiant),
`greybar_*`, `realtimenet`, `tracecb`, anti-spam chat goldseller.

### B20. État des modules sans équivalent chez phBot/SBot (rappel)

Obstacle recovery (détours, jamais de téléport), loot SoX prioritaire (1.2.200), reconnexion
autour de la fenêtre « session ended » (jamais le bouton Confirm), team relay complet
(présence, intel carte live, tracker uniques à fenêtres de respawn, records d'hostilité,
drops partagés, sync town, claims res, console de flotte), autostart, setup guidé.

### B21. Reconnexion / login / session

| Fonctionnalité | Data phBot | Data SBot | État lean | Écart → action |
|---|---|---|---|---|
| Reconnexion / récupération de session | « credentials were not sent, reconnecting », clientless retry + traffic limit | `safecon:relogin`, `loginchar`, `autoselect_startbot[_relogin]` | ✅ `lean-reconnect.js` + `lean-session.js` (jamais le bouton Confirm de la fenêtre « session ended ») | — |
| Démarrage auto | `autostart` | `greybar_autostart` | ✅ `lean-autostart.js` | — |
| Identifiants / captcha / mot de passe secondaire / multiclient | gateway + queue + captcha | SQLite `gamelogins` (user/password/secondary), captcha 3 essais, `multiclient` | ⛔ jamais (userscript client-bound : on ne stocke aucun identifiant) | — |

---

## C. Backlog consolidé (fusion PHBOT-PORTING.md + apports SBot)

| Prio | Item | Source (data) | Valeur | Coût | Faisabilité / prérequis |
|---|---|---|---|---|---|
| **P0-3** | Ordonnanceur : heure fixe, top-of-hour, retour-puis-déconnexion | phBot `return_at[_stop]`, `return_before_next_hour(+_minutes)`, `return_and_disconnect(+_minutes)` ; SBot `disconnect_time/town/scrollback` | ★★★★☆ | faible | trivial sur `Town.reason()` + session ; débloque P2-10 et le hand-over multi-persos |
| **P0-2** | Moteur de conditions (when → do, vocabulaire fermé) | phBot 46 messages d'actions + `EVENT_*` ; y absorber P1-8 (protection) et `emerg_*` SBot | ★★★★☆ | moyen | tous les domaines d'action existent déjà en modules ; tests = messages d'erreur phBot |
| **P1** | Pills/purification perso + pet (cure) | SBot `autoabstatepill`, `abstatepill*`, `attpetautoabnormal` | ★★★☆☆ | moyen | **préalable** : vérifier états anormaux + items CURE dans le client OpenSRO (audit A2) |
| **P1** | Achat de Grass of Life | SBot `buygol`, `goltype/number` | ★★★☆☆ | faible | stable-keeper ; motif skip-if-not-sold existant (audit A1) |
| **P1** | Zerk : conditions SBot complémentaires (encerclé/esprit/potion) | SBot `zerkcond/cornered/spirit/potion` | ★★☆☆☆ | faible | le combat (jauge + classes) est déjà upstream ; ne portent que les variantes SBot |
| **P1-9** | Vendre l'excès de potions | phBot `sell_excess_potions` | ★★☆☆☆ | faible | trivial |
| **P1** | Alarmes sonores par événement et par unique | SBot `alarms` 32 + `uniques` 26 clés | ★★★☆☆ | faible | tons existants ; brancher sur team intel/tracker |
| **P1-7'** | Alchimie : Proof/Awake + éléments→pierres | phBot | ★★☆☆☆ | faible-moyen | vérifier les items dans les données du jeu d'abord |
| **P1-4** | Smart Town | phBot « Smart Town: Visiting %0 » | ★★★☆☆ | moyen | composer la course depuis `Town.reason()` ; risque = complexité de Town |
| P2-6 | Guild storage | phBot 36 messages ; SBot `guildstorage_*` | ★★★☆☆ | moyen | seulement si une guilde est utilisée ; **wire à vérifier live** |
| P2 | Switch d'arme CH en rotation | SBot `skills:switch*` (8 clés) | ★★★☆☆ | moyen | builds hybrides ; interaction buff-gear à spécifier |
| P2 | Auto-use xp/sxp/stat scrolls | SBot `autouse_*` (11 types) | ★★☆☆☆ | faible | catalogue d'items à confirmer |
| P2 | « Noise »/skills de vitesse au walk-back | SBot `walkback:*cast*`, `castnoise` | ★★☆☆☆ | faible | SpeedScroll couvre la vitesse ; noise = rogue |
| P2 | Matching : recherche/adhésion + union party | SBot `partymatching_*`, `autopt*` ; phBot `union_party` | ★★☆☆☆ | moyen | si l'équipe en use ; vérifier l'existance d'union côté OpenSRO |
| P2-12 | Pet organize (combine + moves) | phBot « Pet: Organize finished » | ★★☆☆☆ | faible-moyen | — |
| P2-13 | Déconnexion « aucun mouvement serveur » | phBot « No movement confirmed… » | ★★☆☆☆ | faible | variante en action de conditions |
| P2 | Consommation d'items d'événement | SBot AutoEvent, 171 codes `EVENT_*` | ★★☆☆☆ | moyen | dépend de ce qu'OpenSRO fait tourner comme événements |
| P2-10 | Quêtes événement / quotidiennes horaires | phBot `quest_event`, `return_before_next_hour` | ★★★☆☆ | moyen | après P0-3 + constat de l'offre réelle d'événements |
| P2-11 | Mieux équipé automatiquement | phBot « Equipping better item » | ★★★☆☆ livré | fait | **PR #86** : vraies stats + remplacé stocké au warehouse (spec B validée par l'utilisateur) |
| P3-14 | Académie | phBot | ★☆☆☆☆ | moyen | existe sur OpenSRO ? |
| P3 | Exchange joueur (timeout) | SBot | ★☆☆☆☆ | faible | besoin couvert par stall |

P1-5 (migration de zone par niveau) et la moitié de P1-7 (cible + limite) sont **clos** depuis
PHBOT-PORTING.md (levelSpots #76 ; `alchemy.target/limit`). P0-1 Auto Quest est livré
(1.8.x + upstream 1.2.197-199).

## D. Ne pas importer

Anti-cheat officiel (X-Trap, HackShield, captcha), clientless/gateway/OAuth, proxy/SOCKS,
multiclient, monétisation (BTC, abonnements), plugins Python, LLM (la couche team/knowledge
joue ce rôle), chat complet, PvP ciblé, Manager distant, minimap CDN (tuiles du jeu
disponibles), navmesh phBot chiffré, bricolages client (`infzoom`, `destealth`), Forgotten
World / Magic POP / taxi, invitations de masse guild/académie.

## E. Ce qui a déjà été repris des dumps (à jour de ce jour)

| Apport des dumps | État |
|---|---|
| navdata SBot (décodage complet) | ✅ intégrée : `navdata-lean/` (53 fichiers), `lean-navdata-index.js`, consommée par route/route-check/walkback |
| Marteau de réparation (SBot `userepairhammer`) | ✅ `lean-repair-hammer.js` |
| Spots par niveau (phBot « changing training area for level ») | ✅ `lean-levelspot.js` (upstream #76) |
| Trace/follow + assist (SBot `trace*`) | ✅ `lean-trace.js` + team assist |
| Party matching (SBot `partymatching_*`) | 🟡 approbation corrélée (fork) |
| Retour périodique (phBot `return_every`) | ✅ `town.every` |
| Alchimie cible/limite (phBot « Achieved maximum ») | ✅ `alchemy.target/limit` |
| Auto Quest (phBot §1.2) | ✅ 1.8.x + picker upstream |
| Priorité SoX (—) | ✅ 1.2.200 |
