# Double Babble — resume checklist

Written 2026-08-13 after a few months away. Updated 2026-09-15.
Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

Line numbers below were re-verified on 2026-09-15, after persistence landed and `App.tsx`
shrank from 180 lines to 107. If they drift again, `grep` beats trusting them.

---

## Where things stand

- **`npm run build` passes**, and `npx prettier --check src/` is clean.
- **`npm run lint` has 3 errors, all one cause.** The branch gate at `Map.tsx:156-164` is
  commented out, which orphans `LEVELS_REQUIRED_PER_LINK` (`:18`), `handleDisabledClick`
  (`:98`) and `linksAmount` (`:152`). That's a deferred decision, not rot: the gate is staying, it just can't be switched on
  until level-up exists — see T2.3.
  `noUnusedLocals` / `noUnusedParameters` are now commented out in `tsconfig.app.json:20-21`
  so unused vars no longer fail the build, and `.vscode/settings.json` downgrades them to a
  hint in the editor instead of red.
- **Persistence works.** T3 is done — see the Done log for the shape of it.
- **Version control exists**, with a `.git-blame-ignore-revs` so the Prettier commit
  doesn't pollute `git blame`.
- **The hard part works.** `calculateAllPositions` (`Map.tsx:34`) derives the whole layout
  by walking links. It's the cleverest thing here and it does its job. Don't rewrite it.
- **The data model anticipates the future.** `innerNodeIds` and `examples` are already on
  the types, waiting. Caveat: `parentId` is **`null` on every node** — all 7 demo nodes and
  every node `createNode` produces (`helpers.ts:13`). It's a door left open, not a usable
  field. Don't reach for it as a "find the root" marker until something actually sets it.
- ~2,470 lines across 18 files — but 729 of those are `data.ts`, almost all demo
  vocabulary. The code itself is still small and tidy.

---

## Invariants — the rules the code quietly depends on

New section, and probably the most useful thing in this file. These aren't tasks. They're
assumptions that are load-bearing in several places at once, so breaking one produces a
bug that surfaces somewhere unrelated.

### 1. The node graph is always connected.

Verified 2026-09-08 by walking all 7 demo nodes as anchor. **Four** separate pieces of
code depend on this:

- `calculateAllPositions` (`Map.tsx:34`) only positions nodes reachable from its start
  node. Unreachable nodes keep `{x: null, y: null}`.
- The render bails with a bare `return` on a null position (`Map.tsx:235`), so an
  unreachable node **renders as nothing at all**. Silent data loss from the user's view.
- `nodes[0]` is the layout anchor (`Map.tsx:107`). Safe only because every anchor reaches
  every node — see invariant 2.
- `canExpandN/E/S/W` (`Map.tsx:246-257`) test cell occupancy *only*, no longer the
  `linkIds` slot. That simplification is correct **because** a linked neighbour always
  occupies the adjacent cell — which requires it to have a position. If a linked node is
  ever unpositioned, a `[+]` renders over a live link and clicking it overwrites
  `linkIds`, orphaning the old neighbour. Worth a one-line comment at `Map.tsx:246`.

**This is also the core game mechanic**, not just an implementation detail: the whole point
is building a path from words you have to words you want. A disconnected node is a
vocabulary set obtained without earning the route to it. So enforce it when *mutating*
state and let the layout assume it. See T4 "Delete a node".

**It holds today, but nothing checks it.** Verified 2026-09-15. It survives on a chain of
four facts spread across three files, and no single place states the rule:

1. `SideMenu.tsx:118` — the `[x]` that fires the only delete path renders inside
   `{!hasTitle && ...}`, so **only an untitled node can ever be deleted**.
2. `SideMenu.tsx:71` — `LevelUpButton` renders inside `{hasTitle && ...}`, so an untitled
   node is **permanently level 0**.
3. The branch gate (`Map.tsx:156-164` — commented out, but staying; see T2.3) is
   `linksAmount >= Math.floor(level / 3)`. At level 0 that is `>= 0`, and every non-root node
   already holds one link back to its parent, so the test passes and the add is blocked. Not
   "needs level 3" — **level 0 blocks branching outright**. So an untitled node can never
   acquire a child, and the only deletable node is therefore always a leaf.
4. `DebugPanel`'s `set` bypasses every guard above by design, but `grep -c "title: ''"
   src/data.ts` returns `0` — no demo node is untitled, so `set` can't install an untitled
   non-leaf either.

`App.tsx:73`'s `nodes.length > 1` is not part of this chain; it stops the map going *empty*,
a different problem.

**What makes it reachable again: condition 1 dying.** The moment a delete or dismiss path is
exposed for a *titled* node — which T4 "Delete a node" plans — a node with children becomes
deletable and the split is live. The reducer's `delete` case (`nodesReducer.ts:85`) will
split the graph quite happily; it is simply never called that way today. So the leaf-only
check is not optional polish, it's what has to land in the same commit as any wider delete UI.

**And it is reachable right now, while the gate is commented out**, because that switches off
condition 3: name a node, `[+]` from it, `[+]` again from the still-untitled middle node,
name the third, then `[x]` the middle one. Both ends survive, unconnected.
`calculateAllPositions` walks from `nodes[0]`, the far node keeps `{x: null, y: null}`, and
`Map.tsx:235` renders nothing for it — gone from the map, still in state and still in the log,
across reloads. That's a reason not to leave the gate off for long, not a separate bug.

### 2. The graph is a tree, by construction.

Every add creates a fresh node with exactly one link back to its parent, so you can never
close a cycle. 7 nodes / 6 edges, and that ratio is structurally locked.

Consequences worth knowing before you change anything about adding:

- **The layout anchor doesn't matter.** Because `positionsNormalized` (`Map.tsx:123`)
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

The `add` case of `nodesReducer` (`nodesReducer.ts:60-73`) writes both sides — the new
node's back-link and the parent's forward link. Every demo node reciprocates. `calculateAllPositions` traverses via
`currentNode.linkIds[direction]` and positions the child via its back-link, so a one-sided
link means the child never gets positioned (→ invariant 1). A link pointing at a
**nonexistent** id is worse: `positions[danglingId]` is `undefined`, `undefined?.x !== null`
is `true`, and the walk throws a TypeError. Nothing currently creates one; if you write a
migration or hand-edit saved data, that's the crash to expect.

### 4. The action log must stay replayable.

New with persistence, and the least obvious one, because nothing enforces it. `storage.ts`
keeps `{schema, base, log}` and rebuilds state on load with
`log.reduce(nodesReducer, base)` (`storage.ts:49`). For that to give back the map you had,
four things must all hold:

- **The reducer stays pure and deterministic.** No `Date.now()`, no `crypto.randomUUID()`,
  no `localStorage`, no `console` side effects that matter. React's StrictMode already
  double-invokes it to check, so an impure reducer shows up as doubled effects in dev.
- **Ids are minted by the caller, never by the reducer.** `onAddNodeClick` (`App.tsx:60`)
  calls `createNode()` and puts the whole node in the payload. If the reducer generated the
  uuid instead, every replay would produce different ids and the whole graph would come
  apart. This is the single most important line to not "tidy up" later.
- **Actions describe the change, not the result.** `edit` carries
  `{id, changes}` and `add` carries `targetNodeId`, so the reducer reads current values out
  of `state`. An action carrying a whole captured node would write a stale copy back on
  replay.
- **`set` is never logged.** It replaces the entire map, so it pairs with
  `resetHistoryTo`, which writes a *new base* and empties the log
  (`DebugPanel.tsx:23`, `:34`). Everything else goes through the logging `dispatch`
  wrapper (`App.tsx:41`). Get this backwards and you either store the whole map inside a
  log entry or lose the reset on reload.

Verified 2026-09-14: a six-action session (add / edit / add / delete / add / edit) replays
byte-identically to the live state.

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
- [x] Unused imports in `Map.tsx` and `WordAdd.tsx`; unused `_` in `makeInitWordGroup`;
      unused `theme` param in `Theme.ts`; `FC<{}>` → `FC` in `DebugPanel.tsx`;
      useless escapes in `Map/styles.ts`; `values` hoisted out of `RetroSpinner`.
- [x] `data.tsx` → `data.ts` (zero JSX; killed two `react-refresh` errors). All 10 imports
      were already extensionless, so `git mv` needed no import edits.
- [x] The two `setState`-in-`useEffect` errors in `SideMenu.tsx` — fixed properly by
      `key={nodeInFocus.id}` on `<SideMenu>` (`App.tsx:96`) and deleting both effects.
- [x] Honest `useMemo` deps in `Map.tsx`.
      **Worth knowing what this did and didn't fix:** neither dep lie had a visible symptom
      yet. `[nodes.length]` meant a rename didn't recompute positions — but titles don't
      affect positions. And `minX`/`minY` are pure derivations of `positions`, so the old
      deps were already complete *in effect*; the rule just can't prove it. Both changes
      are prophylactic. The part that still matters is in T2.5.

**T3 — persistence** ✅ 2026-09-14, `useState(NODES_DEMO)` → an event-sourced store
- [x] `localStorage` under one key (`nodesHistory`), holding
      `{schema: 1, base: MapNode[], log: NodeAction[]}` — a base snapshot plus an
      append-only forward action log, replayed on load. Chose replay over an inverse-action
      undo stack because the reducer already exists and is pure, so replay is free, whereas
      inverses would be five more functions to keep in sync.
- [x] `useReducer` + a discriminated `NodeAction` union (`nodesReducer.ts:32`), with a
      `switch` and a `const _exhaustive: never = action` default, so adding a sixth action
      type fails the build instead of failing at runtime.
- [x] Reducer moved to its own module. Not cosmetic: `storage.ts` needs it for replay, and
      it imports `storage`, so leaving the reducer in `App.tsx` would have been a cycle.
- [x] Lazy init — `useReducer(nodesReducer, undefined, getInitialState)` (`App.tsx:31`).
      Passing `getInitialState()` as the second argument re-read `localStorage` on *every*
      render, because an argument expression is evaluated every time. Same trap as
      `useState(expensive())` vs `useState(expensive)`.
- [x] Logging happens in a `dispatch` wrapper (`App.tsx:41`), not a `useEffect` on `nodes`.
      The effect version saved once on mount (mount counts as a change) and twice under
      StrictMode, and it couldn't see *which* action caused the change. The wrapper is
      middleware in the Redux sense.
- [x] Storage validated on load with an `isHistory` type guard (`storage.ts:8`), and a
      failed parse copies the raw string to `nodesHistory:corrupt` before resetting, so a
      bad load costs the session but not the data.
- [x] Size, measured: ~155 bytes per action (add 300, edit 100, delete 66) against ~21 KB
      per full snapshot. The old snapshot-per-save design would have hit the ~5 MB quota
      after 239 saves.

**T2.7 — shared `words` object** ✅ 2026-09-14 — `createNode()` (`helpers.ts:3`) builds a
fresh object per call, so new nodes no longer share `nouns`/`verbs`/`adjectives` arrays.
Landed before persistence, which matters: saving shared-by-reference arrays would have
baked the bug into stored data.

Still open from T0:
- [ ] **Rewrite `README.md`** `20min` — still the untouched Vite template. Paste in your own
      description of the concept (nodes, levels, branching, inner maps, two languages +
      English pivot). **This is the anti-overwhelm task:** next time you come back after
      months, this file is what saves you.
- [ ] **Favicon** `5min` — `index.html:7` is still `/vite.svg`.

---

## T2 — Real bugs (in rough order of how much they'll bite)

- [ ] **1. Verbs and adjectives write into the nouns array.** `deep`-ish, high value.
      `WordAdd.tsx` holds one piece of state — `nouns` (`:37`) — but renders all three
      groups from it: `nouns[index]` at `:152`, `:154`, `:167`, `:180`. So typing a verb
      overwrites noun row 0. Worse, `nouns` has 6 slots and verbs/adjectives have 3, so the
      rows never line up. `allFilled` (`:112`) also only checks nouns — which is why
      **Level up** never enables.
      Fix: one state object keyed by word group, `Record<WordGroupsType, WordType[]>`, and a
      `handleChange(group, i, language)`.
- [ ] **2. The level-up hint shows the wrong number.** `5min`
      `Map.tsx:309` computes `Math.floor(node.level / 3) * 3 + 3`, correct only when you
      already have as many links as your level allows. For a **freshly branched node**
      (level 0, one link back to its parent) it promises "3", but the gate
      (`Map.tsx:156-164`, currently commented out) needs `floor(level/3) > 1` — i.e.
      **level 6**. That's the most common case in the app.
      Fix: `(linksCount + 1) * LEVELS_REQUIRED_PER_LINK`.
- [ ] **3. The branch gate is commented out — restore it, but not first.** `20min`, and it's
      the single cause of the three lint errors.
      The gate is `linksAmount >= Math.floor(level / 3)` (`Map.tsx:156-164`) and
      `linksAmount` counts *all* links including the one back to the parent. So the root gets
      its first branch at level 3 but **every other node needs level 6**. Either that's the
      intended difficulty curve — write it down in the README — or exclude the incoming link.
      Ties into #2.
      **Decided 2026-09-15: the gate stays and gets uncommented — but level-up has to land
      first.** Nothing raises `level` yet (T4), and the root starts at 0, so
      `0 >= Math.floor(0 / 3)` blocks even the very first add: switching the gate on today
      means nothing can branch at all. That's why it's commented out, and it's the whole
      reason T4 level-up sits ahead of it in the queue.
      It also does a second, quieter job — it is condition 3 of invariant 1, the thing that
      stops an unnamed node from acquiring children it could orphan. So it's not only pacing,
      and the map is genuinely splittable while it's off.
- [ ] **4. Missing React keys on three list renders.** `20min`
      `Map.tsx:259` returns a `<>…</>` per node with the `key` on the inner `NodeRoot`
      instead of on the fragment — and `<>` can't take a key, so this needs
      `<Fragment key={node.id}>`. Same shape at `WordAdd.tsx:138` (`WordGroup` unkeyed, key
      on `WordGroupHeader` at `:139`) and `WordList.tsx:36`.
      Note: **lint will never catch these** — `eslint-plugin-react` isn't installed, only
      `react-hooks` and `react-refresh`. They're browser-console warnings. Causes needless
      remounts, which is exactly what makes input focus and animations feel flaky.
- [ ] **5. The layout anchor is implicit.** `20min` — half done.
      ✅ The reordering half is fixed: `add` and `edit` now use `.map()` instead of
      filter-then-append (`nodesReducer.ts:74`, `:80`), so existing array order is never
      permuted and new nodes append at the end.
      Still open: `calculateAllPositions(nodes, nodes[0])` (`Map.tsx:107`) anchors on
      whatever happens to be first. **No visible symptom** (invariant 2: normalization makes
      the anchor irrelevant), so this isn't fixing a bug — it's stopping a future bug from
      being *nondeterministic*: if invariant 1 ever breaks, which fragment of the split map
      survives on screen depends on this. Either store an explicit `rootId` or
      accept `nodes[0]` with a comment saying why it's safe. Do **not** reach for `parentId` —
      it's `null` everywhere.
- [ ] **6. Unreachable nodes vanish, and empty-map math produces garbage.** `20min`
      The bare `return` at `Map.tsx:235` renders nothing for a null position (see
      invariant 1). Add a guard, and either render orphans in a corner or at least
      `console.warn` them so it's not silent.
      Also the reduce-over-empty cases: `Math.min(...[])` is `Infinity` (`Map.tsx:112`,
      `:117`) **and** `Math.max(...[])` is `-Infinity` (`mapWidth` at `:168`, `mapHeight`
      at `:177`). If every position is null you get a map sized `-Infinity`. Guard both
      directions, not just the `min` pair.
- [x] **7. Every new node shares one `words` object.** ✅ Done — see the Done log.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — identical map at
      `nodesReducer.ts:4` and `Map.tsx:20`. Move it next to `LinkDirections` in `data.ts`.
      `unlinkTargetNode` (`nodesReducer.ts:11`) is fine where it is — only the reducer uses it.
- [ ] **9. Game rules are scattered.** `20min`
      `LEVELS_REQUIRED_PER_LINK` in `Map.tsx:18`, `REQUIRED_WORDS_PER_LEVEL` in
      `WordAdd.tsx:21`, and the `/ 3` breakpoint math inlined at `Map.tsx:309`. One
      `rules.ts`. Cheap now, and it's what lets you tune the game later without a hunt.
- [ ] **10. The colour palette is defined three times.** `20min`
      `Map/styles.ts:8-13`, `SideMenu/styles.ts:3-12`, and `COLOUR_DARK` *again* at
      `App.tsx:15`. One `theme/colours.ts`. While you're there: `Theme.ts:53` hardcodes
      `color: 'white'` on `MuiInputBase`, fighting `palette.text.primary`.
- [ ] **11. `<TextButton color={…}>` does nothing.** `5min` — `SideMenu.tsx:81` and `:84`
      pass `color={COLOUR_LIGHT}`, but `TextButton` is a plain `styled("button")` that never
      reads it, so it leaks to the DOM as an attribute and styles nothing.
      Same class of bug: `NodeAddButton` in `Map/styles.ts` filters `"position"` in
      `shouldForwardProp`, but the prop is called `direction` — so `direction="N"` leaks
      through too.
- [ ] **12. `DebugPanel` ships to users.** `5min` — it renders unconditionally at
      `App.tsx:85`, fixed to the top-left corner. The "boop" button is gone; it now has real
      "Clear history" and "Use demo" buttons, so don't delete it — gate it behind
      `import.meta.env.DEV`. That also drops `NODES_DEMO` (729 lines of `data.ts`) out of the
      production bundle, which is most of the current 388 KB.
      While you're there: `DebugPanel` reaches into `storage` itself (`:6`) and pairs
      `resetHistoryTo` with a raw `dispatchNodes`. It is correct **only** because `App.tsx:85`
      passes the non-logging dispatch. Pass the logging `dispatch` by mistake and you write
      the entire map into a log entry. A `loadNodes(nodes)` in `storage.ts` that resets the
      base and returns the nodes would make that unrepresentable.
- [ ] **13. Autotranslate has no error path.** `20min` — `autoTranslate`
      (`WordAdd.tsx:61`) fires 2×N parallel requests to `api.mymemory.translated.net`
      (`:71`, `:80`) with no `catch`: a failed or rate-limited call just leaves the fields
      blank with no message, and the anonymous quota there is small.
      On the gibberish: MyMemory is a *translation-memory* API — it returns whatever humans
      previously submitted, so single words come back weird. That's the API, not your code.
      A real dictionary API is the actual fix, but do the error handling regardless so
      failures stop looking like bugs in your own code.

---

## T3 — Persistence ✅ done, with follow-ups

The build is in the Done log; invariant 4 is the part to not break. What's left:

- [ ] **`getInitialState` can return `[]`.** `5min`
      The old version had an `if (nodesFromStorage.length === 0) return createEmptyMap()`
      fallback and the rewrite dropped it. An empty `base` with an empty log now returns an
      empty array, and `Map` computes `mapWidth = -Infinity` (verified). Not reachable
      through the UI while delete is guarded, but the net is gone. Ties into T2.6, which is
      the same `Math.max(...[])` problem seen from the render side.
- [ ] **`isHistory` validates the envelope, not the contents.** `20min`, or decide not to.
      `{schema: 1, base: [1,2,3], log: ["nonsense"]}` passes the guard. You get some cover
      for free — the `reduce` runs inside the `try`, so junk that *throws* lands in the
      catch and resets — but junk that doesn't throw becomes your state. For a pet project
      stopping here is reasonable; just make it deliberate with a comment saying the guard
      covers shape and replay covers the rest, rather than leaving it looking finished.
- [ ] **`saveAction` can silently desync from disk.** `20min`
      It pushes to `history.log` and *then* calls `updateStorage()` (`storage.ts:35-36`).
      If `setItem` throws — `QuotaExceededError`, or Safari private mode, where it throws
      on the first write — the action is in memory but not on disk, and every later save
      retries the whole history and keeps failing, silently. A `try`/`catch` that logs and
      pops the action back off keeps the two in step.
- [ ] **Nothing bounds the log.** `deep`, deliberately parked — you want to think about the
      shape first. Numbers to think with, measured 2026-09-14: `saveAction` re-serialises
      the *entire* history on every action, so cost grows linearly — 0.3 MB / 0.7 ms at
      1,000 actions, 2.9 MB / 7.1 ms at 10,000. `localStorage.setItem` is synchronous, so
      that's main-thread time on every click; **jank arrives well before the ~5 MB quota
      does**. The standard answer is compaction: past some log length, replay into a new
      base and truncate. A few thousand actions is a lot of gameplay, so this is genuinely
      not urgent.
- [ ] **`schema: 1` is checked but nothing migrates.** `20min` when the first shape change
      lands. `isHistory` rejects anything that isn't `1`, which currently means "throw the
      map away and keep a `:corrupt` copy". That's an acceptable answer for now *because*
      the corrupt copy exists. The moment there's data you'd be sad to lose, this needs a
      real migration step rather than a rejection.
- [ ] **State shape, before any state library.** `deep`, optional
      `nodes` is an array searched with `.find()` in a dozen places. Normalizing to
      `Record<string, MapNode>` plus a `rootId` kills the `.find()`s and is the same shape
      any store would want later. Weaker argument than it was — `useReducer` landed and
      T2.5's reordering half is fixed — so this is now a readability call, not a correctness
      one. Note it would change the persisted `base` shape, i.e. the first real use for
      `schema`.

---

## T4 — Unfinished flows (smallest first)

- [ ] **Wire up the Level up button.** `1h` — `WordAdd.tsx:198` has `disabled={!allFilled}`
      and **no `onClick` at all**. Needs: lift the words to `App`, append to
      `nodeInFocus.words`, `level + 1`, close the form. Do T2.1 first or you'll submit six
      copies of the same noun. **This is the one that makes the game a game.**
      Now cheap on the state side: it's one `edit` action with
      `changes: {words, level}` — `NodeAction`'s `edit` payload already allows exactly those
      two fields plus `title` (`nodesReducer.ts:45`) and nothing else, so it can't
      accidentally touch `linkIds`. Also unblocks T2.3: without level-up, nothing can ever
      reach level 3, so the branch gate can't be switched back on.
- [ ] **Decide where example sentences go.** `20min` to decide, `1h` to build.
      `examples` already exists on `WordType`, the demo data is full of them, and
      `WordList.tsx:45` already renders them. Only `WordAdd` has no inputs. Cheapest version
      is one optional example row under each word line, and you're done.
- [ ] **EDIT flow** `1h` — `SideMenu.tsx:84`, button renders and does nothing.
- [ ] **Delete a node** `1h` — **and this is where invariant 1 gets decided.**
      Right now only an *unnamed* new node can be dismissed (`onCancelNewNodeClick`,
      `App.tsx:72`). `unlinkTargetNode` (`nodesReducer.ts:11`) is already written generically
      and does the hard part.
      **This is the commit where the leaf-only check stops being optional.** Invariant 1
      currently holds only because delete is exposed for untitled nodes alone, and an untitled
      node can never have children. Exposing delete for a *titled* node removes that
      guarantee outright, so the check has to land in the same commit, not the next one. Write
      it once — count non-null `linkIds`, allow when `<= 1` — and use it in both delete paths.
      Deleting a non-leaf node splits the graph. Verified: delete `forest` and depending on
      what sits at `nodes[0]`, between 1 and 3 of the 6 survivors render — the rest vanish
      silently. Delete `road` and `castle` disappears.
      **Decision: allow deleting leaf nodes only** (≤1 link), which keeps invariant 1 and
      matches the game's premise. Cheap, and correct rather than a workaround. The
      alternative — laying out every disconnected component — is in Parked below.
      Also needs a confirm step, since a node holds real vocabulary.
- [ ] **TRAIN flow** `deep` — `SideMenu.tsx:81`, renders and does nothing.
      Scope it brutally small for v1: show a word in one language, reveal the other two on
      click, no scoring, no spaced repetition. Ship that, then iterate.
- [ ] **Zoomable map** `deep` — a CSS `transform: scale()` on `MapContainer` plus a wheel
      handler gets most of the way. `scrollToNode` (`Map.tsx:186`) needs the scale factored
      into its arithmetic.
- [ ] **Search: find a node by a word in it** `1h` — genuinely easy and satisfying. Filter
      `nodes` on `words[*].translations[*]`, then reuse the `scrollToNode` + focus machinery
      that already exists.
- [ ] **Make the language list configurable** `1h` — `"english"`/`"swedish"`/`"french"` are
      hardcoded in `WordAdd.tsx` (init, both fetch URLs, three inputs) and `WordList.tsx`,
      even though the types are already open (`Record<string, string>`). A `LANGUAGES`
      constant with `{ pivot, left, right }` would let you change what you're learning
      without touching components.
- [ ] **AI word / category suggestions** `deep` — after persistence and level-up. It's a
      nice-to-have on top of a working loop.
- [ ] **Inner nodes (zoom into a node's own map)** `deep` — `innerNodeIds` exists, unused.
      Good news: this does **not** require allowing a disconnected graph. An inner map is a
      *separate scope* with its own nodes and its own links, connected among themselves — so
      it's a tree of connected graphs, each obeying invariant 1, and
      `calculateAllPositions` gets called per scope with a different input set. No new layout
      logic. Park until the outer map is solid.

---

## Game design — open questions worth writing down

- **Geomap or mindmap?** The 4-neighbour grid is a bet on *geomap*: adjacency means
  something, "branch into a lake and a farm from the forest" reads geographically, and the
  constraint is thematic. A *mindmap* reading wants arbitrary node degree and no geometric
  consistency at all, and there the grid is pure tax. You don't have to decide now, but the
  more you build on the grid the more the bet is locked in.
- **Path-finding mode** — hardcoded maps, player routes from a start node to a destination
  as speaking practice instead of journalling. Interacts with invariant 2: a tree gives a
  unique route, which makes it a well-defined puzzle. Also the mode that stresses grid
  capacity hardest — long paths through a filling grid, and cells run out.

---

## Parked on purpose — permission to not think about these

- **Making room / stretchable edges.** `deep`, genuinely hard, correctly parked.
  The goal: let the user press `[+]` on a side whose cell is occupied by an *unconnected*
  node, and push things apart to fit. In an H-shape, `[+]` east of the top-left corner is
  blocked by the top-right corner, and making room means doubling the middle bridge.
  What's known:
  - **A solution always exists on a tree.** The unique path from A to the occupant has net
    horizontal displacement equal to their x-difference, so at least one edge points the
    needed way; stretch it by one and the cell frees up. In the thin H there's exactly one
    horizontal edge, so the answer is forced and unambiguous.
  - **Two different features, very different costs.** *Inserting a real node mid-edge* is
    nearly free — positions are derived from links, so the walk produces the new layout by
    itself and every edge stays one cell long. But it doesn't solve this, because the space
    has to appear *without* a node appearing. *Variable-length edges* is the one you want:
    store a distance per link, multiply it into `directionShift` in the walk, and give
    `NodeLink` a span prop (it currently hardcodes `NODE_WIDTH + NODE_SPACE`
    in `Map/styles.ts`). That part is a prop and a multiply, not a rewrite.
  - **The real cost is collision, and it cascades.** Cells *along* a stretched edge become
    occupied, so `canExpand*` has to test a segment rather than a point. Worse, translating
    a component can collide with a *third* branch that had nothing to do with the
    operation, and fixing that can collide with a fourth. And where a path holds several
    candidate edges, you need a rule for which one gives — and the user watches a distant
    part of the map move for reasons they can't see.
  - So this isn't "make room", it's **incremental grid layout with constraint
    propagation**. When you get here, the cheap answer probably isn't a smarter walk:
    deriving positions from a memoryless walk is exactly what makes slack impossible to
    express. The alternatives are storing coordinates with a real layout pass, or dropping
    the grid — i.e. the same geomap/mindmap fork arriving from the other side.
- **Dynamic non-grid graph.** Force-directed layout, a different rendering model, and it
  invalidates `calculateAllPositions`, `scrollToNode`, and every `canExpand*` check. The
  4-neighbour grid is a legitimate design choice, not a compromise. Revisit only if the grid
  genuinely blocks you.
- **Tests.** There are none, and for a solo pet project that's fine. *If* you ever want
  exactly one: `calculateAllPositions` is a pure function and by far the riskiest logic
  here. One vitest file, five cases — including a disconnected graph, so invariant 1 has
  something watching it. Nothing else needs it.
- **Accessibility, mobile, keyboard nav.** Real gaps (the `+` buttons have no labels,
  Escape doesn't close the side menu, the layout assumes a wide screen). Worth knowing, not
  worth blocking on for a personal project.
- **`index.css`** is still mostly Vite template CSS — commented-out blocks, a `.logo` spin
  animation, a light-mode media query fighting your dark theme. Cosmetic; clean it whenever
  it annoys you.
- **`vite` is pinned to `^8.0.0-beta.13`** with an `overrides` entry, though 8.2.2 is
  stable. Probably leftover from getting the build working. Harmless, but it's cruft — bump
  it and drop the override next time you touch `package.json`.

---

## Suggested next session

**T2.1**, the `WordAdd` state bug, then **T4 level-up**. That pair is what turns this from a
map editor into a game, and it's the unblocker for everything downstream: nothing raises
`level` today, so the branch gate (T2.3) can't be switched on, so branching can't be tuned,
so T2.2's hint number can't be checked against real play. Do T2.1 first — until it's fixed,
level-up submits six copies of the same noun.

Then **uncomment the branch gate** (T2.3) and play with the numbers. That also restores
condition 3 of invariant 1; see the invariants section for what's exposed while it's off.

Cheap wins whenever you want one: T2.8 (`oppositeDirections`, `5min`), T2.12
(`import.meta.env.DEV` on `DebugPanel`, `5min` and it cuts most of the bundle), the T3
`getInitialState` empty-array fallback (`5min`), and the README, still the Vite template.
