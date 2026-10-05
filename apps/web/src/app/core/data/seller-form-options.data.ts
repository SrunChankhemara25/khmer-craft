import { CATEGORIES } from './categories.data';

/**
 * Shared choices for seller onboarding and the seller workspace. Keeping them
 * here prevents a store from being created under one name and edited under a
 * different, incomplete list later.
 */
export const SELLER_CATEGORY_OPTIONS = CATEGORIES.map((category) => category.name);

export const SELLER_LOCATION_OPTIONS = [
  'Phnom Penh',
  'Siem Reap',
  'Battambang',
  'Kampong Cham',
  'Kampong Speu',
  'Kandal',
  'Kampot',
  'Takeo',
  'Other province',
] as const;
