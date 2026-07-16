export type MovieStatus = 'draft' | 'published' | 'archived';
export type CatalogContentType = 'movie' | 'event';

export type Movie = {
  id: string;
  title: string;
  contentType: CatalogContentType;
  description: string;
  posterUrl: string;
  bannerUrl: string | null;
  genres: string[];
  languages: string[];
  durationMin: number;
  certificate: string;
  rating: number;
  releaseDate: string;
  status: MovieStatus;
  createdAt: string;
  updatedAt: string;
};

export type MovieInput = Omit<Movie, 'id' | 'createdAt' | 'updatedAt'> & {
  posterAssetKey?: string | null;
  bannerAssetKey?: string | null;
};

export type MediaKind = 'poster' | 'banner';
export type MediaAsset = {
  url: string;
  key: string;
  width: number;
  height: number;
  contentType: 'image/webp';
};

export type OrganizerApplicationStatus = 'pending' | 'approved' | 'rejected';
export type OrganizerApplication = {
  id: string;
  userId: string;
  businessName: string;
  phone: string;
  documents: string[];
  status: OrganizerApplicationStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
};

export type SeatTier = 'CLASSIC' | 'PRIME' | 'RECLINER';
export type ScreenLayout = {
  rows: Array<{ label: string; seatCount: number; tier: SeatTier }>;
  aisleAfterColumns: number[];
};

export type Screen = {
  id: string;
  theaterId: string;
  name: string;
  layout: ScreenLayout;
  createdAt: string;
  updatedAt: string;
};

export type Theater = {
  id: string;
  organizerId: string;
  name: string;
  city: string;
  address: string;
  status: 'active' | 'inactive';
  screens: Screen[];
  createdAt: string;
  updatedAt: string;
};

export type ShowStatus = 'scheduled' | 'onsale' | 'closed' | 'cancelled';
export type ShowPrice = { tier: SeatTier; priceCents: number };
export type OrganizerShow = {
  id: string;
  movieId: string;
  screenId: string;
  startsAt: string;
  status: ShowStatus;
  createdAt: string;
  updatedAt: string;
  movie: Pick<Movie, 'id' | 'title' | 'posterUrl'>;
  screen: Pick<Screen, 'id' | 'name'>;
  theater: Pick<Theater, 'id' | 'name' | 'city'>;
  pricing: ShowPrice[];
};

export type ShowtimeShow = {
  id: string;
  movieId: string;
  screenId: string;
  startsAt: string;
  status: 'onsale';
  screen: Pick<Screen, 'id' | 'name'>;
  pricing: ShowPrice[];
};

export type MovieShowtimes = {
  city: string;
  date: string;
  theaters: Array<{
    theater: Pick<Theater, 'id' | 'name' | 'city' | 'address'>;
    shows: ShowtimeShow[];
  }>;
};

export type PublicShow = {
  id: string;
  movieId: string;
  screenId: string;
  startsAt: string;
  status: 'onsale';
  movie: Pick<Movie, 'id' | 'title' | 'posterUrl' | 'durationMin' | 'certificate'>;
  screen: Pick<Screen, 'id' | 'name'>;
  theater: Pick<Theater, 'id' | 'name' | 'city' | 'address'>;
  pricing: ShowPrice[];
};

export type ShowSeat = {
  id: string;
  label: string;
  number: number;
  tier: SeatTier;
  status: 'available' | 'held' | 'sold';
};

export type ShowSeatMap = {
  show: PublicShow;
  layout: {
    aisleAfterColumns: number[];
    rows: Array<{ label: string; tier: SeatTier; seats: ShowSeat[] }>;
  };
};
