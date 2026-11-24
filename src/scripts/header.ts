// Home page: the header is light while it floats over the dark hero, and takes the page's colours once the hero is gone.

const header = document.querySelector<HTMLElement>('.top');
const hero = document.querySelector<HTMLElement>('.hero');

if (header && hero) {
  new IntersectionObserver(([entry]) => header.classList.toggle('is-past', !entry.isIntersecting), {
    rootMargin: '-88px 0px 0px 0px',
  }).observe(hero);
}
