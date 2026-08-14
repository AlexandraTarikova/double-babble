# Vocab Journey — resume checklist

Written 2026-08-13, after a few months away. Every box is meant to be one sitting.
Tags: `5min` `20min` `1h` `deep` — pick by how much brain you have today.

---

## First, the good news

Read this before the scary parts:

- **The code typechecks clean.** I ran `tsc` directly over every app file: 0 real errors.
  The only failure is a missing config file (see T0.2) — not rotten code.
- **The dev server still runs fine.** `npm run dev` → HTTP 200, boots in 337ms.
- **The hard part works.** `calculateAllPositions` (auto-layout by walking links) is the
  cleverest thing here and it does its job. You don't need to rewrite it.
- **Your data model already anticipates the future.** `parentId` and `innerNodeIds` are
  in `NodeType` waiting for inner maps. `examples` is already in `WordType`. Past-you
  left doors open.
- Total app code is ~1,300 lines across 9 files. This is a small, tidy project.
  It only feels big because it's been sitting.

---

## T0 — Safety net (do these first, ~1 hour total, all boring)

- [ ] **`git init`** `5min` — **there is no version control at all.** Months of work with
      no undo. Do this before touching anything else.
      Add a `.gitignore` (`node_modules`, `dist`, `.env`, `.DS_Store` — there are two
      `.DS_Store` files sitting in the project right now), then one big first commit.
- [ ] **Restore `tsconfig.json`** `20min` — **`npm run build` is broken.**
      `tsc -b` fails with `TS5083: Cannot read file '.../tsconfig.json'`. Only
      `tsconfig.node.json` survives; `tsconfig.json` and `tsconfig.app.json` are gone.
      Nothing has been typechecked for months — dev works because Vite strips types
      without checking them.
      Grab the standard Vite React-TS pair. Set `allowImportingTsExtensions: true` in
      the app config (`main.tsx:4` imports `./App.tsx` with the extension) or drop the
      extension. Then `npm run build` should pass — I verified there's nothing else
      hiding behind it.
- [ ] **Delete `src/svg-raw.tsx`** `5min` — 922 lines, ~500KB, **not imported anywhere**,
      and it imports a type `StampSize` from `./data` that doesn't exist. It's a leftover
      from a different project (stamps). Deleting it also kills the Babel
      "deoptimised the styling" warning in every lint run.
- [ ] **Drop 5 unused dependencies** `5min` — none of these are imported anywhere in `src/`:
      `@supabase/supabase-js`, `muuri`, `lodash`, `react-colorful`, `@mui/icons-material`.
      Also remove the muuri CDN `<script>` from `index.html:10` — it loads a grid library
      on every page view for nothing.
- [ ] **Rewrite `README.md`** `20min` — it is still the untouched Vite template. Paste in
      your own description of the concept (nodes, levels, branching every 3 levels,
      inner maps, two languages + English pivot). **This is the anti-overwhelm task:**
      next time you come back after months, this file is what saves you.
- [ ] **Fix `index.html` title** `5min` — currently `<title>my-project</title>`, and the
      favicon is still `vite.svg`.

---

## T1 — Lint sweep (`npm run lint` = 16 errors, 3 warnings) `1h` total, satisfying

Mostly deletions. Do them in one go and watch the number drop to zero.

- [ ] `Map.tsx:1` — `Box` and `styled` imported, never used.
- [ ] `WordAdd.tsx:5` — `WordExample` imported, never used.
- [ ] `WordAdd.tsx:15` — unused `_` param in `makeInitWordGroup`.
- [ ] `Theme.ts:52` — unused `theme` param in the `MuiInputBase` override.
- [ ] `DebugPanel.tsx:6` — `FC<{}>` → just `FC`. Two errors from one character.
- [ ] `Map/styles.ts:212` — `"\'↑\'"` has two useless escapes; use `` `'↑'` ``.
- [ ] `RetroSpinner.tsx:5` — move the `values` array outside the component so the
      `useEffect` dep array stops lying.
- [ ] `SideMenu.tsx:37-38` — two `setState`-inside-`useEffect` errors. The real fix is to
      stop mirroring props into state: pass `key={nodeInFocus.id}` to `<SideMenu>` from
      `App.tsx` and let React remount it. Both effects then disappear.
- [ ] **Rename `data.tsx` → `data.ts`** `5min` — it contains zero JSX, and being `.tsx`
      triggers two `react-refresh/only-export-components` errors. Optionally split the
      `NODES_DEMO` blob into `demoData.ts` (it's 500 of the file's 728 lines).
- [ ] `Map.tsx:88` and `Map.tsx:93` — stale `useMemo` deps. Not just lint, an actual
      staleness bug: `positions` is keyed on `[nodes.length]`, so **editing a node
      without adding one never recomputes layout**, and `positionsNormalized` omits
      `minX`/`minY` from its deps. See T2.5 — fix them together.

---

## T2 — Real bugs I found (in rough order of how much they'll bite)

- [ ] **1. Verbs and adjectives write into the nouns array.** `deep`-ish but high value.
      `WordAdd.tsx` only holds one piece of state — `nouns` (line 22) — but renders all
      three groups from it: `nouns[index]` at lines 107, 119, 131, all writing through
      `handleChangeNoun`. So typing a verb overwrites noun row 0. Worse, `nouns` has 6
      slots and verbs/adjectives have 3, so rows never line up. `allFilled` (line 83)
      also only checks nouns — which is part of why **Level up** never enables.
      Fix: one state object keyed by word group, `Record<WordGroupsType, WordType[]>`,
      and a `handleChange(group, i, language)`.
- [ ] **2. The level-up hint shows the wrong number.** `5min`
      `Map.tsx:216` computes `Math.floor(level / 3) * 3 + 3`, which is only correct when
      you have exactly as many links as your level allows. For a **freshly branched node**
      (level 0, one link back to its parent) it promises "3" — but the gate at line 112
      needs `floor(level/3) > 1`, i.e. **level 6**. That's the most common case in the app.
      Fix: `(linksCount + 1) * LEVELS_REQUIRED_PER_LINK`.
- [ ] **3. Decide: should the parent link eat a branch slot?** `20min` — a design call.
      The gate is `linksAmount >= Math.floor(level / 3)` (`Map.tsx:112`) and `linksAmount`
      counts *all* links including the one pointing back at the parent. So the root node
      gets its first branch at level 3, but **every other node needs level 6** for its
      first outgoing branch. Either that's the intended difficulty curve — write it down
      in the README — or exclude the incoming link. Ties into #2.
- [ ] **4. Missing React keys on three list renders.** `20min`
      `Map.tsx:190` returns a `<>…</>` fragment per node with the `key` on the inner
      `NodeRoot` instead of on the fragment. Same shape in `WordList.tsx:28` and
      `WordAdd.tsx:98` — `WordGroup` is unkeyed and the key sits on the header. Causes
      console warnings and needless remounts (which is exactly what makes input focus
      and animations feel flaky).
- [ ] **5. Layout doesn't recompute when it should, and its origin can drift.** `1h`
      Two connected problems in `Map.tsx:88`:
      `calculateAllPositions(nodes, nodes[0])` anchors the whole map on *whatever is
      first in the array* — and `App.tsx:81` reorders the array on every rename
      (`filter` then append). The `[nodes.length]` dep is accidentally hiding this today.
      Fix: anchor on an explicit stable root (e.g. the node with no `parentId`, or a
      `rootId` in state), then honest deps become safe.
- [ ] **6. Nodes unreachable from the root silently vanish.** `20min`
      `Map.tsx:179` bails with a bare `return` when a position is `null`, so a
      disconnected node renders as nothing at all — invisible data loss from the user's
      point of view. Also `Math.min(...[])` is `Infinity` when every position is null
      (lines 90-91), which would produce a garbage map size. Add a guard, and either
      render orphans in a corner or log them.
- [ ] **7. Every new node shares one `words` object.** `5min`
      `App.tsx:49-66` defines `newNode` as a module-level constant, and `{...newNode}`
      is a shallow copy — so **all nodes created in a session share the same
      `nouns`/`verbs`/`adjectives` arrays**. Harmless only because adding words doesn't
      work yet; it'd cross-link vocabulary the moment T3.1 lands. Make it
      `const makeNewNode = (): NodeType => ({ … })`.
- [ ] **8. `oppositeDirections` is copy-pasted.** `5min` — identical map in `App.tsx:26`
      and `Map.tsx:8`. Move it next to `LinkDirections` in `data.ts`.
- [ ] **9. Game rules are scattered across components.** `20min`
      `LEVELS_REQUIRED_PER_LINK` lives in `Map.tsx:6`, `REQUIRED_WORDS_PER_LEVEL` in
      `WordAdd.tsx:8`, and the `/ 3` breakpoint math is inlined at `Map.tsx:216`. Put
      them in one `rules.ts`. Cheap now, and it's what lets you tune the game later
      without a hunt.
- [ ] **10. The colour palette is defined twice.** `20min` — `COLOUR_LIGHT`, `COLOUR_DARK`,
      `COLOUR_HIGHLIGHT` etc. are duplicated in `Map/styles.ts:9-14` and
      `SideMenu/styles.ts:4-13`, and `COLOUR_DARK` is *also* redeclared in `App.tsx:13`.
      One `theme/colours.ts`.
- [ ] **11. `<TextButton color={…}>` does nothing.** `5min` — `SideMenu.tsx:63-64` passes
      `color={COLOUR_LIGHT}`, but `TextButton` is a plain `styled("button")` that never
      reads it, so it leaks to the DOM as an attribute and styles nothing.
- [ ] **12. The debug "boop" button ships to users.** `5min` — `DebugPanel` is rendered
      unconditionally at `App.tsx:111`, fixed to the top-left corner. Gate it behind
      `import.meta.env.DEV` or delete it.
- [ ] **13. Autotranslate has no error path.** `20min` — `WordAdd.tsx:34-80` fires 2×N
      requests to `api.mymemory.translated.net` in parallel with no `catch`: a failed or
      rate-limited call just leaves the fields blank with no message (the anonymous quota
      there is small, and parallel bursts will hit it). Add a `catch` + a visible error.
      On the gibberish: MyMemory is a *translation-memory* API — it returns whatever
      humans previously submitted, so single words come back weird. That's the API, not
      your code. A real dictionary API is the actual fix, but the error handling is worth
      doing regardless so failures stop looking like bugs in your own code.

---

## T3 — Not in your notes, but it's the biggest one

- [ ] **Nothing is ever saved.** `1h` for the small version.
      All state is `useState(NODES_DEMO)` at `App.tsx:71`. **Every refresh throws away
      every node you created and every rename.** You have `@supabase/supabase-js`
      installed but never imported — so past-you was clearly thinking about this and
      stopped.
      Don't start with Supabase. Start with `localStorage`: load in a lazy
      `useState(() => …)` initialiser, save in a `useEffect` on `nodes`, keep `NODES_DEMO`
      as the fallback for a first-ever visit. That single step turns this from a demo
      into something you can actually play with — which is probably the fastest route
      back to enjoying it. Add a `version` field to what you store so future-you can
      migrate it.

---

## T4 — Unfinished flows (your list, smallest first)

- [ ] **Wire up the Level up button.** `1h` — `WordAdd.tsx:146` has `disabled={!allFilled}`
      and **no `onClick` at all**. Needs: lift the words to `App`, append them to
      `nodeInFocus.words`, `level + 1`, close the form. Do T2.1 first or you'll be
      submitting six copies of the same noun. This is the one that makes the game a game.
- [ ] **Decide where example sentences go.** `20min` to decide, `1h` to build.
      Note that `examples` already exists on `WordType`, the demo data is full of them,
      and `WordList.tsx:35-43` already renders them. Only `WordAdd` has no inputs. So the
      cheapest version is one optional example row under each word line, and you're done.
- [ ] **TRAIN flow** `deep` — `SideMenu.tsx:63`, button renders and does nothing.
      Suggest scoping it brutally small for v1: show a word in one language, reveal the
      other two on click, no scoring, no spaced repetition. Ship that, then iterate.
- [ ] **EDIT flow** `1h` — `SideMenu.tsx:64`, same. Editing existing words in place.
- [ ] **Delete a node** `1h` — right now only an *unnamed* new node can be dismissed
      (`onCancelNewNodeClick`). Good news: `unlinkTargetNode` in `App.tsx:36` is already
      written generically and does the hard part. Needs a confirm step and a decision
      about what happens to nodes that were only connected through the deleted one
      (see T2.6 — they'd currently just vanish).
- [ ] **Zoomable map** `deep` — a CSS `transform: scale()` on `MapContainer` plus a wheel
      handler gets you most of the way. `scrollToNode` (`Map.tsx:132`) will need the
      scale factored into its arithmetic.
- [ ] **Search bar: find a node by a word in it** `1h` — genuinely easy, and satisfying:
      filter `nodes` on `words[*].translations[*]`, then reuse the existing
      `scrollToNode` + focus machinery you already built.
- [ ] **Make the language list configurable** `1h` — `"english"`/`"swedish"`/`"french"`
      are hardcoded in `WordAdd.tsx` (init, both fetch URLs, three inputs) and
      `WordList.tsx`, even though the types are already open (`Record<string, string>`).
      A `LANGUAGES` constant with `{ pivot, left, right }` would let you change what
      you're learning without touching components.
- [ ] **AI word / category suggestions** `deep` — do this *after* persistence and the
      level-up flow, it's a nice-to-have on top of a working loop.
- [ ] **Inner nodes (zoom into a node's own map)** `deep` — `parentId` and `innerNodeIds`
      already exist on `NodeType`, unused. Park until the outer map is solid.

---

## Parked on purpose — permission to not think about these

- **Dynamic non-grid graph.** You called it intimidating and you're right: it's a
  force-directed layout, a different rendering model, and it invalidates
  `calculateAllPositions`, `scrollToNode`, and every `canExpand*` check. The 4-neighbour
  grid is a legitimate design choice, not a compromise. Revisit only if the grid
  genuinely blocks you.
- **Tests.** There are none, and for a solo pet project that's fine. *If* you ever want
  exactly one: `calculateAllPositions` is a pure function and by far the riskiest logic
  in the codebase. One vitest file, five cases. Nothing else needs it.
- **Accessibility, mobile, keyboard nav.** Real gaps (the `+` buttons have no labels,
  Escape doesn't close the side menu, the layout assumes a wide screen). Worth knowing,
  not worth blocking on for a personal project.
- **`index.css`** is still mostly Vite template CSS — commented-out blocks, a `.logo`
  spin animation, a light-mode media query fighting your dark theme. Cosmetic; clean it
  whenever it annoys you.

---

## Suggested first session

`git init` → restore `tsconfig.json` → delete `svg-raw.tsx` → drop the 5 dead deps.

Four boxes, about an hour, no design decisions, and it ends with a green
`npm run build` and a repo with history. Then stop for the day.
