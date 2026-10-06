import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerFooter } from '../shared/seller-footer';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { marketplaceUrl } from '../../../core/portal/portal';

@Component({
  selector: 'app-seller-about',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  templateUrl: './seller-about.html',
  styleUrls: ['../shared/seller-portal.css', './seller-about.css'],
})
export class SellerAbout {
  protected readonly marketplaceHome = marketplaceUrl('/');

  protected readonly values = [
    { icon: 'heart', title: 'Makers first', body: 'Every feature starts with one question: does this give a seller more time for the work they love?' },
    { icon: 'shield', title: 'Trust is earned', body: 'No invented numbers, no hidden fees, no automatic charges. If we say it, we can back it up.' },
    { icon: 'leaf', title: 'Local by design', body: 'Every province, local payment with KHQR, and products that carry the story of where they came from.' },
    { icon: 'sparkles', title: 'Simple beats clever', body: 'If it needs a manual, we have not finished designing it. A phone and five minutes should be enough.' },
    { icon: 'lock', title: 'Your store is yours', body: 'Your name, your prices, your story, your buyers. You decide what is published and when.' },
    { icon: 'bridge', title: 'Grow together', body: 'When sellers succeed, the marketplace gets better for buyers too. We only win when you do.' },
  ];

  protected readonly roadmap = [
    { status: 'Available now', title: 'Storefronts with your own style', body: 'Three styles, your brand color, a logo, a cover and your story — set up in minutes and changeable any time.' },
    { status: 'Available now', title: 'Orders, stock and reviews in one place', body: 'One workspace for incoming orders, stock locations and buyer reviews, on every plan.' },
    { status: 'In focus', title: 'Deeper sales insights', body: 'Clearer views of what sells, when, and to whom — so you know what to make more of.' },
    { status: 'In focus', title: 'More ways to be discovered', body: 'Better ways for buyers to find small and new stores alongside established ones.' },
  ];
}
