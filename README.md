# portfolio

Personal site of Jonas Taigel. Astro, hand-written CSS, a few small scripts.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
```

## How the scrolling works

**Home page.** Under the hero, `[data-flow]` pins one screen while you scroll. `src/scripts/flow.ts`
draws the orange line from scroll progress and sets `--v` (0–1 visibility) on each act (About, Work,
Contact), so they fade in and out in place. When scrolling stops between two acts it glides on to the
next one. Narrow screens and `prefers-reduced-motion` get plain stacked sections instead.

**Case studies.** Each project is a `[data-scrolly]` block: text steps on the left, a sticky `.stage` on
the right. `src/scripts/scrolly.ts` sets `data-active` (current step) and `--p` (0–1 progress through it)
on the stage, and `--t` on `.steps` for the reading line. `prefers-reduced-motion` pins both to 1.

**Header.** `src/scripts/header.ts` keeps the floating header light while it is over the dark hero.

Design pass follows the unslop skill by Damir Sokolovsky (@heydamir), CC BY 4.0.
