# BENCH.md — Smoke test Qwen3.8-27b (L0.1/L0.2 partiels)

**Date : 2026-11-03** · Serveur : LM Studio `serveur LM Studio du LAN (adresse locale)` (LAN, pas d'auth
observée) · Modèle identifié : **`qwen/qwen3.8-27b`** (le « 37B » était une confusion de
nom ; aucun 37B n'existe dans la famille Qwen). Contexte configuré côté serveur : **32k
tokens** (fenêtre pratique — le natif 256k du modèle n'est PAS servi ici).

Ce document est le smoke test d'accès (10 requêtes). Le bench complet L0.2 reste à faire
(voir « En attente » en bas). Règle d'honnêteté habituelle : mesures d'un soir, une session,
aucune charge concurrente.

## Résultats

| # | Test | Réglage | Résultat | Temps |
|---|---|---|---|---|
| 1 | Question triviale FR | défaut (thinking ON) | ✅ réponse correcte, 55 tokens de raisonnement | 1,4 s |
| 2 | `chat_template_kwargs.enable_thinking:false` | — | ❌ **ignoré** (57 tokens de raisonnement) | 1,1 s |
| 3 | JSON schema strict | thinking ON, max_tokens 300 | ❌ contenu vide : 300/300 tokens en raisonnement, `finish: length` | 3,6 s |
| 4 | Soft-switch `/no_think` dans le message | — | ❌ **ignoré** (48 tokens de raisonnement) | 1,3 s |
| 5 | `enable_thinking:false` top-level | — | ❌ **ignoré** (65 tokens de raisonnement) | ~1 s |
| 6 | **`reasoning_effort:"none"`** | — | ✅ **thinking OFF** (0 token de raisonnement, réponse en 13 tokens) | ~1 s |
| 7 | JSON schema | thinking ON, max_tokens 800 | ❌ 800/800 en raisonnement, contenu vide | 9,7 s |
| 8 | **JSON schema + `reasoning_effort:"none"`** | max_tokens 300 | ✅ JSON strict **valide**, `finish: stop` | **1,4 s** |
| 9 | JSON schema | thinking ON, max_tokens **2500** | ❌ **non-terminaison** : 2500/2500 en raisonnement circulaire (9 000 caractères), contenu vide, coupé en pleine phrase | 26 s |
| 10 | **JSON schema + `reasoning_effort:"low"`** | max_tokens 1500 | ✅ raisonnement **conclu** (768 tokens), `finish: stop`, JSON valide | 11 s |

## Enseignements

1. **Le seul interrupteur de thinking qui fonctionne sur ce serveur est
   `reasoning_effort`** (`"none"` / `"low"` honorés). Sont ignorés :
   `chat_template_kwargs.enable_thinking`, le soft-switch `/no_think` du message, et
   `enable_thinking` top-level.
2. **Le thinking par défaut ne termine PAS sur les questions ouvertes** : à 300, 800 et
   2500 tokens de budget, il a tout brûlé en raisonnement sans jamais produire la réponse
   (test 9 : 26 s pour rien). Ce n'est pas un problème de budget mais de non-terminaison —
   le comportement « réflexion excessive » documenté pour Qwen3.8. Sur question triviale
   en revanche, il reste court (~50 tokens) et conclut.
3. **Débit mesuré : ~83 tok/s en génération** (test 7 : 800 tokens en 9,65 s, préfill et
   réseau inclus) — nettement au-dessus des 25-35 tok/s de référence GPU 24 Go. Latence
   bout-en-bout d'une réponse courte : ~1,4 s.
4. **JSON structuré (`json_schema` strict) fiable** dès que le thinking est maîtrisé
   (tests 8 et 10 valides du premier coup).
5. **Connaissance SRO du modèle brut = hallucinée** : question sur les uniques →
   « Sword of the King », « Aegis », « Ragnarok » (inexistants ; les vrais : Tiger Girl,
   Uruchi, Isyutaru, Lord Yarkan…). Confirme la règle LLM-ROADMAP : **toute connaissance
   jeu passe par le RAG L6 sourcé**, jamais la mémoire du modèle.
6. **Fenêtre pratique = 32k** (config serveur), pas 256k : le RAG L6 devra **chunker/indexer**
   le corpus au lieu de le mettre en contexte entier — ajustement par rapport à la
   première version de LLM-ROADMAP.

## Profils recommandés (ajuste L0.4 de LLM-ROADMAP)

| Profil | Réglage | max_tokens | Timeout | Usage |
|---|---|---|---|---|
| **interactif** | `reasoning_effort:"none"` | 300-800 | 5 s | copilote config (L3), suggestions flotte (L5) |
| **analyse courte** | `reasoning_effort:"low"` | 1 500 | 30 s | briefs, diagnostics simples (L2), RAG (L6) |
| **analyse profonde** | thinking par défaut | ⚠️ à éviter en l'état : non-terminaison | — | si vraiment nécessaire : gros budget + **vérifier `finish_reason`** + repli automatique en `low` |

Règle générale : toute réponse avec `finish_reason:"length"` et `content` vide = échec
dû au thinking → rejouer en `low` ou `none`.

## En attente (bench complet L0.2) — FAIT le 2026-11-03 (`tools/llm/bench.mjs`)

| Test | Résultat | Note |
|---|---|---|
| Modèles servis | 23 | `qwen/qwen3.8-27b` résident |
| **TTFT stream** (`none`) | **710 ms** · 8,1 s total | usable interactif ; finish=stop |
| **TTFT stream** (`low`) | 1 996 ms · 31,5 s total | le thinking consomme ; réservé à l'analyse |
| **JSON strict valide** | **20/20 (100 %)** | critère L0 (≥ 95 %) atteint ; pire latence 4,9 s |
| **Tool-calling natif** | **2/3** | confirme la route §0.2 : le canal de production reste le schéma JSON |
| **Sonde contexte** | extraction correcte | 12 369 tokens réels · **59-101 s** — le prefill long est LE goulot |
| **Vision** (`qwen2-vl-7b-instruct`) | terrain lu correctement | **2,9 s** modèle résident / **15,7 s** après chargement |

Enseignements L0.2 :
1. **Coût de bascule de modèle ~10-15 s** : les latences d'un même test varient du simple
   au décuple selon le modèle résident (JSON 0,9 s → 4,9 s quand qwen2-vl revenait).
   Conséquence : la file L0.4 épingle un modèle principal ; les taches vision sont
   groupées, jamais entrelacées avec les taches texte.
2. **Prefill long = goulot majeur** : 12k tokens ≈ 1-2 min. Les budgets « analyse » à
   10-30k tokens de LLM-ROADMAP §7 sont optimistes sur ce serveur : les diagnostics
   doivent chunker (ne pas envoyer les notes entières) et la sonde reste < 10k.
3. Streaming : TTFT sub-seconde en `none` → la boucle supervision (LS) est confortable ;
   `low` en stream = 30 s → travaux différés uniquement.
4. `stream_options.include_usage` non géré par ce serveur : les compteurs d'usage
   manquent en streaming (temps total seul) — non bloquant.

