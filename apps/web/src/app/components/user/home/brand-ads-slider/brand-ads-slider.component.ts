import {
  Component,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../../core/api/api.config';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

export interface BrandAdSlide {
  id: string;
  theme: string;
  badge: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  targetType: 'STORE' | 'PRODUCT';
  targetId: string;
  targetUrl: string;
  buttonText: string;
  storeName?: string;
  storeSlug?: string;
}

const DEFAULT_BRAND_ADS: BrandAdSlide[] = [
  {
    id: 'default-lv',
    theme: 'luxury',
    badge: 'OFFICIAL BRAND',
    title: 'Louis Vuitton',
    subtitle: 'Savoir-Faire & Leather Craftsmanship',
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80',
    targetType: 'STORE',
    targetId: 'louis-vuitton',
    targetUrl: '/stores',
    buttonText: 'Explore Brand',
    storeName: 'Louis Vuitton Maison',
  },
  {
    id: 'default-dior',
    theme: 'luxury',
    badge: 'HAUTE COUTURE',
    title: 'Christian Dior',
    subtitle: 'Artisanal Silk & Haute Couture Collections',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=80',
    targetType: 'STORE',
    targetId: 'dior',
    targetUrl: '/stores',
    buttonText: 'Visit Collection',
    storeName: 'Dior Paris',
  },
  {
    id: 'default-pchum-ben',
    theme: 'pchum-ben',
    badge: 'PCHUM BEN SPECIAL',
    title: 'Silk & Stone Atelier',
    subtitle: 'Ancestral Offerings & Sacred Silver Bowls',
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    targetType: 'STORE',
    targetId: 'silk-stone',
    targetUrl: '/stores',
    buttonText: 'Explore Crafts',
    storeName: 'Kampong Luong Silversmiths',
  },
  {
    id: 'default-artisans-angkor',
    theme: 'local-pride',
    badge: 'HERITAGE ATELIER',
    title: 'Artisans Angkor',
    subtitle: 'Sacred Sandstone Sculptures & Silk Scarves',
    imageUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80',
    targetType: 'STORE',
    targetId: 'artisans-angkor',
    targetUrl: '/stores',
    buttonText: 'Discover Brand',
    storeName: 'Artisans Angkor Siem Reap',
  },
  {
    id: 'default-kampot-pottery',
    theme: 'local-pride',
    badge: 'AUTHENTIC STONEWARE',
    title: 'Kampot Ceramics',
    subtitle: 'Wood-fired coastal clay tableware & pottery crafts',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
    targetType: 'STORE',
    targetId: 'kampot-pottery',
    targetUrl: '/stores',
    buttonText: 'Shop Stoneware',
    storeName: 'Kampot Studio',
  },
];

@Component({
  selector: 'app-brand-ads-slider',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  template: `
    <div class="brand-ads-section">
      <div class="section-head">
        <div class="head-left">
          <span class="badge-tag">Brand Spotlight &amp; Ads</span>
          <h2 class="section-title">Featured Brands &amp; Sponsored Slides</h2>
        </div>
        <div class="head-right">
          <a routerLink="/stores" class="see-all">
            Explore brands <ui-icon name="arrow-right" [size]="14" />
          </a>
          <div class="nav-controls">
            <button
              type="button"
              class="nav-arrow"
              (click)="scrollLeft()"
              aria-label="Previous brand slides"
            >
              <ui-icon name="chevron-left" [size]="18" />
            </button>
            <button
              type="button"
              class="nav-arrow"
              (click)="scrollRight()"
              aria-label="Next brand slides"
            >
              <ui-icon name="chevron-right" [size]="18" />
            </button>
          </div>
        </div>
      </div>

      <div #track class="brand-ads-track" tabindex="0" role="region" aria-label="Brand Advertisement Slides">
        @for (slide of slides(); track slide.id) {
          <article
            class="brand-ad-card"
            (click)="openSlide(slide)"
            (keydown.enter)="openSlide(slide)"
            tabindex="0"
            [attr.aria-label]="slide.title + ' brand advertisement'"
          >
            <!-- Background Image -->
            <div class="card-bg-wrap">
              <img
                class="card-img"
                [src]="slide.imageUrl"
                [alt]="slide.title"
                loading="lazy"
                (error)="onImgError($event)"
              />
              <div class="card-overlay"></div>
            </div>

            <!-- Top Pill Badge -->
            <div class="card-top">
              <span class="brand-badge" [attr.data-theme]="slide.theme">
                {{ slide.badge || 'FEATURED BRAND' }}
              </span>
            </div>

            <!-- Bottom Content -->
            <div class="card-bottom">
              <h3 class="brand-name">{{ slide.title }}</h3>
              <p class="brand-subtitle">{{ slide.subtitle }}</p>
              @if (slide.storeName) {
                <span class="brand-maker">{{ slide.storeName }}</span>
              }

              <button
                type="button"
                class="card-action-btn"
                [attr.aria-label]="'Explore ' + slide.title"
                (click)="openSlide(slide); $event.stopPropagation()"
              >
                <ui-icon name="arrow-right" [size]="16" color="#fff" />
              </button>
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .brand-ads-section {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .section-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 14px;
      }
      .head-left {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .badge-tag {
        align-self: flex-start;
        background: #2b2118;
        color: #f7eedf;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 3px 9px;
        border-radius: 6px;
      }
      .section-title {
        font-family: var(--font-heading, Georgia, serif);
        font-size: clamp(22px, 1.8vw, 28px);
        font-weight: 700;
        color: var(--color-text, #261f18);
        margin: 0;
      }
      .head-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .see-all {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-accent, #9e3625);
        font-size: 13.5px;
        font-weight: 650;
        text-decoration: none;
        transition: color 150ms ease;
      }
      .see-all:hover {
        color: var(--color-primary-dark, #632014);
      }
      .nav-controls {
        display: flex;
        gap: 6px;
      }
      .nav-arrow {
        align-items: center;
        background: var(--paper, #fff);
        border: 1px solid var(--color-border-strong, #d9cfc2);
        border-radius: 50%;
        color: var(--color-text, #261f18);
        cursor: pointer;
        display: flex;
        height: 36px;
        justify-content: center;
        width: 36px;
        transition: background 150ms ease, border-color 150ms ease, transform 150ms ease;
      }
      .nav-arrow:hover {
        background: var(--color-sand, #f6f1e8);
        border-color: var(--color-accent, #9e3625);
        transform: scale(1.05);
      }

      /* Sliding track of Big Cards */
      .brand-ads-track {
        display: flex;
        gap: 16px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        scrollbar-width: none;
        padding-bottom: 8px;
        -webkit-overflow-scrolling: touch;
      }
      .brand-ads-track::-webkit-scrollbar {
        display: none;
      }

      /* Big Card styling matching media_1791131152479.png */
      .brand-ad-card {
        border-radius: 18px;
        box-shadow: 0 4px 16px rgba(18, 15, 12, 0.08);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        flex: 0 0 clamp(260px, 22vw, 310px);
        height: clamp(380px, 32vw, 440px);
        justify-content: space-between;
        outline: none;
        overflow: hidden;
        padding: 20px;
        position: relative;
        scroll-snap-align: start;
        transition: transform 220ms ease, box-shadow 220ms ease;
      }
      .brand-ad-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 30px rgba(18, 15, 12, 0.18);
      }
      .brand-ad-card:focus-visible {
        box-shadow: 0 0 0 3px var(--color-accent, #9e3625);
      }

      /* Full-bleed background with image zoom */
      .card-bg-wrap {
        inset: 0;
        position: absolute;
        z-index: 1;
        overflow: hidden;
      }
      .card-img {
        height: 100%;
        object-fit: cover;
        width: 100%;
        display: block;
        transition: transform 400ms ease;
      }
      .brand-ad-card:hover .card-img {
        transform: scale(1.05);
      }
      .card-overlay {
        background: linear-gradient(
          0deg,
          rgba(14, 18, 15, 0.92) 0%,
          rgba(14, 18, 15, 0.5) 45%,
          rgba(14, 18, 15, 0.15) 75%,
          transparent 100%
        );
        inset: 0;
        position: absolute;
        z-index: 2;
      }

      /* Top Elements */
      .card-top {
        position: relative;
        z-index: 3;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .brand-badge {
        background: rgba(22, 18, 15, 0.72);
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 999px;
        color: #f7eedf;
        font-size: 10px;
        font-weight: 750;
        letter-spacing: 0.08em;
        padding: 4px 10px;
        text-transform: uppercase;
      }
      .brand-badge[data-theme='luxury'] {
        background: rgba(180, 83, 9, 0.3);
        border-color: rgba(245, 158, 11, 0.5);
        color: #fbbf24;
      }
      .brand-badge[data-theme='pchum-ben'] {
        background: rgba(20, 98, 66, 0.4);
        border-color: rgba(52, 211, 153, 0.4);
        color: #a7f3d0;
      }

      /* Bottom Content */
      .card-bottom {
        position: relative;
        z-index: 3;
        color: #fff;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      .brand-name {
        color: #fff;
        font-family: var(--font-heading, Georgia, serif);
        font-size: 23px;
        font-weight: 700;
        line-height: 1.25;
        margin: 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      }
      .brand-subtitle {
        color: rgba(255, 255, 255, 0.88);
        font-size: 12.5px;
        line-height: 1.4;
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .brand-maker {
        color: rgba(255, 255, 255, 0.65);
        font-size: 11px;
        font-weight: 600;
        margin-top: 2px;
      }
      .card-action-btn {
        align-items: center;
        background: rgba(30, 36, 32, 0.8);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        bottom: 0;
        color: #fff;
        cursor: pointer;
        display: flex;
        height: 38px;
        justify-content: center;
        position: absolute;
        right: 0;
        width: 38px;
        transition: background 150ms ease, transform 150ms ease;
      }
      .brand-ad-card:hover .card-action-btn {
        background: var(--color-accent, #9e3625);
        border-color: var(--color-accent, #9e3625);
        transform: scale(1.1);
      }
    `,
  ],
})
export class BrandAdsSliderComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  protected readonly trackRef = viewChild<ElementRef<HTMLDivElement>>('track');

  protected readonly slides = signal<BrandAdSlide[]>(DEFAULT_BRAND_ADS);

  ngOnInit(): void {
    this.http.get<BrandAdSlide[]>(`${API_URL}/promotions/active`).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.slides.set(data);
        }
      },
      error: () => {
        // Fall back to default premier brand ads
        this.slides.set(DEFAULT_BRAND_ADS);
      },
    });
  }

  scrollLeft(): void {
    const el = this.trackRef()?.nativeElement;
    if (el) el.scrollBy({ left: -320, behavior: 'smooth' });
  }

  scrollRight(): void {
    const el = this.trackRef()?.nativeElement;
    if (el) el.scrollBy({ left: 320, behavior: 'smooth' });
  }

  openSlide(slide: BrandAdSlide): void {
    if (slide.targetUrl) {
      void this.router.navigateByUrl(slide.targetUrl);
    }
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80';
  }
}
