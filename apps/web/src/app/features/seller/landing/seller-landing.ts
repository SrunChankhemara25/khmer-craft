import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import {
  dayWithYourStore,
  faqItems,
  guideChapters,
  prepChecklist,
  sellerJourneys,
  sellerPlans,
  sellerPromises,
  sellerSteps,
  sellerTools,
} from '../../../core/data/seller-content.data';

/**
 * The seller portal's home page — the first thing a prospective seller reads.
 *
 * Written to be read top to bottom: why we built it, how it works, what a day
 * looks like, what it costs, and what to prepare. The device mockups use real
 * category artwork the storefront already ships, so what a seller sees here is
 * what the site actually looks like.
 *
 * Nothing on this page claims a number the marketplace cannot back up. There
 * are no seller counts, revenue figures or ratings, and the seller journeys
 * are labelled as illustrative examples.
 */
@Component({
  selector: 'app-seller',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  templateUrl: './seller-landing.html',
  styleUrls: ['../shared/seller-portal.css', './seller-landing.css'],
})
export class SellerPage {
  protected readonly trust = [
    { icon: 'check', label: 'Free Starter plan' },
    { icon: 'globe', label: 'Every province' },
    { icon: 'wallet', label: 'Pay plans with KHQR' },
    { icon: 'edit', label: 'Edit anytime' },
  ];

  protected readonly madeFor = [
    'Silk weavers', 'Potters', 'Home kitchens', 'Pepper farmers', 'Boutiques',
    'Skincare makers', 'Woodworkers', 'Painters', 'Family shops', 'Toy makers',
    'Electronics sellers', 'Basket weavers', 'Coffee roasters', 'Jewellers',
  ];

  protected readonly claims = [
    {
      icon: 'globe',
      title: 'Found by people already shopping',
      body: 'Your storefront sits in the same marketplace buyers browse for everything else — in search and in categories — not on a page they have to be sent a link to.',
    },
    {
      icon: 'shield',
      title: 'Nothing goes live without you',
      body: 'Your products, prices, categories and contact details are yours to edit. Drafts stay drafts until you publish them, and you can change your mind any time.',
    },
    {
      icon: 'wallet',
      title: 'Every order in one place',
      body: 'Incoming orders, payment status and stock locations live in one workspace, so nothing is tracked in a separate notebook or lost in a chat.',
    },
  ];

  protected readonly categories = [
    { slug: 'fashion', label: 'Fashion', idea: 'Krama, silk scarves, tailoring, accessories' },
    { slug: 'food-groceries', label: 'Food', idea: 'Kampot pepper, palm sugar, snacks, coffee' },
    { slug: 'home-living', label: 'Home', idea: 'Baskets, ceramics, textiles, furniture' },
    { slug: 'beauty-wellness', label: 'Beauty', idea: 'Natural oils, balms, soaps, herbal care' },
    { slug: 'electronics', label: 'Electronics', idea: 'Accessories, chargers, gadgets, repairs' },
    { slug: 'kids-family', label: 'Kids & family', idea: 'Wooden toys, clothing, school supplies' },
    { slug: 'arts-culture', label: 'Arts & culture', idea: 'Paintings, carvings, silverwork, prints' },
  ];

  /**
   * Most sellers here are already selling — in a chat thread or a social page.
   * This is the honest difference, not a swipe at how they work today.
   */
  protected readonly comparison = [
    { point: 'Being found', before: 'Buyers need your link, or need to already follow you.', after: 'You appear in search and category browsing alongside every other store.' },
    { point: 'Showing products', before: 'Photos scattered through a feed, prices asked again and again.', after: 'Every product has its own page with photos, price, options and stock.' },
    { point: 'Taking an order', before: 'Details arrive across messages and get retyped by hand.', after: 'The order arrives complete — items, quantity, address, payment status.' },
    { point: 'Knowing your stock', before: 'You remember it, or you check a notebook.', after: 'Counts drop as things sell, and each product records where it is kept.' },
    { point: 'Getting paid', before: 'Screenshots of transfers, reconciled later.', after: 'Payment status sits on the order itself in your dashboard.' },
    { point: 'Earning trust', before: 'New buyers have only your word to go on.', after: 'Public reviews and your replies help strangers decide to buy.' },
  ];

  protected readonly steps = sellerSteps;
  protected readonly day = dayWithYourStore;
  protected readonly tools = sellerTools;
  protected readonly journeys = sellerJourneys;
  protected readonly promises = sellerPromises;
  protected readonly plans = sellerPlans;
  protected readonly guide = guideChapters.slice(0, 3);
  protected readonly faqPreview = faqItems.filter((item) =>
    [
      'How long does it take to open a store?',
      'How much does it cost to sell?',
      'Will I be charged automatically?',
      'Can I open the store now and add products later?',
      'Can I sell from any province?',
      'Can I have more than one store?',
    ].includes(item.question),
  );

  // ------------------------------------------------------------ checklist
  protected readonly checklist = prepChecklist;
  protected readonly checked = signal<boolean[]>(prepChecklist.map(() => false));
  protected readonly readyCount = computed(() => this.checked().filter(Boolean).length);
  protected readonly readyPercent = computed(() => (this.readyCount() / this.checklist.length) * 100);
  protected readonly readyMessage = computed(() => {
    const count = this.readyCount();
    if (count === 0) return 'ready — tick what you already have.';
    if (count < 3) return 'ready — a good start. The rest can come later.';
    if (count < this.checklist.length) return 'ready — you could open your store today.';
    return 'ready — you have everything. Let’s open your store!';
  });

  protected toggle(index: number): void {
    this.checked.update((list) => list.map((value, i) => (i === index ? !value : value)));
  }

  // ----------------------------------------------------------- sticky CTA
  protected readonly showStickyCta = signal(false);

  constructor() {
    // Show it only once the hero's own buttons have scrolled away.
    const onScroll = () => this.showStickyCta.set(window.scrollY > 720);
    window.addEventListener('scroll', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => window.removeEventListener('scroll', onScroll));
  }
}
