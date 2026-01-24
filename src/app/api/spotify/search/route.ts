import { NextRequest, NextResponse } from "next/server";

// Cache simple en memoria para reducir llamadas
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

interface iTunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string;
  artworkUrl60: string;
  previewUrl: string;
  trackTimeMillis: number;
  trackViewUrl: string;
}

interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesTrack[];
}

// GET - Buscar canciones usando iTunes API (no requiere credenciales)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { ok: false, error: "Query de búsqueda requerida (mínimo 2 caracteres)" },
        { status: 400 }
      );
    }

    const cacheKey = `itunes_${query.toLowerCase()}_${limit}`;
    
    // Verificar cache
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ok: true,
        tracks: cached.data,
        source: "cache",
      });
    }

    // Buscar en iTunes (no requiere API key)
    const searchUrl = new URL("https://itunes.apple.com/search");
    searchUrl.searchParams.set("term", query);
    searchUrl.searchParams.set("media", "music");
    searchUrl.searchParams.set("entity", "song");
    searchUrl.searchParams.set("limit", limit.toString());
    searchUrl.searchParams.set("country", "PE"); // Perú

    const response = await fetch(searchUrl.toString(), {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("iTunes search failed:", response.status);
      return NextResponse.json({
        ok: true,
        tracks: [],
        message: "Error al buscar canciones. Intenta de nuevo.",
      });
    }

    const data: iTunesSearchResponse = await response.json();

    // Transformar respuesta al formato esperado por el frontend
    const tracks = data.results.map((track) => ({
      id: track.trackId.toString(),
      name: track.trackName,
      uri: `itunes:track:${track.trackId}`,
      duration: Math.round((track.trackTimeMillis || 0) / 1000),
      durationFormatted: formatDuration(track.trackTimeMillis || 0),
      previewUrl: track.previewUrl || null,
      artist: track.artistName,
      album: track.collectionName,
      // Obtener imagen de mayor resolución reemplazando 100x100 por 600x600
      albumImage: track.artworkUrl100?.replace("100x100", "600x600") || null,
      albumImageSmall: track.artworkUrl60 || track.artworkUrl100 || null,
      trackUrl: track.trackViewUrl,
    }));

    // Guardar en cache
    searchCache.set(cacheKey, { data: tracks, timestamp: Date.now() });

    // Limpiar cache antiguo periódicamente
    if (searchCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of searchCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          searchCache.delete(key);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      tracks,
      total: data.resultCount,
      source: "itunes",
    });

  } catch (error) {
    console.error("Error searching iTunes:", error);
    return NextResponse.json(
      { ok: false, error: "Error al buscar canciones" },
      { status: 500 }
    );
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
