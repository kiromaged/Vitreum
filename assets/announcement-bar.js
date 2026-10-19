import { Component } from '@theme/component';

/** Horizon announcements: four-second holds and sequential 700ms transitions. */
export class AnnouncementBar extends Component {
  #current = 0;
  #timer;
  #animation;
  #events;
  #motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  #running = false;
  #generation = 0;
  #selected = false;

  connectedCallback() {
    super.connectedCallback();
    this.#events = new AbortController();
    const options = { signal: this.#events.signal };
    this.addEventListener('pointerenter', this.#updatePlayback, options);
    this.addEventListener('pointerleave', this.#updatePlayback, options);
    this.addEventListener('focusin', this.#updatePlayback, options);
    this.addEventListener('focusout', () => queueMicrotask(this.#updatePlayback), options);
    document.addEventListener('visibilitychange', this.#updatePlayback, options);
    this.#motion.addEventListener('change', this.#reset, options);
    document.addEventListener('shopify:block:select', this.#selectBlock, options);
    document.addEventListener('shopify:block:deselect', () => {
      this.#selected = false;
      this.#updatePlayback();
    }, options);
    this.#reset();
  }

  disconnectedCallback() {
    this.#generation++;
    clearTimeout(this.#timer);
    this.#animation?.cancel();
    this.#events?.abort();
    super.disconnectedCallback();
  }

  updatedCallback() {
    super.updatedCallback();
    this.#reset();
  }

  get slides() { return [...this.querySelectorAll('.announcement-bar__slide')]; }
  get autoplayInterval() {
    const seconds = Number(this.getAttribute('autoplay'));
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
  }

  #show(index) {
    const slides = this.slides;
    this.#current = ((index % slides.length) + slides.length) % slides.length || 0;
    slides.forEach((slide, position) => {
      const hidden = position !== this.#current;
      slide.setAttribute('aria-hidden', String(hidden));
      slide.toggleAttribute('inert', hidden);
      slide.querySelectorAll('a').forEach(link => { link.tabIndex = hidden ? -1 : 0; });
    });
  }

  #reset = () => {
    this.#generation++;
    clearTimeout(this.#timer);
    this.#animation?.cancel();
    this.#animation = undefined;
    this.#running = false;
    this.#show(this.#motion.matches ? 0 : this.#current);
    this.#updatePlayback();
  };

  #canPlay() {
    return this.isConnected && !document.hidden && !this.#motion.matches &&
      !this.#selected && !this.matches(':hover') && !this.contains(document.activeElement) &&
      this.slides.length > 1 && this.autoplayInterval > 0;
  }

  #updatePlayback = () => {
    clearTimeout(this.#timer);
    if (!this.#canPlay()) {
      this.#animation?.pause();
      return;
    }
    if (this.#running) {
      this.#animation?.play();
    } else {
      this.#timer = setTimeout(() => this.next(), this.autoplayInterval);
    }
  };

  #selectBlock = (event) => {
    const index = this.slides.findIndex(slide => slide.dataset.blockId === event.detail?.blockId);
    if (index < 0) return;
    this.#selected = true;
    this.#reset();
    this.#show(index);
  };

  async next() {
    if (!this.#canPlay() || this.#running) return;
    clearTimeout(this.#timer);
    this.#running = true;
    const generation = this.#generation;
    const options = { duration: 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' };
    try {
      const outgoing = this.slides[this.#current];
      if (!outgoing?.animate) {
        this.#show(this.#current + 1);
        return;
      }
      this.#animation = outgoing.animate([
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(-8px)' }
      ], options);
      await this.#animation.finished;
      if (generation !== this.#generation) return;
      const exit = this.#animation;
      // Hide the outgoing message before exposing the incoming one.
      this.#show(this.#current + 1);
      exit.cancel();
      this.#animation = this.slides[this.#current].animate([
        { opacity: 0, transform: 'translateY(8px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], options);
      if (!this.#canPlay()) this.#animation.pause();
      await this.#animation.finished;
      if (generation !== this.#generation) return;
      this.#animation.cancel();
      this.#animation = undefined;
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    } finally {
      if (generation === this.#generation) {
        this.#running = false;
        this.#updatePlayback();
      }
    }
  }
}

if (!customElements.get('announcement-bar-component')) {
  customElements.define('announcement-bar-component', AnnouncementBar);
}
