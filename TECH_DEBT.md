# My own notes

TODO: add checking work uniqueness when adding new ones - remember to allow repeats if 
different categories

----

# Claude notes

# Double Babble — resume checklist

Written 2026-08-13 after a few months away. Updated 2026-09-26, 2026-10-06 (TRAIN, PROGRESS,
branch gate), 2026-10-13 (mobile v1), and 2026-10-15 (inner maps MVP).
Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

Line numbers below were re-verified on 2026-10-15 against the inner-maps working tree. If they
drift again, `grep` beats trusting them.

---

## Where things stand

- **`npm run build`, `npm run lint` and `npx prettier --check src/` are all clean.** Bundle is
  427 KB. `noUnusedLocals` / `noUnusedParameters` are still commented out in
  `tsconfig.app.json:20-21`; lint has been at zero for a while, so they can come back on.
- **Inner maps MVP works** (2026-10-15). A node can hold one inner map — exactly one level
  deep — and the whole thing is still a single flat `nodes` array, scoped by `outerNodeId`.
  It's an experiment to check whether inner maps behave like the outer one before the DB
  design; see the "Inner maps" section for the model, the decisions and what's still open.
- **Mobile v1 is done**, deliberately "usable", not "designed". Leftovers in "Mobile v1".
- **The next big thing is a backend**, as a fullstack learning project. "Before the backend"
  lists what the current code has already decided for you. The inner-maps experiment was the
  last data-model question to settle first.
- **The game loop closes and branches.** Add words → level up → node grows → branch. Child #k
  of a non-root node needs level `3k`; a lone root gets its first branch free. `[+]` only
  appears on titled nodes now (`Map.tsx:263-290`).
- **TRAIN v1 and PROGRESS "general" work.** Training results live in a second store — T6.
- **`level` is derived, not stored.** `getNodeLevel(node)` (`helpers.ts:43`) against
  `REQUIRED_WORDS_PER_LEVEL` (`helpers.ts:37`, currently 2/1/1).
- **Ids come from `createId()`** (`helpers.ts:8`), not `crypto.randomUUID()`, which only
  exists on HTTPS / `localhost` and so breaks testing on a phone via `http://<LAN-IP>`.
- **Autotranslate works, and fails cleanly.** T5 — and it says why not to reopen it.
- **The hard part works.** `calculateAllPositions` (`Map.tsx:42`) — and it needed no changes
  for inner maps, which is the clearest sign the layout-from-links bet was right.
- ~5,340 lines across 25 files, ~2,500 of them demo vocabulary in `nodesDemo.ts`.

---

## Invariants — the rules the code quietly depends on

These aren't tasks. They're assumptions that are load-bearing in several places at once, so
breaking one produces a bug that surfaces somewhere unrelated. **With inner maps, 1–3 apply
per map, not to the whole array**, and there's a fifth. **All of them matter more once there's
a server**, because a server is a second place that can create, change or replay state.

### 1. Every map is connected.

Each map — the top level, and each inner map — is one connected graph. `Map` only ever sees
one map at a time (`nodesToDisplay`, `App.tsx:74`). Verified 2026-09-08 for the outer demo
map. **Four** separate pieces of code depend on this:

- `calculateAllPositions` (`Map.tsx:42`) only positions nodes reachable from its start
  node. Unreachable nodes keep `{x: null, y: null}`.
- The render bails with a bare `return` on a null position (`Map.tsx:259`), so an
  unreachable node **renders as nothing at all**. Silent data loss from the user's view.
- `nodes[0]` of the current map is the layout anchor (`Map.tsx:124`). For an inner map that's
  the node `addRootNode` created, because it's appended before any of its children.
- `canExpandN/E/S/W` (`Map.tsx:271-290`) test cell occupancy *only*, not the `linkIds` slot.
  Correct **because** a linked neighbour always occupies the adjacent cell. If a linked node
  is ever unpositioned, a `[+]` renders over a live link and clicking it overwrites
  `linkIds`, orphaning the old neighbour.

**This is also the core game mechanic**: the whole point is building a path from words you
have to words you want. Enforce it when *mutating* state and let the layout assume it.

**It holds — re-verified 2026-10-15.** Nothing checks it in one place; it survives on:

1. **Only an untitled node can be deleted.** The only delete path is the `x` in
   `NewTitle.tsx:38` → `onCancelNewNodeClick` (`App.tsx:112`), and `NewTitle` renders only
   inside `{!hasTitle && …}` (`SideMenu.tsx:117`). The guard is now
   `nodesToDisplay.length > 1` (`App.tsx:113`) — per map — so the only node of a map, e.g. an
   inner map's placeholder root, can't be deleted.
2. **An untitled node is permanently level 0.** `WordAdd` renders on `mode === 'levelUp'`
   (`SideMenu.tsx:132`); the only `setMode('levelUp')` is in `TitleBlock.tsx:33`, which renders
   only inside `{hasTitle && …}` (`SideMenu.tsx:114`). `key={nodeInFocus.id}` (`App.tsx:177`)
   resets `mode` per node.
3. **An untitled node can't branch.** Two layers now. The UI doesn't render `[+]` on an
   untitled node at all (`hasTitle`, `Map.tsx:263`, used in each `canExpand*`). Behind that,
   the gate (`Map.tsx:175-177`) blocks a level-0 node that already has one link. The
   zero-link edge case — a fresh map's only node, which the gate would let branch once — used
   to be safe only because the result is still a leaf; with `hasTitle` it can't happen. That
   matters more now, because *every* inner map starts as exactly that node. If gate logic
   moves to `rules.ts` for a server, "must have a title to branch" goes with it.
4. `DebugPanel`'s `set` bypasses all of this by design; no demo node is untitled.

**What breaks it: condition 1 dying.** A delete path for a *titled* node (T4) lets the
reducer's `delete` case (`nodesReducer.ts:151`) split a map. Leaf-only, same commit.

### 2. Every map is a tree, by construction.

`addNode` creates a fresh node with exactly one link back to its parent; `addRootNode` creates
an unlinked node in an *empty* map. Neither can close a cycle.

- **The layout anchor doesn't matter.** `positionsNormalized` (`Map.tsx:139`) subtracts
  `minX`/`minY`. It stops being harmless the moment invariant 1 breaks.
- **Exactly one path between any two nodes** of a map.
- **"Make room" is well-defined** — see Parked.
- "Link two existing nodes" would kill this.

### 3. Links are symmetric.

`addNode` (`nodesReducer.ts:76-99`) writes both sides. A one-sided link leaves the child
unpositioned; a link to a **nonexistent** id makes the walk throw (`positions[danglingId]` is
`undefined`, `undefined?.x !== null` is `true`). Nothing creates one today. **A migration, a
hand-edited save, or a server that accepts a malformed `addNode` is how you'd get one.** In a
database, a `links` table (one row per link) makes this invariant disappear — see "Before the
backend".

### 4. The action log must stay replayable.

`log.reduce(nodesReducer, base)` (`storageHistory.ts:49`) has to give back the map you had:

- **The reducer stays pure and deterministic.** No `Date.now()`, no id generation, no
  `localStorage`. Reading values *out of `state`* is fine — that's deterministic.
- **Ids are minted by the caller, never by the reducer.** `onAddNodeClick` (`App.tsx:100`)
  and `onZoomClick` (`App.tsx:135`) call `createNode()` and put the whole node in the payload.
- **Actions describe the change, not the result.** `edit` carries `{id, changes}`, `addNode`
  carries `targetNodeId`, `addWords` (`nodesReducer.ts:121`) only the new words.
- **`set` is never logged.** It pairs with `resetHistoryTo` (`DebugPanel.tsx:67`, `:79`).
  Everything else goes through the logging `dispatch` wrapper (`App.tsx:81`).
- **New, and worth knowing for the server: rejected actions are still logged.** `dispatch`
  calls `saveAction` *before* the reducer runs, so an action the reducer refuses (e.g. an
  `addRootNode` into a non-empty map) stays in the log forever. Replay refuses it again
  identically, so it's harmless junk locally. A server should do it the other way round:
  validate, then store.

Verified 2026-09-14: a six-action session replays byte-identically to the live state.

**Training grades are not in this log** — T6. "Clear history" resets the map only.

**Shape changes keep happening without `schema` moving.** Twice now: the stored `level`
removal (2026-09-26), and `parentId`/`innerNodeIds` → `outerNodeId` (2026-10-15). Old saves
still load — a node with no `outerNodeId` is `!outerNodeId`, so it lands on the top level,
which is correct — but only by luck of the defaults. T3's migration item.

### 5. Links never cross between maps. (New, 2026-10-15)

Both ends of every link have the same `outerNodeId`. If one didn't, the walk for either map
couldn't find the other end in its filtered list, so the node gets no position and vanishes
from *both* maps — invariant 1's failure, reached from outside.

It holds because: `[+]` only renders on nodes of the map on screen, and `onAddNodeClick` gives
the new node the *on-screen* map, `createNode(nodeZoomed?.id)` (`App.tsx:100`). Correct, but
it's a UI fact. Taking it from the node you branched from instead — the reducer copying
`targetNode.outerNodeId` onto the new node in `addNode` — would make it structural, and it's
the check a server needs anyway.

---

## Inner maps — the MVP and what it decided (2026-10-15)

**The model.** One flat `nodes` array. `MapNode.outerNodeId` (`data.ts:56`) is `null` for the
top level, or the id of the node whose inner map this node lives in. A map is
`nodes.filter(n => n.outerNodeId === id)` (`App.tsx:74`). In SQL that's an adjacency list: one
`nodes` table, a nullable FK, `WHERE outer_node_id = ?`. **Verdict: the flat array works and
is the right shape for the DB.** `calculateAllPositions`, the reducer and replay needed no
changes — each map is just a smaller input.

**Decided:**
- **`innerNodeIds` is gone.** It was the reverse of `outerNodeId`, stored twice and with
  nothing keeping the two in step — the same reason stored `level` was deleted. Children are
  derived.
- **`parentId` → `outerNodeId`.** "Parent" already means "the node you branched from" in the
  link graph (`Map.tsx:62` still has a local `parentId` in that sense, and that's correct).
- **Exactly one inner level.** Enforced in the reducer (`addRootNode` refuses an outer node
  that is itself inner) and in the UI (an inner node only gets a zoom-*out* button,
  `WordList.tsx:32-37`, which goes straight to the top level).
- **The first node of an inner map is created on zoom-in** (option B). `addRootNode`
  (`nodesReducer.ts:101`) is its own action because `addNode` needs a link target. The reducer
  refuses if the outer node doesn't exist, if it's itself an inner node, or if the inner map
  already has nodes — so "one connected tree per map" holds by construction, not by the
  caller checking first. The map id lives in one place, `payload.node.outerNodeId`.
- **Zoom is state, not data.** `nodeZoomedId` (`App.tsx:65`) is an id; `nodeZoomed` is looked
  up from `nodes`, the same pattern as `nodeInFocus`. `<Map key={nodeZoomedId ?? 'root'}>`
  (`App.tsx:172`) gives each map fresh scroll and focus state. Both `DebugPanel` resets also
  reset the zoom (`DebugPanel.tsx:70`, `:82`).

**Open:**
- [ ] **What deleting a container does to its inner map.** Deferred to T4 "delete a node",
      deliberately. Can't happen today (only untitled nodes can be deleted, and those never
      have words, so can never be zoomed into). In SQL it's `ON DELETE CASCADE` vs
      `RESTRICT`; the leaf-only rule probably extends to "and no inner map".
- [ ] **Option B's cost: placeholders that stay forever.** Zoom in and straight back out, and
      the untitled root stays — undeletable, because it's the only node of its map. Fine for
      an experiment. If inner maps stay, the cleaner version is an *empty state*: zoom is pure
      navigation, an empty inner map renders a "create the first place" button, and an empty
      inner map becomes valid, so cancel could delete its only node
      (`nodesToDisplay.length > 1 || !!nodeZoomed`). Same `addRootNode`; only the trigger
      changes. It would also turn T2.6's empty-map `-Infinity` into a designed state.
- [ ] **Auto-opening the side menu on the new root felt wrong** — tried and reverted. A guess
      at why: zooming in is *looking*. Opening a naming prompt over the map you just
      navigated into (full-screen on mobile) turns a side effect you didn't ask for into a
      demand — whereas `[+]` opening `NewTitle` is fine because there you did ask to create
      something. If that's it, it's another point for the empty-state version above.
- [ ] **The demo has one inner node** (`cabin` in `forest`), unlinked. Linked inner layouts
      have only been tested by playing. Worth a few linked inner nodes in `nodesDemo.ts`.
- [ ] **Small.** `isZoomed={!!nodeZoomedId}` (`Map.tsx:254`) uses the id rather than the
      looked-up node; harmless now that both resets clear it. `MapHeader` / `MapTitle` /
      `LeftColumn` are styled components exported from `App.tsx:31-54` — the only file
      mixing styles and wiring. Typo "non-emty" in the `addRootNode` error message.
- [ ] **Not decided, on purpose:** whether the outer map shows anything about a node's inner
      map (that's what `innerNodeIds` was being kept for). If it comes back, derive it.

---

## Before the backend — what the current code has already decided

Not a plan, and not tasks: facts about the existing code that will shape whatever server you
build, so you meet them on purpose rather than by surprise.

- **The action log is a ready-made sync protocol.** State is "a base plus an append-only list
  of deltas". The simplest server that fits *stores actions*: the client POSTs what
  `saveAction` already logs, loading is the same `reduce` on either side. The alternative — a
  server storing nodes behind CRUD endpoints — is more conventional and also fine; then the
  log becomes a local-only detail. **The biggest decision; choose it consciously.**
- **The tables, as far as the code has decided them:** `nodes` (id, title, `outer_node_id`
  nullable FK to `nodes`), words (per node, per group, three translations, optional
  examples), links. Inner maps settled that it's one `nodes` table, not one per level.
  **Links are worth their own table** (`from_id`, `to_id`, `direction`): `linkIds` stores
  every link twice and invariant 3 exists only to keep the copies agreeing. The trade-off is
  rebuilding `linkIds` on load, or teaching the walk to read edges.
- **Client-minted ids are the right shape.** A retried POST can be made idempotent (the server
  already has that node id), and the client never waits for the server to name a node.
- **The reducer is the business logic, and it's pure.** `nodesReducer.ts` imports only from
  `data.ts` and `helpers.ts` — no React, no browser APIs. A TypeScript backend could import it
  to validate or replay.
- **A server must not trust the client's actions, and must validate *before* storing** (today
  the log stores first — invariant 4). The invariants are the checklist: `addNode` targets an
  existing node with a free direction and a title (1, 3), stays inside its map (5);
  `addRootNode` only into an empty map one level deep (already in the reducer); `delete` only
  a leaf (1); the gate allows the branch (needs it out of `Map.tsx` — T2.9).
- **`set` doesn't fit a log-on-the-server model.** It's a "reset" endpoint, not an action.
- **`schema` starts to matter for real.** Two shape changes have already slipped through
  without it. On a server you can't "Clear history" out of the third.
- **`wordStrength` is a different kind of data.** A snapshot keyed by word *text*, rewritten
  whole on every grade (T6). Synced as-is it's last-write-wins on the whole object. Grade
  events (`{key, value, at}`) would fit the same append-only model, and fix `lastCheck`.
- **Users don't exist yet.** Everything assumes one map and one person. Auth, and "whose map is
  this", is the first thing any backend tutorial will make you add, and it's what changes the
  data model (one log per user, at minimum).
- **`DebugPanel` reaches straight into storage** (T2.12). With a backend its buttons become
  server calls or go away.

---

## Done (keeping the log so future-you can see the shape of it)

**T0 — safety net** ✅ 2026-08/09 — git, tsconfig restored, 922 lines of dead
`svg-raw.tsx` deleted, dead deps dropped (`@mui/icons-material` deliberately kept), title
fixed, Prettier + format-on-save + `.git-blame-ignore-revs` (`0c804fe`).

**T1 — lint sweep** ✅ 2026-09-07, 16 problems → 0. Includes the `setState`-in-`useEffect`
fix via `key={nodeInFocus.id}` on `<SideMenu>`.

**T3 — persistence** ✅ 2026-09-14 — `nodesHistory` = `{schema: 1, base, log}`, replayed on
load. Replay over an inverse-action undo stack because the reducer is already pure.
Discriminated `NodeAction` union with an exhaustive `never` default (`nodesReducer.ts:41`).
Lazy `useReducer` init (`App.tsx:59`). Logging in a `dispatch` wrapper (`App.tsx:81`), not a
`useEffect`. `isHistory` guard + `nodesHistory:corrupt` backup. ~155 bytes per action vs
~21 KB per snapshot.

**T2.7 — shared `words` object** ✅ 2026-09-14. **T2.1 — `WordAdd` state** ✅ 2026-09-17.

**T4 level-up** ✅ 2026-09-17 — one Save / Level up button, a dedicated `addWords` action, and
`level` deleted rather than incremented.

**T2.13 — autotranslate error path** ✅ 2026-09-26, four sittings. **`Promise.allSettled`
never rejects** — failures sit in the results array; nothing reaches `catch`.

**`SideMenu` as a mode switch** ✅ 2026-09-27 — one `SideMenuMode` state instead of flags.

**T4 TRAIN v1 + PROGRESS** ✅ 2026-09-29 / 10-01 — reveal, self-grade 1/0/-1, append to a
per-pair history; PROGRESS shows the last five as dots.

**T2.2 + T2.3 — branch gate back on, hint correct** ✅ 2026-10-06 (`b973ec3`). The `+ 1`
stops the incoming link counting. The hint (`Map.tsx:346`) only shows on a blocked click, where
`3 × linksAmount` is exactly the unblocking level. Words per level went 5/2/2 → 2/1/1.

**T2.12 (half) — demo data moved** ✅ 2026-10-06 — `nodesDemo.ts`, and `data.ts` 754 → 64.

**Mobile v1** ✅ 2026-10-13 (`257c71a`) — below `md` (900px):
- `MenuZone` goes full-screen, `ModePanel` becomes a fixed bottom bar, a back-to-map button
  appears (`SideMenu.tsx:157-158`), every `[+]` on the map is visible, sticky headers.
- **Two columns instead of three.** `sideLanguage` is the only stored state
  (`SideMenu.tsx:54`); `languagesVisible` is derived from it plus `useMediaQuery`. The toggle
  (`SideMenu.tsx:79`) is `undefined` on desktop, which is what hides it.
- **Columns are flex, not percentages.** `FlexLine` (`SideMenu/styles.ts:39`) holds the `gap`,
  `WordCell` (`:96`) is `flex: 1` + `minWidth: 0` + `overflowWrap: 'anywhere'` + a filtered
  `hidden` prop. Removed every `!important` and `nth-child` rule. 3/4/3 became 1/1/1 on
  purpose.
- `100vh` → `100dvh`. `index.css`'s Vite light-mode block gone; `:root` is
  `color-scheme: dark; color: #fff; background: #361c2e`.
- Keys fixed: `<Fragment key={node.id}>` (`Map.tsx:296`), `WordGroup`, `WordCell`, and
  `ProgressView`'s tabs and dots.

**Inner maps MVP** ✅ 2026-10-15 — see the "Inner maps" section.

Still open from T0:
- [ ] **Rewrite `README.md`** `20min` — still the Vite template. A fullstack portfolio project
      gets read by other people.
- [ ] **Favicon** `5min` — `index.html:7` is still `/vite.svg`.

---

## Mobile v1 — known leftovers

Accepted on purpose to wrap mobile up; none of these blocks using it. A real mobile design
(one card per word, say) is the case for a separate component picked with `useMediaQuery`.

- [ ] **Save can stay disabled with no visible reason.** `20min` — `isWordComplete` needs all
      three translations (`WordAdd.tsx:38`, via `allFilled`/`anyFilled` at `:191`, `:195`), but
      one column is hidden. Mark the toggle when the hidden column has empty fields.
- [ ] **`BackToMapButton` scrolls away.** `5min` — `position: absolute` inside the scroll
      container (`SideMenu/styles.ts:380`). `fixed`, or into the bottom bar. Also skips
      `WordAdd`'s "You sure?".
- [ ] **Sticky offsets depend on each other.** `5min` — `top: '60px'` (`SideMenu/styles.ts:88`)
      is the language header's height; `top: '-8px'` (`:55`) cancels `MenuZone`'s padding.
- [ ] **`DebugPanel` is hidden by width, not dev mode** (`DebugPanel.tsx:52`). T2.12.
- [ ] **`NodeAddButton`'s mobile `visibility` rule is dead** (`Map/styles.ts:165`) —
      `NodeRoot`'s `& > button` (`:111-114`) wins.
- [ ] **Small.** `languageColors` (`SideMenu/styles.ts:11`) is still typed `Partial`. Header
      toggle buttons are clickable-looking on desktop with no handler. `[EDIT]` hidden below
      `sm` (`SideMenu.tsx:111`). `TextButton`'s `hideOnDesktop` (`SideMenu/styles.ts:23-34`)
      is the inverse case — used for the zoom-out button, since desktop has one in the map
      header.

---

## T2 — Real bugs (in rough order of how much they'll bite)

- [x] **1, 2, 3, 7, 13** ✅ — see Done log.
- [ ] **4. React keys — two things left.** `5min`
      - The `[✔]/[~]/[x]` buttons (`TrainView.tsx:161`) are unkeyed.
      - **The real one:** rows are keyed on three translations concatenated
        (`WordList.tsx:63`, `TrainView.tsx:130`, `ProgressView.tsx:73`), and `addWords`
        appends without dedup — your uniqueness TODO from the render side. `${group}_${index}`
        is the honest key; `WordAdd.tsx:233` already does it.
      **Lint will never catch these** — `eslint-plugin-react` isn't installed.
- [ ] **5. The layout anchor is implicit.** `20min` — `calculateAllPositions(nodes, nodes[0])`
      (`Map.tsx:124`). Per map now, and for inner maps it happens to be the `addRootNode` node.
      Store a root id per map, or comment why `nodes[0]` is safe.
- [ ] **6. Unreachable nodes vanish, and empty-map math produces garbage.** `20min`
      Bare `return` at `Map.tsx:259`. `Math.min(...[])` is `Infinity` (`:128`, `:133`),
      `Math.max(...[])` is `-Infinity` (`mapWidth` `:188`, `mapHeight` `:197`, `maxLevel`
      `:153`). Unreachable today — `addRootNode` on zoom means no map renders empty — but the
      empty-state version of inner maps would make empty maps a real state.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — `nodesReducer.ts:11`, `Map.tsx:28`.
- [ ] **9. Game rules are scattered.** `20min` — **the backend makes this one matter.**
      `LEVELS_REQUIRED_PER_LINK` (`Map.tsx:26`) and the gate formula inline in a click handler
      (`Map.tsx:175-177`), next to the hint (`:346`) and the new "must have a title" check
      (`:263`); `REQUIRED_WORDS_PER_LEVEL` and `getNodeLevel` in `helpers.ts:37`, `:43`. A
      `rules.ts` with `canBranch(node)` / `nextBranchLevel(node)` is what a server imports to
      validate an `addNode`.
- [ ] **10. Palette lives in the side menu's styles.** `5min` — `SideMenu/styles.ts:4-15`.
      `Theme.ts:53` still hardcodes `color: 'white'`.
- [ ] **11. `direction` leaks to the DOM.** `5min` — `NodeAddButton` filters `"position"`
      (`Map/styles.ts:134`) but the prop is `direction` (`Map.tsx:358`).
- [ ] **12. `DebugPanel` ships to users.** `5min` — gate it behind `import.meta.env.DEV`
      instead of the width check (`DebugPanel.tsx:52`); drops `nodesDemo.ts` out of the
      427 KB bundle. And it pairs `resetHistoryTo` with a raw `dispatchNodes`, correct only
      because `App.tsx:151` passes the non-logging dispatch.

---

## T3 — Persistence ✅ done, with follow-ups

All refs in `storageHistory.ts`. Several of these change shape once there's a server.

- [ ] **`getInitialState` can return `[]`.** `5min` — empty base + empty log. Ties into T2.6.
- [ ] **`isHistory` validates the envelope, not the contents.** Fine locally, not for a server.
- [ ] **`saveAction` can silently desync from disk.** `20min` — pushes, *then* writes
      (`:35-36`). Same shape of problem as "the POST failed".
- [ ] **Nothing bounds the log.** `deep`, parked. 0.3 MB / 0.7 ms at 1,000 actions, 2.9 MB /
      7.1 ms at 10,000. Compaction when it matters.
- [ ] **`schema: 1` is checked but nothing migrates.** `20min` — two silent shape changes so
      far (invariant 4). Mandatory with a backend.
- [ ] **State shape.** `deep`, optional — `Record<string, MapNode>` instead of an array.
      Readability, not correctness. If ever, before the server.

---

## T4 — Unfinished flows (smallest first)

- [x] **Level up**, **TRAIN v1**, **inner maps MVP** ✅ — see Done log.
- [ ] **Decide where example sentences go.** `20min` / `1h` — only `WordAdd` has no inputs.
- [ ] **EDIT flow** `1h` — `[EDIT]` is `disabled={true}` (`SideMenu.tsx:111`); `edit` is in
      `SideMenuMode` (`data.ts:6`). Editing a word's text orphans its training history (T6).
- [ ] **Delete a node** `1h` — **where invariant 1 gets decided, and now also what happens to a
      node's inner map.** Leaf-only, written once, same commit as the UI. `unlinkTargetNode`
      (`nodesReducer.ts:18`) does the hard part. Confirm step: `WordAdd`'s "You sure?"
      (`:269`) is the pattern. Training records probably stay.
- [ ] **PROGRESS "errors" / "time"** — disabled tabs (`ProgressView.tsx:39`). Fix T6's
      `lastCheck` first.
- [ ] **Zoomable map** `deep` — `transform: scale()` + wheel/pinch; `scrollToNode`
      (`Map.tsx:206`) needs the scale. Not to be confused with inner-map "zoom", which is
      navigation.
- [ ] **Search: find a node by a word in it** `1h` — now has to search across maps and
      zoom to the right one first. A natural first server query.
- [ ] **Make the language list configurable** `1h` — the triple is one declaration
      (`data.ts:60`). Left: `languageCode` (`WordAdd.tsx:41`) and `languageColors`
      (`SideMenu/styles.ts:11`). The annotation on `emptyTranslations` (`WordAdd.tsx:26`) is
      load-bearing. The `as` casts (`WordAdd.tsx:93`, `:101`, `:132`, `:174`;
      `TrainView.tsx:62`) are the only thing giving `Object.fromEntries` its shape.
- [ ] **AI word / category suggestions** `deep` — a good server endpoint later: the API key
      can't live in the client.

---

## T5 — `WordAdd` / autotranslate: what's left after four sittings

**Nothing here is a visible bug. Read before reopening the file** — it's finished enough. The
first two have teeth.

- [ ] **The async write-back is correct only because the inputs are disabled.** `20min`
      `setWords(() => wordsUpdated)` (`WordAdd.tsx:175`) ignores `prev`; built from `words`
      captured before the `await` (`:143`, `:160`). Inputs are `disabled={isLoading}` (`:241`).
      Save (`:265`) and `x` (`:269`) aren't disabled while loading.
- [ ] **Two traversals kept in step by a hand-rolled counter.** `20min` — `:143` vs `:160`,
      `let i = -1` / `++i` (`:158`, `:163`).
- [ ] **`translate` returns `any`.** `5min` — `?? ''` at `:57`.
- [ ] **A successful empty translation overwrites a typed word.** `5min` — `:57` vs `:168`.
- [ ] **A total failure locks the retry.** `5min` — `setInputTouched(false)` (`:176`) vs
      `enableAutoTranslation` (`:184`).
- [ ] **`isWordComplete` tests for `''` specifically.** `5min` — `:38`.
- [ ] **MyMemory is still the wrong API.** `deep` — and with a backend, the call can move
      server-side.

---

## T6 — TRAIN / PROGRESS: the second store

**None of this is critical.** Re-read "Before the backend" before syncing this store.

- [ ] **Records are keyed by word text** (`getWordKey`, `helpers.ts:65`). Same pair in two
      nodes — or in an inner and an outer map — shares a record; editing a word orphans its
      history; the group is part of the key, matching your uniqueness TODO.
- [ ] **`lastCheck: Date` is a type lie after a reload.** `5min` — `data.ts:40` vs
      `TrainView.tsx:103`. Store `Date.now()` as `number`. Fix before it crosses a network.
- [ ] **The per-render read in `TrainView` is load-bearing.** `5min`, a comment —
      `TrainView.tsx:65`. A `useMemo` like `ProgressView.tsx:28` would make the second grade
      overwrite the first.
- [ ] **Revealing a second word before grading the first drops the first grade.** `5min` to
      decide — `TrainView.tsx:71`, `:81`.
- [ ] **`[TRAIN]` hides at level 0** (`SideMenu.tsx:94`) even with saved words. Deliberate?
- [ ] **Small:** `saveWordStrengthList` / `setWordStrengthList` are one write under two names
      (`storageStrength.ts:30`, `:34`). `isWordStrengthList` (`:5`) accepts `null`/arrays.
      `TrainView.tsx` exports `TrainMode`. `ProgressMode.time` is `'time,'` (`data.ts:14`).

---

## Game design — open questions worth writing down

- **Geomap or mindmap?** The 4-neighbour grid is a bet on *geomap*. Inner maps doubled down
  on it — a Cabin inside the Forest reads geographically.
- **What are inner maps *for*?** The MVP shows they work technically. Open: does an inner
  node level the outer one, is an inner map unlocked by level, does it show on the outer map.
- **Path-finding mode** — route from a start node to a destination. Unique route on a tree.
- **What does a grade mean over time?** Decay, maybe spaced repetition, once "time" exists.
- **Shared maps?** A backend makes "someone else's map" possible. Read-only sharing is cheap
  with a log; collaborative editing is a much bigger problem.

---

## Parked on purpose — permission to not think about these

- **Making room / stretchable edges.** `deep`. Really "incremental grid layout with constraint
  propagation". Variable-length edges would be a distance per link in `directionShift`
  (`Map.tsx:35`).
- **Dynamic non-grid graph.** Invalidates `calculateAllPositions`, `scrollToNode`, `canExpand*`.
- **Tests.** None, and fine. Candidates: `calculateAllPositions`, the gate once it's in
  `rules.ts`, and now `addRootNode`'s three refusals. **A backend changes this calculus** —
  server endpoints are where tests usually start paying for themselves.
- **Accessibility and keyboard nav.** Unlabelled `+` buttons, no Escape to close the menu.
- **`vite` pinned to `^8.0.0-beta.13`** with an `overrides` entry (`package.json:34-37`).

---

## Suggested next session

**Backend, by choice.** The inner-maps experiment answered the last data-model question: one
flat `nodes` table with a nullable `outer_node_id`.

Two decisions first — "Before the backend" has the reasoning:
1. **Store actions or store nodes?** A log on the server keeps your architecture; a node
   table is the conventional CRUD shape. And either way: **links as their own table?**
2. **What does a server refuse?** The invariants are the list. `addRootNode` already does its
   checks in the reducer — that's the pattern; T2.9's `rules.ts` is the next piece.

Cheap things worth doing before the first server commit, while there's one copy of the data:
- `schema` bump + a migration for the two silent shape changes (T3), or at least decide not to.
- T6 `lastCheck` → `number` (`5min`).
- T2.12 `import.meta.env.DEV` on `DebugPanel` (`5min`).
- `README.md`.

In downtime, by appetite: the inner-maps empty state, T4 delete a node, T4 search (now
cross-map), Mobile v1 leftovers, T2.8 / T2.11.
