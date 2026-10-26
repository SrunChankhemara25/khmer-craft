import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROMOTIONS, Promotion } from '../core/data/promotions.data';
import { IconComponent } from './icon.component';

const AUTOPLAY_MS = 6000;

/**
 * Promotion carousel for the top of the homepage.
 *
 * One mechanism serves both behaviours the design needs: the track is a
 * scroll-snap container, so a person can swipe or trackpad-scroll it directly,
 * and autoplay simply calls scrollTo on the same element. That means manual and
 * automatic movement can never disagree about which slide is showing — the
 * active dot is derived from scroll position, not from a separate index.
 *
 * Autoplay pauses on hover, on keyboard focus, when the tab is hidden, and is
 * disabled entirely for users who prefer reduced motion.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, IconComponent],
  template: `
    <section
      class="slider"
      aria-roledescription="carousel"
      aria-label="Promotions"
      (mouseenter)="paused.set(true)"
      (mouseleave)="paused.set(false)"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
    >
      <div #track class="track" (scroll)="onScroll()">
        @for (promo of promotions; track promo.id; let i = $index) {
          <article
            class="slide"
            [class]="'slide theme-' + promo.theme"
            role="group"
            aria-roledescription="slide"
            [attr.aria-label]="i + 1 + ' of ' + promotions.length"
          >
            <div class="container slide-inner">
              <div class="copy">
                <span class="eyebrow">
                  <ui-icon name="sparkles" [size]="13" /> {{ promo.eyebrow }}
                </span>
                <h1>{{ promo.headline }}</h1>
                <p>{{ promo.subtitle }}</p>
                <div class="actions">
                  <a
                    class="btn btn-lg cta"
                    [routerLink]="promo.ctaRoute"
                    [queryParams]="promo.ctaParams ?? {}"
                  >
                    {{ promo.ctaLabel }} <ui-icon name="arrow-right" [size]="16" />
                  </a>
                  @if (promo.secondaryLabel) {
                    <a class="btn btn-lg cta-secondary" [routerLink]="promo.secondaryRoute">
                      {{ promo.secondaryLabel }}
                    </a>
                  }
                </div>
              </div>

              <div class="visual img-placeholder dark">
                @if (promo.flash) {
                  <span class="flash">{{ promo.flash }}</span>
                }
                <span class="visual-caption">{{ promo.visual }}</span>
              </div>
            </div>
          </article>
        }
      </div>

      <div class="dots" role="tablist" aria-label="Choose slide">
        @for (promo of promotions; track promo.id; let i = $index) {
          <button
            type="button"
            role="tab"
            class="dot"
            [class.active]="i === index()"
            [attr.aria-selected]="i === index()"
            [attr.aria-label]="promo.headline"
            (click)="goTo(i)"
          ></button>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .slider {
        position: relative;
      }
      .track {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        /* Hidden here on purpose: the dots are the affordance, and a scrollbar
           under a full-bleed hero reads as a layout bug. Swiping still works. */
        scrollbar-width: none;
      }
      .track::-webkit-scrollbar {
        display: none;
      }
      .slide {
        flex: 0 0 100%;
        scroll-snap-align: start;
        scroll-snap-stop: always;
      }
      .slide-inner {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 48px;
        align-items: center;
        padding-top: 52px;
        padding-bottom: 52px;
        min-height: 420px;
      }
      .copy {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 12px;
        border-radius: var(--radius-full);
        font-size: 12px;
        font-weight: 650;
      }
      h1 {
        font-size: clamp(30px, 3.4vw, 46px);
        line-height: 1.1;
        letter-spacing: -0.03em;
        max-width: 12em;
      }
      .copy p {
        font-size: 15px;
        line-height: 1.65;
        max-width: 34em;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .visual {
        position: relative;
        height: 320px;
        border-radius: var(--radius-lg);
        display: grid;
        place-items: center;
      }
      .visual-caption {
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        opacity: 0.55;
      }
      .flash {
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 10px 16px;
        border-radius: var(--radius-md);
        font-family: var(--font-heading);
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        transform: rotate(4deg);
      }

      /* ---- themes ---- */
      .theme-brand {
        background: var(--color-bg-alt);
      }
      .theme-brand .eyebrow {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .theme-brand .cta {
        background: var(--color-accent);
        color: #fff;
      }
      .theme-brand .cta:hover {
        background: var(--color-accent-hover);
      }

      .theme-sale {
        background: #1d1512;
      }
      .theme-sale h1,
      .theme-sale .visual-caption {
        color: #fff;
      }
      .theme-sale p {
        color: rgba(255, 255, 255, 0.72);
      }
      .theme-sale .eyebrow {
        background: rgba(224, 178, 105, 0.16);
        color: var(--gold);
      }
      .theme-sale .cta {
        background: var(--gold);
        color: #24190f;
      }
      .theme-sale .cta:hover {
        background: #eec483;
      }
      .theme-sale .flash {
        background: var(--gold);
        color: #24190f;
      }

      .theme-delivery {
        background: #14231c;
      }
      .theme-delivery h1,
      .theme-delivery .visual-caption {
        color: #fff;
      }
      .theme-delivery p {
        color: rgba(255, 255, 255, 0.72);
      }
      .theme-delivery .eyebrow {
        background: rgba(120, 200, 160, 0.15);
        color: #8fd8b4;
      }
      .theme-delivery .cta {
        background: #8fd8b4;
        color: #10231a;
      }
      .theme-delivery .cta:hover {
        background: #a8e3c6;
      }
      .theme-delivery .flash {
        background: #8fd8b4;
        color: #10231a;
      }

      .theme-seller {
        background: var(--color-accent);
      }
      .theme-seller h1,
      .theme-seller .visual-caption {
        color: #fff;
      }
      .theme-seller p {
        color: rgba(255, 255, 255, 0.78);
      }
      .theme-seller .eyebrow {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .theme-seller .cta {
        background: #fff;
        color: var(--color-accent);
      }
      .theme-seller .cta:hover {
        background: #f4ece9;
      }

      /* Secondary button adapts to light vs dark slides. */
      .cta-secondary {
        background: transparent;
        border: 1px solid var(--color-border-strong);
        color: var(--color-text);
      }
      .cta-secondary:hover {
        background: var(--color-bg-alt);
      }
      .theme-sale .cta-secondary,
      .theme-delivery .cta-secondary,
      .theme-seller .cta-secondary {
        border-color: rgba(255, 255, 255, 0.28);
        color: #fff;
      }
      .theme-sale .cta-secondary:hover,
      .theme-delivery .cta-secondary:hover,
      .theme-seller .cta-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      /* ---- dots ---- */
      .dots {
        position: absolute;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        padding: 7px 12px;
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(8px);
      }
      .dot {
        width: 8px;
        height: 8px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.25);
        transition: width var(--dur-base) var(--ease-standard);
      }
      .dot:hover {
        background: rgba(0, 0, 0, 0.45);
      }
      .dot.active {
        width: 22px;
        border-radius: var(--radius-full);
        background: var(--color-accent);
      }

      @media (max-width: 900px) {
        .slide-inner {
          grid-template-columns: 1fr;
          gap: 26px;
          padding-top: 34px;
          padding-bottom: 46px;
          min-height: 0;
        }
        .visual {
          height: 190px;
          order: -1;
        }
        h1 {
          max-width: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .track {
          scroll-behavior: auto;
        }
      }
    `,
  ],
})
export class HeroSliderComponent implements OnInit {
  protected readonly promotions: Promotion[] = PROMOTIONS;

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly index = signal(0);
  protected readonly paused = signal(false);

  ngOnInit(): void {
    // Honour the OS "reduce motion" setting — an auto-advancing carousel is
    // exactly the kind of movement that setting exists to stop.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = setInterval(() => {
      // Skip while hovered/focused, or while the tab is in the background —
      // otherwise the slide silently races ahead while nobody is looking.
      if (this.paused() || document.hidden) {
        return;
      }
      // Advance from where the track actually is, not from a counter. If a
      // scroll was interrupted (or never ran, as happens in a background tab),
      // a counter would drift and the dots would point at the wrong slide.
      this.goTo((this.currentSlide() + 1) % this.promotions.length);
    }, AUTOPLAY_MS);

    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected goTo(target: number): void {
    const element = this.track().nativeElement;
    element.scrollTo({ left: element.clientWidth * target });
    // Set the dot immediately so a click feels instant, then let onScroll
    // correct it. The scroll event is the more trustworthy of the two — a
    // swipe never calls this method — but it can lag or, in a background tab,
    // not fire at all, and the dot should not sit still in the meantime.
    this.index.set(target);
  }

  /** Derive the active dot from real scroll position, so swiping stays in sync. */
  protected onScroll(): void {
    this.index.set(this.currentSlide());
  }

  private currentSlide(): number {
    const element = this.track().nativeElement;
    if (element.clientWidth === 0) {
      return this.index();
    }
    return Math.round(element.scrollLeft / element.clientWidth);
  }
}
