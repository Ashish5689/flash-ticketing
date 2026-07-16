import { useCallback, useState } from 'react';

import { Footer, Navbar } from '../components/layout';
import { Badge, Button, Card, Input, Modal, Spinner } from '../components/ui';

export function ThemeDemo() {
  const [modalOpen, setModalOpen] = useState(false);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const scrollToComponents = () => {
    document.querySelector('#components')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col" id="top">
      <Navbar onCityClick={() => setModalOpen(true)} />
      <main className="flex-1">
        <section className="bg-surface">
          <div className="mx-auto grid max-w-content gap-10 px-5 py-14 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-10">
            <div className="max-w-xl">
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Your next great story starts here
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
                A production-ready foundation for discovering and booking movies, events, plays, and
                more.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={scrollToComponents} size="lg">
                  Explore movies
                </Button>
                <Button onClick={scrollToComponents} size="lg" variant="outline">
                  View components
                </Button>
              </div>
            </div>
            <CinemaPreview />
          </div>
        </section>

        <section className="px-5 py-14 sm:px-8 lg:py-10" id="components">
          <div className="mx-auto max-w-content overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-6 py-6 sm:px-8">
              <h2 className="text-2xl font-bold tracking-tight">Built for every booking moment</h2>
              <p className="mt-2 text-sm text-muted">
                Reusable primitives powered by semantic theme tokens.
              </p>
            </div>
            <div className="grid lg:grid-cols-12">
              <Showcase title="Button variants" className="lg:col-span-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button size="sm">Primary</Button>
                  <Button size="sm" variant="outline">
                    Outline
                  </Button>
                  <Button disabled size="sm">
                    Disabled
                  </Button>
                  <Button disabled size="sm" variant="outline">
                    Disabled
                  </Button>
                </div>
              </Showcase>
              <Showcase title="Input" className="lg:col-span-3">
                <Input
                  label="Search"
                  leadingIcon={<SearchIcon />}
                  placeholder="Search movies, events, plays…"
                />
              </Showcase>
              <Showcase title="Badge states" className="lg:col-span-2">
                <div className="flex flex-col items-start gap-3">
                  <Badge variant="nowShowing">Now showing</Badge>
                  <Badge variant="comingSoon">Coming soon</Badge>
                </div>
              </Showcase>
              <Showcase title="Card" className="lg:col-span-2">
                <Card className="p-4">
                  <div className="grid aspect-video place-items-center rounded bg-surface-subtle text-muted">
                    <TicketIcon />
                  </div>
                  <h3 className="mt-4 font-semibold">Sample Movie</h3>
                  <p className="mt-1 text-sm text-muted">Drama · 2h 15m</p>
                </Card>
              </Showcase>
              <Showcase title="Modal & spinner" className="lg:col-span-2">
                <div className="grid gap-5">
                  <Button onClick={() => setModalOpen(true)} size="sm" variant="outline">
                    Open modal
                  </Button>
                  <Spinner />
                </div>
              </Showcase>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      <Modal
        description="This helps us show events and movies near you."
        footer={
          <>
            <Button onClick={closeModal} variant="outline">
              Cancel
            </Button>
            <Button onClick={closeModal}>Confirm</Button>
          </>
        }
        onClose={closeModal}
        open={modalOpen}
        title="Confirm your city"
      >
        <label className="grid gap-2 text-sm font-medium" htmlFor="city-select">
          City
          <select
            className="min-h-11 rounded border border-border bg-surface px-3 text-sm text-foreground hover:border-muted focus:border-focus"
            defaultValue="Mumbai"
            id="city-select"
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

function Showcase({
  title,
  className,
  children,
}: {
  title: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-b border-border p-6 last:border-b-0 lg:border-b-0 lg:border-r ${className}`}
    >
      <h3 className="mb-5 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function CinemaPreview() {
  return (
    <div
      className="overflow-hidden rounded-lg bg-surface-dark shadow-md"
      aria-label="Cinema preview"
    >
      <div className="grid aspect-video place-items-center text-brand-contrast sm:aspect-auto sm:h-72">
        <svg aria-hidden="true" className="size-24" fill="none" viewBox="0 0 96 96">
          <path
            d="M24 36h48a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8H24a8 8 0 0 1-8-8V44a8 8 0 0 1 8-8Z"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="m42 50 18 11-18 11V50Z"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <path
            d="m19 34 53-16a5 5 0 0 1 6 3l2 7-61 18-2-7a5 5 0 0 1 2-5Z"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path d="m31 31 9 10m8-15 9 10m8-15 9 10" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
      <div className="flex items-center gap-4 bg-foreground px-5 py-4 text-brand-contrast">
        <PlayIcon />
        <div className="h-1 flex-1 overflow-hidden rounded bg-muted">
          <div className="h-full w-2/5 bg-brand" />
        </div>
        <span className="text-xs text-brand-contrast">00:45 / 01:48</span>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg aria-hidden="true" className="size-8" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6V7Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path d="M12 8v2m0 4v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" className="size-5 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="m8 5 11 7-11 7V5Z" fill="currentColor" />
    </svg>
  );
}
