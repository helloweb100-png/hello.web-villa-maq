/* ==========================================================================
   MAQUINADOS VILLASEÑOR — main.js
   --------------------------------------------------------------------------
   Dependencias opcionales (CDN, ya incluidas en el HTML):
     · GSAP + ScrollTrigger → galería con pin, parallax, línea de proceso
     · Lenis                → scroll suave ("motion slow")
   Si alguna no carga, el sitio sigue funcionando (degradación progresiva).

   Módulos
     01 Utilidades            08 Hero (engranes + canvas + DRO)
     02 WhatsApp              09 Efectos de scroll (GSAP)
     03 Loader                10 Tabs de materiales
     04 Scroll suave          11 FAQ
     05 Header y menú         12 Formulario → WhatsApp
     06 Cursor + magnético    13 WhatsApp flotante
     07 Reveals y contadores
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     01 · UTILIDADES
     ------------------------------------------------------------------------ */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const body = document.body;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = () => typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  const WA_NUMBER = '523317143918'; // 33 1714 3918 (México)

  // Ejecuta un módulo sin que un error tumbe al resto de la página
  const safe = (name, fn) => {
    try { fn(); } catch (err) { console.error(`[main.js] módulo "${name}" falló:`, err); }
  };

  const debounce = (fn, ms) => {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  };

  // Estado compartido de scroll (lo alimenta Lenis o el scroll nativo)
  const scrollSubs = [];
  const scrollState = { y: 0, velocity: 0 };
  const pushScroll = (y, velocity) => {
    scrollState.y = y;
    scrollState.velocity = velocity;
    for (const fn of scrollSubs) fn(y, velocity);
  };

  let lenis = null;
  const refreshTriggers = debounce(() => { if (hasGSAP()) window.ScrollTrigger.refresh(); }, 180);

  /* ------------------------------------------------------------------------
     02 · WHATSAPP — todos los [data-msg] abren el chat con mensaje precargado
     ------------------------------------------------------------------------ */
  const waURL = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;

  function initWhatsApp() {
    $$('[data-msg]').forEach((a) => { a.href = waURL(a.dataset.msg); });
  }

  /* ------------------------------------------------------------------------
     03 · LOADER (spinner de carga)
     ------------------------------------------------------------------------ */
  function initLoader() {
    return new Promise((resolve) => {
      const loader = $('#loader');
      if (!loader) { root.classList.add('is-loaded'); resolve(); return; }

      const bar = $('#loaderBar');
      const pct = $('#loaderPct');
      const status = $('#loaderStatus');
      const lx = $('#lx');
      const ly = $('#ly');
      const msgs = ['Calibrando ejes…', 'Cargando herramientas…', 'Verificando tolerancias…', 'Listo para maquinar'];

      const minTime = reduced ? 350 : 2100;
      const t0 = performance.now();
      let loaded = document.readyState === 'complete';
      let fontsReady = false;
      let p = 0;
      let finished = false;

      if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { fontsReady = true; });
      setTimeout(() => { loaded = true; fontsReady = true; }, 6500); // nunca esperar de más

      const finish = () => {
        if (finished) return;
        finished = true;
        loader.classList.add('is-done');
        root.classList.add('is-loaded');
        body.classList.remove('is-locked');
        if (lenis) lenis.start();
        setTimeout(() => loader.classList.add('is-gone'), 1500);
        resolve();
      };

      const frame = (now) => {
        if (finished) return;
        const t = now - t0;
        const ready = loaded && fontsReady && t >= minTime;
        const target = ready ? 100 : Math.min(92, (t / minTime) * 92);
        p += (target - p) * (ready ? 0.22 : 0.1);
        if (target - p < 0.4) p = target;

        if (pct) pct.textContent = Math.round(p);
        if (bar) bar.style.strokeDashoffset = (100 - p).toFixed(1);
        if (status) status.textContent = msgs[Math.min(msgs.length - 1, Math.floor(p / 26))];
        if (lx) lx.textContent = (p * 3.1416).toFixed(3).padStart(7, '0');
        if (ly) ly.textContent = (p * 3.236).toFixed(3).padStart(7, '0');

        if (p >= 100) { setTimeout(finish, 320); return; }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
      setTimeout(finish, 8000); // failsafe
    });
  }

  /* ------------------------------------------------------------------------
     04 · SCROLL SUAVE (Lenis) + anclas
     ------------------------------------------------------------------------ */
  function initSmooth() {
    if (!reduced && typeof window.Lenis !== 'undefined') {
      lenis = new window.Lenis({
        duration: 1.25,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.4,
      });
      lenis.on('scroll', ({ scroll, velocity }) => pushScroll(scroll, velocity));

      if (hasGSAP()) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add((t) => lenis.raf(t * 1000));
        window.gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);
      }
    } else {
      let last = window.scrollY;
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        pushScroll(y, y - last);
        last = y;
      }, { passive: true });
      if (hasGSAP()) window.gsap.registerPlugin(window.ScrollTrigger);
    }
    if (hasGSAP()) window.ScrollTrigger.config({ ignoreMobileResize: true });
  }

  function goTo(el) {
    const header = $('#header');
    const isPinned = el.classList.contains('work');
    const offset = isPinned ? 0 : -((header ? header.offsetHeight : 70) - 1);
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.7 });
    else {
      const top = el.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function initAnchors(closeMenu) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      // pequeño retardo para que el menú móvil libere el bloqueo de scroll
      setTimeout(() => goTo(el), 60);
      history.replaceState(null, '', id);
    });
  }

  /* ------------------------------------------------------------------------
     05 · HEADER + MENÚ MÓVIL + PROGRESO
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#header');
    const progress = $('#progress');
    const burger = $('#burger');
    const menu = $('#menu');
    if (!header) return () => {};

    let menuOpen = false;
    let lastY = 0;
    let maxScroll = 1;
    const measure = () => { maxScroll = Math.max(1, root.scrollHeight - window.innerHeight); };
    measure();
    window.addEventListener('resize', debounce(measure, 200));
    window.addEventListener('load', measure);

    scrollSubs.push((y) => {
      header.classList.toggle('is-scrolled', y > 30);
      if (!menuOpen) {
        if (y > 520 && y > lastY + 4) header.classList.add('is-hidden');
        else if (y < lastY - 4 || y <= 520) header.classList.remove('is-hidden');
      }
      lastY = y;
      if (progress) progress.style.transform = `scaleX(${clamp(y / maxScroll, 0, 1).toFixed(4)})`;
    });

    const setMenu = (open) => {
      menuOpen = open;
      if (!burger || !menu) return;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      body.classList.toggle('is-locked', open);
      if (lenis) (open ? lenis.stop() : lenis.start());
      if (open) header.classList.remove('is-hidden');
    };
    if (burger) burger.addEventListener('click', () => setMenu(!menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
    window.matchMedia('(min-width: 960px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

    // Sección activa en la navegación
    const links = $$('[data-nav]');
    const targets = ['nosotros', 'servicios', 'trabajos', 'materiales', 'proceso', 'contacto']
      .map((id) => document.getElementById(id)).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${en.target.id}`));
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      targets.forEach((t) => io.observe(t));
    }

    return () => setMenu(false);
  }

  /* ------------------------------------------------------------------------
     06 · CURSOR PERSONALIZADO + BOTONES MAGNÉTICOS + TILT
     ------------------------------------------------------------------------ */
  function initCursor() {
    if (!finePointer || reduced) return;
    const cursor = $('#cursor');
    if (!cursor) return;
    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    let x = -100, y = -100, rx = -100, ry = -100;

    window.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      cursor.classList.remove('is-hidden');
    }, { passive: true });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, [data-tilt], input, select, textarea, label, [role="tab"]'));
    });

    const loop = () => {
      rx = lerp(rx, x, 0.18);
      ry = lerp(ry, y, 0.18);
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function initMagnetic() {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * 0.22;
        const my = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.translate = `${mx.toFixed(1)}px ${my.toFixed(1)}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  function initTilt() {
    if (!finePointer || reduced) return;
    $$('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', `${((px - 0.5) * 6).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - py) * 6).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ------------------------------------------------------------------------
     07 · REVEALS (IntersectionObserver) + TEXTO POR PALABRAS + CONTADORES
     ------------------------------------------------------------------------ */
  // Envuelve cada palabra en una máscara para el efecto "sube desde abajo"
  function splitWords(el) {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((ch) => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.style.setProperty('--i', i++);
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(el);
  }

  // Statement: cada palabra se "enciende" con el scroll
  function splitStatement(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    const spans = words.map((word) => {
      const s = document.createElement('span');
      s.className = 'sw';
      s.textContent = word;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });
    const k = words.findIndex((w) => /^vuelve$/i.test(w));
    if (k > -1) spans.slice(k, k + 3).forEach((s) => s.classList.add('sw--acc'));
  }

  function initReveals() {
    $$('[data-split]').forEach(splitWords);
    $$('[data-words]').forEach(splitStatement);

    // Retardo escalonado dentro de grupos
    $$('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        if (child.hasAttribute('data-reveal') && !child.style.getPropertyValue('--d')) {
          child.style.setProperty('--d', `${i * 90}ms`);
        }
      });
    });

    const els = $$('[data-reveal], [data-split]');
    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    // Un elemento 100 % recortado con clip-path nunca "intersecta" para el observer:
    // en esos casos se observa a su contenedor y se revela el elemento desde ahí.
    const groups = new Map();
    els.forEach((el) => {
      const target = el.getAttribute('data-reveal') === 'clip' ? el.parentElement : el;
      if (!groups.has(target)) groups.set(target, []);
      groups.get(target).push(el);
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        groups.get(en.target).forEach((el) => el.classList.add('in'));
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    groups.forEach((_, target) => io.observe(target));
  }

  function initCounters() {
    const nodes = $$('[data-count]');
    if (!nodes.length) return;
    const fmt = (n, target) => (target < 10 ? String(n).padStart(2, '0') : String(n));
    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach((n) => { n.textContent = fmt(+n.dataset.count, +n.dataset.count); });
      return;
    }
    nodes.forEach((n) => { n.textContent = fmt(0, +n.dataset.count); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = +el.dataset.count;
        const dur = 1800;
        const t0 = performance.now();
        const step = (now) => {
          const t = clamp((now - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(2, -10 * t); // easeOutExpo
          el.textContent = fmt(Math.round(target * (t >= 1 ? 1 : eased)), target);
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    nodes.forEach((n) => io.observe(n));
  }

  /* ------------------------------------------------------------------------
     08 · HERO — engranes que engranan + chispas + polvo metálico + DRO
     ------------------------------------------------------------------------ */
  function initHero() {
    const hero = $('#inicio');
    const stage = $('#stage');
    const cvs = $('#heroCanvas');
    if (!hero || !stage || !cvs) return;

    // Palabra rotativa
    const words = $$('.cycle__w');
    if (words.length > 1 && !reduced) {
      let idx = 0;
      setInterval(() => {
        if (document.hidden) return;
        const cur = words[idx];
        idx = (idx + 1) % words.length;
        const nxt = words[idx];
        cur.classList.remove('is-active');
        cur.classList.add('is-out');
        nxt.classList.remove('is-out');
        nxt.classList.add('is-active');
        setTimeout(() => cur.classList.remove('is-out'), 950);
      }, 2300);
    }

    // Parallax de salida del hero (variable CSS --hp)
    scrollSubs.push((y) => {
      if (y > window.innerHeight * 1.3) return;
      hero.style.setProperty('--hp', clamp(y / window.innerHeight, 0, 1).toFixed(3));
    });

    const ctx = cvs.getContext('2d');
    const gA = $('#gearA'), gB = $('#gearB'), gC = $('#gearC');
    const droX = $('#droX'), droY = $('#droY'), droZ = $('#droZ');

    // Geometría del SVG (viewBox 0 70 640 500) — ver index.html
    const A = { x: 230, y: 360 }, B = { x: 410.56, y: 208.49 }, C = { x: 555.45, y: 247.31 };
    const PHI = -40; // dirección A → B (grados)
    const PSI = 15;  // dirección B → C (grados)
    // Cinemática de engranaje: ángulo del engrane conducido para que los dientes encajen
    const mesh = (rotA, nA, nB, phi) => phi + 180 - ((rotA - phi) * nA) / nB - 360 / nB / 2;

    let w = 0, h = 0, dpr = 1;
    let particles = [];
    let sparks = [];
    let contacts = [];
    let sparksOn = false;
    const pointer = { x: 0.72, y: 0.4, tx: 0.72, ty: 0.4, px: -999, py: -999, active: false, lpx: -999, lpy: -999 };

    const seed = () => {
      const n = clamp(Math.floor((w * h) / 15000), 36, 110);
      particles = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: -0.05 - Math.random() * 0.26,
        r: Math.random() * 1.5 + 0.4,
        a: Math.random() * 0.5 + 0.2,
        t: Math.random() * 6.28,
      }));
    };

    // Convierte puntos de contacto del SVG a coordenadas del canvas
    const measure = () => {
      const hr = hero.getBoundingClientRect();
      const sr = stage.getBoundingClientRect();
      const toScreen = (vx, vy) => ({
        x: sr.left - hr.left + (vx / 640) * sr.width,
        y: sr.top - hr.top + ((vy - 70) / 500) * sr.height,
      });
      contacts = [toScreen(344.9, 263.6), toScreen(493.4, 230.7)];
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cvs.width = Math.round(w * dpr);
      cvs.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      measure();
    };
    resize();
    window.addEventListener('resize', debounce(resize, 200));

    const spawn = (x, y, ang, speed, life) => {
      if (sparks.length > 240) return;
      sparks.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life, max: life });
    };

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      pointer.tx = px / r.width;
      pointer.ty = py / r.height;
      pointer.active = true;
      pointer.px = px; pointer.py = py;
      const dx = px - pointer.lpx, dy = py - pointer.lpy;
      const speed = Math.hypot(dx, dy);
      if (sparksOn && speed > 9 && pointer.lpx > -900) {
        const n = Math.min(3, 1 + Math.floor(speed / 28));
        const base = Math.atan2(-dy, -dx);
        for (let i = 0; i < n; i++) spawn(px, py, base + (Math.random() - 0.5) * 1.3, 60 + Math.random() * 170, 0.4 + Math.random() * 0.5);
      }
      pointer.lpx = px; pointer.lpy = py;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { pointer.active = false; pointer.px = -999; pointer.py = -999; pointer.lpx = -999; });

    const fmtDRO = (v) => (v >= 0 ? '+' : '-') + Math.abs(v).toFixed(3).padStart(7, '0');

    const drawFrame = (time, dt, frame) => {
      ctx.clearRect(0, 0, w, h);

      // Polvo metálico + constelación
      ctx.globalCompositeOperation = 'source-over';
      for (const p of particles) {
        p.x += p.vx * dt * 60;
        p.y += p.vy * dt * 60;
        if (pointer.active) {
          const dx = p.x - pointer.px, dy = p.y - pointer.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < 16900) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / 130) * 1.6;
            p.x += (dx / d) * f; p.y += (dy / d) * f;
          }
        }
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        const a = p.a * (0.6 + 0.4 * Math.sin(time * 2 + p.t));
        ctx.fillStyle = `rgba(220,228,235,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 8000) {
            ctx.strokeStyle = `rgba(255,255,255,${(0.09 * (1 - d2 / 8000)).toFixed(3)})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
      }

      // Chispas en los puntos de contacto de los engranes
      if (sparksOn) {
        sparkAcc += dt;
        while (sparkAcc > 0.05) {
          sparkAcc -= 0.05;
          contacts.forEach((c, i) => {
            if (Math.random() < 0.75) spawn(c.x, c.y, -Math.PI / 2 + (Math.random() - 0.5) * 2.4 + (i ? 0.5 : -0.3), 70 + Math.random() * 190, 0.45 + Math.random() * 0.7);
          });
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vy += 400 * dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0 || s.y > h + 20) { sparks.splice(i, 1); continue; }
        const k = s.life / s.max;
        ctx.strokeStyle = `rgba(255,${Math.floor(110 + 140 * k)},${Math.floor(30 + 90 * k * k)},${k.toFixed(2)})`;
        ctx.lineWidth = 0.5 + 1.5 * k;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.035, s.y - s.vy * 0.035); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';

      // Re-medir cada ~1.5 s (el escenario tiene animación de entrada y tilt)
      if (frame % 90 === 0) measure();
    };

    let last = performance.now();
    let time = 0, frame = 0, running = false, visible = true, sparkAcc = 0;

    const tick = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt; frame++;

      if (!pointer.active) {
        pointer.tx = 0.72 + Math.sin(time * 0.35) * 0.06;
        pointer.ty = 0.4 + Math.cos(time * 0.28) * 0.05;
      }
      pointer.x = lerp(pointer.x, pointer.tx, 0.06);
      pointer.y = lerp(pointer.y, pointer.ty, 0.06);

      hero.style.setProperty('--mx', `${(pointer.x * 100).toFixed(1)}%`);
      hero.style.setProperty('--my', `${(pointer.y * 100).toFixed(1)}%`);
      stage.style.setProperty('--ry', `${((pointer.x - 0.5) * 8).toFixed(2)}deg`);
      stage.style.setProperty('--rx', `${((0.5 - pointer.y) * 6).toFixed(2)}deg`);

      // Engranes: giran solos y se aceleran con el scroll
      const rotA = time * 9 + scrollState.y * 0.14;
      const rotB = mesh(rotA, 28, 16, PHI);
      const rotC = mesh(rotB, 16, 12, PSI);
      gA.setAttribute('transform', `translate(${A.x} ${A.y}) rotate(${rotA.toFixed(2)})`);
      gB.setAttribute('transform', `translate(${B.x} ${B.y}) rotate(${rotB.toFixed(2)})`);
      gC.setAttribute('transform', `translate(${C.x} ${C.y}) rotate(${rotC.toFixed(2)})`);

      // DRO (lector digital de posición, como el de la fresadora)
      if (frame % 4 === 0 && droX) {
        droX.textContent = fmtDRO((pointer.x - 0.5) * 420 + Math.sin(time * 0.6) * 3);
        droY.textContent = fmtDRO((0.5 - pointer.y) * 260 + Math.cos(time * 0.5) * 2.4);
        droZ.textContent = fmtDRO(25 + Math.sin(time * 0.3) * 10 + scrollState.y * 0.02);
      }

      drawFrame(time, dt, frame);
      requestAnimationFrame(tick);
    };

    const start = () => { if (running || reduced) return; running = true; last = performance.now(); requestAnimationFrame(tick); };
    const stop = () => { running = false; };

    if (reduced) {
      // Cuadro estático: engranes engranados en su posición inicial
      const rotB = mesh(0, 28, 16, PHI), rotC = mesh(rotB, 16, 12, PSI);
      gB.setAttribute('transform', `translate(${B.x} ${B.y}) rotate(${rotB})`);
      gC.setAttribute('transform', `translate(${C.x} ${C.y}) rotate(${rotC})`);
      drawFrame(0, 0, 1);
      return;
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (visible) start(); });
    start();

    // Las chispas arrancan cuando termina la animación de entrada
    const armSparks = () => setTimeout(() => { sparksOn = true; measure(); }, 1900);
    if (root.classList.contains('is-loaded')) armSparks();
    else new MutationObserver((_, obs) => { if (root.classList.contains('is-loaded')) { armSparks(); obs.disconnect(); } })
      .observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  /* ------------------------------------------------------------------------
     09 · EFECTOS DE SCROLL (GSAP/ScrollTrigger + extras sin dependencias)
     ------------------------------------------------------------------------ */
  function initTicker() {
    const track = $('#tickerTrack');
    const skewEl = $('#tickerSkew');
    if (!track) return;
    const group = track.firstElementChild;
    for (let i = 0; i < 3; i++) track.appendChild(group.cloneNode(true)); // 4 copias → bucle continuo
    if (reduced || !skewEl) return;

    let skew = 0;
    const loop = () => {
      const target = clamp(scrollState.velocity * 0.16, -6, 6);
      skew = lerp(skew, target, 0.1);
      skewEl.style.setProperty('--skew', `${skew.toFixed(2)}deg`);
      scrollState.velocity *= 0.9; // decae si el scroll se detiene
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // Elementos que giran con el scroll (engranes decorativos)
  function initSpin() {
    if (reduced) return;
    const els = $$('[data-spin]');
    scrollSubs.push((y) => {
      els.forEach((el) => { el.style.transform = `rotate(${(y * parseFloat(el.dataset.spin)).toFixed(2)}deg)`; });
    });
  }

  function initWorkNative(section, viewport, track) {
    // Móvil / sin GSAP: carrusel nativo con scroll‑snap + indicador
    const idx = $('#workIdx');
    const bar = $('#workBar');
    const cards = $$('.wcard', track);
    const update = () => {
      const max = viewport.scrollWidth - viewport.clientWidth;
      const p = max > 0 ? viewport.scrollLeft / max : 0;
      if (bar) bar.style.setProperty('--p', Math.max(0.08, p).toFixed(3));
      if (idx) idx.textContent = String(clamp(Math.round(p * (cards.length - 1)) + 1, 1, cards.length)).padStart(2, '0');
    };
    viewport.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initScrollFx() {
    const section = $('#trabajos');
    const viewport = $('#workViewport');
    const track = $('#workTrack');

    if (!hasGSAP() || reduced) {
      if (section) section.classList.add('is-native');
      if (section && viewport && track) initWorkNative(section, viewport, track);
      $$('.process .step').forEach((s) => s.classList.add('is-active'));
      const fill = $('#stepsFill');
      if (fill) fill.style.setProperty('--p', 1);
      $$('.statement__text .sw').forEach((s) => { s.style.opacity = 1; });
      return;
    }

    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // Parallax suave de imágenes
    $$('[data-parallax]').forEach((img) => {
      gsap.fromTo(img, { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Statement: las palabras se encienden al avanzar
    const sw = $$('.statement__text .sw');
    if (sw.length) {
      gsap.to(sw, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: '.statement__text', start: 'top 82%', end: 'bottom 48%', scrub: true },
      });
    }

    // Línea de progreso del proceso + pasos activos
    const steps = $$('.process .step');
    const fill = $('#stepsFill');
    if (fill && steps.length) {
      ScrollTrigger.create({
        trigger: '#steps', start: 'top 72%', end: 'bottom 62%',
        onUpdate: (self) => {
          fill.style.setProperty('--p', self.progress.toFixed(3));
          steps.forEach((s, i) => s.classList.toggle('is-active', self.progress >= i / steps.length - 0.02));
        },
      });
    }

    // Marca gigante del footer
    const mark = $('#footMark span');
    if (mark) {
      gsap.fromTo(mark, { yPercent: 45, opacity: 0.2 }, {
        yPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: '.footer', start: 'top 92%', end: 'bottom bottom', scrub: true },
      });
    }

    // Galería horizontal con pin (≥ 900 px). En móvil: carrusel nativo.
    if (section && viewport && track) {
      const idx = $('#workIdx');
      const bar = $('#workBar');
      const cards = $$('.wcard', track);
      const mm = gsap.matchMedia();

      mm.add('(min-width: 900px)', () => {
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${Math.round(dist() * 1.15)}`,
            pin: true,
            scrub: 0.9,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (bar) bar.style.setProperty('--p', Math.max(0.08, self.progress).toFixed(3));
              if (idx) idx.textContent = String(clamp(Math.round(self.progress * (cards.length - 1)) + 1, 1, cards.length)).padStart(2, '0');
            },
          },
        });
        return () => { gsap.set(track, { clearProps: 'transform' }); };
      });

      mm.add('(max-width: 899px)', () => { initWorkNative(section, viewport, track); });
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------------------
     10 · TABS DE MATERIALES (accesibles con teclado)
     ------------------------------------------------------------------------ */
  function initTabs() {
    const tabs = $$('.mats__tab');
    const panels = $$('.mats__panel');
    if (!tabs.length) return;

    const activate = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      panels.forEach((p, j) => {
        const on = i === j;
        p.hidden = !on;
        p.classList.toggle('is-active', on);
      });
      refreshTriggers();
    };

    tabs.forEach((t, i) => {
      t.addEventListener('click', () => activate(i));
      t.addEventListener('keydown', (e) => {
        let n = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); activate(n, true); }
      });
    });
  }

  /* ------------------------------------------------------------------------
     11 · FAQ (acordeón accesible)
     ------------------------------------------------------------------------ */
  function initFAQ() {
    const items = $$('.acc__item');
    items.forEach((item) => {
      const btn = $('.acc__btn', item);
      btn.addEventListener('click', () => {
        const open = !item.classList.contains('is-open');
        items.forEach((it) => {
          const on = it === item && open;
          it.classList.toggle('is-open', on);
          $('.acc__btn', it).setAttribute('aria-expanded', String(on));
        });
        setTimeout(refreshTriggers, 650);
      });
    });
  }

  /* ------------------------------------------------------------------------
     12 · FORMULARIO → WHATSAPP
     ------------------------------------------------------------------------ */
  function initForm() {
    const form = $('#quoteForm');
    if (!form) return;
    const status = $('#formStatus');
    const val = (name) => (form.elements[name] ? form.elements[name].value.trim() : '');

    const setInvalid = (field, bad) => {
      const wrap = field.closest('.field');
      if (wrap) wrap.classList.toggle('is-invalid', bad);
      field.setAttribute('aria-invalid', String(bad));
    };

    form.querySelectorAll('[required]').forEach((f) => {
      const clear = () => { if (f.value.trim()) setInvalid(f, false); };
      f.addEventListener('input', clear);
      f.addEventListener('change', clear);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstBad = null;
      form.querySelectorAll('[required]').forEach((f) => {
        const bad = !f.value.trim();
        setInvalid(f, bad);
        if (bad && !firstBad) firstBad = f;
      });
      if (firstBad) {
        firstBad.focus();
        if (status) status.textContent = 'Revisa los campos marcados para continuar.';
        return;
      }

      const lines = [
        `Hola, soy ${val('nombre')}. Quiero cotizar: ${val('pieza')}.`,
        `Material: ${val('material') || 'por definir'}.`,
        `Cantidad: ${val('cantidad') || 'por definir'}.`,
        `Detalles: ${val('mensaje')}`,
      ];
      if (val('telefono')) lines.push(`Mi teléfono: ${val('telefono')}`);
      lines.push('(Enviado desde la página web de Maquinados Villaseñor)');

      // Enlace temporal: evita bloqueadores de ventanas emergentes
      const a = document.createElement('a');
      a.href = waURL(lines.join('\n'));
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();

      if (status) status.textContent = '¡Listo! Se abrió WhatsApp con tu solicitud. Adjunta una foto o plano para cotizar más rápido.';
    });
  }

  /* ------------------------------------------------------------------------
     13 · WHATSAPP FLOTANTE (burbuja de invitación)
     ------------------------------------------------------------------------ */
  function initWAFloat() {
    const bubble = $('#waBubble');
    const close = $('#waClose');
    if (!bubble) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('mv-wa-dismissed') === '1'; } catch (_) { /* privado */ }
    if (dismissed) return;

    const hide = (persist) => {
      bubble.classList.remove('is-show');
      if (persist) { try { sessionStorage.setItem('mv-wa-dismissed', '1'); } catch (_) { /* noop */ } }
    };
    if (close) close.addEventListener('click', () => hide(true));
    setTimeout(() => { bubble.classList.add('is-show'); setTimeout(() => hide(false), 11000); }, 8000);
  }

  /* ------------------------------------------------------------------------
     ARRANQUE
     ------------------------------------------------------------------------ */
  body.classList.add('is-locked');
  safe('whatsapp', initWhatsApp);
  safe('smooth', initSmooth);
  if (lenis) lenis.stop(); // se libera cuando termina el loader
  safe('loader', () => { initLoader(); });

  const closeMenu = (() => { let fn = () => {}; safe('header', () => { fn = initHeader(); }); return fn; })();
  safe('anchors', () => initAnchors(closeMenu));
  safe('reveals', initReveals);
  safe('counters', initCounters);
  safe('cursor', initCursor);
  safe('magnetic', initMagnetic);
  safe('tilt', initTilt);
  safe('ticker', initTicker);
  safe('spin', initSpin);
  safe('hero', initHero);
  safe('scrollfx', initScrollFx);
  safe('tabs', initTabs);
  safe('faq', initFAQ);
  safe('form', initForm);
  safe('wafloat', initWAFloat);

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  // Estado inicial de scroll (por si la página carga ya desplazada)
  pushScroll(window.scrollY, 0);
})();
