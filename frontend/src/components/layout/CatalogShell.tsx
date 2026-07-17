import { useEffect, useState, type PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

import { getShowCities } from '../../lib/catalog-api';
import { useCatalogStore } from '../../stores/catalogStore';
import { Button, Modal } from '../ui';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function CatalogShell({ children }: PropsWithChildren) {
  const city = useCatalogStore((state) => state.city);
  const { pathname } = useLocation();
  const setCity = useCatalogStore((state) => state.setCity);
  const [draftCity, setDraftCity] = useState(city);
  const [cityOpen, setCityOpen] = useState(false);
  const citiesQuery = useQuery({ queryKey: ['show-cities'], queryFn: getShowCities });
  const cities = citiesQuery.data?.length ? citiesQuery.data : ['Mumbai', 'Bengaluru', 'Delhi NCR'];

  useEffect(() => setDraftCity(city), [city]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  const close = () => {
    setDraftCity(city);
    setCityOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onCityClick={() => setCityOpen(true)} />
      {children}
      <Footer />
      <Modal
        description="Choose where you want to discover movies, events, and available showtimes."
        footer={
          <div className="flex justify-end gap-3">
            <Button onClick={close} variant="ghost">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setCity(draftCity);
                setCityOpen(false);
              }}
            >
              Show listings in {draftCity}
            </Button>
          </div>
        }
        onClose={close}
        open={cityOpen}
        title="Choose your city"
      >
        <label className="grid gap-2 text-sm font-semibold" htmlFor="catalog-city">
          City
          <select
            className="min-h-12 rounded-lg border border-border bg-surface px-3"
            id="catalog-city"
            onChange={(event) => setDraftCity(event.target.value)}
            value={draftCity}
          >
            {cities.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </Modal>
    </div>
  );
}
