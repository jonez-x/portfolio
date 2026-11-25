// Smoothed wheel scrolling (Lenis): the page eases to where the wheel sends it instead of stepping.
// Touch keeps native scrolling; reduced motion gets no smoothing at all, so `lenis` is null there.
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export const lenis = matchMedia('(prefers-reduced-motion: no-preference)').matches
  ? new Lenis({ autoRaf: true, lerp: 0.1 })
  : null;

export const ease = (t: number) => 1 - Math.pow(1 - t, 4);

// Links to a spot on this same page glide there with the same easing instead of jumping.
if (lenis) {
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]:not(.skip)');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    const target = url.hash.length > 1 ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
    if (!target) return;
    e.preventDefault();
    history.pushState(null, '', url.hash);
    lenis.scrollTo(target, { duration: 1.2, easing: ease });
  });
}
