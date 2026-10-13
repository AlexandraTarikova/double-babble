# My own notes

TODO: add checking work uniqueness when adding new ones - remember to allow repeats if 
different categories

----

# Claude notes

# Double Babble — resume checklist

Written 2026-08-13 after a few months away. Updated 2026-09-26, 2026-10-06 (TRAIN, PROGRESS,
branch gate), and 2026-10-13 (mobile v1, right before starting on a backend).
Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

Line numbers below were re-verified on 2026-10-13 against the mobile-v1 working tree. If they
drift again, `grep` beats trusting them.

---

## Where things stand

- **`npm run build`, `npm run lint` and `npx prettier --check src/` are all clean.** Bundle is
  423 KB. `noUnusedLocals` / `noUnusedParameters` are still commented out in
  `tsconfig.app.json:20-21`; lint has been at zero for a while, so they can come back on.
- **Mobile v1 is done**, and it's deliberately "usable", not "designed". Below 900px (`md`)
  the side menu goes full-screen, shows two language columns with a toggle for which outer
  one, and moves the mode buttons to a fixed bottom bar. Good from ~500–900px, OK down to
  ~400px, below that needs a real mobile design. Leftovers are in the "Mobile v1" section.
- **The next big thing is a backend**, as a fullstack learning project rather than something
  the game needs. The "Before the backend" section lists what the current code has already
  decided for you. Features may still happen in between.
- **The game loop closes and branches.** Add words → level up → node grows → branch. The
  gate is on; child #k of a non-root node needs level `3k`, and a lone root gets its first
  branch free.
- **TRAIN v1 and PROGRESS "general" work.** Training results live in a second, simpler
  store — T6.
- **`level` is derived, not stored.** `getNodeLevel(node)` (`helpers.ts:44`) against
  `REQUIRED_WORDS_PER_LEVEL` (`helpers.ts:38`, currently 2/1/1).
- **Ids come from `createId()`** (`helpers.ts:8`), a hand-rolled v4 UUID on
  `crypto.getRandomValues`, not `crypto.randomUUID()`. Keep it that way: `randomUUID` only
  exists in a *secure context* (HTTPS or `localhost`), so it's `undefined` when you open the
  dev server on your phone via `http://<LAN-IP>`. `getRandomValues` has no such restriction.
- **Autotranslate works, and fails cleanly.** T5 — and it says why not to reopen it.
- **The hard part works.** `calculateAllPositions` (`Map.tsx:42`). Don't rewrite it.
- **`parentId` is still `null` on every node** (`helpers.ts:27`, and all demo nodes). A door
  left open, not a usable field.
- ~5,050 lines across 25 files, 2,304 of them demo vocabulary in `nodesDemo.ts`. `data.ts`
  is down to 65 lines of types.

---

## Invariants — the rules the code quietly depends on

These aren't tasks. They're assumptions that are load-bearing in several places at once, so
breaking one produces a bug that surfaces somewhere unrelated. **All four matter more once
there's a server**, because a server is a second place that can create, change or replay
state — see "Before the backend".

### 1. The node graph is always connected.

Verified 2026-09-08 by walking all 7 demo nodes as anchor. **Four** separate pieces of
code depend on this:

- `calculateAllPositions` (`Map.tsx:42`) only positions nodes reachable from its start
  node. Unreachable nodes keep `{x: null, y: null}`.
- The render bails with a bare `return` on a null position (`Map.tsx:247`), so an
  unreachable node **renders as nothing at all**. Silent data loss from the user's view.
- `nodes[0]` is the layout anchor (`Map.tsx:116`). Safe only because every anchor reaches
  every node — see invariant 2.
- `canExpandN/E/S/W` (`Map.tsx:258-269`) test cell occupancy *only*, not the `linkIds`
  slot. That's correct **because** a linked neighbour always occupies the adjacent cell —
  which requires it to have a position. If a linked node is ever unpositioned, a `[+]`
  renders over a live link and clicking it overwrites `linkIds`, orphaning the old
  neighbour. Worth a one-line comment at `Map.tsx:258`.

**This is also the core game mechanic**, not just an implementation detail: the whole point
is building a path from words you have to words you want. So enforce it when *mutating*
state and let the layout assume it. See T4 "Delete a node".

**It holds — re-verified 2026-10-13.** Nothing checks it; it survives on a chain of four
facts across four files:

1. **Only an untitled node can be deleted.** The only delete path in the UI is the `x` in
   `NewTitle.tsx:38` → `onCancelNewNodeClick` (`App.tsx:71`), and `NewTitle` renders only
   inside `{!hasTitle && …}` (`SideMenu.tsx:119`). The new mobile back button
   (`SideMenu.tsx:160`) only *closes* the menu, so it isn't a second path.
2. **An untitled node is permanently level 0.** `WordAdd`, the only UI that adds words,
   renders on `mode === 'levelUp'` (`SideMenu.tsx:134`). The only `setMode('levelUp')` is the
   `[+]` in `TitleBlock.tsx:33`, and `TitleBlock` renders only inside `{hasTitle && …}`
   (`SideMenu.tsx:116`). `key={nodeInFocus.id}` (`App.tsx:109`) resets `mode` per node.
3. **The branch gate blocks a level-0 node that already has a link.** `Map.tsx:166-169`:
   blocked when `linksAmount >= floor(level / 3) + 1`, so at level 0 with one link it's
   blocked. A node with *zero* links passes — only ever the single, untitled node of a fresh
   map — and it can get exactly one child, after which it's a leaf. Still safe.
   (Mobile shows every node's `[+]` all the time, `Map/styles.ts:106-109`. Visibility only —
   every click still goes through the gate.)
4. `DebugPanel`'s `set` bypasses every guard above by design, but `grep -c "title: ''"
   src/nodesDemo.ts` returns `0` — no demo node is untitled.

`App.tsx:72`'s `nodes.length > 1` is not part of this chain; it stops the map going *empty*.

**What breaks it: condition 1 dying.** The moment a delete path exists for a *titled* node —
T4 "Delete a node" — the reducer's `delete` case (`nodesReducer.ts:124`) will split the graph
quite happily. The leaf-only check has to land in the same commit as that UI.

### 2. The graph is a tree, by construction.

Every add creates a fresh node with exactly one link back to its parent, so you can never
close a cycle. 7 nodes / 6 edges, and that ratio is structurally locked.

- **The layout anchor doesn't matter.** `positionsNormalized` (`Map.tsx:131`) subtracts
  `minX`/`minY`, so the layout is translation-invariant — verified identical from all 7
  anchors. It stops being harmless the moment invariant 1 breaks.
- **Exactly one path between any two nodes.** Good for a "find the route" game mode.
- **"Make room" is well-defined** — see Parked.
- If you ever add "link two existing nodes", this invariant dies and takes the points above
  with it.

### 3. Links are symmetric.

The `addNode` case (`nodesReducer.ts:69-93`) writes both sides. `calculateAllPositions`
positions a child via its back-link, so a one-sided link means the child never gets
positioned (→ invariant 1). A link to a **nonexistent** id is worse: `positions[danglingId]`
is `undefined`, `undefined?.x !== null` is `true`, and the walk throws a TypeError. Nothing
creates one today. **A migration, a hand-edited save, or a server that accepts a malformed
`addNode` is how you'd get one.**

### 4. The action log must stay replayable.

`storageHistory.ts` keeps `{schema, base, log}` and rebuilds state on load with
`log.reduce(nodesReducer, base)` (`storageHistory.ts:49`). For that to give back the map you
had, four things must all hold:

- **The reducer stays pure and deterministic.** No `Date.now()`, no id generation, no
  `localStorage`. StrictMode double-invokes it, so impurity shows up as doubled effects.
- **Ids are minted by the caller, never by the reducer.** `onAddNodeClick` (`App.tsx:59`)
  calls `createNode()` and puts the whole node in the payload. If the reducer generated ids,
  every replay would produce different ones. This is the single most important line to not
  "tidy up" — and with a backend it becomes a feature, see below.
- **Actions describe the change, not the result.** `edit` carries `{id, changes}`, `addNode`
  carries `targetNodeId`, `addWords` (`nodesReducer.ts:94`) carries only the new words. An
  action carrying a whole captured node would write a stale copy back on replay.
- **`set` is never logged.** It pairs with `resetHistoryTo`, which writes a new base and
  empties the log (`DebugPanel.tsx:66`, `:77`). Everything else goes through the logging
  `dispatch` wrapper (`App.tsx:40`).

Verified 2026-09-14: a six-action session replays byte-identically to the live state.

**Training grades are not in this log** — `TrainView` writes `wordStrength` directly. "Clear
history" resets the map only; "Reset training data" is the separate button.

**A shape change already happened without `schema` moving** (2026-09-26, the stored `level`
removal). `isHistory` (`storageHistory.ts:8`) only checks `schema === 1`, so old saves load
with a stray `level`. Harmless, and proof the guard won't catch the next one.

---

## Before the backend — what the current code has already decided

Added 2026-10-13. Not a plan, and not tasks: facts about the existing code that will shape
whatever server you build, so you meet them on purpose rather than by surprise.

- **The action log is a ready-made sync protocol.** State is already "a base plus an
  append-only list of deltas". The simplest server that fits is one that *stores actions*:
  the client POSTs each action it already logs in `saveAction`, the server appends it, and
  loading is the same `reduce` on either side. That's event sourcing, which is what you built,
  just with the log living somewhere else. The alternative — a server that stores nodes and
  exposes CRUD endpoints — is more conventional and also fine; it just means the log becomes a
  local-only detail. Worth choosing consciously; it's the biggest decision.
- **Client-minted ids are the right shape for that.** Because `createId()` runs in the client
  and the id travels in the action, a retried POST can be made idempotent (the server has
  already seen that node id), and the client never has to wait for the server to tell it what
  a new node is called. Don't move id generation to the server.
- **The reducer is the business logic, and it's pure.** `nodesReducer.ts` imports only types,
  `LinkDirections`, `WordGroups` and `typedKeys` — no React, no browser APIs. A Node backend
  could import the same file to validate or replay. That's the case for TypeScript on the
  server, if you want one.
- **A server must not trust the client's actions.** Today the only guard on an action is
  "the UI didn't offer the button". `isHistory` checks the envelope, not the contents (T3).
  The invariants above are exactly the list of things a server would need to check: `addNode`
  targets an existing node and a free direction (1, 3), `delete` only removes a leaf (1), the
  gate allows the branch (needs the gate logic out of `Map.tsx` — T2.9). Without that, a bad
  request can produce the dangling-link crash from invariant 3 for everyone who loads the map.
- **`set` doesn't fit a log-on-the-server model.** It replaces everything; on a server it's a
  "reset" endpoint, not an action. Same for `resetHistoryTo`.
- **`schema` starts to matter for real.** Once data lives on a server you can't "Clear
  history" your way out of a shape change. The T3 migration item stops being optional.
- **`wordStrength` is a different kind of data.** It's a snapshot keyed by word *text*,
  rewritten whole on every grade (T6). Syncing it as-is means last-write-wins on the whole
  object — two devices would overwrite each other's grades. Storing individual grade events
  (`{key, value, at}`) would fit the same append-only model as the map, and fixes the
  `lastCheck` type issue on the way.
- **Users don't exist yet.** Everything assumes one map and one person. Auth, and "whose map
  is this", is the first thing any backend tutorial will make you add — it's also the part
  that changes the data model (one log per user, at minimum).
- **`DebugPanel` reaches straight into storage** (T2.12). With a backend, its buttons become
  calls to the server or go away; it's the first thing that will feel wrong.

---

## Done (keeping the log so future-you can see the shape of it)

**T0 — safety net** ✅ 2026-08/09 — git, tsconfig restored, 922 lines of dead
`svg-raw.tsx` deleted, dead deps dropped (`@mui/icons-material` deliberately kept), title
fixed, Prettier + format-on-save + `.git-blame-ignore-revs` (`0c804fe`).

**T1 — lint sweep** ✅ 2026-09-07, 16 problems → 0. Includes the `setState`-in-`useEffect`
fix via `key={nodeInFocus.id}` on `<SideMenu>` (`App.tsx:109`).

**T3 — persistence** ✅ 2026-09-14 — `nodesHistory` = `{schema: 1, base, log}`, replayed on
load. Replay over an inverse-action undo stack because the reducer is already pure.
Discriminated `NodeAction` union with an exhaustive `never` default (`nodesReducer.ts:40`).
Lazy `useReducer` init (`App.tsx:30`). Logging in a `dispatch` wrapper (`App.tsx:40`), not a
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
stops the incoming link counting. The hint (`Map.tsx:325`) only shows on a blocked click, where
`3 × linksAmount` is exactly the unblocking level. Words per level went 5/2/2 → 2/1/1.

**T2.12 (half) — demo data moved** ✅ 2026-10-06 — `nodesDemo.ts`, and `data.ts` 754 → 65.

**Mobile v1** ✅ 2026-10-13 — below `md` (900px):
- `MenuZone` goes full-screen (`SideMenu/styles.ts:170-175`), `ModePanel` becomes a fixed
  bottom bar (`:190-205`), a back-to-map button appears (`SideMenu.tsx:160`), every `[+]` on
  the map is always visible (`Map/styles.ts:106-109`), sticky language and group headers.
- **Two columns instead of three.** `sideLanguage` is the only stored state
  (`SideMenu.tsx:52`); `languagesVisible` is *derived* from it plus `useMediaQuery`, so
  rotating or resizing can't leave it stale — the same "store the choice, derive the rest"
  move as the three architectural bets. The toggle (`SideMenu.tsx:81`) is `undefined` on
  desktop, which is what hides it.
- **Columns are flex, not percentages.** `FlexLine` (`:30`) holds the `gap`, `WordCell` (`:87`)
  is `flex: 1` + `minWidth: 0` + `overflowWrap: 'anywhere'` + a filtered `hidden` prop. A
  hidden cell drops out of the flex calculation, so 3 columns → 2 needs no override. That
  removed every `!important` and every `nth-child` rule. 3/4/3 became 1/1/1 on purpose — the
  wider centre only ever existed to absorb padding.
- `100vh` → `100dvh` (`App.tsx:18`, `MenuZone`, `MapZone`), so iOS's address bar doesn't
  eat the bottom.
- **`index.css`'s Vite light-mode block is gone**, and `:root` is now
  `color-scheme: dark; color: #fff; background: #361c2e`. Before, a phone in light mode
  turned every un-coloured text (node titles, the English column) navy on purple, and every
  button got a light-grey background.
- Keys fixed along the way: `<Fragment key={node.id}>` in `Map.tsx:275`, `WordGroup` keyed
  in all four views, `WordCell` keyed, `ProgressView`'s tabs and dots keyed.

Still open from T0:
- [ ] **Rewrite `README.md`** `20min` — still the Vite template. Doubly worth it now: a
      fullstack portfolio project gets read by other people.
- [ ] **Favicon** `5min` — `index.html:7` is still `/vite.svg`.

---

## Mobile v1 — known leftovers

Added 2026-10-13. Accepted on purpose to wrap mobile up; none of these blocks using it. If a
proper mobile design ever happens (one card per word, say), that's the case for a separate
component picked with `useMediaQuery` — the language choice already lives in `SideMenu`, so
both versions can share it.

- [ ] **Save can stay disabled with no visible reason.** `20min`
      `isWordComplete` needs all three translations (`WordAdd.tsx:38-39`, used by
      `allFilled`/`anyFilled` at `:191`, `:195`), but on mobile one column is hidden. Type
      English + French and Save stays greyed out because of the Swedish field you can't see.
      AUTO hides it when it works. Cheapest fix: mark the toggle when the hidden column has
      empty fields (`Swedish* >`).
- [ ] **`BackToMapButton` scrolls away.** `5min` — `position: absolute` inside the scroll
      container (`SideMenu/styles.ts:371`). `position: fixed`, or move it into the bottom
      bar. It also closes `WordAdd` without the "You sure?" step its own `x` has.
- [ ] **Sticky offsets depend on each other.** `5min` — `WordGroupHeader`'s `top: '60px'`
      (`SideMenu/styles.ts:79`) is the language header's height, and the header's
      `top: '-8px'` (`:46`) cancels `MenuZone`'s top padding. If the header ever wraps at
      ~400px, the group headers overlap it. A shared constant or CSS variable.
- [ ] **`DebugPanel` is hidden by width, not by dev mode** (`DebugPanel.tsx:38`, `:51`). So no
      "Use demo" on the phone, and it still ships to production on desktop. T2.12.
- [ ] **`NodeAddButton`'s own mobile `visibility` rule is dead** (`Map/styles.ts:160`) —
      `NodeRoot`'s `& > button` (`:106-109`) is more specific and does the work. Delete one.
- [ ] **Small.** `languageColors` (`SideMenu/styles.ts:11`) now has all three languages but is
      still typed `Partial` — make it `Record<Language, string>`. Header toggle buttons
      (`LanguageHeader.tsx:40`, `:65`) render as clickable-looking buttons on desktop with no
      handler. `[EDIT]` is hidden below `sm` (`SideMenu.tsx:112-114`) — fine while it's dead.

---

## T2 — Real bugs (in rough order of how much they'll bite)

- [x] **1, 2, 3, 7, 13** ✅ — see Done log.
- [ ] **4. React keys — mostly fixed, two things left.** `5min`
      - The `[✔]/[~]/[x]` buttons (`TrainView.tsx:161`) are still unkeyed.
      - **The real one:** rows are keyed on three translations concatenated
        (`WordList.tsx:63`, `TrainView.tsx:130`, `ProgressView.tsx:74`), and `addWords`
        appends without dedup, so the same word twice gives two rows with one key. Your
        uniqueness TODO at the top of this file, seen from the render side.
        `${group}_${index}` is the honest key — `WordAdd.tsx:233` already does it.
      - (`key={group}` on each `WordGroupHeader` does nothing — it isn't what the `.map()`
        returns. Harmless.)
      **Lint will never catch these** — `eslint-plugin-react` isn't installed.
- [ ] **5. The layout anchor is implicit.** `20min` — `calculateAllPositions(nodes, nodes[0])`
      (`Map.tsx:116`). No visible symptom (invariant 2). Store a `rootId` or comment why
      `nodes[0]` is safe. Not `parentId` — it's `null` everywhere.
- [ ] **6. Unreachable nodes vanish, and empty-map math produces garbage.** `20min`
      Bare `return` at `Map.tsx:247`. `Math.min(...[])` is `Infinity` (`:120`, `:125`),
      `Math.max(...[])` is `-Infinity` (`mapWidth` `:180`, `mapHeight` `:189`, `maxLevel`
      `:145`). Guard both directions.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — `nodesReducer.ts:11`, `Map.tsx:28`.
      Move next to `LinkDirections` in `data.ts`.
- [ ] **9. Game rules are scattered.** `20min` — **and the backend makes this one matter.**
      `LEVELS_REQUIRED_PER_LINK` lives in `Map.tsx:26` and the gate formula is inline in a
      click handler (`Map.tsx:166-169`), next to the hint (`:325`), while
      `REQUIRED_WORDS_PER_LEVEL` and `getNodeLevel` are in `helpers.ts:38`, `:44`. A
      `rules.ts` with both constants, `getNodeLevel` and a `canBranch(node)` /
      `nextBranchLevel(node)` pair is what a server would import to validate an `addNode`.
- [ ] **10. Palette lives in the side menu's styles.** `5min` — `SideMenu/styles.ts:4-15`,
      imported by `Map/styles.ts` and `App.tsx`. A `theme/colours.ts` is a pure move.
      `Theme.ts:53` still hardcodes `color: 'white'` on `MuiInputBase`.
- [ ] **11. `direction` leaks to the DOM.** `5min` — `NodeAddButton` filters `"position"`
      (`Map/styles.ts:129`) but the prop is `direction` (`Map.tsx:337`).
- [ ] **12. `DebugPanel` ships to users.** `5min` — the demo-data half is done. Left: gate it
      behind `import.meta.env.DEV` instead of the width check (`DebugPanel.tsx:51`), which
      also drops `nodesDemo.ts` out of the 423 KB bundle. And it pairs `resetHistoryTo` with
      a raw `dispatchNodes`, correct **only** because `App.tsx:96` passes the non-logging
      dispatch — a `loadNodes(nodes)` in `storageHistory.ts` would make that unrepresentable.

---

## T3 — Persistence ✅ done, with follow-ups

All refs in `storageHistory.ts`. Several of these change shape once there's a server.

- [ ] **`getInitialState` can return `[]`.** `5min` — empty base + empty log → `Map` computes
      `mapWidth = -Infinity`. Not reachable through the UI. Ties into T2.6.
- [ ] **`isHistory` validates the envelope, not the contents.** `20min`, or decide not to.
      Fine for local storage. **Not fine for a server** — see "Before the backend".
- [ ] **`saveAction` can silently desync from disk.** `20min` — pushes, *then* writes
      (`:35-36`). If `setItem` throws, memory and disk disagree forever. The same shape of
      problem as "the POST failed" once there's a server, so worth solving once with that in
      mind.
- [ ] **Nothing bounds the log.** `deep`, parked. 0.3 MB / 0.7 ms at 1,000 actions, 2.9 MB /
      7.1 ms at 10,000, all main-thread. Compaction when it matters — on a server too.
- [ ] **`schema: 1` is checked but nothing migrates.** `20min` — becomes mandatory with a
      backend.
- [ ] **State shape.** `deep`, optional — `Record<string, MapNode>` + `rootId`. Readability,
      not correctness. If you do it, do it before the server, while there's only one copy of
      the data to migrate.

---

## T4 — Unfinished flows (smallest first)

- [x] **Level up**, **TRAIN v1** ✅ — see Done log.
- [ ] **Decide where example sentences go.** `20min` / `1h` — `examples` exists, `WordList`
      and `TrainView` render them, only `WordAdd` has no inputs.
- [ ] **EDIT flow** `1h` — `[EDIT]` is `disabled={true}` (`SideMenu.tsx:113`); `edit` is
      already in `SideMenuMode` (`data.ts:6`). Training records are keyed by word text (T6),
      so editing a word orphans its history — accept that, or move the record in the same
      handler.
- [ ] **Delete a node** `1h` — **where invariant 1 gets decided.** Leaf-only (≤1 non-null
      `linkIds`), written once, used in both delete paths, same commit as the UI.
      `unlinkTargetNode` (`nodesReducer.ts:18`) does the hard part. Needs a confirm step —
      `WordAdd`'s `x` → "You sure?" (`:268-273`) is the pattern. Decide whether deleting a
      node deletes its words' training records (probably not).
- [ ] **PROGRESS "errors" / "time"** — disabled tabs (`ProgressView.tsx:40`). Fix T6's
      `lastCheck` type first.
- [ ] **Zoomable map** `deep` — `transform: scale()` + wheel/pinch; `scrollToNode`
      (`Map.tsx:198`) needs the scale.
- [ ] **Search: find a node by a word in it** `1h` — filter on `words[*].translations[*]`,
      reuse `scrollToNode` + focus. Also a natural first *server* query, if you want one.
- [ ] **Make the language list configurable** `1h` — the triple is one declaration
      (`data.ts:61`). Left: `languageCode` (`WordAdd.tsx:41`) and `languageColors`
      (`SideMenu/styles.ts:11`) are two more tables keyed by language. One per-language
      config next to the triple. The annotation on `emptyTranslations` (`WordAdd.tsx:26`) is
      load-bearing — annotate, don't assert. The `as` casts (`WordAdd.tsx:93`, `:101`, `:132`,
      `:174`; `TrainView.tsx:62`) are the only thing giving `Object.fromEntries` its shape.
- [ ] **AI word / category suggestions** `deep` — a good excuse for a server endpoint later:
      the API key can't live in the client.
- [ ] **Inner nodes** `deep` — `innerNodeIds` unused; each inner map is its own connected
      scope. ZOOM placeholders in `WordList.tsx:37`, `WordAdd.tsx:213`; `onZoomClick` is an
      empty `// WIP` (`SideMenu.tsx:66`).

---

## T5 — `WordAdd` / autotranslate: what's left after four sittings

**Nothing here is a visible bug. Read before reopening the file** — it's finished enough. The
first two have teeth.

- [ ] **The async write-back is correct only because the inputs are disabled.** `20min`
      `setWords(() => wordsUpdated)` (`WordAdd.tsx:175`) ignores `prev`; `wordsUpdated` is
      built from `words` captured before the `await` (`:143`, `:160`). Can't bite today —
      the inputs are `disabled={isLoading}` (`:241`), AUTO is disabled while loading
      (`LanguageHeader.tsx:48`). Merge into `prev` anyway. Save (`:265`) and `x` (`:268`) are
      not disabled while loading.
- [ ] **Two traversals kept in step by a hand-rolled counter.** `20min` — `:143` vs `:160`,
      `let i = -1` / `++i` (`:158`, `:163`). Keep the `Record` shape through the fetch.
- [ ] **`translate` returns `any`.** `5min` — `?? ''` at `:57`. Annotate `Promise<string>`.
- [ ] **A successful empty translation overwrites a typed word.** `5min` — `?? ''` (`:57`)
      wins the `??` at `:168-169`. Throw instead.
- [ ] **A total failure locks the retry.** `5min` — `setInputTouched(false)` (`:176`) runs on
      failure too; `enableAutoTranslation` (`:184`) needs it.
- [ ] **`isWordComplete` tests for `''` specifically.** `5min` — `:38-39`. `.every((v) => !!v)`.
- [ ] **MyMemory is still the wrong API.** `deep`. A real dictionary API is the fix — and with
      a backend, the call (and any key) can move server-side.

---

## T6 — TRAIN / PROGRESS: the second store

**None of this is critical.** Re-read "Before the backend" before syncing this store — it's
the one that doesn't fit the append-only model.

- [x] ~~Key format change orphans old records~~ — committed in `b973ec3`; old test records
      are dead weight, "Reset training data" clears them.
- [ ] **Records are keyed by word text** (`getWordKey`, `helpers.ts:66`). Same pair in two
      nodes shares a record (probably right); editing a word orphans its history (T4 EDIT);
      the group is part of the key, matching your "allow repeats if different categories"
      TODO. Pick the same uniqueness rule for adding words and for this key.
- [ ] **`lastCheck: Date` is a type lie after a reload.** `5min` — `data.ts:40` vs
      `TrainView.tsx:103`. `JSON.parse` gives back a string; `lastCheck.getTime()` will throw
      when "time" reads it. Store `Date.now()` as `number`. Also a JSON-over-HTTP issue, so
      fix it before it crosses a network.
- [ ] **The per-render read in `TrainView` is load-bearing.** `5min`, a comment —
      `getWordStrengthList()` at `TrainView.tsx:65` runs every render and that's what keeps it
      fresh after a save. Wrapping it in `useMemo` like `ProgressView.tsx:29` would make the
      second grade overwrite the first.
- [ ] **Revealing a second word before grading the first drops the first grade.** `5min` to
      decide — `onRevealClick` (`TrainView.tsx:71`) replaces `evaluationPending` (`:81`).
- [ ] **`[TRAIN]` hides at level 0** (`SideMenu.tsx:96`) even with saved words. Deliberate?
- [ ] **Small:** `saveWordStrengthList` / `setWordStrengthList` are one write under two names
      (`storageStrength.ts:30`, `:34`). `isWordStrengthList` (`:5`) accepts `null`/arrays.
      `TrainView.tsx` exports `TrainMode`. `ProgressMode.time` is `'time,'` (`data.ts:14`).
      `ProgressView` takes `onZoomClick` and never uses it (`:26`).

---

## Game design — open questions worth writing down

- **Geomap or mindmap?** The 4-neighbour grid is a bet on *geomap*. The more you build on it
  the more the bet is locked in.
- **Path-finding mode** — route from a start node to a destination as speaking practice.
  Unique route on a tree (invariant 2).
- **What does a grade mean over time?** Decay, and eventually maybe spaced repetition, once
  "time" exists.
- **Shared maps?** A backend makes "someone else's map" possible for the first time — a
  teacher's map, a published starter map. Read-only sharing is cheap with a log; collaborative
  editing of one map is a much bigger problem (two people branching the same node).

---

## Parked on purpose — permission to not think about these

- **Making room / stretchable edges.** `deep`. A solution always exists on a tree; the cost is
  collision cascading through other branches. Really "incremental grid layout with constraint
  propagation" — stored coordinates or dropping the grid. Variable-length edges would be a
  distance per link multiplied into `directionShift` (`Map.tsx:35`).
- **Dynamic non-grid graph.** Invalidates `calculateAllPositions`, `scrollToNode`, `canExpand*`.
- **Tests.** None, and fine. If you want one: `calculateAllPositions`, five cases including a
  disconnected graph. Second candidate: the gate, once it's in `rules.ts`. **A backend
  changes this calculus** — server endpoints are where tests usually start paying for
  themselves, and the reducer is pure enough to test from either side.
- **Accessibility and keyboard nav.** Unlabelled `+` buttons, no Escape to close the menu.
- **`vite` pinned to `^8.0.0-beta.13`** with an `overrides` entry (`package.json:34-37`).

---

## Suggested next session

**Backend, by choice.** The game doesn't need one; you want a fullstack project to learn on,
and this is a good one for it because the data model is small and already event-shaped.

Before writing server code, two decisions that everything else follows from — "Before the
backend" has the reasoning for both:
1. **Store actions or store nodes?** A log on the server keeps your architecture; a node
   table is the more conventional CRUD shape. Either is a legitimate learning path.
2. **What does a server refuse?** Today nothing validates an action. Deciding which invariant
   checks move server-side tells you what to extract first — almost certainly T2.9's
   `rules.ts`.

Cheap things worth doing before the first server commit, because they're cheaper while
there's only one copy of the data:
- T6 `lastCheck` → `number` (`5min`) — a `Date` doesn't survive JSON either way.
- T2.12 `import.meta.env.DEV` on `DebugPanel` (`5min`).
- T3 state shape, *if* you were ever going to do it.
- `README.md` — people will look at a fullstack portfolio repo.

In downtime, by appetite: T4 delete a node (the invariant-1 commit), T4 search, the Mobile v1
leftovers, T2.8 / T2.11 (`5min` each).
