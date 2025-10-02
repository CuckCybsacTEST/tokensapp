// Minimal ambient typings for 'luxon' to satisfy TS in this project setup.
// Note: Luxon v3 ships its own types, but the current TS config may not resolve them correctly.
// This file can be removed if tsconfig/moduleResolution is adjusted to pick up Luxon's bundled d.ts.
declare module "luxon" {
  export class DateTime {
    static fromISO(s: string, opts?: any): DateTime;
    static fromJSDate(d: Date, opts?: any): DateTime; // added to satisfy legacy references
    static now(): DateTime;
    setZone(zone: string, opts?: any): DateTime;
    startOf(unit: string): DateTime;
    endOf(unit: string): DateTime;
    plus(values: Record<string, number>): DateTime; // optional chaining support
    set(values: Record<string, number>): DateTime; // optional chaining support
    toJSDate(): Date;
    toISO(): string | null;
    get isValid(): boolean;
  }
}
