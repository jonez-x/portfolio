// The cursor: a small orange square on the pointer, and four corner brackets that trail it and lock onto
// the link or button underneath, like the [bracket] links across the site.
// Only for a mouse or trackpad; touch and reduced motion keep the system cursor.

if (matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
  const root = document.documentElement;
  const dot = document.createElement('div');
  const frame = document.createElement('div');
  dot.className = 'cursor-dot';
  frame.className = 'cursor-frame';
  frame.innerHTML = '<i></i><i></i><i></i><i></i>';
  dot.ariaHidden = frame.ariaHidden = 'true';
  document.body.append(frame, dot);
  root.classList.add('has-cursor');

  const SIZE = 26;
  const PAD = 8;
  const TARGETS = 'a, button, summary, label, [role="button"]';
  let x = -100;
  let y = -100;
  const box = { x, y, w: SIZE, h: SIZE };
  let down = false;

  addEventListener(
    'pointermove',
    (e) => {
      if (!root.classList.contains('cursor-on')) Object.assign(box, { x: e.clientX - SIZE / 2, y: e.clientY - SIZE / 2 });
      x = e.clientX;
      y = e.clientY;
      root.classList.add('cursor-on');
    },
    { passive: true },
  );
  addEventListener('mouseout', (e) => {
    if (!e.relatedTarget) root.classList.remove('cursor-on');
  });
  addEventListener('pointerdown', () => (down = true));
  addEventListener('pointerup', () => (down = false));

  function tick() {
    // looked up every frame, so the lock follows the page when it scrolls under a still pointer
    const target = document.elementFromPoint(x, y)?.closest(TARGETS);
    let to;
    if (target) {
      const r = target.getBoundingClientRect();
      to = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
    } else {
      const s = down ? SIZE * 0.6 : SIZE;
      to = { x: x - s / 2, y: y - s / 2, w: s, h: s };
    }
    for (const k of ['x', 'y', 'w', 'h'] as const) box[k] += (to[k] - box[k]) * 0.24;

    frame.style.transform = `translate(${box.x}px, ${box.y}px)`;
    frame.style.width = `${box.w}px`;
    frame.style.height = `${box.h}px`;
    frame.classList.toggle('is-locked', !!target);
    dot.style.transform = `translate(${x}px, ${y}px)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
