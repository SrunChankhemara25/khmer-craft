export interface Promotion {
  id: string;
  /** Small label above the headline, e.g. "LIMITED TIME". */
  eyebrow: string;
  headline: string;
  subtitle: string;
  /** Large discount flash shown on the visual, e.g. "50% OFF". Optional. */
  flash?: string;
  ctaLabel: string;
  ctaRoute: string;
  ctaParams?: Record<string, string>;
  secondaryLabel?: string;
  secondaryRoute?: string;
  /** Maps to a theme class in the slider's stylesheet. */
  theme: 'brand' | 'sale' | 'delivery' | 'seller';
  /** Placeholder caption for the slide visual. */
  visual: string;
}

/**
 * Homepage promotion slides.
 *
 * MARKETING PLACEHOLDER COPY — the discounts and campaign names here are not
 * backed by any real pricing rule. When a promotions endpoint exists, replace
 * this array; nothing else needs to change.
 */
export const PROMOTIONS: Promotion[] = [
  {
    id: 'brand',
    eyebrow: 'Proudly local, authentically Cambodian',
    headline: 'Authentic Cambodian products, crafted with love',
    subtitle:
      'Support local artisans and farmers. Discover handmade crafts, organic foods, and traditional products from across Cambodia.',
    ctaLabel: 'Shop Now',
    ctaRoute: '/products',
    secondaryLabel: 'Explore Categories',
    secondaryRoute: '/categories',
    theme: 'brand',
    visual: 'Artisan at work',
  },
  {
    id: 'black-friday',
    eyebrow: 'Black Friday · Limited time',
    headline: 'Up to 50% off handmade crafts',
    subtitle:
      'Our biggest sale of the year. Silk, pottery and bamboo from Cambodian workshops, reduced for one week only.',
    flash: '50% OFF',
    ctaLabel: 'Shop the sale',
    ctaRoute: '/products',
    ctaParams: { collection: 'handmade-crafts' },
    secondaryLabel: 'See all products',
    secondaryRoute: '/products',
    theme: 'sale',
    visual: 'Black Friday',
  },
  {
    id: 'free-delivery',
    eyebrow: 'Every order, every province',
    headline: 'Free delivery on orders over $50',
    subtitle:
      'Order from as many artisans as you like — we group your delivery and drop the fee once your basket passes $50.',
    flash: 'FREE',
    ctaLabel: 'Start shopping',
    ctaRoute: '/products',
    secondaryLabel: 'Shipping info',
    secondaryRoute: '/shipping',
    theme: 'delivery',
    visual: 'Delivery across Cambodia',
  },
  {
    id: 'seller',
    eyebrow: 'For Cambodian makers',
    headline: 'Sell your craft to the whole country',
    subtitle:
      'Open a store, list your products and reach buyers in every province. No listing fee while we are in beta.',
    ctaLabel: 'Become a seller',
    ctaRoute: '/become-a-seller',
    secondaryLabel: 'How it works',
    secondaryRoute: '/about',
    theme: 'seller',
    visual: 'Your workshop, online',
  },
];
