import { Category } from '../catalog/catalog.models';

/**
 * The category tree.
 *
 * Two levels: a main category people browse into, and sub-categories that
 * narrow it down. Sub-category names must match the `subcategory` values the
 * API stores on products — the slug is derived, so "Bowls & Plates" is
 * reachable as `bowls-plates`.
 *
 * Some sub-categories have no products yet. That is deliberate: the tree
 * describes where stock will live, and an empty one shows its empty state
 * rather than being hidden, so a seller can see the gap.
 *
 * TODO(api): there is no categories endpoint; this is the source of truth for
 * the tree while the API only stores category/subcategory as free text.
 */
export const CATEGORIES: Category[] = [
  {
    slug: 'handmade-crafts',
    name: 'Handmade Crafts',
    description: 'Souvenirs and keepsakes made by hand',
    tagline:
      'Pieces made one at a time by Cambodian artisans — no two quite alike.',
    icon: 'sparkles',
    banner: 'Artisan at work',
    subcategories: [
      { slug: 'kitchen-utensils', name: 'Kitchen & Utensils' },
      { slug: 'candles-decor', name: 'Candles & Decor' },
      { slug: 'souvenirs', name: 'Souvenirs' },
    ],
  },
  {
    slug: 'pottery',
    name: 'Pottery',
    description: 'Wheel-thrown clay from Kampong Chhnang',
    tagline:
      'Thrown, glazed and fired by hand. Small variations are the mark of the maker.',
    icon: 'award',
    banner: 'Potter at the wheel',
    subcategories: [
      { slug: 'bowls-plates', name: 'Bowls & Plates' },
      { slug: 'cups-mugs', name: 'Cups & Mugs' },
      { slug: 'storage-jars', name: 'Storage Jars' },
      { slug: 'vases', name: 'Vases' },
    ],
  },
  {
    slug: 'weaving',
    name: 'Weaving',
    description: 'Silk krama, scarves and textiles',
    tagline:
      'Silk and cotton woven on wooden looms, dyed with natural pigments.',
    icon: 'grid',
    banner: 'Silk on the loom',
    subcategories: [
      { slug: 'scarves', name: 'Scarves' },
      { slug: 'table-linen', name: 'Table Linen' },
      { slug: 'bags-pouches', name: 'Bags & Pouches' },
    ],
  },
  {
    slug: 'palm-sugar',
    name: 'Palm Sugar',
    description: 'Traditional sugar from Kampong Speu',
    tagline:
      'Harvested at dawn and boiled the same morning, the way it has always been done.',
    icon: 'leaf',
    banner: 'Sugar palm harvest',
    subcategories: [
      { slug: 'blocks-paste', name: 'Blocks & Paste' },
      { slug: 'granulated', name: 'Granulated' },
      { slug: 'syrup', name: 'Syrup' },
    ],
  },
  {
    slug: 'rice-products',
    name: 'Rice Products',
    description: 'Jasmine and organic rice from Battambang',
    tagline: 'Grown on the Sangke river plain and milled to order.',
    icon: 'package',
    banner: 'Rice fields, Battambang',
    subcategories: [
      { slug: 'white-rice', name: 'White Rice' },
      { slug: 'brown-red-rice', name: 'Brown & Red Rice' },
      { slug: 'sticky-rice', name: 'Sticky Rice' },
    ],
  },
  {
    slug: 'local-food',
    name: 'Local Food',
    description: 'Pantry staples and Khmer flavours',
    tagline: 'The jars and packets that make a Cambodian kitchen work.',
    icon: 'store',
    banner: 'Khmer pantry',
    subcategories: [
      { slug: 'spices-pepper', name: 'Spices & Pepper' },
      { slug: 'sweets-snacks', name: 'Sweets & Snacks' },
      { slug: 'sauces-pastes', name: 'Sauces & Pastes' },
    ],
  },
  {
    slug: 'bamboo-products',
    name: 'Bamboo Products',
    description: 'Baskets, trays and homeware',
    tagline: 'Woven from locally cut culms, pinned without glue.',
    icon: 'box',
    banner: 'Bamboo weaving, Takeo',
    subcategories: [
      { slug: 'baskets', name: 'Baskets' },
      { slug: 'kitchen-steamers', name: 'Kitchen & Steamers' },
      { slug: 'bowls-trays', name: 'Bowls & Trays' },
    ],
  },
  {
    slug: 'dried-fruits',
    name: 'Dried Fruits',
    description: 'Sun-dried mango, banana and jackfruit',
    tagline: 'Dried slowly in the sun, with nothing added.',
    icon: 'gift',
    banner: 'Fruit drying in the sun',
    subcategories: [
      { slug: 'dried-mango', name: 'Dried Mango' },
      { slug: 'chips-crisps', name: 'Chips & Crisps' },
      { slug: 'mixed-fruit', name: 'Mixed Fruit' },
    ],
  },
];

export const findCategory = (slug: string): Category | undefined =>
  CATEGORIES.find((category) => category.slug === slug);

/** Slug for a stored subcategory name, e.g. "Bowls & Plates" -> bowls-plates. */
export const subcategorySlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
