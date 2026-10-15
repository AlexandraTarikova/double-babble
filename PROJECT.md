# double-babble — project brief

A vocabulary-map language-learning game. Personal pet project: a portfolio piece, and a way
to learn React and TypeScript properly by writing them. **As of 2026-10, also the project for
learning backend / fullstack** — a server is being added to apply what I learn as I go, not
because the game needs one.

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
- **Inner maps** (MVP): ZOOM into a node to see its own map of places — the Cabin inside the
  Forest. Strictly one level deep. The first inner node is created automatically on the first
  zoom-in, as an untitled placeholder. What inner maps are _for_ in the game (levelling,
  unlocking) is still open.

The rigidity is deliberate: you add words in fixed-size batches, so the game makes you learn
verbs and adjectives instead of hoarding nouns. Whether that stays is an open design question,
written up in `TECH_DEBT.md`.

## Stack

React 19 + TypeScript, Vite, MUI v7 with Emotion `styled`. No router, no state library, no
tests — state lives in a `useReducer` and persists to `localStorage`. **No backend yet**; one
is the next thing being built, and its stack isn't decided. Visual style is deliberately
retro/terminal, dark only (`color-scheme: dark`).

**Responsive:** desktop-first, using MUI's default breakpoints via `theme.breakpoints.down()`.
Below `md` (900px) the side menu goes full-screen with two language columns instead of three
and a bottom bar for modes. Works well down to ~500px, acceptable to ~400px; below that would
need its own mobile design. Rule of thumb used throughout: restyle the same component with a
media query; reach for `useMediaQuery` in JS only when behaviour differs, not just looks.

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
   writes stale data back. Ids are minted by the caller (`createId()`), never the reducer, so
   replay is deterministic.

The same instinct shows up in smaller places — on mobile only the chosen outer language is
stored, and which columns are visible is derived from it plus the screen size; inner maps
store only `outerNodeId` on each node, and a node's inner map is derived by filtering (an
`innerNodeIds` list was deleted for being the same fact stored twice).

**All maps live in one flat `nodes` array.** `outerNodeId` is `null` for the top level, or the
id of the node whose inner map this is. `Map` only ever receives one map's nodes, so the
layout walk, the reducer and replay needed no changes for inner maps. This is the shape
intended for the DB too: one `nodes` table with a nullable `outer_node_id`.

**The one deliberate exception: training results.** They live in a second key,
`wordStrength`, as a plain snapshot — `Record<key, {results, lastCheck}>` rewritten whole on
every grade, no log, no schema, outside the reducer. Records are keyed by **word text**
(`getWordKey`, `helpers.ts`), not by any id — words don't have ids. So the same word pair in
two nodes shares one record, and changing a word's text orphans its history.

**These bets shape the backend.** The action log is already a sync format, the reducer is pure
enough to run on a server, and client-minted ids make retries safe. The training store is the
part that doesn't fit. `TECH_DEBT.md` → "Before the backend" has the detail.

## Where the code lives

- `src/data.ts` — types and the language triple
- `src/nodesDemo.ts` — the demo map `DebugPanel` loads (almost all of the repo's line count)
- `src/helpers.ts` — `createId`, `createNode`, `getNodeLevel`, the levelling constant,
  `getWordKey`. `createId` is a hand-rolled v4 UUID because `crypto.randomUUID()` only exists
  on HTTPS / `localhost`, which breaks testing on a phone over the LAN.
- `src/nodesReducer.ts` — every state transition: `addNode` / `addRootNode` (first node of an
  inner map; refuses unless the map is empty and one level deep) / `edit` / `delete` / `set` /
  `addWords`
- `src/storageHistory.ts` — the event-sourced `nodesHistory` layer
- `src/storageStrength.ts` — the `wordStrength` training store
- `src/App.tsx` — wiring; `dispatch` wraps `dispatchNodes` so every action is logged. Also
  owns the zoom (`nodeZoomedId`) and filters `nodes` down to the map on screen
  (`nodesToDisplay`).
- `src/components/Map/` — layout, rendering, branch buttons, the branch gate
- `src/components/SideMenu/` — the node panel. `SideMenu` owns the mode
  (`initial` / `words` / `levelUp` / `train` / `progress`) and the mobile language choice,
  and switches between `NewTitle` (naming a new node), `TitleBlock` (title + level + `[+]`),
  `WordList` (read), `WordAdd` (write), `TrainView` (exports `TrainMode`) and
  `ProgressView`. `LanguageHeader` is the shared column header; `FlexLine` + `WordCell` in
  `styles.ts` are the shared column layout.
- `src/components/DebugPanel.tsx` — dev escape hatches (reset map, load demo, generate /
  reset training data). Hidden below `md`, but still ships to production on desktop.

## Invariants

There are five rules the code quietly depends on — every map stays connected, every map is a
tree, links are symmetric, the action log stays replayable, and links never cross between
maps. Mostly not enforced anywhere (`addRootNode` is the exception), and breaking one causes
nodes to silently disappear rather than throw.
**`TECH_DEBT.md` has them written out with the exact conditions currently holding each one up.
Read that section before changing delete, branching, the reducer — or anything a server will
accept from a client.**

## Where it is right now

The core loop works end to end: add words → gain a level → the node grows → branch to a new
place, and it all survives a reload. TRAIN v1 and PROGRESS "general" work on top of it, the
UI is usable on tablets and phones (mobile v1, 2026-10-13), and inner maps work as an MVP
(2026-10-15). `tsc -b`, `prettier` and `npm run lint` are clean.

Built but unfinished: EDIT, delete-a-titled-node, examples in the add form, PROGRESS
"errors"/"time", search, map zoom (scaling — not the same thing as inner-map zoom), inner maps
beyond the MVP (see `TECH_DEBT.md` → "Inner maps").

Next up: **a backend.** The inner-maps experiment settled the table shape; two decisions come
first — does the server store actions or nodes, and what does it refuse — written up at the
bottom of `TECH_DEBT.md`. Features may still happen in downtime.

```
npm run dev      # vite
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run prettier # prettier . --write
```
