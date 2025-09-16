// Utilidad para crear un stream ZIP (nivel compresión 9) listo para append y streaming.
import archiver from "archiver";
import { PassThrough } from "stream";

export function createZipStream() {
  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new PassThrough();
  archive.on("warning", (err) => {
    // eslint-disable-next-line no-console
    console.warn("zip warning", err);
  });
  archive.on("error", (err) => {
    stream.emit("error", err);
  });
  archive.pipe(stream);
  return { archive, stream };
}
