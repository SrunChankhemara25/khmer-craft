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
  secondaryParams?: Record<string, string>;
  /** Maps to a theme class in the slider's stylesheet. */
  theme: 'brand' | 'sale' | 'delivery' | 'seller';
  /** Placeholder caption for the slide visual. */
  visual: string;
  /** Optional muted campaign video shown in place of the decorative visual. */
  video?: string;
  videoWebm?: string;
  poster?: string;
  image?: string;
  sponsoredLabel?: string;
  offer?: string;
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
    id: 'mekong-market',
    eyebrow: 'This week at Mekong Fresh Market',
    headline: 'Fill your basket with everyday essentials',
    subtitle:
      'Fresh groceries, pantry favourites and household essentials from a trusted Cambodian store—all in one order.',
    ctaLabel: 'Browse groceries',
    ctaRoute: '/categories/food-groceries',
    secondaryLabel: 'Explore stores',
    secondaryRoute: '/stores',
    theme: 'brand',
    visual: 'Everything your home needs',
    image: '/assets/ads/premium-supermarket-landscape.png',
    sponsoredLabel: 'Curated by KhmerCraft · Groceries',
    offer: 'Fresh picks for the whole home',
  },
  {
    id: 'marketplace-week',
    eyebrow: 'KhmerCraft marketplace week',
    headline: 'Selected offers from local stores',
    subtitle:
      'Discover featured products across fashion, beauty, homeware, children’s products and Cambodian-made gifts.',
    ctaLabel: 'Shop featured products',
    ctaRoute: '/products',
    ctaParams: { sort: 'featured' },
    secondaryLabel: 'Browse categories',
    secondaryRoute: '/categories',
    theme: 'sale',
    visual: 'Marketplace offers',
    image: '/assets/ads/multi-category-store-landscape.png',
    sponsoredLabel: 'Curated by KhmerCraft · Marketplace edit',
    offer: 'Special finds from trusted stores',
  },
  {
    id: 'electronics',
    eyebrow: 'Phones, computers and accessories',
    headline: 'Technology for work and everyday life',
    subtitle:
      'Discover smartphones, computers, audio, appliances and useful accessories from marketplace sellers.',
    ctaLabel: 'Explore electronics',
    ctaRoute: '/categories/electronics',
    secondaryLabel: 'See all categories',
    secondaryRoute: '/categories',
    theme: 'delivery',
    visual: 'Everyday technology',
    image: '/assets/ads/electronics-campaign-landscape.png',
    sponsoredLabel: 'Curated by KhmerCraft · Electronics',
    offer: 'Explore useful everyday technology',
  },
];
