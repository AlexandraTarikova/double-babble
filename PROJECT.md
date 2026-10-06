# double-babble — project brief

A vocabulary-map language-learning game. Personal pet project: a portfolio piece, and a way
to learn React and TypeScript properly by writing them.

This file exists so a fresh conversation doesn't have to be re-explained from scratch. Short
on purpose. `TECH_DEBT.md` is the long-form companion — current issues, decisions and the
reasoning behind them.

## Working agreement

**I write and commit the code myself. That's the whole point of the project.** What's wanted from an
assistant:

- best-practice advice, explanations, code review, debugging help
- verification — check claims against the actual code and actual behaviour, don't guess from
  memory
- hand me the change and let me apply it

**No editing, creating or deleting files unless I explicitly ask.** Scratch work goes in
`/tmp`. The two exceptions, which are fair game to edit when asked: `TECH_DEBT.md` and this
file.

## The concept

You build a **map of places** — Forest, Village, Castle — and each place holds the vocabulary
that belongs to it. Learning vocabulary is what makes the map grow.

- A **node** is a place. It holds words grouped into nouns / verbs / adjectives.
- A node's **level** comes from how many words it holds, measured against
  `REQUIRED_WORDS_PER_LEVEL` (currently 2 nouns / 1 verb / 1 adjective per level). The
  lowest group wins, so you can't level up on nouns alone.
- Levelling up unlocks **branching**: a node can grow a neighbour in one of four directions
  (N/E/S/W). Each new branch costs `LEVELS_REQUIRED_PER_LINK` (3) more levels; the link back
  to the parent doesn't count, and a lone root node gets its first branch for free.
- Each word carries **three translations** — the two languages you're learning, plus English
  as the pivot in the middle. Currently French / English / Swedish, declared once in
  `data.ts` as `languageL` / `languageC` / `languageR` (see `TECH_DEBT.md`, T4 "configurable
  languages" for what's still hardcoded).
- **AUTO** fills the two outer columns from the English one via an API. API is a simplest
  free API found, produces bad results, but works as a placeholder for now.
- **TRAIN** hides the outer translations; you reveal one, then grade yourself
  `[✔]` / `[~]` / `[x]` (1 / 0 / -1). Each grade is appended to that word pair's history.
- **PROGRESS** shows the last five grades per word pair as a row of dots. Only the "general"
  tab exists; "errors" and "time" are disabled placeholders.
- `innerNodeIds` is a placeholder for the eventual "zoom into a node's own map" feature.
  Unused so far.

The rigidity is deliberate: you add words in fixed-size batches, so the game makes you learn
verbs and adjectives instead of hoarding nouns. Whether that stays is an open design question,
written up in `TECH_DEBT.md`.

## Stack

React 19 + TypeScript, Vite, MUI v7 with Emotion `styled`. No router, no state library, no
tests, no backend — state lives in a `useReducer` and persists to `localStorage`. Visual style
is deliberately retro/terminal.

## Three architectural bets, all the same shape

Each one replaces stored state with a function of other state. This is the main idea in the
codebase, and worth knowing before suggesting anything:

1. **Layout is derived from links.** Nodes have no coordinates. `calculateAllPositions`
   (`Map.tsx`) walks the link graph from an anchor node and computes a grid position for
   everything it reaches, then the render normalizes by the minimum. Consequence: a node the
   walk can't reach has no position and renders as nothing.
2. **Level is derived from word counts.** `getNodeLevel(node)` (`helpers.ts`). There is no
   `level` field — it was deliberately deleted, so there's nothing to keep in sync, and the
   levelling rule is retuned by editing one constant.
3. **State is derived from an action log.** `localStorage` key `nodesHistory` holds
   `{schema, base, log}` — a base snapshot plus an append-only list of actions — and load is
   `log.reduce(nodesReducer, base)`. Actions must be **deltas, not snapshots**, or replay
   writes stale data back.

**The one deliberate exception: training results.** They live in a second key,
`wordStrength`, as a plain snapshot — `Record<key, {results, lastCheck}>` rewritten whole on
every grade, no log, no schema, outside the reducer. Records are keyed by **word text**
(`getWordKey`, `helpers.ts`), not by any id — words don't have ids. So the same word pair in
two nodes shares one record, and changing a word's text orphans its history.

## Where the code lives

- `src/data.ts` — types, the language triple, and an old copy of the demo map (now unused)
- `src/nodesDemo.ts` — the demo map `DebugPanel` loads (new, not committed yet)
- `src/helpers.ts` — `createNode`, `getNodeLevel`, the levelling constant, `getWordKey`
- `src/nodesReducer.ts` — every state transition: `addNode` / `edit` / `delete` / `set` /
  `addWords`
- `src/storageHistory.ts` — the event-sourced `nodesHistory` layer (was `storage.ts`)
- `src/storageStrength.ts` — the `wordStrength` training store
- `src/App.tsx` — wiring; `dispatch` wraps `dispatchNodes` so every action is logged
- `src/components/Map/` — layout, rendering, branch buttons, the branch gate
- `src/components/SideMenu/` — the node panel. `SideMenu` owns the mode
  (`initial` / `words` / `levelUp` / `train` / `progress`) and switches between `NewTitle`
  (naming a new node), `TitleBlock` (title + level + `[+]`), `WordList` (read), `WordAdd`
  (write), `TrainView` (exports `TrainMode`) and `ProgressView`. `LanguageHeader` is the
  shared three-column header.
- `src/components/DebugPanel.tsx` — dev-only escape hatches (reset map, load demo,
  generate / reset training data); currently ships to production

## Invariants

There are four rules the code quietly depends on — the graph stays connected, every node is
reachable from any anchor, links are symmetric, and the action log stays replayable. They are
not enforced anywhere, and breaking one causes nodes to silently disappear rather than throw.
**`TECH_DEBT.md` has them written out with the exact conditions currently holding each one up.
Read that section before changing delete, branching, or the reducer.**

## Where it is right now

The core loop works end to end: add words → gain a level → the node grows → branch to a new
place, and it all survives a reload. TRAIN v1 and PROGRESS "general" work on top of it.
`tsc -b`, `prettier` and `npm run lint` are all clean **in the working tree** — the branch
gate is switched back on there, which is what cleared the last three lint errors, but that
isn't committed yet (as of 2026-10-06).

Built but unfinished: EDIT, delete-a-titled-node, examples in the add form, PROGRESS
"errors"/"time", search, zoom, inner maps.

Next up, deliberately: **pause features and make the UI responsive.** It currently assumes a
wide screen. Starting notes are at the bottom of `TECH_DEBT.md`.

```
npm run dev      # vite
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run prettier # prettier . --write
```
