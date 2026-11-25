// The flow under the hero: a pinned screen where scrolling only draws the line,
// while About, Work and Contact fade in and out in place, one after the other.
// CSS reads --v (0–1, how visible an act is). Narrow screens get the sections stacked instead: the line meanders
// down beside them and draws as you scroll, and each piece settles in as it arrives (.rv / .is-in).
// Reduced motion gets plain stacked sections either way.
import { lenis, ease } from './smooth';

const flow = document.querySelector<HTMLElement>('[data-flow]');

if (flow) {
  const pinned = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  const stacked = matchMedia('(max-width: 900px) and (prefers-reduced-motion: no-preference)');
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

  // Stacked: a line that swings between two lanes along the right edge, every segment heading down,
  // then sweeps left under the contact cards.
  function meander(W: number, H: number) {
    const lanes = [W - 8, W - 30];
    const step = 260;
    let y = 0;
    let lane = 0;
    let d = `M${lanes[0]} 0`;
    while (y + step < H - 160) {
      const ny = y + step;
      lane = 1 - lane;
      d += `C${lanes[1 - lane]} ${y + step / 2} ${lanes[lane]} ${ny - step / 2} ${lanes[lane]} ${ny}`;
      y = ny;
    }
    return d + `C${lanes[lane]} ${y + 120} ${W * 0.7} ${H - 60} 24 ${H - 24}`;
  }

  function fit() {
    const W = sticky.clientWidth;
    const H = sticky.clientHeight;
    let i = 0;
    const d = stacked.matches
      ? meander(W, H)
      : shape.replace(/-?\d+(\.\d+)?/g, (n) => String((Number(n) * (i++ % 2 ? H / 600 : W / 1000)).toFixed(1)));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    path.setAttribute('d', d);
    total = path.getTotalLength();
    path.style.strokeDasharray = String(total);
  }

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const range = () => flow.offsetHeight - sticky.offsetHeight;

  // Stacked: drawn down to 70% of the viewport height. The path only ever heads down, so the length
  // at a given height can be found by bisection.
  function updateStacked() {
    const r = sticky.getBoundingClientRect();
    const y = innerHeight * 0.7 - r.top;
    let lo = 0;
    let hi = total;
    for (let n = 0; n < 16; n++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).y < y) lo = mid;
      else hi = mid;
    }
    const drawn = y <= 0 ? 0 : lo;
    path.style.strokeDashoffset = String(total - drawn);
    const at = path.getPointAtLength(drawn);
    tip.style.left = `${at.x}px`;
    tip.style.top = `${at.y}px`;
    tip.classList.toggle('is-hidden', drawn <= 0 || drawn >= total - 1);
  }

  function update() {
    if (stacked.matches) {
      updateStacked();
      return;
    }
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
  // Stacked: headings, rows and cards settle in one after another as they scroll into view.
  if (stacked.matches) {
    const pieces = acts.flatMap((act) => [
      ...act.querySelectorAll<HTMLElement>('.section-title, .about-line, .about-lead-row, .cv-group, .work-rows li, .fan li'),
    ]);
    pieces.forEach((el) => {
      el.classList.add('rv');
      const siblings = [...el.parentElement!.children].filter((c) => c.matches(el.tagName));
      el.style.setProperty('--rv-i', String(siblings.indexOf(el)));
    });
    const seen = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add('is-in');
          seen.unobserve(e.target);
        }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    pieces.forEach((el) => seen.observe(el));
  }

  // A resize that only changes the height (a phone's address bar sliding away) doesn't move anything.
  let lastW = innerWidth;
  addEventListener('resize', () => {
    if (stacked.matches && innerWidth === lastW) return update();
    lastW = innerWidth;
    relayout();
  });
  pinned.addEventListener('change', relayout);
  stacked.addEventListener('change', relayout);
  relayout();
}
