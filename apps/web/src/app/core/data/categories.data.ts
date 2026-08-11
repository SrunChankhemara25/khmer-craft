import { Category } from '../catalog/catalog.models';

/** Replace with `GET /api/categories` when the endpoint exists. */
export const CATEGORIES: Category[] = [
  {
    slug: 'handmade-crafts',
    name: 'Handmade Crafts',
    description: 'Souvenirs and keepsakes made by hand',
    icon: 'sparkles',
  },
  {
    slug: 'pottery',
    name: 'Pottery',
    description: 'Wheel-thrown clay from Kampong Chhnang',
    icon: 'award',
  },
  {
    slug: 'weaving',
    name: 'Weaving',
    description: 'Silk krama, scarves and textiles',
    icon: 'grid',
  },
  {
    slug: 'palm-sugar',
    name: 'Palm Sugar',
    description: 'Traditional sugar from Kampong Speu',
    icon: 'leaf',
  },
  {
    slug: 'rice-products',
    name: 'Rice Products',
    description: 'Jasmine and organic rice from Battambang',
    icon: 'package',
  },
  {
    slug: 'local-food',
    name: 'Local Food',
    description: 'Pantry staples and Khmer flavours',
    icon: 'store',
  },
  {
    slug: 'bamboo-products',
    name: 'Bamboo Products',
    description: 'Baskets, trays and homeware',
    icon: 'box',
  },
  {
    slug: 'dried-fruits',
    name: 'Dried Fruits',
    description: 'Sun-dried mango, banana and jackfruit',
    icon: 'gift',
  },
];

export const findCategory = (slug: string): Category | undefined =>
  CATEGORIES.find((category) => category.slug === slug);
