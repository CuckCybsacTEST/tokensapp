"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Music,
  Search,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Star,
  User,
  MessageCircle,
  ChevronDown,
  Play,
  Pause,
  X,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration: number;
  durationFormatted: string;
  previewUrl: string | null;
  artist: string;
  album: string;
  albumImage: string | null;
  albumImageSmall: string | null;
}

interface QueueInfo {
  nowPlaying: {
    songTitle: string;
    artist: string;
    albumImage: string | null;
    requesterName: string;
  } | null;
  stats: {
    totalInQueue: number;
    estimatedWaitMinutes: number;
  };
  userPosition: number | null;
}

type OrderType = "FREE" | "PREMIUM" | "VIP";

export default function MusicRequestPage() {
  // Form state
  const [requesterName, setRequesterName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [manualSong, setManualSong] = useState("");
  const [manualArtist, setManualArtist] = useState("");
  const [orderType, setOrderType] = useState<OrderType>("FREE");
  
  // UI state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [queueInfo, setQueueInfo] = useState<QueueInfo | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [config, setConfig] = useState<{
    premiumPrice: number;
    vipPrice: number;
    systemEnabled: boolean;
  } | null>(null);

  const searchParams = useSearchParams();
  const tableId = searchParams?.get("table") ?? null;
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cargar configuración del sistema
  useEffect(() => {
    fetch("/api/admin/music-system/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setConfig(data.config);
        }
      })
      .catch(console.error);
  }, []);

  // Cargar estado de la cola
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const url = orderId 
          ? `/api/music-orders/queue?orderId=${orderId}`
          : "/api/music-orders/queue";
        const res = await fetch(url);
        const data = await res.json();
        if (data.ok) {
          setQueueInfo(data);
        }
      } catch (error) {
        console.error("Error fetching queue:", error);
      }
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 10000); // Actualizar cada 10s
    return () => clearInterval(interval);
  }, [orderId]);

  // Búsqueda en Spotify con debounce
  const searchSpotify = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&limit=8`);
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.tracks);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error searching:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchSpotify(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchSpotify]);

  // Manejar preview de audio
  const togglePreview = (previewUrl: string | null) => {
    if (!previewUrl) return;

    if (playingPreview === previewUrl) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.play();
      audioRef.current.onended = () => setPlayingPreview(null);
      setPlayingPreview(previewUrl);
    }
  };

  // Generar fingerprint del dispositivo (simplificado)
  const getDeviceFingerprint = (): string => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("fingerprint", 2, 2);
    }
    const data = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|");
    
    // Simple hash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };

  // Enviar pedido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requesterName.trim()) {
      setSubmitError("Por favor ingresa tu nombre");
      return;
    }

    const songTitle = selectedTrack?.name || manualSong;
    const artist = selectedTrack?.artist || manualArtist;

    if (!songTitle || !artist) {
      setSubmitError("Por favor selecciona o ingresa una canción");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/music-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: requesterName.trim(),
          whatsapp: whatsapp.trim() || null,
          songTitle,
          artist,
          spotifyId: selectedTrack?.id || null,
          spotifyUri: selectedTrack?.uri || null,
          albumName: selectedTrack?.album || null,
          albumImage: selectedTrack?.albumImage || null,
          duration: selectedTrack?.duration || null,
          previewUrl: selectedTrack?.previewUrl || null,
          orderType,
          tableId: tableId || null,
          deviceFingerprint: getDeviceFingerprint(),
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setSubmitError(data.error);
        setRetryAfter(data.retryAfter);
        setRequiresCaptcha(data.requiresCaptcha);
        return;
      }

      if (!data.ok) {
        setSubmitError(data.error);
        return;
      }

      setOrderId(data.order.id);
      setSubmitSuccess(true);
      setRequiresCaptcha(data.requiresCaptcha);

    } catch (error) {
      console.error("Error submitting:", error);
      setSubmitError("Error al enviar pedido. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form para nuevo pedido
  const handleNewRequest = () => {
    setSubmitSuccess(false);
    setSelectedTrack(null);
    setManualSong("");
    setManualArtist("");
    setSearchQuery("");
    setOrderId(null);
    setRetryAfter(null);
  };

  // Contador de retry
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      const timer = setInterval(() => {
        setRetryAfter((prev) => (prev && prev > 0 ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  if (config && !config.systemEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <Music className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl font-bold mb-2">Sistema Temporalmente Deshabilitado</h1>
          <p className="text-gray-400">El DJ no está aceptando pedidos en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">Go Lounge! Jukebox</h1>
              <p className="text-xs text-gray-400">Pide tu canción favorita</p>
            </div>
          </div>
          {queueInfo && (
            <div className="text-right">
              <div className="text-sm text-gray-400">En cola</div>
              <div className="text-white font-bold">{queueInfo.stats.totalInQueue}</div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Now Playing */}
        {queueInfo?.nowPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl border border-white/10"
          >
            <div className="flex items-center gap-2 text-purple-400 text-sm mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Reproduciendo ahora
            </div>
            <div className="flex items-center gap-3">
              {queueInfo.nowPlaying.albumImage && (
                <img
                  src={queueInfo.nowPlaying.albumImage}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">
                  {queueInfo.nowPlaying.songTitle}
                </div>
                <div className="text-gray-400 text-sm truncate">
                  {queueInfo.nowPlaying.artist}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {submitSuccess ? (
            /* Success Screen */
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">¡Pedido Enviado!</h2>
              <p className="text-gray-400 mb-6">
                {orderType === "FREE"
                  ? "El DJ revisará tu pedido pronto"
                  : "Tu canción está en la cola prioritaria"}
              </p>

              {queueInfo && queueInfo.userPosition !== null && (
                <div className="bg-white/5 rounded-2xl p-6 mb-6">
                  <div className="text-gray-400 text-sm mb-1">Tu posición en cola</div>
                  <div className="text-4xl font-bold text-purple-400">
                    #{queueInfo.userPosition}
                  </div>
                  <div className="text-gray-500 text-sm mt-2">
                    ~{Math.round(queueInfo.userPosition * 3.5)} min de espera
                  </div>
                </div>
              )}

              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  {selectedTrack?.albumImage && (
                    <img
                      src={selectedTrack.albumImage}
                      alt=""
                      className="w-14 h-14 rounded-lg"
                    />
                  )}
                  <div className="text-left">
                    <div className="text-white font-medium">
                      {selectedTrack?.name || manualSong}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {selectedTrack?.artist || manualArtist}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNewRequest}
                className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
              >
                Pedir otra canción
              </button>
            </motion.div>
          ) : (
            /* Request Form */
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Name Input */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Tu nombre *
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                  maxLength={100}
                />
              </div>

              {/* WhatsApp (opcional) */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="999 999 999"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  maxLength={15}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Te notificaremos cuando reproduzcan tu canción
                </p>
              </div>

              {/* Song Search */}
              <div className="relative">
                <label className="block text-sm text-gray-400 mb-2">
                  <Music className="w-4 h-4 inline mr-2" />
                  Buscar canción *
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Busca por título o artista..."
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={!!selectedTrack}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-500 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                <AnimatePresence>
                  {showResults && searchResults.length > 0 && !selectedTrack && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 mt-2 w-full bg-gray-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto"
                    >
                      {searchResults.map((track) => (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => {
                            setSelectedTrack(track);
                            setShowResults(false);
                            setSearchQuery("");
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                        >
                          {track.albumImageSmall && (
                            <img
                              src={track.albumImageSmall}
                              alt=""
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {track.name}
                            </div>
                            <div className="text-gray-400 text-sm truncate">
                              {track.artist}
                            </div>
                          </div>
                          <div className="text-gray-500 text-xs">
                            {track.durationFormatted}
                          </div>
                          {track.previewUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePreview(track.previewUrl);
                              }}
                              className="p-2 hover:bg-white/10 rounded-full"
                            >
                              {playingPreview === track.previewUrl ? (
                                <Pause className="w-4 h-4 text-purple-400" />
                              ) : (
                                <Play className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Selected Track */}
              {selectedTrack && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4"
                >
                  <div className="flex items-center gap-3">
                    {selectedTrack.albumImage && (
                      <img
                        src={selectedTrack.albumImage}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">
                        {selectedTrack.name}
                      </div>
                      <div className="text-gray-400 text-sm truncate">
                        {selectedTrack.artist}
                      </div>
                      <div className="text-gray-500 text-xs mt-1">
                        {selectedTrack.album} • {selectedTrack.durationFormatted}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTrack(null)}
                      className="p-2 hover:bg-white/10 rounded-full"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Manual Input Toggle */}
              {!selectedTrack && (
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showManualInput ? "rotate-180" : ""}`}
                  />
                  ¿No encuentras la canción? Ingresa manualmente
                </button>
              )}

              {/* Manual Input Fields */}
              <AnimatePresence>
                {showManualInput && !selectedTrack && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={manualSong}
                      onChange={(e) => setManualSong(e.target.value)}
                      placeholder="Nombre de la canción"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      maxLength={200}
                    />
                    <input
                      type="text"
                      value={manualArtist}
                      onChange={(e) => setManualArtist(e.target.value)}
                      placeholder="Artista"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      maxLength={200}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Order Type Selection */}
              <div className="space-y-3">
                <label className="block text-sm text-gray-400">
                  <Sparkles className="w-4 h-4 inline mr-2" />
                  Tipo de pedido
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Free */}
                  <button
                    type="button"
                    onClick={() => setOrderType("FREE")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === "FREE"
                        ? "border-green-500 bg-green-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-1">🎵</div>
                      <div className="text-white font-medium text-sm">Gratis</div>
                      <div className="text-gray-500 text-xs">Cola normal</div>
                    </div>
                  </button>

                  {/* Premium */}
                  <button
                    type="button"
                    onClick={() => setOrderType("PREMIUM")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === "PREMIUM"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="text-center">
                      <Star className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                      <div className="text-white font-medium text-sm">Premium</div>
                      <div className="text-purple-400 text-xs font-bold">
                        S/ {config?.premiumPrice || 5}
                      </div>
                    </div>
                  </button>

                  {/* VIP */}
                  <button
                    type="button"
                    onClick={() => setOrderType("VIP")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === "VIP"
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="text-center">
                      <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
                      <div className="text-white font-medium text-sm">VIP</div>
                      <div className="text-yellow-400 text-xs font-bold">
                        S/ {config?.vipPrice || 10}
                      </div>
                    </div>
                  </button>
                </div>
                {orderType !== "FREE" && (
                  <p className="text-xs text-purple-400 text-center">
                    ⚡ Tu canción saltará al frente de la cola
                  </p>
                )}
              </div>

              {/* Error Message */}
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{submitError}</div>
                    {retryAfter && retryAfter > 0 && (
                      <div className="text-sm">
                        Puedes intentar de nuevo en {retryAfter} segundos
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  (!selectedTrack && (!manualSong || !manualArtist)) ||
                  !requesterName.trim() ||
                  (retryAfter !== null && retryAfter > 0)
                }
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : retryAfter && retryAfter > 0 ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Espera {retryAfter}s
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {orderType === "FREE" ? "Enviar Pedido" : `Pagar S/ ${orderType === "PREMIUM" ? config?.premiumPrice || 5 : config?.vipPrice || 10}`}
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Queue Info Footer */}
        {queueInfo && !submitSuccess && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            <Clock className="w-4 h-4 inline mr-1" />
            {queueInfo.stats.totalInQueue} canciones en cola •{" "}
            ~{queueInfo.stats.estimatedWaitMinutes} min de espera
          </div>
        )}
      </main>
    </div>
  );
}
