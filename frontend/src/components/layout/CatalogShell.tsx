import { useState, type PropsWithChildren } from 'react';

import { Button, Modal } from '../ui';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function CatalogShell({ children }: PropsWithChildren) {
  const [cityOpen, setCityOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onCityClick={() => setCityOpen(true)} />
      {children}
      <Footer />
      <Modal
        description="Catalog availability will be connected to city-specific showtimes in Phase 3."
        footer={<Button onClick={() => setCityOpen(false)}>Confirm Mumbai</Button>}
        onClose={() => setCityOpen(false)}
        open={cityOpen}
        title="Choose your city"
      >
        <label className="grid gap-2 text-sm font-medium" htmlFor="catalog-city">
          City
          <select
            className="min-h-11 rounded border border-border bg-surface px-3"
            defaultValue="Mumbai"
            id="catalog-city"
          >
            <option>Mumbai</option>
            <option>Bengaluru</option>
            <option>Delhi NCR</option>
          </select>
        </label>
      </Modal>
    </div>
  );
}
