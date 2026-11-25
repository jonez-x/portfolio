// Scroll-linked progress, written as CSS custom properties; all visuals are CSS reading them.
// [data-scrolly]: picks the active step and sets data-active + --p (progress through it) on .stage,
// and --t (progress through all steps) on .steps for the reading line.
// Narrow screens don't pin the stage: each step gets its own copy (.stage-inline) fixed to its scene,
// sitting in the page under the step's heading, with --p still following that step.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 900px)');

const blocks = [...document.querySelectorAll<HTMLElement>('[data-scrolly]')].map((el) => ({
  stage: el.querySelector<HTMLElement>('.stage')!,
  track: el.querySelector<HTMLElement>('.steps')!,
  steps: [...el.querySelectorAll<HTMLElement>('.step')],
  inline: [] as HTMLElement[],
}));

for (const block of blocks) {
  block.inline = block.steps.map((step, i) => {
    const copy = block.stage.cloneNode(true) as HTMLElement;
    copy.classList.add('stage-inline');
    copy.dataset.active = String(i);
    step.querySelector('h2')!.after(copy);
    return copy;
  });
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

function update() {
  const line = innerHeight * (narrow.matches ? 0.8 : 0.6);

  for (const { stage, track, steps, inline } of blocks) {
    let active = 0;
    let progress = 0;
    steps.forEach((step, i) => {
      const r = step.getBoundingClientRect();
      const p = clamp((line - r.top) / (r.height * 0.75));
      inline[i].style.setProperty('--p', reduceMotion.matches ? '1' : p.toFixed(3));
      if (r.top <= line) {
        active = i;
        progress = p;
      }
    });
    stage.dataset.active = String(active);
    stage.style.setProperty('--p', reduceMotion.matches ? '1' : progress.toFixed(3));
    steps.forEach((step, i) => {
      step.classList.toggle('is-active', i === active);
      step.classList.toggle('is-reached', i <= active && steps[i].getBoundingClientRect().top <= line);
    });
    const r = track.getBoundingClientRect();
    const t = clamp((line - r.top - 172) / Math.max(1, r.height - 172));
    track.style.setProperty('--t', reduceMotion.matches ? '1' : t.toFixed(3));
  }
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    update();
  });
}

addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', schedule);
reduceMotion.addEventListener('change', schedule);
document.documentElement.classList.add('js');
update();
