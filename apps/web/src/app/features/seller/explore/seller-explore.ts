import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KcIcon } from '../../../components/shared/ui/kc-icon/kc-icon';
import { ScrollReveal } from '../../../components/shared/ui/scroll-reveal/scroll-reveal.directive';
import { SellerPortalHeader } from '../shared/seller-portal-header';
import { SellerFooter } from '../shared/seller-footer';
import { sellerTools } from '../../../core/data/seller-content.data';

type WorkspaceScreen = 'storefront' | 'products' | 'orders' | 'reviews' | 'billing';

/**
 * A hands-on tour of the seller workspace. The screens are drawn from sample
 * data and labelled as such — they show the shape of each tool, not anyone's
 * real store.
 */
@Component({
  selector: 'app-seller-explore',
  imports: [RouterLink, KcIcon, ScrollReveal, SellerPortalHeader, SellerFooter],
  templateUrl: './seller-explore.html',
  styleUrls: ['../shared/seller-portal.css', './seller-explore.css'],
})
export class SellerExplore {
  protected readonly tools = sellerTools;
  protected readonly screen = signal<WorkspaceScreen>('storefront');

  protected readonly screens: Array<{ id: WorkspaceScreen; label: string; icon: string; title: string; detail: string; points: string[] }> = [
    {
      id: 'storefront',
      label: 'Storefront',
      icon: 'store',
      title: 'A shop window with your name on it',
      detail: 'Your storefront is the page buyers land on. It carries your logo, cover, colors and story — and every product you publish.',
      points: ['Three styles: Clean, Warm and Bold', 'Your own brand color on buttons and highlights', 'A short story buyers read before they buy', 'Its own link to share on social pages'],
    },
    {
      id: 'products',
      label: 'Products',
      icon: 'box',
      title: 'Your whole catalogue at a glance',
      detail: 'Add, edit and organise products in one list. Stock counts update as orders come in, so you always know what is running low.',
      points: ['Several photos per product', 'Colour and size options', 'Drafts stay private until published', 'Low-stock and sold-out at a glance'],
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'cart',
      title: 'Know exactly what needs you',
      detail: 'New orders arrive complete — items, quantity, delivery address and payment status — so there is nothing to retype or chase.',
      points: ['Confirm, mark ready, ship, deliver', 'Payment status on every order', 'Buyers follow progress on their side', 'Stock location shown for picking'],
    },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: 'review',
      title: 'Turn happy buyers into new ones',
      detail: 'Buyers review the products they receive. Your public replies show future shoppers that a real, caring person runs this store.',
      points: ['Reviews on every product page', 'Reply publicly in your own words', 'Spot what buyers love — and what to fix'],
    },
    {
      id: 'billing',
      label: 'Plan & billing',
      icon: 'wallet',
      title: 'Clear plans, paid your way',
      detail: 'See the plan each store is on and when it renews. Upgrades are paid with ABA KHQR and only activate after ABA confirms.',
      points: ['Starter is free with no expiry', 'Each store has its own plan', 'No automatic charges — ever'],
    },
  ];

  protected readonly current = computed(() => this.screens.find((item) => item.id === this.screen()) ?? this.screens[0]);

  protected readonly orderFlow = [
    { icon: 'cart', who: 'Buyer', title: 'Places the order', body: 'They check out with your product, delivery address and payment.' },
    { icon: 'bell', who: 'You', title: 'See it arrive', body: 'The order appears in Incoming orders, complete and ready to read.' },
    { icon: 'check', who: 'You', title: 'Confirm it', body: 'Let the buyer know you have it and are getting it ready.' },
    { icon: 'package', who: 'You', title: 'Pack and mark ready', body: 'Pick from the stock location shown, pack it carefully.' },
    { icon: 'truck', who: 'You', title: 'Ship it', body: 'Hand it over for delivery and mark the order shipped.' },
    { icon: 'heart', who: 'Buyer', title: 'Receives and reviews', body: 'The order is delivered, and the buyer can leave a review.' },
  ];

  protected readonly mobilePoints = [
    { icon: 'bell', title: 'See new orders straight away', body: 'Your Incoming orders list is the first thing you see.' },
    { icon: 'image', title: 'Add products with your camera', body: 'Take photos and publish without moving them to a computer.' },
    { icon: 'clock', title: 'Five minutes a day is enough', body: 'Confirm, pack, ship and reply — between everything else you do.' },
  ];
}
