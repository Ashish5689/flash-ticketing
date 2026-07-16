import type { Movie, PublicShow, SeatTier, Theater } from './catalog';

export type SeatHold = {
  holdId: string;
  showId: string;
  seats: Array<{ label: string; tier: SeatTier; priceCents: number }>;
  amountCents: number;
  expiresAt: string;
  show?: PublicShow;
};

export type Booking = {
  id: string;
  userId: string;
  showId: string;
  amountCents: number;
  status: 'confirmed' | 'cancelled';
  idempotencyKey: string;
  ticketCode: string;
  createdAt: string;
  movie: Pick<Movie, 'id' | 'title' | 'posterUrl' | 'certificate'>;
  show: { id: string; startsAt: string };
  screen: { id: string; name: string };
  theater: Pick<Theater, 'id' | 'name' | 'city' | 'address'>;
  payment: { provider: string; providerRef: string; status: 'succeeded' | 'failed' };
  seats: Array<{
    id: string;
    seatId: string;
    label: string;
    tier: SeatTier;
    priceCents: number;
  }>;
  ticket: { code: string; qrPayload: string };
};
