(() => {
  // Original catalog photo is a local fallback, never a browser-side AI request.
  class VitreumProductVisual extends HTMLElement {
    connectedCallback() {
      this.events?.abort();
      this.events = new AbortController();
      const img = this.querySelector('img');
      if (!img) return;
      const fallback = () => {
        if (this.dataset.visualKind !== 'cutout' || !this.dataset.fallbackSrc) return;
        this.dataset.visualKind = 'catalog';
        this.dataset.visualSource = 'fallback';
        img.srcset = this.dataset.fallbackSrcset || '';
        img.src = this.dataset.fallbackSrc;
      };
      img.addEventListener('error', fallback, { signal: this.events.signal });
      // A cached failed image may have fired its error before this element upgraded.
      if (img.complete && img.naturalWidth === 0) fallback();
    }

    disconnectedCallback() {
      this.events?.abort();
    }
  }

  if (!customElements.get('vitreum-product-visual')) {
    customElements.define('vitreum-product-visual', VitreumProductVisual);
  }

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const smoothStep = (value) => value * value * (3 - 2 * value);

  class VitrineVortex {
    constructor(root) {
      this.root = root;
      this.scrollMotion = root.dataset.scrollMotion === 'true' && !prefersReducedMotion.matches;
      this.stage = root.querySelector('[data-vitreum-vortex-stage]');
      this.cards = [...root.querySelectorAll('[data-vitreum-vortex-card]')];
      this.particles = [...root.querySelectorAll('[data-vitreum-vortex-particle]')];
      this.scroller = root.closest('.page-wrapper') || window;
      this.grid = root.closest('.shopify-section')?.nextElementSibling?.querySelector('.product-grid-container');
      this.gridSection = this.grid?.closest('.shopify-section');
      this.raf = 0;
      this.lastProgress = -1;
      this.lastRawProgress = 0;
      this.lastFrameAt = performance.now();
      this.inertia = 0;
      this.activeCards = this.cards;
      this.onScroll = this.onScroll.bind(this);
      this.onResize = this.onResize.bind(this);
      this.syncCollectionState = this.syncCollectionState.bind(this);
      this.root.classList.add('is-enhanced');
      this.root.classList.toggle('is-fixed', !this.scrollMotion);
      if (this.scrollMotion) this.gridSection?.classList.add('vitreum-grid-target');

      if (this.cards.length === 0) {
        this.root.classList.add('is-static');
        return;
      }

      if (this.scrollMotion) this.scroller.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', this.onResize, { passive: true });

      this.gridObserver = new MutationObserver(this.syncCollectionState);
      const gridList = this.grid?.querySelector('.product-grid');
      if (gridList) this.gridObserver.observe(gridList, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-product-id'] });

      this.resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(this.onResize) : null;
      this.resizeObserver?.observe(this.root);
      this.syncCollectionState();
      this.onScroll();
    }

    onResize() {
      this.lastProgress = -1;
      this.onScroll();
    }

    onScroll() {
      if (this.raf) return;
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.render();
      });
    }

    syncCollectionState() {
      if (!this.grid) return;
      const visibleIds = new Set(
        [...this.grid.querySelectorAll('[data-product-id]')]
          .map((item) => item.dataset.productId)
          .filter(Boolean)
      );
      if (visibleIds.size === 0) return;

      this.cards.forEach((card) => {
        const isVisible = visibleIds.has(card.dataset.productId);
        card.dataset.vortexActive = String(isVisible);
        card.setAttribute('aria-hidden', String(!isVisible));
        card.tabIndex = isVisible ? 0 : -1;
        card.style.pointerEvents = isVisible ? '' : 'none';
      });
      this.activeCards = this.cards.filter((card) => card.dataset.vortexActive !== 'false');
      this.lastProgress = -1;
      this.onScroll();
    }

    getProgress() {
      const rect = this.root.getBoundingClientRect();
      const travel = Math.max(1, this.root.offsetHeight - window.innerHeight);
      return clamp(-rect.top / travel);
    }

    render() {
      // A fixed composition has no scroll-driven spin, release or inertia.
      const rawProgress = this.scrollMotion ? this.getProgress() : 0.18;
      const now = performance.now();
      const delta = Math.min(80, Math.max(8, now - this.lastFrameAt));
      const scrollVelocity = this.scrollMotion ? (rawProgress - this.lastRawProgress) / delta : 0;
      const targetInertia = clamp(scrollVelocity * 0.45, -0.13, 0.13);
      const damping = 1 - Math.exp(-delta / 95);
      this.inertia += (targetInertia - this.inertia) * damping;
      this.lastRawProgress = rawProgress;
      this.lastFrameAt = now;

      const progressChanged = Math.abs(rawProgress - this.lastProgress) > 0.0005;
      const hasInertia = Math.abs(this.inertia) > 0.0005;
      if (!progressChanged && !hasInertia) return;
      this.lastProgress = rawProgress;
      this.root.style.setProperty('--vortex-progress', rawProgress.toFixed(4));

      const viewport = Math.min(window.innerWidth, 1600);
      const radius = Math.min(360, Math.max(165, viewport * 0.24));
      const vertical = Math.min(330, Math.max(170, window.innerHeight * 0.34));
      const release = smoothStep(clamp((rawProgress - 0.64) / 0.27));
      const settle = smoothStep(clamp((rawProgress - 0.84) / 0.16));
      const spinProgress = rawProgress + this.inertia * 0.16;
      const turns = spinProgress * Math.PI * 5.8;
      const cards = this.activeCards.length ? this.activeCards : this.cards;

      cards.forEach((card, index) => {
        const count = Math.max(1, cards.length);
        const normalized = count === 1 ? 0 : index / (count - 1) - 0.5;
        const lane = index % 3;
        const lanePhase = lane * ((Math.PI * 2) / 3);
        const phase = lanePhase + index * 0.47;
        const angle = phase + turns * (1 + lane * 0.075);
        const taper = 0.58 + (1 - Math.abs(normalized) * 1.6) * 0.54;
        const orbit = radius * taper * (0.9 + Math.sin(spinProgress * Math.PI * 2 + lane) * 0.06);
        const x = Math.cos(angle) * orbit * (1 - release * 0.76);
        const z = Math.sin(angle) * orbit * (1 - release * 0.82);
        const y = normalized * vertical * (1 - release * 0.82)
          + Math.sin(angle * (0.66 + lane * 0.08) + lane) * (36 + lane * 18)
          + Math.cos(angle * 0.35) * 18;
        const gridX = ((index % 4) - 1.5) * Math.min(190, viewport * 0.13);
        const gridY = (Math.floor(index / 4) - 1) * 176;
        const finalX = x * (1 - settle) + gridX * settle;
        const finalY = y * (1 - settle) + gridY * settle;
        const finalZ = z * (1 - settle);
        const depth = clamp((z + radius) / (radius * 2));
        const scale = (0.72 + depth * 0.38) * (1 - settle * 0.08);
        const yaw = this.scrollMotion ? (-angle * 180) / Math.PI + Math.sin(angle) * 12 : Math.sin(angle) * 18;
        const pitch = (normalized * -18) + (1 - depth) * 10;
        const roll = Math.cos(angle) * 7 + this.inertia * 18;

        card.style.transform = `translate3d(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px), ${finalZ}px) rotateY(${yaw}deg) rotateX(${pitch}deg) rotateZ(${roll}deg) scale(${scale})`;
        card.style.opacity = String(clamp(0.74 + depth * 0.24, 0.72, 1));
        card.style.zIndex = String(Math.round(100 + finalZ + depth * 50));
      });

      this.cards.filter((card) => !cards.includes(card)).forEach((card) => {
        card.style.opacity = '0';
      });

      this.particles.forEach((particle, index) => {
        const lane = index % 3;
        const angle = (index / Math.max(1, this.particles.length)) * Math.PI * 2 + spinProgress * Math.PI * (5.2 + lane * 0.8);
        const orbit = 13 + (index % 6) * 4 + rawProgress * 18;
        const x = Math.cos(angle + lane) * orbit;
        const y = Math.sin(angle * (1.15 + lane * 0.08)) * orbit * 0.34 + (lane - 1) * 4;
        const z = Math.sin(angle) * 100;
        particle.style.transform = `translate3d(${x}vw, ${y}vh, ${z}px) scale(${0.72 + depthFromIndex(index, this.particles.length) * 0.7})`;
        particle.style.opacity = String(clamp(0.12 + (1 - release) * 0.3 + Math.sin(angle) * 0.1, 0.08, 0.46));
      });

      this.grid?.style.setProperty('--vortex-grid-reveal', this.scrollMotion ? settle.toFixed(3) : '1');
      const progressLabel = this.root.querySelector('[data-vitreum-vortex-progress]');
      if (progressLabel) progressLabel.textContent = `${String(Math.round(rawProgress * 100)).padStart(2, '0')} / 100`;

      if (hasInertia && !this.raf) {
        this.raf = requestAnimationFrame(() => {
          this.raf = 0;
          this.render();
        });
      }
    }

    destroy() {
      this.scroller.removeEventListener('scroll', this.onScroll);
      window.removeEventListener('resize', this.onResize);
      this.resizeObserver?.disconnect();
      this.gridObserver?.disconnect();
      this.gridSection?.classList.remove('vitreum-grid-target');
      if (this.raf) cancelAnimationFrame(this.raf);
    }
  }

  const depthFromIndex = (index, length) => (index % Math.max(1, length)) / Math.max(1, length - 1);

  const initHero = (root) => {
    root.classList.add('is-ready');
    if (prefersReducedMotion.matches) return;
    root.addEventListener('pointermove', (event) => {
      const rect = root.getBoundingClientRect();
      root.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width - 0.5) * 100);
      root.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height - 0.5) * 100);
    });
    root.addEventListener('pointerleave', () => {
      root.style.setProperty('--pointer-x', 0);
      root.style.setProperty('--pointer-y', 0);
    });
  };

  const initStory = (root) => {
    const scroller = root.closest('.page-wrapper') || window;
    const chapters = [...root.querySelectorAll('[data-vitreum-chapter]')];
    if (prefersReducedMotion.matches) {
      chapters.forEach((chapter) => chapter.style.setProperty('--chapter-progress', '1'));
      return;
    }
    let raf = 0;
    let pointerX = 0;
    let pointerY = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    const render = () => {
      raf = 0;
      const viewport = window.innerHeight;
      pointerX += (pointerTargetX - pointerX) * 0.12;
      pointerY += (pointerTargetY - pointerY) * 0.12;
      chapters.forEach((chapter) => {
        const rect = chapter.getBoundingClientRect();
        const progress = clamp(1 - Math.abs(rect.top + rect.height * 0.5 - viewport * 0.5) / (viewport * 0.8));
        chapter.style.setProperty('--chapter-progress', progress.toFixed(3));

        const chapterCenter = rect.top + rect.height * 0.5;
        const chapterDrift = clamp((chapterCenter - viewport * 0.5) / viewport, -1, 1);
        chapter.querySelectorAll('.vitreum-story__product').forEach((product) => {
          const productDepth = clamp(1 - Math.abs(chapterDrift) * 0.9);
          const lift = -chapterDrift * 18 + pointerY * 8;
          const lateral = pointerX * 14 + chapterDrift * -10;
          const yaw = pointerX * 5 + chapterDrift * 4;
          const pitch = pointerY * -4 + (1 - productDepth) * 3;
          const roll = pointerX * 2 + chapterDrift * -2;
          product.style.setProperty('--story-x', `${lateral.toFixed(2)}px`);
          product.style.setProperty('--story-y', `${lift.toFixed(2)}px`);
          product.style.setProperty('--story-z', `${(productDepth * 18).toFixed(2)}px`);
          product.style.setProperty('--story-yaw', `${yaw.toFixed(2)}deg`);
          product.style.setProperty('--story-pitch', `${pitch.toFixed(2)}deg`);
          product.style.setProperty('--story-roll', `${roll.toFixed(2)}deg`);
          product.style.setProperty('--story-scale', (1 + productDepth * 0.045).toFixed(3));
        });
      });

      if (Math.abs(pointerTargetX - pointerX) > 0.05 || Math.abs(pointerTargetY - pointerY) > 0.05) {
        raf = requestAnimationFrame(render);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const onPointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      pointerTargetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointerTargetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      onScroll();
    };
    const onPointerLeave = () => {
      pointerTargetX = 0;
      pointerTargetY = 0;
      onScroll();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    root.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave, { passive: true });
    render();
  };

  const init = (scope = document) => {
    scope.querySelectorAll('[data-vitreum-hero]').forEach(initHero);
    scope.querySelectorAll('[data-vitreum-story]').forEach(initStory);
    scope.querySelectorAll('[data-vitreum-vortex]').forEach((root) => {
      if (!root.vitreumVortex) root.vitreumVortex = new VitrineVortex(root);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  } else {
    init();
  }

  document.addEventListener('shopify:section:load', (event) => init(event.target));
  document.addEventListener('shopify:section:unload', (event) => {
    event.target.querySelectorAll?.('[data-vitreum-vortex]').forEach((root) => root.vitreumVortex?.destroy());
  });
})();
