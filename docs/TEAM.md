# Team edition — the multi-character plan

This fork (`duan78/opensro-bot-lean`) extends the lean bot with a **team layer**: a private,
player-operated relay that lets several characters share what they see and coordinate. The base
bot stays untouched in behaviour until the Team page is configured; with the relay off or
unreachable, everything works exactly as before.

## Design rules

1. **The relay is an enhancement, never a dependency.** A bot alone must behave exactly like
   the lean bot. Relay down ⇒ silently fall back; hunting never stops or waits on it.
2. **The game stays authoritative.** The relay carries observations and intents between bot
   instances. It never proxies game commands: every action still goes through the local `Cmd`
   layer with its own rate limits and refusal handling. A compromised relay can, at worst,
   suggest safe high-level actions (go to town, regroup); it cannot press game buttons.
3. **Independent services.** The team bus runs with hunting stopped, across world transitions
   and character switches. Party automation already must not depend on hunting; neither does
   the team layer.
4. **Room key = trust circle.** One shared secret per group of characters (the "room key").
   Nothing fancier until there is a reason.

## What the game gives us (verified against the OpenSRO source)

Read-only analysis of the game server (Go) and client engine contracts, which grounds every
later phase:

- **Entity gids are the cross-client key.** Players: `100000 + characterID` (deterministic).
  Monsters: one server-wide counter, never reused within a process lifetime. Caveat: a server
  restart resets the monster counter — shared monster intel must carry short TTLs (a restart
  also disconnects everyone, which flushes live state naturally).
- **Three detection radii per client**, all of them worth reporting:
  1. the interest view (320-unit blocks, 3×3 neighbourhood ≈ ±640 units; a dungeon region is
     one block),
  2. division-wide broadcasts received *without seeing anything*: unique spawn/death notices
     (`0x3058`, by RefObjID), monster HP ticks from damage-over-time, and the optional beta
     player map (`0x3FB0`, flag `SRO_BETA_PLAYER_MAP`, all players every 2 s),
  3. party data (member positions and HP/MP tenths every second, regardless of distance).
- **Who attacks what is observable.** Cast packets (`0xB245`) carry caster gid, target gid and
  exact per-hit damage, and are delivered to every client that has the *caster* in view — so
  a fight can be known even when the target itself is out of view. There is no target-of-
  target; assist is inferred from casts.
- **Monster HP is exact on selection** (`0x745A` → `0xB45A`) and on DoT ticks; otherwise it is
  an estimate summed from cast damage. Shared HP is always labelled an estimate.
- **Dead bodies persist** until the server despawns them (a stable window for coordinated
  resurrection).
- The game's own commands include `chat`, `party-invite/leave/kick`; the lean build strips
  them. If an in-game channel is ever wanted, it is a deliberate re-add, not a discovery.

## Architecture

```
TeamBus       transport: one WebSocket, rooms by key, reconnect/backoff, heartbeats   [phase 1 ✓]
TeamIntel     live shared world: entity digests, combat edges, unique sightings       [phase 2]
TeamKnowledge persistent, versioned: unique tracker, player DB, drops, learnings      [phase 3]
TeamArbiter   decisions: squads, roles, policies, etiquette, spot claims              [phase 4]
              coordinated cycles (town window, deterministic res) + fleet console     [phase 5]
              missions: party composition, unique hunts, job caravans                 [phase 6]
```

**The team is defined by the relay, not by the game party.** Fleet → squads (each with a
mission) → characters with roles (tank, healer, buffer, dps, puller, scout, mule,
coordinator). Roles are inferred from the observed build (masteries/skills), manually
overridable, several per character. The coordinator is a role with deterministic succession
(lowest characterID), not an election; coordination may also come from a fleet console served
by the relay. The in-game party is a tool the orchestrator composes (Auto Share 8 / Each Get 4,
weighted exp, item rotation), not the source of truth.

**Two visibility lanes.** A private lane (the room, everything flows) and an optional public
pool: per-class "share with everyone" checkboxes — unique notices and sightings, monster
presence, zone occupancy, player observations, drop logs — while own live state (position,
build, inventory) and all coordination stay private. Public entries stay attributed to their
source, private beats win conflicts over public claims, and server-announced events (unique
notices) outrank individual sightings.

**Display.** The existing map (`lean-map.js`) gains a shared layer: same pictograms, reduced
opacity, fading with age, source on hover; pinned uniques; a Team panel listing peers, zones
and states; toasts and sounds for unique spawns and contacts. All of it works with hunting
stopped — the extension is useful on its own.

## Phase 1 — presence (implemented)

`lean-team.js` + the Team page + `relay/` (reference server). Each character announces
`{hunting, alive, mode, level}` every 5 s; peers expire after 15 s of silence; reconnects
back off 5→60 s; every failure path degrades to "team relay off" behaviour. Settings are
per character (`team: {enabled, url, token}`), stored under the usual profile prefix.

Tested in simulation only (`lean.test.cjs`, fake WebSocket): connect/hello/welcome, beats and
peer expiry, `wss://` enforcement, backoff, room-key change, relay errors, off-switch, and
that hunting still starts with the relay failing. A live check against a real relay is still
to do.

## Verification honesty

Everything so far is verified by reading the game source and by mocked tests — neither is a
live-server confirmation. Each phase's notes must say what was only simulated. The relay URL
and room key are the player's own infrastructure; the bot never connects anywhere else.

## Fork maintenance

- Update URLs (`build-lean.py`, `lean-update.js`) point at `duan78/opensro-bot-lean`, so
  Tampermonkey updates pull the fork's builds, never the upstream lean bot over this one.
- Upstream (`nixxane/opensro-bot-lean`) remains the source for the base modules; rebase
  regularly, keep team code in `lean-team*.js` and the small integration points (settings
  key, one guard call in the controller, UI page, boot export) minimal so merges stay clean.
- `relay/` is the one place with a `package.json` (the userscript itself stays bundler-free,
  plain JavaScript); the reference relay uses `ws` and nothing else.

## Open decisions (with the fork owner)

- Amend the base repo's AGENTS.md "no radar" rule deliberately when phase 2 lands: proposed
  wording — *an opt-in team intel layer shared through the player's own relay is allowed; the
  old self-contained radar panel stays out*. Until then, phase 1 changes nothing observable.
- Privacy posture: phase 3's player observations carry other players' names/positions to the
  player's own relay; the diagnostics "omit names and locations" promise needs a matching
  sentence here.
- Whether the beta player map flag is enabled on the target server (it would give every
  client all players in the division natively).
