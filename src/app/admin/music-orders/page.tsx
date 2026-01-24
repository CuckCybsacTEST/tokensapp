"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Music,
  Settings,
  Users,
  Ban,
  DollarSign,
  Clock,
  Shield,
  RefreshCw,
  Save,
  QrCode,
  BarChart3,
  AlertTriangle,
  Check,
  X,
  Trash2,
  Eye,
  Download,
} from "lucide-react";

interface MusicSystemConfig {
  id: string;
  systemEnabled: boolean;
  qrEnabled: boolean;
  premiumPrice: number;
  vipPrice: number;
  freeLimitPerHour: number;
  premiumLimitPerHour: number;
  tableLimitPerHour: number;
  cooldownMinutes: number;
  captchaThreshold: number;
  captchaWindowMinutes: number;
  duplicateSongHours: number;
  peakHourMultiplier: number;
  peakHourStart: number;
  peakHourEnd: number;
  eventModeEnabled: boolean;
  blockedArtists: string[];
  blockedSongs: string[];
}

interface BlockedUser {
  id: string;
  identifier: string;
  ipAddress?: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
  expiresAt?: string;
  permanent: boolean;
}

interface Stats {
  totalToday: number;
  freeToday: number;
  premiumToday: number;
  vipToday: number;
  rejectedToday: number;
  playedToday: number;
  revenueToday: number;
}

export default function AdminMusicOrdersPage() {
  const [activeTab, setActiveTab] = useState<"config" | "moderation" | "blocked" | "stats">("config");
  const [config, setConfig] = useState<MusicSystemConfig | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBlockedArtist, setNewBlockedArtist] = useState("");
  const [newBlockedSong, setNewBlockedSong] = useState("");

  // Fetch config
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/music-system/config");
      const data = await res.json();
      if (data.ok) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  }, []);

  // Fetch blocked users
  const fetchBlockedUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/music-system/blocked-users");
      const data = await res.json();
      if (data.ok) {
        setBlockedUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error);
    }
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/music-system/stats");
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchBlockedUsers(), fetchStats()])
      .finally(() => setLoading(false));
  }, [fetchConfig, fetchBlockedUsers, fetchStats]);

  // Save config
  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/music-system/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        alert("Configuración guardada");
      }
    } catch (error) {
      console.error("Error saving config:", error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // Add blocked artist
  const addBlockedArtist = () => {
    if (!config || !newBlockedArtist.trim()) return;
    setConfig({
      ...config,
      blockedArtists: [...config.blockedArtists, newBlockedArtist.trim()],
    });
    setNewBlockedArtist("");
  };

  // Add blocked song
  const addBlockedSong = () => {
    if (!config || !newBlockedSong.trim()) return;
    setConfig({
      ...config,
      blockedSongs: [...config.blockedSongs, newBlockedSong.trim()],
    });
    setNewBlockedSong("");
  };

  // Remove blocked artist
  const removeBlockedArtist = (artist: string) => {
    if (!config) return;
    setConfig({
      ...config,
      blockedArtists: config.blockedArtists.filter((a) => a !== artist),
    });
  };

  // Remove blocked song
  const removeBlockedSong = (song: string) => {
    if (!config) return;
    setConfig({
      ...config,
      blockedSongs: config.blockedSongs.filter((s) => s !== song),
    });
  };

  // Unblock user
  const unblockUser = async (id: string) => {
    try {
      await fetch(`/api/admin/music-system/blocked-users/${id}`, {
        method: "DELETE",
      });
      fetchBlockedUsers();
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <Music className="w-12 h-12 animate-pulse mx-auto mb-4" />
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Administración de Jukebox</h1>
              <p className="text-gray-400">Configura el sistema de pedidos musicales</p>
            </div>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 rounded-xl font-medium flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Guardar Cambios
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
          {[
            { key: "config", label: "Configuración", icon: Settings },
            { key: "moderation", label: "Moderación", icon: Shield },
            { key: "blocked", label: "Usuarios Bloqueados", icon: Ban },
            { key: "stats", label: "Estadísticas", icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                activeTab === key
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Configuration Tab */}
          {activeTab === "config" && config && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Controls */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Control del Sistema
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <span>Sistema Habilitado</span>
                    <input
                      type="checkbox"
                      checked={config.systemEnabled}
                      onChange={(e) => setConfig({ ...config, systemEnabled: e.target.checked })}
                      className="w-6 h-6 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span>QR Público Habilitado</span>
                    <input
                      type="checkbox"
                      checked={config.qrEnabled}
                      onChange={(e) => setConfig({ ...config, qrEnabled: e.target.checked })}
                      className="w-6 h-6 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                  <label className="flex items-center justify-between">
                    <span>Modo Evento (límites relajados)</span>
                    <input
                      type="checkbox"
                      checked={config.eventModeEnabled}
                      onChange={(e) => setConfig({ ...config, eventModeEnabled: e.target.checked })}
                      className="w-6 h-6 rounded bg-white/10 border-white/20 text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Precios
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Precio Premium (S/)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={config.premiumPrice}
                      onChange={(e) => setConfig({ ...config, premiumPrice: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Precio VIP (S/)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={config.vipPrice}
                      onChange={(e) => setConfig({ ...config, vipPrice: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Multiplicador Hora Pico</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={config.peakHourMultiplier}
                      onChange={(e) => setConfig({ ...config, peakHourMultiplier: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Límites de Rate
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Pedidos gratuitos por hora
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.freeLimitPerHour}
                      onChange={(e) => setConfig({ ...config, freeLimitPerHour: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Pedidos premium por hora
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={config.premiumLimitPerHour}
                      onChange={(e) => setConfig({ ...config, premiumLimitPerHour: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Pedidos por mesa por hora
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={config.tableLimitPerHour}
                      onChange={(e) => setConfig({ ...config, tableLimitPerHour: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Cooldown entre pedidos (minutos)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={config.cooldownMinutes}
                      onChange={(e) => setConfig({ ...config, cooldownMinutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Anti-Abuse */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Anti-Abuso
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Umbral para Captcha (pedidos sin registro)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={config.captchaThreshold}
                      onChange={(e) => setConfig({ ...config, captchaThreshold: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Ventana de Captcha (minutos)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="120"
                      value={config.captchaWindowMinutes}
                      onChange={(e) => setConfig({ ...config, captchaWindowMinutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Bloquear duplicados (horas)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={config.duplicateSongHours}
                      onChange={(e) => setConfig({ ...config, duplicateSongHours: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Peak Hours */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 lg:col-span-2">
                <h3 className="text-lg font-bold mb-4">Horario Pico</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Hora Inicio (24h)</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={config.peakHourStart}
                      onChange={(e) => setConfig({ ...config, peakHourStart: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Hora Fin (24h)</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={config.peakHourEnd}
                      onChange={(e) => setConfig({ ...config, peakHourEnd: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Moderation Tab */}
          {activeTab === "moderation" && config && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Blocked Artists */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">Artistas Bloqueados</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newBlockedArtist}
                    onChange={(e) => setNewBlockedArtist(e.target.value)}
                    placeholder="Nombre del artista"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                  <button
                    onClick={addBlockedArtist}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg"
                  >
                    <Ban className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {config.blockedArtists.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay artistas bloqueados</p>
                  ) : (
                    config.blockedArtists.map((artist) => (
                      <div
                        key={artist}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                      >
                        <span>{artist}</span>
                        <button
                          onClick={() => removeBlockedArtist(artist)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Blocked Songs */}
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-bold mb-4">Canciones Bloqueadas</h3>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newBlockedSong}
                    onChange={(e) => setNewBlockedSong(e.target.value)}
                    placeholder="Nombre de la canción"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                  />
                  <button
                    onClick={addBlockedSong}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg"
                  >
                    <Ban className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {config.blockedSongs.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay canciones bloqueadas</p>
                  ) : (
                    config.blockedSongs.map((song) => (
                      <div
                        key={song}
                        className="flex items-center justify-between p-2 bg-white/5 rounded-lg"
                      >
                        <span>{song}</span>
                        <button
                          onClick={() => removeBlockedSong(song)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blocked Users Tab */}
          {activeTab === "blocked" && (
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4">Usuarios Bloqueados</h3>
              {blockedUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay usuarios bloqueados</p>
              ) : (
                <div className="space-y-3">
                  {blockedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{user.identifier}</div>
                        <div className="text-sm text-gray-400">
                          {user.reason} • Bloqueado por {user.blockedBy}
                        </div>
                        {user.expiresAt && (
                          <div className="text-xs text-yellow-400">
                            Expira: {new Date(user.expiresAt).toLocaleString()}
                          </div>
                        )}
                        {user.permanent && (
                          <div className="text-xs text-red-400">Permanente</div>
                        )}
                      </div>
                      <button
                        onClick={() => unblockUser(user.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-purple-400">{stats.totalToday}</div>
                <div className="text-gray-400">Total Hoy</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-green-400">{stats.freeToday}</div>
                <div className="text-gray-400">Gratuitos</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-purple-400">{stats.premiumToday}</div>
                <div className="text-gray-400">Premium</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-yellow-400">{stats.vipToday}</div>
                <div className="text-gray-400">VIP</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-blue-400">{stats.playedToday}</div>
                <div className="text-gray-400">Reproducidas</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
                <div className="text-4xl font-bold text-red-400">{stats.rejectedToday}</div>
                <div className="text-gray-400">Rechazados</div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center lg:col-span-2">
                <div className="text-4xl font-bold text-green-400">
                  S/ {stats.revenueToday.toFixed(2)}
                </div>
                <div className="text-gray-400">Revenue Hoy</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
