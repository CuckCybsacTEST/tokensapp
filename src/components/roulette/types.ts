export interface RouletteElement {
  label: string;
  color: string;
  prizeId: string;
  key?: string;
  labelLines?: string[]; // <-- Propiedad opcional para compatibilidad con el backend
}
