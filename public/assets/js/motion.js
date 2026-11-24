/* ==========================================================================
   Grand Sirenis Locker App · Precarga, revelado y carga diferida
   - Retira la capa de precarga cuando la página terminó de cargar.
   - Revela [data-reveal] al entrar en pantalla (IntersectionObserver).
   - Actualiza el service worker para no servir CSS/JS antiguos.
   Sin dependencias, sin estilos inline en el contenido y accesible sin JS.
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.add('js');

  /* 1. Precarga ------------------------------------------------------------ */
  const boot = document.querySelector('.boot');
  let booted = false;

  const finishBoot = () => {
    if (booted) return;
    booted = true;
    root.classList.remove('is-booting');
    root.classList.add('is-ready');
    if (boot) {
      boot.setAttribute('aria-hidden', 'true');
      window.setTimeout(() => boot.remove(), 620);
    }
  };

  if (boot) {
    root.classList.add('is-booting');
    const settle = () => {
      const fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 1200))])
        .then(finishBoot)
        .catch(finishBoot);
    };
    if (document.readyState === 'complete') settle();
    else window.addEventListener('load', settle, { once: true });
    // Red de seguridad: nunca deja la pantalla bloqueada por una carga lenta.
    window.setTimeout(finishBoot, 4000);
  }

  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    root.classList.remove('is-booting');
    root.classList.add('is-ready');
  });

  /* 2. Revelado progresivo -------------------------------------------------- */
  const revealItems = Array.from(document.querySelectorAll('[data-reveal]'));
  if (revealItems.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-revealed'));
    } else {
      root.classList.add('motion');
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.08 }
      );
      revealItems.forEach((item) => revealObserver.observe(item));
    }

    // Red de seguridad: si el observador tarda en entregar el primer aviso
    // (p. ej. una pestaña que aún no pintó), lo visible se muestra igualmente.
    const revealInView = () => {
      revealItems.forEach((item) => {
        if (item.classList.contains('is-revealed')) return;
        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) item.classList.add('is-revealed');
      });
    };
    const scheduleRevealFallback = () => {
      window.requestAnimationFrame(revealInView);
      window.setTimeout(revealInView, 700);
    };
    if (document.readyState === 'complete') scheduleRevealFallback();
    else window.addEventListener('load', scheduleRevealFallback, { once: true });
  }

  /* 3. Service worker: evitar que se sirvan recursos antiguos ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener(
      'load',
      () => {
        const hadController = Boolean(navigator.serviceWorker.controller);
        let reloaded = false;

        navigator.serviceWorker
          .register('sw.js', { scope: './' })
          .then((registration) => registration.update())
          .catch(() => {
            /* Sin service worker la app sigue funcionando en red local. */
          });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!hadController || reloaded) return;
          reloaded = true;
          window.location.reload();
        });
      },
      { once: true }
    );
  }
})();
