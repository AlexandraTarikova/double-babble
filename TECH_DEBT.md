# Double Babble — resume checklist

Written 2026-08-13 after a few months away. Updated 2026-09-08.
Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

Line numbers below were re-verified on 2026-09-08 (after the Prettier run, which
reflowed everything). If they drift again, `grep` beats trusting them.

---

## Where things stand

- **`npm run build` passes.** `tsconfig.json` / `tsconfig.app.json` restored.
- **`npm run lint` is clean.** 0 errors, 0 warnings. T1 is fully done.
- **Version control exists**, with a `.git-blame-ignore-revs` so the Prettier commit
  doesn't pollute `git blame`.
- **The hard part works.** `calculateAllPositions` (`Map.tsx:34`) derives the whole layout
  by walking links. It's the cleverest thing here and it does its job. Don't rewrite it.
- **The data model anticipates the future.** `innerNodeIds` and `examples` are already on
  the types, waiting. Caveat: `parentId` is **`null` on every node** — all 7 demo nodes and
  every node `onAddNodeClick` creates (`App.tsx:52`). It's a door left open, not a usable
  field. Don't reach for it as a "find the root" marker until something actually sets it.
- ~1,300 lines across 10 files. Small and tidy. It only feels big because it sat.

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
- `canExpandN/E/S/W` (`Map.tsx:246-260`) test cell occupancy *only*, no longer the
  `linkIds` slot. That simplification is correct **because** a linked neighbour always
  occupies the adjacent cell — which requires it to have a position. If a linked node is
  ever unpositioned, a `[+]` renders over a live link and clicking it overwrites
  `linkIds`, orphaning the old neighbour. Worth a one-line comment at `Map.tsx:246`.

**This is also the core game mechanic**, not just an implementation detail: the whole point
is building a path from words you have to words you want. A disconnected node is a
vocabulary set obtained without earning the route to it. So enforce it when *mutating*
state and let the layout assume it. See T4 "Delete a node".

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

`onAddNodeClick` (`App.tsx:107`) writes both sides — the new node's back-link and the
parent's forward link. Every demo node reciprocates. `calculateAllPositions` traverses via
`currentNode.linkIds[direction]` and positions the child via its back-link, so a one-sided
link means the child never gets positioned (→ invariant 1). A link pointing at a
**nonexistent** id is worse: `positions[danglingId]` is `undefined`, `undefined?.x !== null`
is `true`, and the walk throws a TypeError. Nothing currently creates one; if you write a
migration or hand-edit saved data, that's the crash to expect.

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
      `key={nodeInFocus.id}` on `<SideMenu>` (`App.tsx:140`) and deleting both effects.
- [x] Honest `useMemo` deps in `Map.tsx`.
      **Worth knowing what this did and didn't fix:** neither dep lie had a visible symptom
      yet. `[nodes.length]` meant a rename didn't recompute positions — but titles don't
      affect positions. And `minX`/`minY` are pure derivations of `positions`, so the old
      deps were already complete *in effect*; the rule just can't prove it. Both changes
      are prophylactic. The part that still matters is in T2.5.

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
      (level 0, one link back to its parent) it promises "3", but the gate at `Map.tsx:157`
      needs `floor(level/3) > 1` — i.e. **level 6**. That's the most common case in the app.
      Fix: `(linksCount + 1) * LEVELS_REQUIRED_PER_LINK`.
- [ ] **3. Decide: should the parent link eat a branch slot?** `20min` — a design call.
      The gate is `linksAmount >= Math.floor(level / 3)` (`Map.tsx:157`) and `linksAmount`
      counts *all* links including the one back to the parent. So the root gets its first
      branch at level 3 but **every other node needs level 6**. Either that's the intended
      difficulty curve — write it down in the README — or exclude the incoming link.
      Ties into #2.
- [ ] **4. Missing React keys on three list renders.** `20min`
      `Map.tsx:259` returns a `<>…</>` per node with the `key` on the inner `NodeRoot`
      instead of on the fragment — and `<>` can't take a key, so this needs
      `<Fragment key={node.id}>`. Same shape at `WordAdd.tsx:138` (`WordGroup` unkeyed, key
      on `WordGroupHeader` at `:139`) and `WordList.tsx:36`.
      Note: **lint will never catch these** — `eslint-plugin-react` isn't installed, only
      `react-hooks` and `react-refresh`. They're browser-console warnings. Causes needless
      remounts, which is exactly what makes input focus and animations feel flaky.
- [ ] **5. The layout anchor is implicit, and the array reorders under it.** `1h`
      `calculateAllPositions(nodes, nodes[0])` (`Map.tsx:107`) anchors on whatever is first
      in the array, and both `onNodeRename` (`App.tsx:86`) and `onAddNodeClick`
      (`App.tsx:107`) reorder it — `filter` then append — so index 0 becomes "whichever
      node you touched least recently".
      **This has no visible symptom today** (invariant 2: normalization makes the anchor
      irrelevant), so demote it in your head: it isn't fixing a bug, it's stopping a future
      bug from being *nondeterministic*. The moment invariant 1 breaks, which fragment of
      the map survives would depend on your click history.
      Fix, cheapest first: use `.map()` in both handlers so order is preserved, then either
      store an explicit `rootId` in state or accept `nodes[0]` with a comment saying why
      it's safe. Do **not** reach for `parentId` — it's `null` everywhere.
- [ ] **6. Unreachable nodes vanish, and empty-map math produces garbage.** `20min`
      The bare `return` at `Map.tsx:235` renders nothing for a null position (see
      invariant 1). Add a guard, and either render orphans in a corner or at least
      `console.warn` them so it's not silent.
      Also the reduce-over-empty cases: `Math.min(...[])` is `Infinity` (`Map.tsx:112`,
      `:117`) **and** `Math.max(...[])` is `-Infinity` (`mapWidth` at `:168`, `mapHeight`
      at `:177`). If every position is null you get a map sized `-Infinity`. Guard both
      directions, not just the `min` pair.
- [ ] **7. Every new node shares one `words` object.** `5min`
      `App.tsx:52` defines `newNode` as a module-level constant and `{...newNode}` is a
      *shallow* copy — so **all nodes created in a session share the same
      `nouns`/`verbs`/`adjectives` arrays**. Harmless only because adding words doesn't work
      yet; it'd cross-link vocabulary the moment T4's level-up lands. Make it
      `const makeNewNode = (): NodeType => ({ … })`.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — identical map at `App.tsx:25`
      and `Map.tsx:20`. Move it next to `LinkDirections` in `data.ts`.
- [ ] **9. Game rules are scattered.** `20min`
      `LEVELS_REQUIRED_PER_LINK` in `Map.tsx:18`, `REQUIRED_WORDS_PER_LEVEL` in
      `WordAdd.tsx:21`, and the `/ 3` breakpoint math inlined at `Map.tsx:309`. One
      `rules.ts`. Cheap now, and it's what lets you tune the game later without a hunt.
- [ ] **10. The colour palette is defined three times.** `20min`
      `Map/styles.ts:8-13`, `SideMenu/styles.ts:3-12`, and `COLOUR_DARK` *again* at
      `App.tsx:12`. One `theme/colours.ts`. While you're there: `Theme.ts:50` hardcodes
      `color: 'white'` on `MuiInputBase`, fighting `palette.text.primary`.
- [ ] **11. `<TextButton color={…}>` does nothing.** `5min` — `SideMenu.tsx:81` and `:84`
      pass `color={COLOUR_LIGHT}`, but `TextButton` is a plain `styled("button")` that never
      reads it, so it leaks to the DOM as an attribute and styles nothing.
      Same class of bug: `NodeAddButton` in `Map/styles.ts` filters `"position"` in
      `shouldForwardProp`, but the prop is called `direction` — so `direction="N"` leaks
      through too.
- [ ] **12. The debug "boop" button ships to users.** `5min` — `DebugPanel` renders
      unconditionally at `App.tsx:129`, fixed to the top-left corner. Gate it behind
      `import.meta.env.DEV` or delete it.
- [ ] **13. Autotranslate has no error path.** `20min` — `autoTranslate`
      (`WordAdd.tsx:61`) fires 2×N parallel requests to `api.mymemory.translated.net`
      (`:71`, `:80`) with no `catch`: a failed or rate-limited call just leaves the fields
      blank with no message, and the anonymous quota there is small.
      On the gibberish: MyMemory is a *translation-memory* API — it returns whatever humans
      previously submitted, so single words come back weird. That's the API, not your code.
      A real dictionary API is the actual fix, but do the error handling regardless so
      failures stop looking like bugs in your own code.

---

## T3 — Not in the original notes, but it's the biggest one

- [ ] **Nothing is ever saved.** `1h` for the small version.
      All state is `useState(NODES_DEMO)` at `App.tsx:74`. **Every refresh throws away every
      node you created and every rename.**
      Don't start with Supabase. Start with `localStorage`: load in a lazy
      `useState(() => …)` initialiser, save in a `useEffect` on `nodes`, keep `NODES_DEMO` as
      the fallback for a first-ever visit. That single step turns this from a demo into
      something you can play with — probably the fastest route back to enjoying it.
      Add a `version` field to what you store so future-you can migrate it. And validate on
      load: invariants 1 and 3 are trivially violated by stale saved data, and invariant 3
      violations *throw*.
- [ ] **State shape, before any state library.** `deep`, optional
      `nodes` is an array searched with `.find()` in a dozen places. Normalizing to
      `Record<string, NodeType>` plus a `rootId` kills the `.find()`s, makes T2.5 moot, and
      is the same shape any store would want later. `useReducer` gets you there with zero
      dependencies — reach for Zustand/RTK only when prop-drilling actually hurts.

---

## T4 — Unfinished flows (smallest first)

- [ ] **Wire up the Level up button.** `1h` — `WordAdd.tsx:198` has `disabled={!allFilled}`
      and **no `onClick` at all**. Needs: lift the words to `App`, append to
      `nodeInFocus.words`, `level + 1`, close the form. Do T2.1 first or you'll submit six
      copies of the same noun. **This is the one that makes the game a game.**
- [ ] **Decide where example sentences go.** `20min` to decide, `1h` to build.
      `examples` already exists on `WordType`, the demo data is full of them, and
      `WordList.tsx:45` already renders them. Only `WordAdd` has no inputs. Cheapest version
      is one optional example row under each word line, and you're done.
- [ ] **EDIT flow** `1h` — `SideMenu.tsx:84`, button renders and does nothing.
- [ ] **Delete a node** `1h` — **and this is where invariant 1 gets decided.**
      Right now only an *unnamed* new node can be dismissed (`onCancelNewNodeClick`,
      `App.tsx:111`). `unlinkTargetNode` (`App.tsx:38`) is already written generically and
      does the hard part.
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

**T3 localStorage.** It's one `1h` box, it needs no design decisions, and it's the single
change that turns this from a demo into something you can actually play with — which is the
fastest route back to enjoying it. Do T2.7 (`makeNewNode`) first; it's `5min` and saving
shared-by-reference word arrays would bake the bug into your stored data.

After that, **T2.1 → T4 level-up** is the pair that makes it a game.
