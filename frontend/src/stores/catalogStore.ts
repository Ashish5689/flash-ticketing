import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CatalogPreferences = {
  city: string;
  setCity: (city: string) => void;
};

export const useCatalogStore = create<CatalogPreferences>()(
  persist(
    (set) => ({
      city: 'Mumbai',
      setCity: (city) => set({ city }),
    }),
    { name: 'flash-ticketing-catalog-v1' },
  ),
);
