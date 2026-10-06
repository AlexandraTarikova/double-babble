# My own notes

TODO: add checking work uniqueness when adding new ones - remember to allow repeats if 
different categories

----

# Claude notes

# Double Babble — resume checklist

Written 2026-08-13 after a few months away. Updated 2026-09-26, and again 2026-10-06 after
TRAIN, PROGRESS and the branch-gate fix.
Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

Line numbers below were re-verified on 2026-10-06 **against the working tree**, which has
uncommitted changes in `Map.tsx`, `helpers.ts`, `TrainView.tsx`, `ProgressView.tsx`,
`DebugPanel.tsx` and a new `nodesDemo.ts`. If they drift again, `grep` beats trusting them.

---

## Where things stand

- **Uncommitted work is sitting in the tree, and it's good.** Commit it before starting
  anything new. It contains: the branch gate switched back on (T2.3), the hint number fixed
  (T2.2), `REQUIRED_WORDS_PER_LEVEL` lowered to 2/1/1, the training-key format change (see
  T6, it orphans existing training records), and the demo map moving into `nodesDemo.ts`.
- **`npm run build`, `npm run lint` and `npx prettier --check src/` are all clean** in the
  working tree. Lint went from 3 errors to 0 because uncommenting the gate used the three
  orphaned names. `noUnusedLocals` / `noUnusedParameters` are still commented out in
  `tsconfig.app.json:20-21`; with lint at zero now, that's worth turning back on.
- **TRAIN v1 shipped** (`368a716`), scoped exactly as small as planned: reveal a hidden
  translation, grade yourself `[✔]`/`[~]`/`[x]`, the grade is appended to a history. No
  scheduling, no spaced repetition.
- **PROGRESS shipped** (`d19ae56`): last five grades per word pair as dots. "errors" and
  "time" tabs are disabled placeholders.
- **Training data is a second store with different rules.** `wordStrength` in
  `localStorage` is a plain snapshot keyed by word text, outside the action log and outside
  the reducer. That's a reasonable call for per-word stats, but none of the invariants below
  cover it. T6 has what to know.
- **`SideMenu` became a mode switch.** One `mode` state (`SideMenu.tsx:28`) instead of
  `hasTitle`/`levelUpInProgress` flags, with `NewTitle`, `TitleBlock` and `LanguageHeader`
  split out. `storage.ts` was renamed `storageHistory.ts`.
- **The game loop closes, and now branches.** Add words → level up → node grows → branch.
- **`level` is derived, not stored.** `getNodeLevel(node)` (`helpers.ts:34`) against
  `REQUIRED_WORDS_PER_LEVEL` (`helpers.ts:28`).
- **Autotranslate works, and fails cleanly.** What's left is structural — T5, and it says
  why not to reopen it.
- **The hard part works.** `calculateAllPositions` (`Map.tsx:35`) derives the whole layout
  by walking links. Don't rewrite it.
- **The data model anticipates the future.** `innerNodeIds` and `examples` are on the
  types. `parentId` is still **`null` on every node** — demo and `createNode`
  (`helpers.ts:17`) alike. A door left open, not a usable field.
- **The UI assumes a wide screen.** That's the next thing being worked on, by choice — see
  "Suggested next session" at the bottom.
- ~5,650 lines across 25 files, but ~3,000 of those are demo vocabulary (`nodesDemo.ts`
  2,304, plus ~690 lines of the now-dead copy in `data.ts`). The code itself is still small.

---

## Invariants — the rules the code quietly depends on

These aren't tasks. They're assumptions that are load-bearing in several places at once, so
breaking one produces a bug that surfaces somewhere unrelated.

### 1. The node graph is always connected.

Verified 2026-09-08 by walking all 7 demo nodes as anchor. **Four** separate pieces of
code depend on this:

- `calculateAllPositions` (`Map.tsx:35`) only positions nodes reachable from its start
  node. Unreachable nodes keep `{x: null, y: null}`.
- The render bails with a bare `return` on a null position (`Map.tsx:240`), so an
  unreachable node **renders as nothing at all**. Silent data loss from the user's view.
- `nodes[0]` is the layout anchor (`Map.tsx:109`). Safe only because every anchor reaches
  every node — see invariant 2.
- `canExpandN/E/S/W` (`Map.tsx:251-262`) test cell occupancy *only*, not the `linkIds`
  slot. That's correct **because** a linked neighbour always occupies the adjacent cell —
  which requires it to have a position. If a linked node is ever unpositioned, a `[+]`
  renders over a live link and clicking it overwrites `linkIds`, orphaning the old
  neighbour. Worth a one-line comment at `Map.tsx:251`.

**This is also the core game mechanic**, not just an implementation detail: the whole point
is building a path from words you have to words you want. A disconnected node is a
vocabulary set obtained without earning the route to it. So enforce it when *mutating*
state and let the layout assume it. See T4 "Delete a node".

**It holds again — re-verified 2026-10-06 with the gate back on.** Nothing checks it; it
survives on a chain of four facts across four files:

1. **Only an untitled node can be deleted.** The only delete path in the UI is the `x` in
   `NewTitle.tsx:38` → `onCancelNewNodeClick` (`App.tsx:71`), and `NewTitle` renders only
   inside `{!hasTitle && …}` (`SideMenu.tsx:88`).
2. **An untitled node is permanently level 0.** `WordAdd`, the only UI that adds words,
   renders on `mode === 'levelUp'` (`SideMenu.tsx:98`). The only `setMode('levelUp')` in the
   codebase is the `[+]` in `TitleBlock.tsx:33`, and `TitleBlock` renders only inside
   `{hasTitle && …}` (`SideMenu.tsx:85`). `key={nodeInFocus.id}` (`App.tsx:109`) resets
   `mode` when you switch nodes, so a stale `levelUp` can't leak onto an untitled node.
3. **The branch gate blocks a level-0 node that already has a link.** `Map.tsx:160-166`:
   blocked when `linksAmount >= floor(level / 3) + 1`. At level 0 with one link that's
   `1 >= 1`, blocked. So an untitled non-root node can never acquire a child.
   **New edge case from the `+ 1`, checked and safe:** a node with *zero* links passes
   (`0 >= 1` is false). That's only ever the single node of a fresh map — first launch or
   "Clear history" — and that node is untitled. So an untitled root can get exactly one
   child, after which it has one link and is blocked. One link makes it a leaf, so deleting
   it later leaves one connected tree. The chain still holds.
4. `DebugPanel`'s `set` bypasses every guard above by design, but `grep -c "title: ''"
   src/nodesDemo.ts` returns `0` — no demo node is untitled, so `set` can't install an
   untitled non-leaf either.

`App.tsx:72`'s `nodes.length > 1` is not part of this chain; it stops the map going *empty*,
a different problem.

**What breaks it: condition 1 dying.** The moment a delete path is exposed for a *titled*
node — which T4 "Delete a node" plans — a node with children becomes deletable and the split
is live. The reducer's `delete` case (`nodesReducer.ts:124`) will split the graph quite
happily. So the leaf-only check is what has to land in the same commit as any wider delete
UI.

(The 2026-09-26 version of this section described a live split reachable while the gate was
commented out. That's gone with the gate back on. Still in your saved map if you triggered it
back then — "Clear history" fixes that.)

### 2. The graph is a tree, by construction.

Every add creates a fresh node with exactly one link back to its parent, so you can never
close a cycle. 7 nodes / 6 edges, and that ratio is structurally locked.

Consequences worth knowing before you change anything about adding:

- **The layout anchor doesn't matter.** Because `positionsNormalized` (`Map.tsx:124`)
  subtracts `minX`/`minY`, the layout is translation-invariant. Anchoring on any of the 7
  demo nodes produces byte-identical rendered positions — verified. So `nodes[0]` is
  currently harmless. It stops being harmless the moment invariant 1 breaks.
- **Exactly one path between any two nodes.** Good for a "find the route from X to Y" game
  mode: unique solution, not a shortest-path problem.
- **"Make room" is well-defined.** Cutting any edge splits a tree into exactly two
  components, so you can always translate one side. On a graph with cycles this can be
  outright impossible. See Parked → "Making room".
- If you ever add "link two existing nodes", this invariant dies and takes the three
  points above with it.

### 3. Links are symmetric.

The `addNode` case of `nodesReducer` (`nodesReducer.ts:69-93`) writes both sides — the new
node's back-link and the parent's forward link. Every demo node reciprocates.
`calculateAllPositions` traverses via `currentNode.linkIds[direction]` and positions the
child via its back-link, so a one-sided link means the child never gets positioned
(→ invariant 1). A link pointing at a **nonexistent** id is worse: `positions[danglingId]` is
`undefined`, `undefined?.x !== null` is `true`, and the walk throws a TypeError. Nothing
currently creates one; if you write a migration or hand-edit saved data, that's the crash to
expect.

### 4. The action log must stay replayable.

`storageHistory.ts` keeps `{schema, base, log}` and rebuilds state on load with
`log.reduce(nodesReducer, base)` (`storageHistory.ts:49`). For that to give back the map you
had, four things must all hold:

- **The reducer stays pure and deterministic.** No `Date.now()`, no `crypto.randomUUID()`,
  no `localStorage`, no `console` side effects that matter. React's StrictMode already
  double-invokes it to check, so an impure reducer shows up as doubled effects in dev.
- **Ids are minted by the caller, never by the reducer.** `onAddNodeClick` (`App.tsx:59`)
  calls `createNode()` and puts the whole node in the payload. If the reducer generated the
  uuid instead, every replay would produce different ids and the whole graph would come
  apart. This is the single most important line to not "tidy up" later.
- **Actions describe the change, not the result.** `edit` carries `{id, changes}` and
  `addNode` carries `targetNodeId`, so the reducer reads current values out of `state`.
  `addWords` (`nodesReducer.ts:94`) carries only the words being added and appends them to
  whatever the node holds *at replay time*. Reusing `edit` with `changes: {words}` instead
  would have stored a snapshot dressed up as a delta.
- **`set` is never logged.** It replaces the entire map, so it pairs with `resetHistoryTo`,
  which writes a *new base* and empties the log (`DebugPanel.tsx:64`, `:75`). Everything
  else goes through the logging `dispatch` wrapper (`App.tsx:40`). Get this backwards and
  you either store the whole map inside a log entry or lose the reset on reload.

Verified 2026-09-14: a six-action session (add / edit / add / delete / add / edit) replays
byte-identically to the live state.

**Training grades are not in this log**, and shouldn't be — `TrainView` writes `wordStrength`
directly. That's fine; it just means "replay gives you everything back" is true of the map
only. "Clear history" resets the map and leaves training records alone; "Reset training
data" is the separate button.

**A shape change already happened without `schema` moving** (2026-09-26): deleting the
stored `level` field changed `MapNode` and the `edit` payload, but `isHistory`
(`storageHistory.ts:8`) only checks `schema === 1`, so old saves still load with a stray
`level`. Harmless — nothing reads it — but proof the guard won't catch the next one.

---

## Done (keeping the log so future-you can see the shape of it)

**T0 — safety net** ✅ 2026-08/09
- [x] `git init` + `.gitignore` — done, with `.vscode/settings.json` un-ignored so the
      shared Prettier-on-save config is committable.
- [x] Restore `tsconfig.json` / `tsconfig.app.json` — `npm run build` green.
- [x] Delete `src/svg-raw.tsx` (922 lines of leftovers from a stamps project).
- [x] Drop dead dependencies — `@supabase/supabase-js`, `muuri`, `lodash`,
      `react-colorful` gone, plus the muuri CDN `<script>` from `index.html`.
      **`@mui/icons-material` deliberately kept** — used as button placeholders while coding.
- [x] Fix `index.html` title → `Double Babble`.
- [x] Add Prettier (`.prettierrc`, `.prettierignore`, `prettier` in **devDependencies**),
      format-on-save via `esbenp.prettier-vscode`, and `.git-blame-ignore-revs` for the
      formatting commit (`0c804fe`).

**T1 — lint sweep** ✅ 2026-09-07, 16 problems → 0
- [x] Unused imports, unused params, `FC<{}>` → `FC`, useless escapes, `values` hoisted out
      of `RetroSpinner`.
- [x] `data.tsx` → `data.ts` (zero JSX; killed two `react-refresh` errors).
- [x] The two `setState`-in-`useEffect` errors in `SideMenu.tsx` — fixed properly by
      `key={nodeInFocus.id}` on `<SideMenu>` (`App.tsx:109`) and deleting both effects.
- [x] Honest `useMemo` deps in `Map.tsx`. Prophylactic — neither dep lie had a visible
      symptom yet.

**T3 — persistence** ✅ 2026-09-14, `useState(NODES_DEMO)` → an event-sourced store
- [x] `localStorage` under one key (`nodesHistory`), holding
      `{schema: 1, base: MapNode[], log: NodeAction[]}`, replayed on load. Chose replay over
      an inverse-action undo stack because the reducer already exists and is pure, so replay
      is free, whereas inverses would be five more functions to keep in sync.
- [x] `useReducer` + a discriminated `NodeAction` union (`nodesReducer.ts:40`), with a
      `const _exhaustive: never = action` default, so a sixth action type fails the build.
- [x] Reducer in its own module — `storageHistory.ts` needs it for replay, and it imports
      storage, so leaving it in `App.tsx` would have been a cycle.
- [x] Lazy init — `useReducer(nodesReducer, undefined, getInitialState)` (`App.tsx:30`).
      Same trap as `useState(expensive())` vs `useState(expensive)`.
- [x] Logging in a `dispatch` wrapper (`App.tsx:40`), not a `useEffect` on `nodes`.
- [x] `isHistory` type guard on load (`storageHistory.ts:8`); a failed parse copies the raw
      string to `nodesHistory:corrupt` before resetting.
- [x] Size, measured: ~155 bytes per action against ~21 KB per full snapshot.

**T2.7 — shared `words` object** ✅ 2026-09-14 — `createNode()` builds a fresh object per call.

**T2.1 — `WordAdd` state** ✅ 2026-09-17 — one `Record<WordGroupsType, Word[]>`, row counts
from `deficit` (`WordAdd.tsx:77`).

**T4 level-up** ✅ 2026-09-17 — **Save** / **Level up** (`WordAdd.tsx:280`) → `handleSubmit`
(`:119`) → `onAddWords` (`App.tsx:78`) → `addWords` (`nodesReducer.ts:94`). One button, not
two: with `level` derived, "save partial" and "level up" are the same append.

**T2.13 — autotranslate error path** ✅ 2026-09-26, four sittings. The lesson:
**`Promise.allSettled` never rejects.** Failures sit in the results array as
`{status: 'rejected'}` entries; nothing reaches `catch`.

**`SideMenu` as a mode switch** ✅ 2026-09-27 (`85cee56`, `528e886`) — one
`SideMenuMode` state instead of boolean flags; `NewTitle`, `TitleBlock`, `LanguageHeader`
extracted. Same instinct as everything else: one value instead of several that must agree.

**T4 TRAIN v1** ✅ 2026-09-29 / 10-01 (`368a716`, `d19ae56`, `37360f3`) — scoped as small as
the plan said: reveal one hidden translation, self-grade 1/0/-1, append to a per-pair history
in `wordStrength`. Plus **PROGRESS** "general": the last five grades as dots
(`ProgressView.tsx:84-100`). Follow-ups in T6.

**T2.2 + T2.3 — the branch gate is back, and the hint is right** ✅ 2026-10-06, **in the
working tree, not committed yet.**
- `getNodeLevel(targetNode)` instead of the deleted `.level` (`Map.tsx:162`), so it
  compiles.
- `+ 1` on the allowance, which answers the old "is level 6 for a first child intended?"
  question with "no": the incoming link no longer counts. Child #k of a non-root node needs
  level 3k; the root gets child #1 at level 0, then 3, 6, 9. Lint 3 → 0 as a side effect.
- The hint is `linksAmount * LEVELS_REQUIRED_PER_LINK` (`Map.tsx:318`). Checked: it only
  appears on a *blocked* click (the `::after` pulse, `Map/styles.ts:218-226`), and whenever a
  click is blocked, `3 × linksAmount` is exactly the level that unblocks it. Correct
  everywhere it's visible. That also killed the inline `/ 3` from T2.9.
- Words per level 5/2/2 → 2/1/1, so a first child now costs 6 nouns, 3 verbs, 3 adjectives
  instead of 15/6/6. **Decide whether that's the real tuning or a testing value** before
  committing, and write the answer in the commit message.

Still open from T0:
- [ ] **Rewrite `README.md`** `20min` — still the untouched Vite template. `PROJECT.md`
      covers the "what is this" half; the README just needs your own two paragraphs and the
      commands.
- [ ] **Favicon** `5min` — `index.html:7` is still `/vite.svg`.

---

## T2 — Real bugs (in rough order of how much they'll bite)

- [x] **1. Verbs and adjectives write into the nouns array.** ✅ Done.
- [x] **2. The level-up hint shows the wrong number.** ✅ Fixed in the working tree — see
      Done log.
- [x] **3. The branch gate is commented out.** ✅ Back on in the working tree — see Done log.
- [ ] **4. Missing React keys — now in five files.** `20min`
      ✅ `WordAdd` is right: `<WordGroup key={key}>` (`:217`), `<WordLine key={…}>` (`:224`).
      The rest share two patterns:
      - **Key on a child instead of on what `.map()` returns.** `Map.tsx:268` returns a
        bare `<>` with the key on `NodeRoot` (`:302`) — needs `<Fragment key={node.id}>`.
        `WordList.tsx:48` and `TrainView.tsx:115` return an unkeyed `<WordGroup>` with the
        key on the header inside. `ProgressView.tsx:59` gets this right — copy it.
      - **No key at all on inner maps.** The per-language `<Box>` in `WordList.tsx:59`,
        `TrainView.tsx:126`, `ProgressView.tsx:79`; the grade buttons in `TrainView.tsx:151`;
        the tab fragment in `ProgressView.tsx:35`; both dot loops in `ProgressView.tsx:89`
        and `:96`.
      Separately, a real collision rather than a warning: `WordList.tsx:56`,
      `TrainView.tsx:123` and `ProgressView.tsx:67` key each row on its three translations
      concatenated, and `addWords` appends without dedup — so the same word twice gives two
      rows with one key. That's your TODO at the top of this file seen from the render side.
      `${group}_${index}` is the honest key everywhere — and in `TrainView` it already matches
      how reveal state is addressed (`:70`).
      **Lint will never catch these** — `eslint-plugin-react` isn't installed. They're
      browser-console warnings.
- [ ] **5. The layout anchor is implicit.** `20min` — half done.
      ✅ `addNode` and `edit` use `.map()` (`nodesReducer.ts:89`, `:119`), so order is stable.
      Still open: `calculateAllPositions(nodes, nodes[0])` (`Map.tsx:109`). No visible
      symptom (invariant 2); it's about making a future bug *deterministic*. Store a `rootId`
      or comment why `nodes[0]` is safe. Don't reach for `parentId` — it's `null` everywhere.
- [ ] **6. Unreachable nodes vanish, and empty-map math produces garbage.** `20min`
      The bare `return` at `Map.tsx:240` renders nothing for a null position. Guard it and at
      least `console.warn`. Also `Math.min(...[])` is `Infinity` (`Map.tsx:113`, `:118`) and
      `Math.max(...[])` is `-Infinity` (`mapWidth` `:173`, `mapHeight` `:182`, `maxLevel`
      `:138`). Guard both directions.
- [x] **7. Every new node shares one `words` object.** ✅ Done.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — `nodesReducer.ts:11` and
      `Map.tsx:21`. Move it next to `LinkDirections` in `data.ts`.
- [ ] **9. Game rules are scattered.** `20min` — closer.
      ✅ The inline `/ 3` is gone; both gate and hint use `LEVELS_REQUIRED_PER_LINK`.
      Still split: that constant lives in `Map.tsx:19`, while `REQUIRED_WORDS_PER_LEVEL` and
      `getNodeLevel` live in `helpers.ts:28`, `:34`. And the gate formula itself is written
      out twice in spirit — once as the block condition (`Map.tsx:160-162`), once as the hint
      (`:318`). A `rules.ts` with the two constants, `getNodeLevel`, and a
      `canBranch(node)` / `nextBranchLevel(node)` pair keeps those from drifting.
- [ ] **10. The colour palette — now defined once, in the wrong place.** `5min`
      ✅ One definition: `SideMenu/styles.ts:4-13`, imported by `Map/styles.ts:3-9` and
      `App.tsx:14`. Left: the map importing its colours from the side menu's styles is a
      backwards dependency — a `theme/colours.ts` is a pure move. And `Theme.ts:53` still
      hardcodes `color: 'white'` on `MuiInputBase`.
- [ ] **11. A prop leaks to the DOM.** `5min` — half gone.
      ✅ `TextButton color={…}` is gone from `SideMenu`.
      Left: `NodeAddButton` filters `"position"` in `shouldForwardProp`
      (`Map/styles.ts:126`), but the prop is `direction` (`Map.tsx:330`), so `direction="N"`
      reaches the DOM.
- [ ] **12. `DebugPanel` ships to users.** `5min` — renders unconditionally at `App.tsx:94`.
      Gate it behind `import.meta.env.DEV`. It now pulls in `nodesDemo.ts` (2,304 lines),
      so that also drops most of the current **420 KB** bundle (was 389 KB).
      Two things to finish while there:
      - **The demo-map move is half done.** `DebugPanel` imports `NODES_DEMO` from
        `nodesDemo.ts` (`:23`) and comments out the old import (`:8`), but `data.ts:256` still
        exports the old copy, plus `NOUNS_DEMO` / `VERBS_DEMO` / `ADJECTIVES_DEMO` (`:67`,
        `:142`, `:193`). Nothing else imports them — delete, and `data.ts` goes from 754 lines
        to about 65.
      - `DebugPanel` pairs `resetHistoryTo` with a raw `dispatchNodes`, correct **only**
        because `App.tsx:96` passes the non-logging dispatch. A `loadNodes(nodes)` in
        `storageHistory.ts` would make the wrong pairing unrepresentable.
- [x] **13. Autotranslate has no error path.** ✅ Done. MyMemory is still the wrong API — T5.

---

## T3 — Persistence ✅ done, with follow-ups

The build is in the Done log; invariant 4 is the part to not break. All refs are in
`storageHistory.ts`.

- [ ] **`getInitialState` can return `[]`.** `5min`
      An empty `base` with an empty log returns an empty array, and `Map` computes
      `mapWidth = -Infinity`. Not reachable through the UI while delete is guarded. Ties into
      T2.6.
- [ ] **`isHistory` validates the envelope, not the contents.** `20min`, or decide not to.
      `{schema: 1, base: [1,2,3], log: ["nonsense"]}` passes. Junk that throws during replay
      lands in the catch; junk that doesn't becomes state. Fine for a pet project — just say
      so in a comment.
- [ ] **`saveAction` can silently desync from disk.** `20min`
      Pushes to `history.log`, *then* calls `updateStorage()` (`:35-36`). If `setItem` throws
      (quota, Safari private mode) the action is in memory but not on disk, and every later
      save retries and fails silently. `try`/`catch` that pops the action back off.
- [ ] **Nothing bounds the log.** `deep`, deliberately parked. Measured 2026-09-14: 0.3 MB /
      0.7 ms at 1,000 actions, 2.9 MB / 7.1 ms at 10,000, all main-thread. Compaction (replay
      into a new base past N actions) is the answer when it matters.
- [ ] **`schema: 1` is checked but nothing migrates.** `20min` when the first shape change
      lands. Rejection + `:corrupt` copy is acceptable until there's data you'd hate to lose.
- [ ] **State shape, before any state library.** `deep`, optional — `Record<string,
      MapNode>` + `rootId` instead of an array searched with `.find()`. Readability, not
      correctness. Would be the first real use of `schema`.

---

## T4 — Unfinished flows (smallest first)

- [x] **Wire up the Level up button.** ✅ Done.
- [x] **TRAIN flow** ✅ v1 done — see Done log, follow-ups in T6.
- [ ] **Decide where example sentences go.** `20min` to decide, `1h` to build.
      `examples` exists on `Word`, the demo data is full of them, `WordList` and `TrainView`
      render them. Only `WordAdd` has no inputs.
- [ ] **EDIT flow** `1h` — `[EDIT]` at `SideMenu.tsx:83` has no `onClick`, and there's an
      `edit` key in `SideMenuMode` (`data.ts:6`) waiting for it. **New thing to decide before
      building it:** training records are keyed by word text (T6), so editing a word's text
      orphans its history. Either accept that ("a corrected word is a new word"), or move the
      record to the new key in the same handler.
- [ ] **Delete a node** `1h` — **and this is where invariant 1 gets decided.**
      Only an *unnamed* node can be dismissed today (`NewTitle.tsx:38` → `App.tsx:71`).
      `unlinkTargetNode` (`nodesReducer.ts:18`) already does the hard part.
      **Allow deleting leaf nodes only** (≤1 non-null `linkIds`) — write the check once, use
      it in both delete paths, and land it in the same commit as the UI. Verified: deleting
      `forest` renders 1–3 of the 6 survivors depending on `nodes[0]`; deleting `road` loses
      `castle`. Needs a confirm step — `WordAdd`'s `x` → "You sure?" (`:283-288`) is a
      pattern you already have. Also decide whether deleting a node deletes its words'
      training records (probably not — the same word may live in another node).
- [ ] **PROGRESS "errors" / "time"** — tabs exist, disabled (`ProgressView.tsx:38`). "time"
      will read `lastCheck`, which isn't a `Date` after a reload — fix T6's type lie first.
- [ ] **Zoomable map** `deep` — CSS `transform: scale()` on `MapContainer` plus a wheel
      handler. `scrollToNode` (`Map.tsx:191`) needs the scale in its arithmetic. On touch
      this becomes pinch-zoom, so it overlaps with the responsive work.
- [ ] **Search: find a node by a word in it** `1h` — filter on `words[*].translations[*]`,
      reuse `scrollToNode` + focus.
- [ ] **Make the language list configurable** `1h` — more than half done.
      ✅ The triple is declared once now: `languageL` / `languageC` / `languageR`
      (`data.ts:61`), and every component imports it.
      Left: two lookup tables keyed by language name — `languageCode` (`WordAdd.tsx:42`) and
      `languageColors` (`SideMenu/styles.ts:15`, which is `Partial<Record<…>>`, so a new
      language silently gets no colour). Fold both into one per-language config next to the
      triple, and a settings UI has somewhere to write to.
      Still load-bearing: the annotation on `emptyTranslations` (`WordAdd.tsx:27`). Annotate,
      don't assert. The remaining `as` casts (`WordAdd.tsx:86`, `:94`, `:125`, `:167`;
      `TrainView.tsx:58`) are the only thing giving `Object.fromEntries` results their shape.
- [ ] **AI word / category suggestions** `deep` — nice-to-have on top of a working loop.
- [ ] **Inner nodes (zoom into a node's own map)** `deep` — `innerNodeIds` exists, unused.
      Doesn't require a disconnected graph: each inner map is its own connected scope, and
      `calculateAllPositions` runs per scope. The ZOOM buttons in `WordList.tsx:29` and
      `WordAdd.tsx:205` are placeholders for it; `onZoomClick` is an empty `// WIP`
      (`SideMenu.tsx:42`).

---

## T5 — `WordAdd` / autotranslate: what's left after four sittings

**Nothing in this section is a visible bug.** These are structural things found while
reviewing it. **Read this before reopening the file.** It is *finished enough*. Go back in
only if one of these bites, or the T4 language work takes you there — and then the first two
have teeth.

- [ ] **The async write-back is correct only because the inputs are disabled.** `20min`
      `setWords(() => wordsUpdated)` (`WordAdd.tsx:168`) ignores `prev`, and `wordsUpdated`
      is built from `words` captured before the `await` (`:136`, `:153`). Edits made during
      the request would be reverted. Can't happen today: inputs are `disabled={isLoading}`
      (`:228`, `:246`, `:259`) and AUTO is disabled while loading (`LanguageHeader.tsx:22`).
      Make `setWords((prev) => …)` actually merge into `prev`.
      Same area: **Save** (`:280`) and **x** (`:283`) are not disabled while loading.
- [ ] **Two traversals walking in step, kept in step by a hand-rolled counter.** `20min`
      `targets` walks `Object.values(words)` (`:136`); the write-back walks `typedKeys(words)`
      (`:153`) with `let i = -1` / `++i` (`:151`, `:156`). Holds today, silently wrong if it
      ever doesn't. Keep the `Record<WordGroupsType, …>` shape through the fetch instead.
- [ ] **`translate` returns `any`.** `5min` — `?? ''` at `:58`. Annotate `Promise<string>`.
      The freeze it once caused (a `null` in a controlled `value`, React's loose `null !=`
      guard, warning once per page load) is the reason to care.
- [ ] **A successful empty translation overwrites a word you typed.** `5min` — `?? ''`
      (`:58`) makes "no answer" a fulfilled `''`, which wins the `??` at `:161-162`. Throw
      instead.
- [ ] **A total failure locks the retry.** `5min` — `setInputTouched(false)` (`:169`) runs on
      failure too, and `enableAutoTranslation` (`:177`) needs `inputTouched`.
- [ ] **`isWordComplete` tests for `''` specifically.** `5min` — `:39-40`.
      `.every((v) => !!v)` costs nothing.
- [ ] **MyMemory is still the wrong API.** `deep`, a decision rather than a fix.

---

## T6 — TRAIN / PROGRESS: the second store

Added 2026-10-06. **None of this is critical.** TRAIN and PROGRESS work. These are the rough
edges, the first one being the only one that touches data you already have.

- [ ] **The uncommitted key change orphans existing training records.** `5min`, just a
      decision. `getWordKey` (`helpers.ts:56`) went from `nouns__from-english-to-french__herbe`
      to `nouns__grass__from-english-to-french__herbe` — adding the source word, which is the
      right fix (two English words with the same French translation no longer share a
      record). But `wordStrength` has no `schema`, so old-format records just stop being
      found. Nothing breaks; they're dead weight. Since it's your own test data: press
      "Reset training data" (or "Generate training data") after committing and move on.
      Next time the key format changes there'll be real data, so that's when a `schema` on
      this store earns its place.
- [ ] **Records are keyed by word text.** Not a bug — a property to know.
      Consequences: (a) the same word pair in two nodes shares one record, which is probably
      what you want — it's the same knowledge; (b) editing a word's text orphans its history
      (see T4 EDIT); (c) the group is part of the key, so "a fly" as a noun and "to fly" as a
      verb stay separate — which matches your uniqueness TODO at the top ("allow repeats if
      different categories"). Whatever uniqueness rule you pick for adding words, pick the same
      one here.
- [ ] **`lastCheck: Date` is a type lie after a reload.** `5min`
      `data.ts:40` says `Date`, `TrainView.tsx:99` writes `new Date()`, but `JSON.stringify`
      turns it into a string and `JSON.parse` doesn't turn it back. Nothing reads it yet. The
      PROGRESS "time" tab will, and `lastCheck.getTime()` will throw. Store `Date.now()` as
      `number` (or an ISO `string`) and type it honestly.
- [ ] **The per-render read in `TrainView` is load-bearing.** `5min`, a comment.
      `getWordStrengthList()` at `TrainView.tsx:61` runs on *every* render, and that's what
      keeps `wordStrengthList` fresh after a save (`setEvaluationPending(null)` triggers the
      re-render that re-reads). It looks like something to wrap in `useMemo` the way
      `ProgressView.tsx:27` does — **don't**: with a memo, the second grade in a session
      spreads the stale list and overwrites the first. `ProgressView` gets away with it
      because it's read-only and remounts on every visit. The tidy version is `useState`
      initialised from storage and updated alongside the save; until then, a comment.
- [ ] **Revealing a second word before grading the first silently drops the first grade.**
      `5min` to decide. `onRevealClick` (`TrainView.tsx:67`) replaces `evaluationPending`, so
      the earlier reveal stays revealed and ungraded. Fine if skipping is allowed — then it's
      a feature, and worth one line saying so.
- [ ] **`[TRAIN]` hides at level 0** (`SideMenu.tsx:67`), even when the node has saved
      words from a partial Save. `[PROGRESS]` always shows. Deliberate gate, or should it be
      "has at least one word"?
- [ ] **Small stuff.** `5min` each, whenever.
      - `saveWordStrengthList` and `setWordStrengthList` (`storageStrength.ts:30`, `:34`) are
        the same write under two names; keep the second.
      - `isWordStrengthList` (`storageStrength.ts:5`) accepts `null` and arrays — same
        "checks the envelope" stance as `isHistory`; `?? {}` covers `null`.
      - `TrainView.tsx` exports `TrainMode` — the file was renamed, the component wasn't.
      - `ProgressMode.time` is `'time,'` with a stray comma (`data.ts:14`). Unused, harmless.
      - `ProgressView` accepts `onZoomClick` and never uses it (`ProgressView.tsx:24`).

---

## Game design — open questions worth writing down

- **Geomap or mindmap?** The 4-neighbour grid is a bet on *geomap*: adjacency means
  something, and the constraint is thematic. A *mindmap* wants arbitrary degree and no
  geometry, and there the grid is pure tax. The more you build on the grid the more the bet
  is locked in.
- **Path-finding mode** — hardcoded maps, route from a start node to a destination as
  speaking practice. A tree gives a unique route (invariant 2). Also the mode that stresses
  grid capacity hardest.
- **What does a grade mean over time?** PROGRESS shows the last five raw grades. Once
  "time" exists, the obvious next question is decay — a word last checked a month ago at
  `[✔]` probably isn't as strong as one checked yesterday. That's where spaced repetition
  would enter, if it ever does.

---

## Parked on purpose — permission to not think about these

- **Making room / stretchable edges.** `deep`, genuinely hard, correctly parked.
  The goal: `[+]` on a side whose cell is occupied by an *unconnected* node, pushing things
  apart to fit.
  - **A solution always exists on a tree** — the path to the occupant has an edge pointing
    the needed way; stretch it by one.
  - **Inserting a real node mid-edge** is nearly free (positions are derived), but doesn't
    solve this. **Variable-length edges** do: a distance per link, multiplied into
    `directionShift` (`Map.tsx:28`), and a span prop on `NodeLink`.
  - **The real cost is collision, and it cascades** — segments instead of points in
    `canExpand*`, translations that hit third branches, and a rule for which edge gives.
  - So it's **incremental grid layout with constraint propagation**, and the likely answer
    is stored coordinates with a real layout pass, or dropping the grid — the geomap/mindmap
    fork again.
- **Dynamic non-grid graph.** Force-directed layout invalidates `calculateAllPositions`,
  `scrollToNode` and every `canExpand*`. Revisit only if the grid genuinely blocks you.
- **Tests.** None, and that's fine. *If* you ever want one: `calculateAllPositions` is pure
  and the riskiest logic here — one vitest file, five cases, including a disconnected graph.
  A second candidate now: the gate formula, once it lives in `rules.ts` (T2.9).
- **Accessibility and keyboard nav.** The `+` buttons have no labels, Escape doesn't close
  the side menu. (Mobile moved out of this list — it's next.)
- **`index.css`** is still mostly Vite template CSS, including a `prefers-color-scheme:
  light` block (`index.css:69`) fighting your dark theme.
- **`vite` is pinned to `^8.0.0-beta.13`** with an `overrides` entry (`package.json:34-37`).
  Bump it and drop the override next time you touch `package.json`.

---

## Suggested next session

**1. Commit what's in the tree.** `5min`. It's lint-clean and it's the gate fix you planned.
Two decisions to put in the message: is 2/1/1 words-per-level the real tuning, and are you
fine resetting training data for the new key format (T6, first item). If `nodesDemo.ts` is
meant to replace the copy in `data.ts`, finishing that (T2.12) is a natural second commit.

**Nothing in the new flows blocks pausing features.** Checked specifically for loose ends: the
only thing touching stored data is the key-format change, and it's test data. Invariant 1
holds again with the gate on, including the new zero-link edge case. Everything else in T6 is
a rough edge, not a hole.

**2. Responsive UI — the plan for the next stretch.** What the layout currently assumes,
verified 2026-10-06, as a starting map rather than a design:

- **Side by side, always.** `RootZone` (`App.tsx:16`) is a flex row with
  `overflow: 'hidden'` and `minWidth: '100vw'`; the menu has `minWidth: '60%'`
  (`SideMenu/styles.ts:124`) and `padding: '8px 40px 40px 40px'`. On a phone the map gets
  under 40% of the width and the menu still loses 80px to padding. The decision to make
  first is the small-screen arrangement — stacked, or the menu as a full-screen/bottom
  sheet over the map — because everything else follows from it.
- **Word rows are three fixed columns** — `30% / 40% / 30%` in `LanguageHeaderRoot`
  (`SideMenu/styles.ts:44-53`) and `WordLine` (`:89-92`). Three languages side by side is
  the identity of the app, so it's worth trying to keep, but `WordAdd` puts three text inputs
  in those columns and `TrainView` puts three grade buttons *next to* a word inside one
  column (`TrainView.tsx:146-164`).
- **The map uses fixed pixels.** `NODE_WIDTH` 150, `NODE_HEIGHT` 80, `NODE_SPACE` 60
  (`Map/styles.ts:11-13`) and `padding: '60px'` on `MapZone` (`:19`). Panning is native
  scroll, which works on touch already. `scrollToNode` and the `ResizeObserver`
  (`Map.tsx:220-233`) re-centre on resize, so they should keep working whatever the
  container size — worth checking rather than assuming.
- **Hover-only behaviour.** Scrollbars are invisible until `:hover` (both `MapZone` and
  `MenuZone`), and `WordAdd`'s "You sure?" resets on `onMouseLeave` (`WordAdd.tsx:285`),
  which touch devices fire unreliably. The `[+]` branch buttons show on *focus*
  (`showLinkButtons={isFocused}`, `Map.tsx:306`), not hover, so those are fine.
- **Tap targets are small.** `[+]`, `[✔]/[~]/[x]` and the reveal blocks are text-sized
  buttons — fine with a mouse, fiddly with a thumb.
- **`DebugPanel` is `position: fixed` top-left** (`DebugPanel.tsx:52`) and will sit on top
  of whatever goes there on a phone. Doing T2.12 (`import.meta.env.DEV`) first makes it a
  dev-only nuisance.
- **No breakpoints exist yet** — no `@media`, no `theme.breakpoints` use; MUI's are there
  for free via the `ThemeProvider` you already have (`theme.breakpoints.down('sm')` inside
  `styled`).

**After that, by appetite:** T4 delete a node (the invariant-1 commit), T4 search, T6's
`lastCheck` fix before building PROGRESS "time". Cheap wins whenever: T2.8, T2.11, T2.12,
the T3 `getInitialState` fallback, the favicon, the README.
