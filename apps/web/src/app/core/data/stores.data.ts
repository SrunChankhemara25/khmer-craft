import { Store } from '../catalog/catalog.models';

export const STORES: Store[] = [];

export const findStore = (id: string): Store | undefined =>
  STORES.find((store) => store.id === id);
