import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { guideChapters } from '../../../core/data/seller-content.data';

/** Height of the sticky seller header, so chapter headings land just below it. */
const HEADER_OFFSET = 112;

/**
 * A free, long-form guide to selling online, written for small Cambodian
 * businesses. The side table of contents follows the chapter being read.
 */
@Component({
  selector: 'app-seller-guide',
  imports: [RouterLink, KcIcon, SellerPortalHeader, SellerFooter],
  templateUrl: './seller-guide.html',
  styleUrls: ['../shared/seller-portal.css', './seller-guide.css'],
})
export class SellerGuide implements AfterViewInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scroller = inject(ViewportScroller);

  protected readonly chapters = guideChapters;
  protected readonly totalMinutes = guideChapters.reduce((sum, chapter) => sum + parseInt(chapter.readTime, 10), 0);
  protected readonly activeChapter = signal(guideChapters[0].id);

  constructor() {
    // Land chapter headings below the sticky seller header, not under it.
    this.scroller.setOffset([0, HEADER_OFFSET]);
    this.destroyRef.onDestroy(() => this.scroller.setOffset([0, 0]));
  }

  ngAfterViewInit(): void {
    // The router's anchor scrolling runs before a lazy page has rendered, so a
    // link straight to /guide#pricing would land at the top. Scroll here instead.
    const fragments = this.route.fragment.subscribe((id) => {
      if (!id) return;
      setTimeout(() => {
        const target = this.host.nativeElement.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
        if (!target) return;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET, behavior: 'smooth' });
      }, 60);
    });
    this.destroyRef.onDestroy(() => fragments.unsubscribe());

    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.activeChapter.set((entry.target as HTMLElement).dataset['chapter'] ?? this.activeChapter());
          }
        }
      },
      // A chapter counts as "being read" while it crosses the upper third of the screen.
      { rootMargin: '-25% 0px -65% 0px' },
    );
    this.host.nativeElement.querySelectorAll('[data-chapter]').forEach((node: Element) => observer.observe(node));
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
