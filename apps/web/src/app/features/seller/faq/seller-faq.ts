import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { FaqCategory, faqCategories, faqItems, sellerSteps } from '../../../core/data/seller-content.data';

/** Every seller question, grouped by topic and searchable. */
@Component({
  selector: 'app-seller-faq',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  templateUrl: './seller-faq.html',
  styleUrls: ['../shared/seller-portal.css', './seller-faq.css'],
})
export class SellerFaq {
  protected readonly categories = faqCategories;
  protected readonly totalCount = faqItems.length;
  protected readonly steps = sellerSteps;

  protected readonly query = signal('');
  protected readonly category = signal<string>('all');

  /** Topics to show: filtered by the chosen topic, then by the search words. */
  protected readonly visible = computed<FaqCategory[]>(() => {
    const words = this.query().trim().toLowerCase().split(/\s+/).filter(Boolean);
    const topic = this.category();
    return this.categories
      .filter((cat) => topic === 'all' || cat.id === topic)
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          const text = `${item.question} ${item.answer}`.toLowerCase();
          return words.every((word) => text.includes(word));
        }),
      }))
      .filter((cat) => cat.items.length > 0);
  });

  protected readonly helpLinks = [
    { icon: 'lightbulb', title: 'Read the seller guide', body: 'Six short chapters on photos, descriptions, pricing, packing and growth.', cta: 'Open the guide', path: '/guide' },
    { icon: 'eye', title: 'Tour the workspace', body: 'Click through the storefront, products, orders and billing screens.', cta: 'Take the tour', path: '/explore' },
    { icon: 'heart', title: 'Talk to the team', body: 'Visit the help centre to reach KhmerCraft support about anything else.', cta: 'Visit help centre', path: '/help' },
  ];
}
