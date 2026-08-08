// Lightweight scroll effects: hero parallax + reveal-on-scroll. Plain CSS +
// IntersectionObserver, no dependencies. Respects prefers-reduced-motion.

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Hero parallax ---

function initParallax() {
  if (prefersReducedMotion) return;

  const targets = Array.from(document.querySelectorAll('[data-parallax]'));
  if (targets.length === 0) return;

  let ticking = false;

  function update() {
    const viewportH = window.innerHeight;
    targets.forEach((el) => {
      const speed = Number(el.dataset.parallaxSpeed) || 0.15;
      const rect = el.getBoundingClientRect();
      // Only bother computing while the element is anywhere near the viewport.
      if (rect.bottom < -200 || rect.top > viewportH + 200) return;
      const offset = (rect.top - viewportH / 2) * speed;
      el.style.transform = `translateY(${offset.toFixed(1)}px)`;
    });
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// --- Scroll-reveal ---

let revealObserver = null;

function getRevealObserver() {
  if (revealObserver) return revealObserver;

  revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  return revealObserver;
}

// Called on initial load for static markup, and again by page scripts after
// they inject dynamic content (product grids, wishlist grid, order lists...).
function observeReveal(root = document) {
  const elements = root.matches && root.matches('.reveal') ? [root] : Array.from(root.querySelectorAll('.reveal'));

  if (prefersReducedMotion) {
    elements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = getRevealObserver();
  elements.forEach((el) => {
    if (!el.classList.contains('is-visible')) observer.observe(el);
  });
}

window.NoveAnimations = { observeReveal };

document.addEventListener('DOMContentLoaded', () => {
  initParallax();
  observeReveal(document);
});
