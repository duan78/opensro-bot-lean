# PHBOT-PORTING.md — what to take from phBot (v20.1.6) and what not to

Analysis of a reverse-engineered phBot dump (ProjectHax LLC, stable v20.1.6, 2026-11).
The dump lives outside this repository; behaviour was reconstructed from ~4 400 config
keys and ~1 500 runtime strings extracted from the decrypted memory image, so every
"phBot does X" below is an informed reconstruction, not decompiled logic. Game-side
feasibility was checked against the OpenSRO source checkout (`../opensro`, read-only
reference; the live server may be ahead of it — the stall contract precedent).

Companion analysis (not in this repo): `FEATURES.md`, `RAPPORT.md` of the dump.

## Already covered here (do not port)

| phBot feature | Our equivalent | Note |
|---|---|---|
| Navmesh A* (per-region .bin, encrypted) | `lean-clipper.js` uses the game's own movement clipper | Ours cannot be wrong by construction; the dump's navmesh is unusable without its loader. |
| CDN minimap tiles (8 019 JPG) | `lean-map.js` renders the game's own tiles | No CDN dependency worth adding. |
| Clientless / gateway / queue / traffic limit | N/A — we run inside the client page | Out of scope for a userscript. |
| Auto potions, vigor, pet kits, pet HGP | potion logic + `lean-pet-potion.js`, `lean-pet.js` | Live-reviewed upstream. |
| Attack pet summon/recall/revive | upstream 1.2.187 attack pet assist | Merged. |
| Targeting filters (types, level min/max, priority, anti-KS) | `hunt.classes`, `levelMin/Max`, `include/exclude`, `priority`, `avoidKs` | Covered; only fine per-monster ordering is missing (low value). |
| Training area, radius, return to centre, chase | `hunt.*`, `lean-chase.js`, `lean-walkback.js` | Covered. |
| Auto Lure | `lean-lure.js` | Covered, party-oriented. |
| Return triggers: bag/pet full, potions, ammo, broken weapon, durability, inactivity | `Town.reason()` (incl. `noXp`, better than "not attacked") | ~80% covered; the gaps are P0-3 below. |
| Repair, per-merchant buy, sell, warehouse | `restock.js`, `Town`, `lean-items.js` | Ours confirms server-side transactions. |
| Alchemy elixirs + Lucky/Steady/Immortal/Astral | `lean-alchemy.js` + generated chances | See P1-7 for the remainder. |
| Stall | `lean-stall.js` (live-verified wire contract) | Simulation-tested only, as shipped. |
| Trade caravans | `lean-trade.js` | Covered in the main line. |
| Teleporters / ferries | `lean-travel.js` | Covered. |
| Party, party buffs/heals, resurrect | `lean-party.js`, `lean-support.js`, `lean-resurrect.js` | Ours is more conservative (effect confirmation). |
| Auto masteries, auto stat points | `lean-mastery.js`, `lean-statpoints.js` | One confirmed point at a time. |
| Buff gear / job suit swap | `lean-buff-gear.js` | Covered. |
| Battle scrolls, item mall | `lean-scrolls.js`, `lean-mall.js` 1.7.0+ | Live-proven purchases; phBot has nothing like it for a private server. |
| Reconnect / login recovery | `lean-reconnect.js`, `lean-session.js` | Covered. |
| Statistics, sounds, player alert | `lean-stats.js`, `tones`, `playerAlert`, `lean-reports.js` | Covered. |
| Wardrobe / avatars | `lean-wardrobe.js` | Covered. |

## Import candidates, ranked

| # | Candidate | Value | Cost | Feasibility | Preconditions / risks |
|---|---|---|---|---|---|
| **P0-1** | **Auto Quest (hunt/collect)** — phBot's flagship | ★★★★★ | High | Good: the OpenSRO client already ships the full contract (NPC dialogue statechart, quest journal, accept 0x71EB / reward 0x729A, markers) | Quest definitions source; verify opcodes live before trusting the checkout (stall precedent). |
| **P0-2** | Conditions engine (`when → do` rules) | ★★★★☆ | Medium | Very good: every phBot action maps to a module we already have | Keep it lean: closed action vocabulary, JSON rules, no arbitrary scripting. |
| **P0-3** | Return scheduler: fixed time (`return_at`), top-of-hour alignment (`return_before_next_hour`), return-then-disconnect | ★★★★☆ | Low | Trivial on top of `Town.reason()` | None; prerequisite for recurring/event quests and clean multi-character session hand-over. |
| P1-4 | Smart Town (compose the town trip from the services actually needed) | ★★★☆☆ | Medium | Good (`restock.js` + `gen-towns.py`) | Watch `Town` complexity. |
| P1-5 | Auto training-area migration by level | ★★★☆☆ | Medium | Good, but the zone table must be hand-curated | A wrong table makes the bot wander. |
| P1-6 | Guild storage (deposit/withdraw, lock handling) | ★★★☆☆ | Medium | Good (same shape as warehouse) | Only if we actually use a guild; verify the wire live. |
| P1-7 | Alchemy remainder: stop at target +N, Proof/Awake stones, element→stone crafting | ★★★☆☆ | Low-medium | Fits `lean-alchemy.js` | Verify those stones/elements exist in OpenSRO's item data first. |
| P1-8 | Protection policies (disconnect/stop on player attacking, GM spawn, murderer status) | ★★★☆☆ | Low | Very good: detections exist (`playerAlert`, team intel) | Fold into P0-2 as conditions instead of a dedicated module. |
| P1-9 | Sell excess potions | ★★☆☆☆ | Low | Trivial | QoL. |
| P2-10 | Event/recurring quest scheduler | ★★★☆☆ | Medium | Unknown until P0-1 exists | Depends on what OpenSRO actually offers. |
| P2-11 | Auto-equip better items | ★★☆☆☆ | Medium | Medium (stat comparison) | Mis equip risk; low interest if gear is played by hand. |
| P2-12 | Pet organize (combine + bag↔pet moves) | ★★☆☆☆ | Low-medium | Good | Pickup and town moves already exist. |
| P2-13 | No-server-movement watchdog → disconnect | ★★☆☆☆ | Low | Trivial variant of `antistuck` | Defensive extra. |
| P2-14 | Academy / union party | ★☆☆☆☆ | Medium | Unknown (does the server have academies?) | Only if the team uses them. |
| P3-15 | Autoconfigure (profile from character) | ★☆☆☆☆ | Low | Good | `lean-setup.js` already covers most of it. |

## Do not import

| phBot feature | Why not |
|---|---|
| X-Trap / HackShield handling, subscription captcha solving | Official-server anti-cheat countermeasures; out of scope, and OpenSRO has no use for them. |
| BTC marketplace, subscriptions, remote Manager, Python plugin system, LLM tab | Product/monetisation infrastructure; contrary to a lean userscript. The team/knowledge layer covers the assistant role our way. |
| Clientless, Joymax/Innova gateway, OAuth 4game, DoH/DNS rewrite, silent Defender exclusion | Native multi-publisher architecture; inapplicable and unwanted in a browser page. |
| Forgotten World, Magic POP, taxi, bulk guild/academy invites | Official-server scope; revisit only if OpenSRO ships it and we use it. |

## Data assets from the dump

| Artefact | Verdict |
|---|---|
| `features/*.txt` (keys + runtime messages) | Keep as a test matrix: every phBot error message is a failure path our state machines should cover (AGENTS.md "Test state-machine failure paths"). |
| Plugin event list (EVENT_*) | Keep: blueprint for the P0-2 event vocabulary and team-intel detections. |
| navmesh/ (encrypted per file) | Useless here; the native clipper is better. |
| minimap.zip | Useless online (we render the game's tiles); offline fallback at best. |

## Recommended order

1. P0-3 scheduler (hours; unblocks the rest).
2. P0-2 conditions, minimal closed vocabulary; test matrix = phBot error messages.
3. P0-1 Auto Quest in three steps: (a) live read-only probe of the quest/dialogue
   opcodes from the userscript, (b) definitions discovered from the live journal and
   markers, (c) hunt/collect state machine with server-confirmation guarantees.
4. P1 in order 7 → 5 → 4 → 6 → 9.
