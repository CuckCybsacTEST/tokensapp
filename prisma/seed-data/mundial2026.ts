export type Mundial2026SeedPrize = {
  key: string;
  label: string;
  description: string;
  color: string;
  stockTotal: number;
  priority: number;
  claimWindowHours: number;
};

export type Mundial2026SeedMatch = {
  matchNumber: number;
  group: string;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  startsAtUtc: string;
};

export const MUNDIAL2026_CAMPAIGN_SEED = {
  slug: 'mundial2026',
  name: 'Mundial FIFA 2026',
  timezone: 'America/Lima',
  startsAtUtc: '2026-06-11T19:00:00.000Z',
  endsAtUtc: '2026-07-19T20:00:00.000Z',
} as const;

export const MUNDIAL2026_PRIZE_SEEDS: Mundial2026SeedPrize[] = [
  {
    key: 'mesa-fan-fest',
    label: 'Mesa Fan Fest Mundialista',
    description: 'Reserva preferente para ver un partido con consumo incluido.',
    color: '#0F172A',
    stockTotal: 24,
    priority: 100,
    claimWindowHours: 72,
  },
  {
    key: 'camiseta-oficial',
    label: 'Camiseta Oficial Mundial 2026',
    description: 'Camiseta de seleccion participante del Mundial 2026.',
    color: '#0B5FFF',
    stockTotal: 18,
    priority: 90,
    claimWindowHours: 72,
  },
  {
    key: 'balon-trionda',
    label: 'Balon Adidas Trionda',
    description: 'Balon inspirado en el modelo oficial del torneo.',
    color: '#00A86B',
    stockTotal: 12,
    priority: 80,
    claimWindowHours: 72,
  },
  {
    key: 'consumo-vip-150',
    label: 'Consumo VIP Mundialista S/150',
    description: 'Credito de barra exclusivo para la dinamica del Mundial 2026.',
    color: '#E11D48',
    stockTotal: 90,
    priority: 70,
    claimWindowHours: 72,
  },
  {
    key: 'kit-hinchada',
    label: 'Kit Hinchada 2026',
    description: 'Bufanda, vaso conmemorativo y accesorios para el partido.',
    color: '#F59E0B',
    stockTotal: 180,
    priority: 60,
    claimWindowHours: 72,
  },
  {
    key: 'balde-celebracion',
    label: 'Balde Celebracion',
    description: 'Promo especial de bebidas para compartir durante el partido.',
    color: '#7C3AED',
    stockTotal: 96,
    priority: 50,
    claimWindowHours: 72,
  },
];

export const MUNDIAL2026_FEATURED_TEAMS = [
  'Mexico',
  'Canada',
  'Estados Unidos',
  'Argentina',
  'Brasil',
  'Francia',
  'Espana',
  'Inglaterra',
  'Portugal',
  'Alemania',
] as const;

// Fixture real de la fase de grupos publicado para el Mundial 2026.
export const MUNDIAL2026_GROUP_STAGE_MATCHES: Mundial2026SeedMatch[] = [
  { matchNumber: 1, group: 'A', matchday: 1, homeTeam: 'Mexico', awayTeam: 'Sudafrica', startsAtUtc: '2026-06-11T19:00:00.000Z' },
  { matchNumber: 2, group: 'A', matchday: 1, homeTeam: 'Corea del Sur', awayTeam: 'Republica Checa', startsAtUtc: '2026-06-12T02:00:00.000Z' },
  { matchNumber: 3, group: 'B', matchday: 1, homeTeam: 'Canada', awayTeam: 'Bosnia y Herzegovina', startsAtUtc: '2026-06-12T19:00:00.000Z' },
  { matchNumber: 4, group: 'D', matchday: 1, homeTeam: 'Estados Unidos', awayTeam: 'Paraguay', startsAtUtc: '2026-06-13T01:00:00.000Z' },
  { matchNumber: 5, group: 'C', matchday: 1, homeTeam: 'Haiti', awayTeam: 'Escocia', startsAtUtc: '2026-06-14T01:00:00.000Z' },
  { matchNumber: 6, group: 'D', matchday: 1, homeTeam: 'Australia', awayTeam: 'Turquia', startsAtUtc: '2026-06-14T04:00:00.000Z' },
  { matchNumber: 7, group: 'C', matchday: 1, homeTeam: 'Brasil', awayTeam: 'Marruecos', startsAtUtc: '2026-06-13T22:00:00.000Z' },
  { matchNumber: 8, group: 'B', matchday: 1, homeTeam: 'Catar', awayTeam: 'Suiza', startsAtUtc: '2026-06-13T19:00:00.000Z' },
  { matchNumber: 9, group: 'E', matchday: 1, homeTeam: 'Costa de Marfil', awayTeam: 'Ecuador', startsAtUtc: '2026-06-15T00:00:00.000Z' },
  { matchNumber: 10, group: 'E', matchday: 1, homeTeam: 'Alemania', awayTeam: 'Curazao', startsAtUtc: '2026-06-14T17:00:00.000Z' },
  { matchNumber: 11, group: 'F', matchday: 1, homeTeam: 'Paises Bajos', awayTeam: 'Japon', startsAtUtc: '2026-06-14T20:00:00.000Z' },
  { matchNumber: 12, group: 'F', matchday: 1, homeTeam: 'Suecia', awayTeam: 'Tunez', startsAtUtc: '2026-06-15T01:00:00.000Z' },
  { matchNumber: 13, group: 'H', matchday: 1, homeTeam: 'Arabia Saudita', awayTeam: 'Uruguay', startsAtUtc: '2026-06-15T22:00:00.000Z' },
  { matchNumber: 14, group: 'H', matchday: 1, homeTeam: 'Espana', awayTeam: 'Cabo Verde', startsAtUtc: '2026-06-15T16:00:00.000Z' },
  { matchNumber: 15, group: 'G', matchday: 1, homeTeam: 'Iran', awayTeam: 'Nueva Zelanda', startsAtUtc: '2026-06-16T01:00:00.000Z' },
  { matchNumber: 16, group: 'G', matchday: 1, homeTeam: 'Belgica', awayTeam: 'Egipto', startsAtUtc: '2026-06-15T19:00:00.000Z' },
  { matchNumber: 17, group: 'I', matchday: 1, homeTeam: 'Francia', awayTeam: 'Senegal', startsAtUtc: '2026-06-16T19:00:00.000Z' },
  { matchNumber: 18, group: 'I', matchday: 1, homeTeam: 'Irak', awayTeam: 'Noruega', startsAtUtc: '2026-06-16T22:00:00.000Z' },
  { matchNumber: 19, group: 'J', matchday: 1, homeTeam: 'Argentina', awayTeam: 'Argelia', startsAtUtc: '2026-06-17T01:00:00.000Z' },
  { matchNumber: 20, group: 'J', matchday: 1, homeTeam: 'Austria', awayTeam: 'Jordania', startsAtUtc: '2026-06-17T02:00:00.000Z' },
  { matchNumber: 21, group: 'L', matchday: 1, homeTeam: 'Ghana', awayTeam: 'Panama', startsAtUtc: '2026-06-18T00:00:00.000Z' },
  { matchNumber: 22, group: 'L', matchday: 1, homeTeam: 'Inglaterra', awayTeam: 'Croacia', startsAtUtc: '2026-06-17T20:00:00.000Z' },
  { matchNumber: 23, group: 'K', matchday: 1, homeTeam: 'Portugal', awayTeam: 'RD Congo', startsAtUtc: '2026-06-17T18:00:00.000Z' },
  { matchNumber: 24, group: 'K', matchday: 1, homeTeam: 'Uzbekistan', awayTeam: 'Colombia', startsAtUtc: '2026-06-18T01:00:00.000Z' },
  { matchNumber: 25, group: 'A', matchday: 2, homeTeam: 'Republica Checa', awayTeam: 'Sudafrica', startsAtUtc: '2026-06-18T16:00:00.000Z' },
  { matchNumber: 26, group: 'B', matchday: 2, homeTeam: 'Suiza', awayTeam: 'Bosnia y Herzegovina', startsAtUtc: '2026-06-18T19:00:00.000Z' },
  { matchNumber: 27, group: 'B', matchday: 2, homeTeam: 'Canada', awayTeam: 'Catar', startsAtUtc: '2026-06-18T22:00:00.000Z' },
  { matchNumber: 28, group: 'A', matchday: 2, homeTeam: 'Mexico', awayTeam: 'Corea del Sur', startsAtUtc: '2026-06-19T01:00:00.000Z' },
  { matchNumber: 29, group: 'C', matchday: 2, homeTeam: 'Brasil', awayTeam: 'Haiti', startsAtUtc: '2026-06-20T00:30:00.000Z' },
  { matchNumber: 30, group: 'C', matchday: 2, homeTeam: 'Escocia', awayTeam: 'Marruecos', startsAtUtc: '2026-06-19T22:00:00.000Z' },
  { matchNumber: 31, group: 'D', matchday: 2, homeTeam: 'Turquia', awayTeam: 'Paraguay', startsAtUtc: '2026-06-20T03:00:00.000Z' },
  { matchNumber: 32, group: 'D', matchday: 2, homeTeam: 'Estados Unidos', awayTeam: 'Australia', startsAtUtc: '2026-06-19T19:00:00.000Z' },
  { matchNumber: 33, group: 'E', matchday: 2, homeTeam: 'Alemania', awayTeam: 'Costa de Marfil', startsAtUtc: '2026-06-20T20:00:00.000Z' },
  { matchNumber: 34, group: 'E', matchday: 2, homeTeam: 'Ecuador', awayTeam: 'Curazao', startsAtUtc: '2026-06-20T23:00:00.000Z' },
  { matchNumber: 35, group: 'F', matchday: 2, homeTeam: 'Paises Bajos', awayTeam: 'Suecia', startsAtUtc: '2026-06-20T18:00:00.000Z' },
  { matchNumber: 36, group: 'F', matchday: 2, homeTeam: 'Tunez', awayTeam: 'Japon', startsAtUtc: '2026-06-21T03:00:00.000Z' },
  { matchNumber: 37, group: 'H', matchday: 2, homeTeam: 'Uruguay', awayTeam: 'Cabo Verde', startsAtUtc: '2026-06-21T22:00:00.000Z' },
  { matchNumber: 38, group: 'H', matchday: 2, homeTeam: 'Espana', awayTeam: 'Arabia Saudita', startsAtUtc: '2026-06-21T16:00:00.000Z' },
  { matchNumber: 39, group: 'G', matchday: 2, homeTeam: 'Belgica', awayTeam: 'Iran', startsAtUtc: '2026-06-21T19:00:00.000Z' },
  { matchNumber: 40, group: 'G', matchday: 2, homeTeam: 'Nueva Zelanda', awayTeam: 'Egipto', startsAtUtc: '2026-06-22T01:00:00.000Z' },
  { matchNumber: 41, group: 'I', matchday: 2, homeTeam: 'Noruega', awayTeam: 'Senegal', startsAtUtc: '2026-06-23T00:00:00.000Z' },
  { matchNumber: 42, group: 'I', matchday: 2, homeTeam: 'Francia', awayTeam: 'Irak', startsAtUtc: '2026-06-22T21:00:00.000Z' },
  { matchNumber: 43, group: 'J', matchday: 2, homeTeam: 'Argentina', awayTeam: 'Austria', startsAtUtc: '2026-06-22T19:00:00.000Z' },
  { matchNumber: 44, group: 'J', matchday: 2, homeTeam: 'Jordania', awayTeam: 'Argelia', startsAtUtc: '2026-06-23T01:00:00.000Z' },
  { matchNumber: 45, group: 'L', matchday: 2, homeTeam: 'Inglaterra', awayTeam: 'Ghana', startsAtUtc: '2026-06-23T20:00:00.000Z' },
  { matchNumber: 46, group: 'L', matchday: 2, homeTeam: 'Panama', awayTeam: 'Croacia', startsAtUtc: '2026-06-23T23:00:00.000Z' },
  { matchNumber: 47, group: 'K', matchday: 2, homeTeam: 'Portugal', awayTeam: 'Uzbekistan', startsAtUtc: '2026-06-23T18:00:00.000Z' },
  { matchNumber: 48, group: 'K', matchday: 2, homeTeam: 'Colombia', awayTeam: 'RD Congo', startsAtUtc: '2026-06-24T01:00:00.000Z' },
  { matchNumber: 49, group: 'C', matchday: 3, homeTeam: 'Escocia', awayTeam: 'Brasil', startsAtUtc: '2026-06-24T22:00:00.000Z' },
  { matchNumber: 50, group: 'C', matchday: 3, homeTeam: 'Marruecos', awayTeam: 'Haiti', startsAtUtc: '2026-06-24T22:00:00.000Z' },
  { matchNumber: 51, group: 'B', matchday: 3, homeTeam: 'Suiza', awayTeam: 'Canada', startsAtUtc: '2026-06-24T19:00:00.000Z' },
  { matchNumber: 52, group: 'B', matchday: 3, homeTeam: 'Bosnia y Herzegovina', awayTeam: 'Catar', startsAtUtc: '2026-06-24T19:00:00.000Z' },
  { matchNumber: 53, group: 'A', matchday: 3, homeTeam: 'Republica Checa', awayTeam: 'Mexico', startsAtUtc: '2026-06-25T01:00:00.000Z' },
  { matchNumber: 54, group: 'A', matchday: 3, homeTeam: 'Sudafrica', awayTeam: 'Corea del Sur', startsAtUtc: '2026-06-25T01:00:00.000Z' },
  { matchNumber: 55, group: 'E', matchday: 3, homeTeam: 'Curazao', awayTeam: 'Costa de Marfil', startsAtUtc: '2026-06-25T21:00:00.000Z' },
  { matchNumber: 56, group: 'E', matchday: 3, homeTeam: 'Ecuador', awayTeam: 'Alemania', startsAtUtc: '2026-06-25T20:00:00.000Z' },
  { matchNumber: 57, group: 'F', matchday: 3, homeTeam: 'Japon', awayTeam: 'Suecia', startsAtUtc: '2026-06-26T00:00:00.000Z' },
  { matchNumber: 58, group: 'F', matchday: 3, homeTeam: 'Tunez', awayTeam: 'Paises Bajos', startsAtUtc: '2026-06-25T23:00:00.000Z' },
  { matchNumber: 59, group: 'D', matchday: 3, homeTeam: 'Turquia', awayTeam: 'Estados Unidos', startsAtUtc: '2026-06-26T02:00:00.000Z' },
  { matchNumber: 60, group: 'D', matchday: 3, homeTeam: 'Paraguay', awayTeam: 'Australia', startsAtUtc: '2026-06-26T02:00:00.000Z' },
  { matchNumber: 61, group: 'I', matchday: 3, homeTeam: 'Noruega', awayTeam: 'Francia', startsAtUtc: '2026-06-26T19:00:00.000Z' },
  { matchNumber: 62, group: 'I', matchday: 3, homeTeam: 'Senegal', awayTeam: 'Irak', startsAtUtc: '2026-06-26T19:00:00.000Z' },
  { matchNumber: 63, group: 'G', matchday: 3, homeTeam: 'Egipto', awayTeam: 'Iran', startsAtUtc: '2026-06-27T03:00:00.000Z' },
  { matchNumber: 64, group: 'G', matchday: 3, homeTeam: 'Nueva Zelanda', awayTeam: 'Belgica', startsAtUtc: '2026-06-27T03:00:00.000Z' },
  { matchNumber: 65, group: 'H', matchday: 3, homeTeam: 'Cabo Verde', awayTeam: 'Arabia Saudita', startsAtUtc: '2026-06-26T23:00:00.000Z' },
  { matchNumber: 66, group: 'H', matchday: 3, homeTeam: 'Uruguay', awayTeam: 'Espana', startsAtUtc: '2026-06-26T23:00:00.000Z' },
  { matchNumber: 67, group: 'L', matchday: 3, homeTeam: 'Panama', awayTeam: 'Inglaterra', startsAtUtc: '2026-06-27T21:00:00.000Z' },
  { matchNumber: 68, group: 'L', matchday: 3, homeTeam: 'Croacia', awayTeam: 'Ghana', startsAtUtc: '2026-06-27T21:00:00.000Z' },
  { matchNumber: 69, group: 'J', matchday: 3, homeTeam: 'Argelia', awayTeam: 'Austria', startsAtUtc: '2026-06-28T04:00:00.000Z' },
  { matchNumber: 70, group: 'J', matchday: 3, homeTeam: 'Jordania', awayTeam: 'Argentina', startsAtUtc: '2026-06-28T02:00:00.000Z' },
  { matchNumber: 71, group: 'K', matchday: 3, homeTeam: 'Colombia', awayTeam: 'Portugal', startsAtUtc: '2026-06-28T01:30:00.000Z' },
  { matchNumber: 72, group: 'K', matchday: 3, homeTeam: 'RD Congo', awayTeam: 'Uzbekistan', startsAtUtc: '2026-06-27T23:30:00.000Z' },
];
