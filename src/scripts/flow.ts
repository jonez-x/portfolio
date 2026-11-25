// The flow under the hero: a pinned screen where scrolling only draws the line,
// while About, Work and Contact fade in and out in place, one after the other.
// CSS reads --v (0–1, how visible an act is); narrow screens and reduced motion get plain stacked sections.
import { lenis, ease } from './smooth';

const flow = document.querySelector<HTMLElement>('[data-flow]');

if (flow) {
  const pinned = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  const sticky = flow.querySelector<HTMLElement>('.flow-sticky')!;
  const svg = flow.querySelector<SVGSVGElement>('.thread')!;
  const path = flow.querySelector<SVGPathElement>('.thread-path')!;
  const tip = flow.querySelector<HTMLElement>('.thread-tip')!;
  const acts = [...flow.querySelectorAll<HTMLElement>('[data-act]')];
  const anchors = [...flow.querySelectorAll<HTMLElement>('.flow-anchor')];

  // Each act's window on the scroll progress: fade in, hold, fade out. The first stretch is line only.
  const windows: [number, number][] = [[0.16, 0.46], [0.5, 0.74], [0.78, 1.2]];
  const FADE = 0.06;
  // The path is drawn on a 1000×600 grid in the markup; it's rescaled to real pixels so the stroke stays even.
  const shape = path.getAttribute('d')!;
  let total = 0;

  function fit() {
    const W = sticky.clientWidth;
    const H = sticky.clientHeight;
    let i = 0;
    const d = shape.replace(/-?\d+(\.\d+)?/g, (n) => String((Number(n) * (i++ % 2 ? H / 600 : W / 1000)).toFixed(1)));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    path.setAttribute('d', d);
    total = path.getTotalLength();
    path.style.strokeDasharray = String(total);
  }

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const range = () => flow.offsetHeight - sticky.offsetHeight;

  function update() {
    if (!pinned.matches) {
      acts.forEach((act) => act.style.removeProperty('--v'));
      return;
    }
    const p = clamp((parseFloat(getComputedStyle(sticky).top) - flow.getBoundingClientRect().top) / range());

    const drawn = total * clamp(p / 0.92);
    path.style.strokeDashoffset = String(total - drawn);
    const at = path.getPointAtLength(drawn);
    const vb = svg.viewBox.baseVal;
    tip.style.left = `${(at.x / vb.width) * 100}%`;
    tip.style.top = `${(at.y / vb.height) * 100}%`;
    tip.classList.toggle('is-hidden', drawn <= 0 || drawn >= total);

    acts.forEach((act, i) => {
      const [from, to] = windows[i];
      const v = Math.min(clamp((p - from) / FADE), clamp((to - p) / FADE));
      act.style.setProperty('--v', v.toFixed(3));
      act.classList.toggle('is-on', v > 0.5);
    });
  }

  // Anchors (#about, #work, #contact) sit where each act is fully shown, so nav links land on it.
  function placeAnchors() {
    anchors.forEach((anchor, i) => {
      const [from, to] = windows[i];
      const hold = Math.min(1, (from + FADE + Math.min(to, 1)) / 2);
      anchor.style.top = pinned.matches ? `${hold * range()}px` : '';
    });
  }

  // Keyboard users tabbing into an act that isn't showing get scrolled to it.
  acts.forEach((act, i) =>
    act.addEventListener('focusin', () => {
      if (pinned.matches && !act.classList.contains('is-on')) anchors[i].scrollIntoView();
    }),
  );

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  const relayout = () => {
    fit();
    placeAnchors();
    update();
  };

  // Settling: when scrolling stops between two stops (top, each act, the end), glide on to the next one in the
  // scroll direction; only a nudge of less than NUDGE pixels glides back. CSS scroll-snap can't do this over
  // gaps this tall, it either ignores them (proximity) or keeps pulling back to the top (mandatory).
  let direction = 0;
  let lastY = scrollY;
  let gliding = false;
  let settleTimer = 0;
  const NUDGE = 48;

  const stops = () => [
    0,
    ...anchors.map((a) => a.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(a).scrollMarginTop)),
    document.documentElement.scrollHeight - innerHeight,
  ];

  function settle() {
    if (!pinned.matches || gliding) return;
    const y = scrollY;
    const all = stops();
    if (all.some((s) => Math.abs(s - y) < 2)) return;
    const next = all.findIndex((s) => s > y);
    if (next <= 0) return;
    const [a, b] = [all[next - 1], all[next]];
    const target = direction >= 0 ? (y - a > NUDGE ? b : a) : b - y > NUDGE ? a : b;
    gliding = true;
    const done = () => {
      gliding = false;
      removeEventListener('scrollend', done);
    };
    if (lenis) {
      lenis.scrollTo(target, { duration: 0.9, easing: ease, onComplete: done });
    } else {
      scrollTo({ top: target, behavior: 'smooth' });
      addEventListener('scrollend', done);
    }
    setTimeout(done, 1200);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener(
    'scroll',
    () => {
      if (scrollY !== lastY) direction = Math.sign(scrollY - lastY);
      lastY = scrollY;
      clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 140);
    },
    { passive: true },
  );
  addEventListener('resize', relayout);
  pinned.addEventListener('change', relayout);
  relayout();
}
