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
  `REQUIRED_WORDS_PER_LEVEL` (currently 5 nouns / 2 verbs / 2 adjectives per level). The
  lowest group wins, so you can't level up on nouns alone.
- Levelling up unlocks **branching**: a node can grow a neighbour in one of four directions
  (N/E/S/W) once it has enough levels per existing link.
- Each word carries **three translations** — the two languages you're learning, plus English
  as the pivot in the middle. Currently French / English / Swedish, hardcoded in two places
  (see `TECH_DEBT.md`, T4 "configurable languages").
- **AUTO** fills the two outer columns from the English one via an API. API is a simplest
  free API found, produces bad results, but works as a placeholder for now.
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
3. **State is derived from an action log.** `localStorage` holds
   `{schema, base, log}` — a base snapshot plus an append-only list of actions — and load is
   `log.reduce(nodesReducer, base)`. Actions must be **deltas, not snapshots**, or replay
   writes stale data back.

## Where the code lives

- `src/data.ts` — types + demo vocabulary (most of its length is the data)
- `src/helpers.ts` — `createNode`, `getNodeLevel`, the levelling constant
- `src/nodesReducer.ts` — every state transition: `addNode` / `edit` / `delete` / `set` /
  `addWords`
- `src/storage.ts` — the event-sourced `localStorage` layer
- `src/App.tsx` — wiring; `dispatch` wraps `dispatchNodes` so every action is logged
- `src/components/Map/` — layout, rendering, branch buttons
- `src/components/SideMenu/` — the node panel: `WordList` (read) and `WordAdd` (write)
- `src/components/DebugPanel/` — dev-only escape hatches; currently ships to production

## Invariants

There are four rules the code quietly depends on — the graph stays connected, every node is
reachable from any anchor, links are symmetric, and the action log stays replayable. They are
not enforced anywhere, and breaking one causes nodes to silently disappear rather than throw.
**`TECH_DEBT.md` has them written out with the exact conditions currently holding each one up.
Read that section before changing delete, branching, or the reducer.**

## Where it is right now

The core loop works end to end: add words → gain a level → the node grows → branch to a new
place, and it all survives a reload. `tsc -b` and `prettier` are clean. `npm run lint` reports
three errors, all from one deliberately commented-out block in `Map.tsx` — see `TECH_DEBT.md`,
T2.3.

Built but unfinished: TRAIN, EDIT, delete-a-titled-node, examples in the add form, search,
zoom, inner maps.

```
npm run dev      # vite
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run prettier # prettier . --write
```
