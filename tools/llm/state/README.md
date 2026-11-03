# State schemas (LLM-ROADMAP L1)

What an LLM is allowed to see of the bot, as versioned JSON. Rules:

1. **Structured state, never pixels and never raw dumps** — every consumer builds one of
   these documents and only these documents.
2. **Redaction like the bug reports**: no player names, no chat text, no coordinates in
   `botStatus`/`sessionStats`/`reports` (the existing reports already omit them; keep it
   that way). Anything taken from the game is a *data field*, never instructions.
3. **No secrets**: room tokens, account data, silk balance are absent by design; if a
   field does not exist here, no tool may send it.
4. **Versioned**: each document carries `schema`; consumers reject unknown major bumps.
5. **Samples**: `samples/` holds one realistic, fully redacted example per schema, used
   by the eval harness and as living documentation.

| File | Contents | Main consumers |
|---|---|---|
| `botStatus.schema.json` | Per-character settings digest, current phase, last controller messages | L2 diagnose, L3 config copilot |
| `sessionStats.schema.json` | Kills, XP/h, gold, deaths, return reasons, phase durations | L2, LJ journal, LS supervisor |
| `reports.schema.json` | The existing anonymous bug-report payload, as sent by lean-reports | L2 |
| `fleetSnapshot.schema.json` | Relay-side view: presence beats, digests, unique notices, KV (fork only) | L5 arbiter |
| `economy.schema.json` | Mall catalogue digest, stall sales, gold flow | L7 economy |

Regenerate nothing automatically yet: the producers land with L2/L3; today the schemas
are contracts plus hand-built samples, so the eval fixtures and the journal self-test
already target the real shapes.
