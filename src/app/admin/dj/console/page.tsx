"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  Music,
  Play,
  Pause,
  SkipForward,
  Check,
  X,
  Clock,
  User,
  Flag,
  Volume2,
  VolumeX,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  Star,
  Crown,
  AlertTriangle,
  Trash2,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { useDJSocket } from "@/hooks/useSocket";

interface MusicOrder {
  id: string;
  requesterName: string;
  songTitle: string;
  artist: string;
  albumName?: string;
  albumImage?: string;
  duration?: number;
  previewUrl?: string;
  spotifyUri?: string;
  orderType: "FREE" | "PREMIUM" | "VIP";
  status: "PENDING" | "APPROVED" | "QUEUED" | "PLAYING" | "PLAYED" | "REJECTED" | "CANCELLED";
  priority: number;
  queuePosition?: number;
  createdAt: string;
  flagged: boolean;
  flaggedReason?: string;
  djNotes?: string;
  table?: { number: number; name?: string };
}

export default function DJConsolePage() {
  const [orders, setOrders] = useState<MusicOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<MusicOrder | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MusicOrder | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "queued" | "flagged">("all");
  const [djNotes, setDjNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const { socket, isConnected } = useDJSocket();

  // Fetch orders
  const fetchOrders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch("/api/music-orders?today=true&limit=100");
      const data = await res.json();
      if (data.ok) {
        setOrders(data.orders);
        const playing = data.orders.find((o: MusicOrder) => o.status === "PLAYING");
        setNowPlaying(playing || null);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders(false), 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Socket.IO listeners
  useEffect(() => {
    if (socket) {
      socket.on("new-music-order", (data: any) => {
        console.log("🎵 Nuevo pedido:", data);
        fetchOrders(false);
        // Play notification sound
        const audio = new Audio("/sounds/notification.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      });

      return () => {
        socket.off("new-music-order");
      };
    }
  }, [socket, fetchOrders]);

  // Update order status
  const updateStatus = async (
    orderId: string,
    status: string,
    extras?: { djNotes?: string; rejectedReason?: string }
  ) => {
    try {
      const res = await fetch(`/api/music-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...extras, playedBy: "DJ" }),
      });
      
      if (res.ok) {
        fetchOrders(false);
        setSelectedOrder(null);
        setDjNotes("");
        setRejectReason("");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Toggle flag
  const toggleFlag = async (orderId: string, flagged: boolean, reason?: string) => {
    try {
      await fetch(`/api/music-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged, flaggedReason: reason }),
      });
      fetchOrders(false);
    } catch (error) {
      console.error("Error toggling flag:", error);
    }
  };

  // Play preview
  const togglePreview = (previewUrl?: string) => {
    if (!previewUrl) return;

    if (audioPlaying === previewUrl) {
      audioRef?.pause();
      setAudioPlaying(null);
    } else {
      audioRef?.pause();
      const audio = new Audio(previewUrl);
      audio.volume = 0.3;
      audio.play();
      audio.onended = () => setAudioPlaying(null);
      setAudioRef(audio);
      setAudioPlaying(previewUrl);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (filter === "pending") return order.status === "PENDING";
    if (filter === "queued") return ["APPROVED", "QUEUED"].includes(order.status);
    if (filter === "flagged") return order.flagged;
    return ["PENDING", "APPROVED", "QUEUED"].includes(order.status);
  });

  const pendingCount = orders.filter((o) => o.status === "PENDING").length;
  const queuedCount = orders.filter((o) => ["APPROVED", "QUEUED"].includes(o.status)).length;
  const flaggedCount = orders.filter((o) => o.flagged).length;

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case "VIP":
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case "PREMIUM":
        return <Star className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-12 h-12 text-purple-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Cargando consola DJ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-black/50 border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">DJ Console</h1>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-gray-400">
                    {isConnected ? "En vivo" : "Desconectado"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchOrders(false)}
                disabled={refreshing}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Now Playing & Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Now Playing */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-400 text-sm mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              REPRODUCIENDO AHORA
            </div>

            {nowPlaying ? (
              <div className="flex items-center gap-6">
                {nowPlaying.albumImage && (
                  <img
                    src={nowPlaying.albumImage}
                    alt=""
                    className="w-24 h-24 rounded-xl object-cover shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{nowPlaying.songTitle}</h2>
                  <p className="text-gray-400 text-lg">{nowPlaying.artist}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {nowPlaying.requesterName}
                    </span>
                    {nowPlaying.table && (
                      <span>Mesa {nowPlaying.table.name || nowPlaying.table.number}</span>
                    )}
                    {getOrderTypeIcon(nowPlaying.orderType)}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => updateStatus(nowPlaying.id, "PLAYED")}
                    className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Terminada
                  </button>
                  <button
                    onClick={() => {
                      const next = filteredOrders[0];
                      if (next) {
                        updateStatus(nowPlaying.id, "PLAYED");
                        updateStatus(next.id, "PLAYING");
                      }
                    }}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium flex items-center gap-2"
                  >
                    <SkipForward className="w-5 h-5" />
                    Siguiente
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>No hay canción reproduciéndose</p>
                <p className="text-sm">Selecciona una canción de la cola</p>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: "all", label: "Todos", count: pendingCount + queuedCount },
              { key: "pending", label: "Pendientes", count: pendingCount },
              { key: "queued", label: "En Cola", count: queuedCount },
              { key: "flagged", label: "Flaggeados", count: flaggedCount },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  filter === key
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                }`}
              >
                {label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === key ? "bg-white/20" : "bg-white/10"
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Queue List */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No hay pedidos en esta categoría</p>
                </div>
              ) : (
                filteredOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                    className={`bg-white/5 hover:bg-white/10 rounded-xl p-4 border transition-colors cursor-pointer ${
                      order.flagged
                        ? "border-red-500/50"
                        : order.orderType === "VIP"
                        ? "border-yellow-500/50"
                        : order.orderType === "PREMIUM"
                        ? "border-purple-500/50"
                        : "border-white/10"
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-600 w-8">
                        #{index + 1}
                      </div>
                      
                      {order.albumImage && (
                        <img
                          src={order.albumImage}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{order.songTitle}</span>
                          {getOrderTypeIcon(order.orderType)}
                          {order.flagged && (
                            <Flag className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="text-gray-400 text-sm truncate">{order.artist}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {order.requesterName}
                          </span>
                          {order.table && (
                            <span>Mesa {order.table.name || order.table.number}</span>
                          )}
                          <span>{formatDuration(order.duration)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.previewUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreview(order.previewUrl);
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg"
                          >
                            {audioPlaying === order.previewUrl ? (
                              <VolumeX className="w-5 h-5 text-purple-400" />
                            ) : (
                              <Volume2 className="w-5 h-5 text-gray-400" />
                            )}
                          </button>
                        )}

                        {order.status === "PENDING" && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(order.id, "QUEUED");
                              }}
                              className="p-2 bg-green-600 hover:bg-green-500 rounded-lg"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                              }}
                              className="p-2 bg-red-600 hover:bg-red-500 rounded-lg"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}

                        {["APPROVED", "QUEUED"].includes(order.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (nowPlaying) {
                                updateStatus(nowPlaying.id, "PLAYED");
                              }
                              updateStatus(order.id, "PLAYING");
                            }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" />
                            Reproducir
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column - Stats & Details */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="font-bold mb-4">Estadísticas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-400">{pendingCount}</div>
                <div className="text-sm text-gray-400">Pendientes</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-400">{queuedCount}</div>
                <div className="text-sm text-gray-400">En Cola</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {orders.filter((o) => o.orderType !== "FREE").length}
                </div>
                <div className="text-sm text-gray-400">Premium/VIP</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {orders.filter((o) => o.status === "PLAYED").length}
                </div>
                <div className="text-sm text-gray-400">Reproducidas</div>
              </div>
            </div>
          </div>

          {/* Selected Order Details */}
          {selectedOrder && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Detalles del Pedido</h3>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedOrder.albumImage && (
                <img
                  src={selectedOrder.albumImage}
                  alt=""
                  className="w-full h-48 rounded-xl object-cover mb-4"
                />
              )}

              <h4 className="text-xl font-bold">{selectedOrder.songTitle}</h4>
              <p className="text-gray-400">{selectedOrder.artist}</p>
              {selectedOrder.albumName && (
                <p className="text-gray-500 text-sm">{selectedOrder.albumName}</p>
              )}

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Solicitante</span>
                  <span>{selectedOrder.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tipo</span>
                  <span className="flex items-center gap-1">
                    {getOrderTypeIcon(selectedOrder.orderType)}
                    {selectedOrder.orderType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duración</span>
                  <span>{formatDuration(selectedOrder.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estado</span>
                  <span>{selectedOrder.status}</span>
                </div>
              </div>

              {selectedOrder.spotifyUri && (
                <a
                  href={`https://open.spotify.com/track/${selectedOrder.spotifyUri.split(":")[2]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-400 hover:text-green-300 text-sm mt-4"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir en Spotify
                </a>
              )}

              {/* Actions */}
              <div className="mt-6 space-y-3">
                {selectedOrder.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => updateStatus(selectedOrder.id, "QUEUED")}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Aprobar
                    </button>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Razón del rechazo (opcional)"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                      />
                      <button
                        onClick={() =>
                          updateStatus(selectedOrder.id, "REJECTED", { rejectedReason: rejectReason })
                        }
                        className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium flex items-center justify-center gap-2"
                      >
                        <X className="w-5 h-5" />
                        Rechazar
                      </button>
                    </div>
                  </>
                )}

                {["APPROVED", "QUEUED"].includes(selectedOrder.status) && (
                  <button
                    onClick={() => {
                      if (nowPlaying) {
                        updateStatus(nowPlaying.id, "PLAYED");
                      }
                      updateStatus(selectedOrder.id, "PLAYING");
                    }}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Reproducir Ahora
                  </button>
                )}

                {/* Flag toggle */}
                <button
                  onClick={() => toggleFlag(selectedOrder.id, !selectedOrder.flagged)}
                  className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                    selectedOrder.flagged
                      ? "bg-yellow-600 hover:bg-yellow-500"
                      : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <Flag className="w-5 h-5" />
                  {selectedOrder.flagged ? "Quitar Flag" : "Marcar como Sospechoso"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Tips */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="font-bold mb-4">Controles Rápidos</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span>VIP = Máxima prioridad</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <span>Premium = Alta prioridad</span>
              </div>
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" />
                <span>Flaggeado = Revisar manualmente</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
