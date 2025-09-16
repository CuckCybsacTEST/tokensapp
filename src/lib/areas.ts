export const ALLOWED_AREAS = [
  'Barra',
  'Mozos',
  'Seguridad',
  'Animación',
  'DJs',
  'Multimedia',
  'Otros',
] as const;

export type Area = typeof ALLOWED_AREAS[number];

export function isValidArea(value: unknown): value is Area {
  return typeof value === 'string' && ALLOWED_AREAS.includes(value as Area);
}
