import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { billingSteps, faqCategories, planComparison, sellerPlans } from '../../../core/data/seller-content.data';

/** Plans, a full comparison, and exactly how a paid plan gets paid for. */
@Component({
  selector: 'app-seller-pricing',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  templateUrl: './seller-pricing.html',
  styleUrls: ['../shared/seller-portal.css', './seller-pricing.css'],
})
export class SellerPricing {
  protected readonly plans = sellerPlans;
  protected readonly comparison = planComparison;
  protected readonly billing = billingSteps;
  protected readonly pricingFaq = faqCategories.find((category) => category.id === 'money')?.items ?? [];

  protected readonly selectedFit = signal<number | null>(null);
  protected readonly fits = [
    {
      key: 'STARTER',
      plan: 'Starter',
      quote: 'I make things on the side and want to see if people will buy them online.',
      why: 'It has everything you need to open a store and take orders, and it costs nothing — so you can test the waters without any risk.',
    },
    {
      key: 'STANDARD',
      plan: 'Growth',
      quote: 'Orders come in most weeks and I want to understand what sells best.',
      why: 'Expanded sales insights show which products earn their place, and priority support helps when something needs sorting quickly.',
    },
    {
      key: 'PREMIUM',
      plan: 'Professional',
      quote: 'We are an established workshop with a big range and a small team behind it.',
      why: 'Professional onboarding support helps you set up a large catalogue properly, and early access puts new seller tools in your hands first.',
    },
  ] as const;
}
