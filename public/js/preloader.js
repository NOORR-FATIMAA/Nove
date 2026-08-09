/* ===== First-entry splash preloader (index.html only) =====
   Waits for the full page load, enforces a minimum visible time so fast
   connections don't just flash the overlay, then fades it out and removes
   it from the DOM. Sets a sessionStorage flag so it never re-appears
   during the same browser session. */

(function () {
  'use strict';

  var PRELOADER_MIN_MS = 700;
  var preloader = document.getElementById('preloader');
  if (!preloader) return;

  var showTime = Date.now();

  window.addEventListener('load', function () {
    var elapsed = Date.now() - showTime;
    var remaining = Math.max(0, PRELOADER_MIN_MS - elapsed);

    setTimeout(function () {
      preloader.classList.add('is-hidden');
      document.body.classList.remove('preloading');

      try {
        sessionStorage.setItem('nove_seen_splash', '1');
      } catch (_) {
        /* private-browsing or storage full — harmless */
      }

      /* Remove element after the CSS transition finishes */
      preloader.addEventListener('transitionend', function onEnd() {
        preloader.removeEventListener('transitionend', onEnd);
        preloader.remove();
      });

      /* Safety net: if transitionend never fires (reduced-motion, etc.),
         remove after a generous timeout */
      setTimeout(function () {
        if (preloader.parentNode) preloader.remove();
      }, 800);
    }, remaining);
  });
})();
