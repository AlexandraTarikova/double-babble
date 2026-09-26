# My own notes

TODO: add checking work uniqueness when adding new ones - remember to allow repeats if 
different categories

----

# Claude notes

# Double Babble — resume checklist

Written 2026-08-13 after a few months away. Updated 2026-09-26.
Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

Line numbers below were re-verified on 2026-09-26, after `WordAdd` was rewritten and the
stored `level` field was deleted. If they drift again, `grep` beats trusting them.

---

## Where things stand

- **`npm run build` passes**, and `npx prettier --check src/` is clean.
- **`npm run lint` has 3 errors, all one cause.** The branch gate at `Map.tsx:162-167` is
  commented out, which orphans `LEVELS_REQUIRED_PER_LINK` (`:19`), `handleDisabledClick`
  (`:99`) and `linksAmount` (`:155`). That's a deferred decision, not rot: the gate is
  staying, and as of 2026-09-26 the thing that was blocking it has landed — see T2.3.
  `noUnusedLocals` / `noUnusedParameters` are now commented out in `tsconfig.app.json:20-21`
  so unused vars no longer fail the build, and `.vscode/settings.json` downgrades them to a
  hint in the editor instead of red.
- **Persistence works.** T3 is done — see the Done log for the shape of it.
- **The game loop closes.** T2.1 and T4 level-up both landed 2026-09-17. `WordAdd` holds one
  `Record<WordGroupsType, Word[]>`, **Save** / **Level up** commits through a dedicated
  `addWords` action, and the map redraws with the new level. You can actually play it now:
  add words, gain a level, watch the node grow. That was the "makes it a game" milestone.
- **`level` is no longer stored — it's derived.** `getNodeLevel(node)` (`helpers.ts:29`)
  computes it from word counts against `REQUIRED_WORDS_PER_LEVEL` (`helpers.ts:23`), and the
  field is gone from `MapNode`. Same instinct as `calculateAllPositions` deriving layout from
  links: one source of truth, nothing to keep in sync, and the rule is retuned by editing one
  constant. One consequence to know about — **the commented-out branch gate still reads
  `targetNode.level` (`Map.tsx:163`), so uncommenting it as written won't compile.** See T2.3.
- **Autotranslate works, and fails cleanly.** Four sittings got there. What's left is
  structural, not broken — T5 has it, and says why not to reopen it.
- **Version control exists**, with a `.git-blame-ignore-revs` so the Prettier commit
  doesn't pollute `git blame`.
- **The hard part works.** `calculateAllPositions` (`Map.tsx:34`) derives the whole layout
  by walking links. It's the cleverest thing here and it does its job. Don't rewrite it.
- **The data model anticipates the future.** `innerNodeIds` and `examples` are already on
  the types, waiting. Caveat: `parentId` is **`null` on every node** — all 7 demo nodes and
  every node `createNode` produces (`helpers.ts:13`). It's a door left open, not a usable
  field. Don't reach for it as a "find the root" marker until something actually sets it.
- ~2,750 lines across 20 files — but 725 of those are `data.ts`, almost all demo
  vocabulary. The code itself is still small and tidy.

---

## Invariants — the rules the code quietly depends on

New section, and probably the most useful thing in this file. These aren't tasks. They're
assumptions that are load-bearing in several places at once, so breaking one produces a
bug that surfaces somewhere unrelated.

### 1. The node graph is always connected.

Verified 2026-09-08 by walking all 7 demo nodes as anchor. **Four** separate pieces of
code depend on this:

- `calculateAllPositions` (`Map.tsx:35`) only positions nodes reachable from its start
  node. Unreachable nodes keep `{x: null, y: null}`.
- The render bails with a bare `return` on a null position (`Map.tsx:241`), so an
  unreachable node **renders as nothing at all**. Silent data loss from the user's view.
- `nodes[0]` is the layout anchor (`Map.tsx:109`). Safe only because every anchor reaches
  every node — see invariant 2.
- `canExpandN/E/S/W` (`Map.tsx:252-262`) test cell occupancy *only*, no longer the
  `linkIds` slot. That simplification is correct **because** a linked neighbour always
  occupies the adjacent cell — which requires it to have a position. If a linked node is
  ever unpositioned, a `[+]` renders over a live link and clicking it overwrites
  `linkIds`, orphaning the old neighbour. Worth a one-line comment at `Map.tsx:252`.

**This is also the core game mechanic**, not just an implementation detail: the whole point
is building a path from words you have to words you want. A disconnected node is a
vocabulary set obtained without earning the route to it. So enforce it when *mutating*
state and let the layout assume it. See T4 "Delete a node".

**It holds today, but nothing checks it.** Verified 2026-09-15. It survives on a chain of
four facts spread across three files, and no single place states the rule:

1. `SideMenu.tsx:125` — the `[x]` that fires the only delete path renders inside
   `{!hasTitle && ...}` (`:98`), so **only an untitled node can ever be deleted**.
2. `SideMenu.tsx:78` — `LevelUpButton` renders inside `{hasTitle && ...}` (`:63`), and
   `WordAdd` — the only UI anywhere that adds words — renders inside
   `{hasTitle && levelUpInProgress}` (`SideMenu.tsx:132`). Since level is now *derived* from
   word count, an untitled node can never gain a word, so it is **permanently level 0**. The
   conclusion survived the stored-`level` removal; the reason for it got stronger.
3. The branch gate (`Map.tsx:162-167` — commented out, but staying; see T2.3) is
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
`Map.tsx:241` renders nothing for it — gone from the map, still in state and still in the log,
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

The `addNode` case of `nodesReducer` (`nodesReducer.ts:69-92`) writes both sides — the new
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
  `{id, changes}` and `addNode` carries `targetNodeId`, so the reducer reads current values
  out of `state`. An action carrying a whole captured node would write a stale copy back on
  replay. `addWords` (`nodesReducer.ts:94`) is the newest case and gets this right: it carries
  only the words being added and appends them to whatever the node holds *at replay time*.
  The tempting alternative — reusing `edit` with `changes: {words}` — would have forced every
  action to carry the whole merged array, growing the log quadratically and storing a snapshot
  dressed up as a delta.
- **`set` is never logged.** It replaces the entire map, so it pairs with
  `resetHistoryTo`, which writes a *new base* and empties the log
  (`DebugPanel.tsx:23`, `:34`). Everything else goes through the logging `dispatch`
  wrapper (`App.tsx:41`). Get this backwards and you either store the whole map inside a
  log entry or lose the reset on reload.

Verified 2026-09-14: a six-action session (add / edit / add / delete / add / edit) replays
byte-identically to the live state.

**Added 2026-09-26 — a shape change has already happened, and `schema` didn't move.** Deleting
the stored `level` field changed both `MapNode` and the `edit` payload type
(`nodesReducer.ts:53`), but `isHistory` (`storage.ts:8`) only checks `schema === 1`, so a
`nodesHistory` written before the change still loads: its `base` nodes carry a stray `level`,
and any logged `edit` with `changes: {level: n}` writes that stray field back on replay.
Harmless today — nothing reads it and `getNodeLevel` ignores it — but it's the first real
instance of the problem the T3 `schema` item describes, and proof the guard won't catch the
next one. If a saved map ever looks wrong, "Clear history" in `DebugPanel` is the reset.

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

**T2.1 — `WordAdd` state** ✅ 2026-09-17 — one `Record<WordGroupsType, Word[]>` (`:92`) with a
`handleChangeWord(group, i, language)` (`:105`), so verbs and adjectives stop writing into the
nouns array. Row counts now come from `deficit` (`:82`), which asks how many of each group the
node still needs for its next level — so the form shows exactly what's missing instead of a
fixed six.

**T4 level-up** ✅ 2026-09-17 — **Save** / **Level up** (`WordAdd.tsx:294`) commits through
`handleSubmit` (`:124`) → `onAddWords` (`App.tsx:79`) → a dedicated `addWords` case
(`nodesReducer.ts:94`). This is the commit where it became a game. Two decisions worth keeping:
- **One button, not two.** With `level` derived, "save partial progress" and "level up" are
  the *same* action — appending words — so the button just flips its label on `allFilled`
  (`:295`). The third button you were considering would have been a second name for one
  dispatch.
- **`level` deleted rather than incremented.** The reducer never writes a level;
  `getNodeLevel` derives it from word counts. That's why there is no stale-level bug to worry
  about, and why the levelling rule can be retuned by editing one constant.

**T2.13 — autotranslate error path** ✅ 2026-09-26, and it took four sittings. `translate`
(`WordAdd.tsx:48`) throws on `!response.ok`, `getPromiseValue` (`:61`) logs `r.reason` and
returns `undefined`, the `?? word.translations[language]` fallback (`:166`, `:167`) keeps the
typed value, and `try`/`catch`/`finally` means the spinner always clears. All three inputs are
`disabled={isLoading}` (`:242`, `:260`, `:273`).
The lesson that cost the most time, written down so it's never rediscovered: **`Promise.allSettled`
never rejects.** With the network off, nothing reached `catch` and nothing printed — the failures
were sitting in the results array as `{status: 'rejected'}` entries the whole time. What looked
like a frozen app was a `null` reaching a controlled `value`; see T5 for that mechanism.

Still open from T0:
- [ ] **Rewrite `README.md`** `20min` — still the untouched Vite template. Paste in your own
      description of the concept (nodes, levels, branching, inner maps, two languages +
      English pivot). **This is the anti-overwhelm task:** next time you come back after
      months, this file is what saves you.
- [ ] **Favicon** `5min` — `index.html:7` is still `/vite.svg`.

---

## T2 — Real bugs (in rough order of how much they'll bite)

- [x] **1. Verbs and adjectives write into the nouns array.** ✅ Done — see the Done log.
- [ ] **2. The level-up hint shows the wrong number.** `5min`
      `Map.tsx:316` computes `Math.floor(level / 3) * 3 + 3`, correct only when you
      already have as many links as your level allows. For a **freshly branched node**
      (level 0, one link back to its parent) it promises "3", but the gate
      (`Map.tsx:162-167`, currently commented out) needs `floor(level/3) > 1` — i.e.
      **level 6**. That's the most common case in the app.
      Fix: `(linksCount + 1) * LEVELS_REQUIRED_PER_LINK`.
- [ ] **3. The branch gate is commented out — restore it, but not first.** `20min`, and it's
      the single cause of the three lint errors.
      The gate is `linksAmount >= Math.floor(level / 3)` (`Map.tsx:162-167`) and
      `linksAmount` counts *all* links including the one back to the parent. So the root gets
      its first branch at level 3 but **every other node needs level 6**. Either that's the
      intended difficulty curve — write it down in the README — or exclude the incoming link.
      Ties into #2.
      **Decided 2026-09-15: the gate stays and gets uncommented — but level-up has to land
      first.** Nothing raises `level` yet (T4), and the root starts at 0, so
      `0 >= Math.floor(0 / 3)` blocks even the very first add: switching the gate on today
      means nothing can branch at all. That's why it's commented out, and it's the whole
      reason T4 level-up sits ahead of it in the queue.
      **Update 2026-09-26: the blocker is gone — level-up landed, so this is switchable now,
      and it's the suggested next task.** Two things to handle while switching it on:
      1. **It won't compile as written.** `Map.tsx:163` reads `targetNode.level`, and that
         field no longer exists — `level` is derived now. It has to become
         `getNodeLevel(targetNode)`, which `Map.tsx` already imports.
      2. **Check what the first branch actually costs before committing to it.** A fresh root
         is level 0, so `0 >= Math.floor(0 / 3)` still blocks its first add — it has to reach
         level 3 first, which at the current `REQUIRED_WORDS_PER_LEVEL` (`helpers.ts:23`)
         means 15 nouns, 6 verbs and 6 adjectives before the map can grow at all. That may
         well be too long a wait for a first-time player. It's one constant; tune it by
         playing.
      It also does a second, quieter job — it is condition 3 of invariant 1, the thing that
      stops an unnamed node from acquiring children it could orphan. So it's not only pacing,
      and the map is genuinely splittable while it's off.
- [ ] **4. Missing React keys — one of three fixed.** `20min`
      ✅ `WordAdd` is done: `<WordGroup key={key}>` (`:231`) and `<WordLine key={...}>`
      (`:238`).
      Still open, and both are the *same misplacement* — a key on a child instead of on the
      element the `.map()` returns:
      - `Map.tsx:266` returns a bare `<>…</>` per node with the key on the inner `NodeRoot`
        (`:300`). `<>` can't take a key, so this needs `<Fragment key={node.id}>`.
      - `WordList.tsx:45` returns an unkeyed `<WordGroup>` with the key on
        `<WordGroupHeader>` (`:46`). Move it up one level.
      Separately, and a real collision rather than a warning: `WordList.tsx:53` keys each row
      on its three translations concatenated, and `addWords` appends without dedup — so adding
      the same word twice produces two rows with an identical key. Position-based
      (`${group}_${index}`) is the honest choice here, the way `WordAdd` does it.
      Note: **lint will never catch these** — `eslint-plugin-react` isn't installed, only
      `react-hooks` and `react-refresh`. They're browser-console warnings. Causes needless
      remounts, which is exactly what makes input focus and animations feel flaky.
- [ ] **5. The layout anchor is implicit.** `20min` — half done.
      ✅ The reordering half is fixed: `addNode` and `edit` now use `.map()` instead of
      filter-then-append (`nodesReducer.ts:89`, `:119`), so existing array order is never
      permuted and new nodes append at the end.
      Still open: `calculateAllPositions(nodes, nodes[0])` (`Map.tsx:109`) anchors on
      whatever happens to be first. **No visible symptom** (invariant 2: normalization makes
      the anchor irrelevant), so this isn't fixing a bug — it's stopping a future bug from
      being *nondeterministic*: if invariant 1 ever breaks, which fragment of the split map
      survives on screen depends on this. Either store an explicit `rootId` or
      accept `nodes[0]` with a comment saying why it's safe. Do **not** reach for `parentId` —
      it's `null` everywhere.
- [ ] **6. Unreachable nodes vanish, and empty-map math produces garbage.** `20min`
      The bare `return` at `Map.tsx:241` renders nothing for a null position (see
      invariant 1). Add a guard, and either render orphans in a corner or at least
      `console.warn` them so it's not silent.
      Also the reduce-over-empty cases: `Math.min(...[])` is `Infinity` (`Map.tsx:113`,
      `:118`) **and** `Math.max(...[])` is `-Infinity` (`mapWidth` at `:174`, `mapHeight`
      at `:183`). If every position is null you get a map sized `-Infinity`. Guard both
      directions, not just the `min` pair.
- [x] **7. Every new node shares one `words` object.** ✅ Done — see the Done log.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — identical map at
      `nodesReducer.ts:11` and `Map.tsx:21`. Move it next to `LinkDirections` in `data.ts`.
      `unlinkTargetNode` (`nodesReducer.ts:18`) is fine where it is — only the reducer uses it.
- [ ] **9. Game rules are scattered.** `20min` — half moved.
      ✅ `REQUIRED_WORDS_PER_LEVEL` and `getNodeLevel` now sit together (`helpers.ts:23`,
      `:29`), which is the right instinct but the wrong file — `helpers.ts` also holds
      `createNode` and the `typedKeys`/`typedEntries` utilities.
      Still scattered: `LEVELS_REQUIRED_PER_LINK` in `Map.tsx:19` and the `/ 3` breakpoint
      math inlined at `Map.tsx:316` — see T2.2, that inline `3` and that constant are supposed
      to be the same number, which is exactly the bug. One `rules.ts` holding both constants
      plus `getNodeLevel`, and it's what lets you tune the game later without a hunt.
- [ ] **10. The colour palette is defined three times.** `20min`
      `Map/styles.ts:8-13`, `SideMenu/styles.ts:3-12`, and `COLOUR_DARK` *again* at
      `App.tsx:15`. One `theme/colours.ts`. While you're there: `Theme.ts:53` hardcodes
      `color: 'white'` on `MuiInputBase`, fighting `palette.text.primary`.
- [ ] **11. `<TextButton color={…}>` does nothing.** `5min` — `SideMenu.tsx:88` and `:91`
      pass `color={COLOUR_LIGHT}`, but `TextButton` is a plain `styled("button")` that never
      reads it, so it leaks to the DOM as an attribute and styles nothing.
      Same class of bug: `NodeAddButton` in `Map/styles.ts` filters `"position"` in
      `shouldForwardProp`, but the prop is called `direction` — so `direction="N"` leaks
      through too.
- [ ] **12. `DebugPanel` ships to users.** `5min` — it renders unconditionally at
      `App.tsx:95`, fixed to the top-left corner. The "boop" button is gone; it now has real
      "Clear history" and "Use demo" buttons, so don't delete it — gate it behind
      `import.meta.env.DEV`. That also drops `NODES_DEMO` (most of `data.ts`'s 725 lines) out
      of the production bundle, which is most of the current 389 KB.
      While you're there: `DebugPanel` reaches into `storage` itself (`:6`) and pairs
      `resetHistoryTo` with a raw `dispatchNodes`. It is correct **only** because `App.tsx:95`
      passes the non-logging dispatch. Pass the logging `dispatch` by mistake and you write
      the entire map into a log entry. A `loadNodes(nodes)` in `storage.ts` that resets the
      base and returns the nodes would make that unrepresentable.
- [x] **13. Autotranslate has no error path.** ✅ Done — see the Done log, and **T5** for
      the handful of structural things left in that component.
      Still true and still not your code: MyMemory is a *translation-memory* API — it returns
      whatever humans previously submitted, so single words come back weird. A real dictionary
      API is the actual fix. Parked in T5.

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

- [x] **Wire up the Level up button.** ✅ Done — see the Done log. Landed as a dedicated
      `addWords` action rather than the `edit` action this entry originally suggested, which
      turned out to be the better call: an `edit` carrying `changes: {words}` would have had to
      carry the whole merged array every time, i.e. a snapshot pretending to be a delta. See
      invariant 4.
- [ ] **Decide where example sentences go.** `20min` to decide, `1h` to build.
      `examples` already exists on `Word`, the demo data is full of them, and
      `WordList.tsx` already renders them. Only `WordAdd` has no inputs. Cheapest version
      is one optional example row under each word line, and you're done.
- [ ] **EDIT flow** `1h` — `SideMenu.tsx:91`, button renders and does nothing.
- [ ] **Delete a node** `1h` — **and this is where invariant 1 gets decided.**
      Right now only an *unnamed* new node can be dismissed (`onCancelNewNodeClick`,
      `App.tsx:72`). `unlinkTargetNode` (`nodesReducer.ts:18`) is already written generically
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
- [ ] **TRAIN flow** `deep` — `SideMenu.tsx:88`, renders and does nothing.
      Scope it brutally small for v1: show a word in one language, reveal the other two on
      click, no scoring, no spaced repetition. Ship that, then iterate.
- [ ] **Zoomable map** `deep` — a CSS `transform: scale()` on `MapContainer` plus a wheel
      handler gets most of the way. `scrollToNode` needs the scale factored
      into its arithmetic. `scrollToNode` is now at `Map.tsx:192`.
- [ ] **Search: find a node by a word in it** `1h` — genuinely easy and satisfying. Filter
      `nodes` on `words[*].translations[*]`, then reuse the `scrollToNode` + focus machinery
      that already exists.
- [ ] **Make the language list configurable** `1h` — half done.
      ✅ The *types* are real now: `Languages` and `Language` (`data.ts:1`, `:7`),
      `Word.translations` is `Record<Language, string>`, and both components read through
      `languageL`/`languageC`/`languageR` variables instead of literal keys — so a language
      swap is a one-place change rather than a find-and-replace, and a typo is a type error.
      What's left is that "one place" not existing yet: the triple is declared **twice**, at
      `WordAdd.tsx:77` and `WordList.tsx:22`, rebuilt on every render, and `languageCode`
      (`WordAdd.tsx:42`) is a third hardcoded mapping. Hoist to one
      `{ pivot, left, right }` constant, then a settings UI has somewhere to write to.
      One thing to not break: the annotation on `emptyTranslations` (`WordAdd.tsx:27`) is
      load-bearing. Written as `as Record<Language, string>` instead, it would stop checking,
      and adding a fourth language would silently produce words missing that field. Annotate,
      don't assert — that's the same reason the remaining `as` casts in that file
      (`:91`, `:99`, `:130`, `:172`) are worth a suspicious look if you ever touch them:
      `Object.fromEntries` returns a wide type, so the cast is the *only* thing giving those
      objects their shape.
- [ ] **AI word / category suggestions** `deep` — after persistence and level-up. It's a
      nice-to-have on top of a working loop.
- [ ] **Inner nodes (zoom into a node's own map)** `deep` — `innerNodeIds` exists, unused.
      Good news: this does **not** require allowing a disconnected graph. An inner map is a
      *separate scope* with its own nodes and its own links, connected among themselves — so
      it's a tree of connected graphs, each obeying invariant 1, and
      `calculateAllPositions` gets called per scope with a different input set. No new layout
      logic. Park until the outer map is solid.

---

## T5 — `WordAdd` / autotranslate: what's left after four sittings

Added 2026-09-26. **Nothing in this section is a visible bug.** The component works: type
words, press AUTO, get translations, Save, watch the level go up. Offline it fails cleanly and
logs. These are the structural things found while reviewing it, written down so they don't have
to be rediscovered.

**Read this before reopening the file.** `WordAdd` took four sittings and cost more motivation
than it was worth. It is *finished enough*. Don't go back in to make it elegant. Go back in
only if one of these bites for real, or when the T4 language work takes you in there anyway —
and if you do, the first two items are the ones with teeth.

- [ ] **The async write-back is correct only because the inputs are disabled.** `20min`
      `setWords(() => wordsUpdated)` (`WordAdd.tsx:173`) takes a function, which *looks* like
      the safe functional form, but it ignores the `prev` argument — and `wordsUpdated` is
      built from the `words` captured before the `await` (`:141`, `:158`). So any change to
      `words` made *during* the request gets silently reverted when the request lands. It is
      exactly as stale as passing the value directly.
      It can't happen today: all three inputs carry `disabled={isLoading}` (`:242`, `:260`,
      `:273`) and AUTO carries `disabled={… || isLoading}` (`:214`), and those are the only two
      callers of `setWords`. Verified by modelling it — with the guard removed, keystrokes
      typed during the request vanish when the translations arrive.
      Which means a `disabled` prop down in the render is load-bearing for the correctness of
      an async write 130 lines above it, and nothing says so. The cheap insurance is to make
      `setWords((prev) => …)` actually merge into `prev`, so the guard is the belt and the
      update is the braces.
      Smaller, same area: **Save** and **[x]** are *not* disabled while loading (`:294`,
      `:297`). So mid-request you can still commit the untranslated words, or unmount the form.
      The `setWords` on an unmounted component is a harmless no-op in React 19, but the
      half-finished save is real.
- [ ] **Two traversals walking in step, kept in step by a hand-rolled counter.** `20min`
      `targets` is built by walking `Object.values(words)` (`:141`); the write-back walks
      `typedKeys(words)` (`:158`) and re-derives the position with `let i = -1` and `++i`
      (`:156`, `:161`). Alignment does hold — same object, and `Object.keys`/`Object.values`
      agree on order — and it's verified end to end. But nothing *enforces* it, and the failure
      mode is silent: if the two ever traverse differently, words quietly receive each other's
      translations. Verified what that looks like — `grass` ends up with `to grow`'s French,
      no error anywhere.
      The fix isn't a better counter, it's not flattening: keep the
      `Record<WordGroupsType, …>` shape through the fetch so the write-back can index
      `[group][index]` and no counter exists to get out of step. Typechecks, roughly the same
      line count.
- [ ] **`translate` returns `any`, so nothing type-checks what reaches an input.** `5min`
      `response.json()` is `any`, so `data?.responseData?.translatedText ?? ''` (`:58`) is
      `any`, so `translationsL`/`translationsR` are `any[]` — verified by forcing TS to print
      them. That is the one remaining route for a non-string to land in a controlled `value`,
      which is precisely what the freeze below was. Annotate the return as `Promise<string>`,
      and wrap the body in `String(…)` if you want the runtime guarantee too.
      **The freeze, recorded because it cost an evening.** A failed translation used to become
      `null`; `null` reached `value={…}`; and React's `updateInput` guards the DOM write with
      `if (null != value)` — a *loose* check — so it skipped the write entirely and the input
      kept showing `'...'` forever, with `isLoading` already back to `false`. Nothing was
      hanging; the DOM had simply stopped being updated. React does warn about it, but behind a
      module-level `didWarnValueNull` flag: **once per page load**, not once per input. Fixed
      by returning `undefined` and falling back with `?? word.translations[language]`. Worth
      being precise about why that worked: the **`??` fallback** is doing the work, not the
      change of sentinel — `undefined` freezes an input exactly like `null` does, it just
      doesn't even warn.
- [ ] **A successful empty translation overwrites a word you typed.** `5min`
      `translate` ends `?? ''` (`:58`), so "the API answered but had nothing" becomes a
      *fulfilled* empty string. An empty string isn't nullish, so it wins the `??` at `:166`
      and blanks the field. If that should behave like a failure — and it probably should — it
      wants to `throw` instead, so `getPromiseValue` turns it into `undefined`.
- [ ] **A total failure locks the retry.** `5min`
      `setInputTouched(false)` (`:174`) runs on the failure path too, and
      `enableAutoTranslation` (`:182`) requires `inputTouched` — so after an AUTO where
      everything failed, the button is disabled and there's no way to try again without editing
      a field first. Gate it on at least one translation having actually landed.
- [ ] **`isWordComplete` tests for `''` specifically.** `5min`, and it's only a latent trap.
      `!Object.values(word.translations).includes('')` (`:39`) is true for a word whose
      translation is `null` or `undefined`, because neither equals `''`. Harmless as long as
      the `??` fallbacks hold, which they do — but it's the same assumption ("a translation is
      always a string") that the `any` above quietly breaks. `.every((v) => !!v)` costs
      nothing.
- [ ] **MyMemory is still the wrong API.** `deep`, and it's a decision rather than a fix.
      It's a translation-*memory* service: it returns what humans previously submitted, so
      single words come back odd. Never was your code. A real dictionary API is the fix; until
      then the gibberish is expected behaviour, and the error handling above is what stops it
      *looking* like a bug in your own code.

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

**Not `WordAdd`.** It works, T5 records what's left in it, and none of that is urgent. Four
sittings in one component is enough — this paragraph exists so you don't have to re-decide that
when you come back and see the open checkboxes.

The loop closes now (add words → level up → node grows), so the next thing that changes how the
game *feels* is branching, and it's cheap:

**T2.3 — uncomment the branch gate.** `20min`. The blocker is gone; level-up landed. Two edits:
swap `targetNode.level` for `getNodeLevel(targetNode)` at `Map.tsx:163` (it won't compile
otherwise), then actually play it and see whether level 3 is a reasonable wait for a first
branch — at the current constants that's 15 nouns, 6 verbs and 6 adjectives. If it isn't, tune
`REQUIRED_WORDS_PER_LEVEL` (`helpers.ts:23`). This also clears all three lint errors and
restores condition 3 of invariant 1, which is genuinely open while the gate is off.

**T2.2 — the hint number.** `5min`, same sitting: the `[+]` promises "3" when the real
requirement is 6, and you'll be staring straight at that while tuning.

Then pick by appetite, not by order:
- **T4 delete a node** `1h` — the next real flow, and the one that decides invariant 1. The
  leaf-only check has to land in the same commit; the reasoning is already written up there.
- **T4 search by word** `1h` — genuinely easy, immediately satisfying, touches nothing risky.
  A good one for a low-energy evening.
- **T4 examples in `WordAdd`** — only if you actually want to be back in that file.

Cheap wins whenever you want one: T2.8 (`oppositeDirections`, `5min`), T2.12
(`import.meta.env.DEV` on `DebugPanel`, `5min`, and it cuts most of the 389 KB bundle), the T3
`getInitialState` empty-array fallback (`5min`), and `README.md` — still the Vite template,
though `PROJECT.md` now covers the "what is this" half of it.
