declare module "@zxing/browser" {
  export class BrowserMultiFormatReader {
    decodeFromConstraints(
      constraints: MediaStreamConstraints,
      video: HTMLVideoElement,
      callback: (result: { getText(): string } | null, err: unknown) => void
    ): Promise<void>;
    reset(): void;
  }
}
