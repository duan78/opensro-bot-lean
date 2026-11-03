# tools/llm — outillage LLM local (LLM-ROADMAP.md, phases L0/L1/L2/LJ)

Tout tourne contre le serveur LM Studio du réseau local (OpenAI-compatible).
Configuration par variables d'environnement :

```bash
LMSTUDIO_URL=http://127.0.0.1:1234     # défaut ; mettre l'adresse de votre serveur
LLM_MODEL=qwen/qwen3.8-27b              # modèle principal (défaut)
LLM_VISION_MODEL=qwen2-vl-7b-instruct   # modèle vision (défaut)
```

| Fichier | Phase | Rôle |
|---|---|---|
| `client.mjs` | L0 | Client OpenAI-compatible : `reasoning_effort`, `json_schema` strict (décodage contraint), streaming TTFT, timeouts. **Le schéma JSON est le canal d'action ; le tool-calling libre ne l'est pas** (bench : 2/3) |
| `bench.mjs` | L0.2 | Bench complet : TTFT stream, 20× JSON valide, tool-calling, sonde de contexte, vision (tuile minimap réelle). Résultats consignés dans `notes/llm/BENCH.md` |
| `state/` | L1 | Schémas d'état versionnés (ce que le LLM a le droit de voir) + samples + règles de rédaction/anti-injection |
| `eval/golden.json` | L0.5 | Jeu doré : 12 incidents réels vécus par le bot (symptômes + faits + cause racine attendue) |
| `eval/adversarial.json` | L0.5 | Cas adverses (injection, dépassements de plafond, hors whitelist, duplication, dégradation) — fixtures pour le fuzz de L3/LS/L5 |
| `diagnose.mjs` | L2 | Diagnosticien : lit un cas (ou `--eval` tout le jeu doré), exige des **citations [F#]**, refuse les faits inventés, note top-1 strict/large + hallucinations de citation |
| `journal.mjs` | LJ | Distillateur de journal par personnage : résumé mesuré → journal compact **réécrit** (jamais empilé), contradictions écrasées, faits mesurés seulement, cap dur 6 000 caractères. `--selftest` = Go/No-Go de la fiche (5 sessions chaînées) |

## Règles d'usage (issues de la route §0.2)

1. **Une requête à la fois** (27B dense) ; jamais de taches entrelacées texte/vision (la
   bascule de modèle coûte ~10-15 s, cf. BENCH.md).
2. `reasoning_effort` : `"none"` pour tout ce qui est interactif, `"low"` pour l'analyse ;
   **jamais** le défaut (thinking non-terminatif).
3. `finish_reason === 'length'` avec contenu vide = échec → rejouer en `low`/`none`.
4. Prefill long = goulot (12k tokens ≈ 1-2 min) : les contextes restent < 10k tokens.

## Exemples

```bash
node tools/llm/bench.mjs --quick          # bench court
node tools/llm/diagnose.mjs --case 1      # un incident, réponse citée
node tools/llm/diagnose.mjs --eval        # jeu doré complet + verdict Go/No-Go
node tools/llm/journal.mjs --selftest     # 5 sessions chaînées, vérifie cap/écrasement
```
