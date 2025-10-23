"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { brand } from "../../marketing/styles/brand";
import { TicketSelector } from "../../marketing/components/TicketSelector";

interface ShowDetails {
  id: string;
  title: string;
  slug: string;
  startsAt: string;
  endsAt?: string;
  imageWebpPath?: string;
  imageBlurData?: string;
  details?: string;
  specialGuests?: string;
  slot?: number;
}

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number;
  capacity: number;
  soldCount: number;
  availableFrom?: string;
  availableTo?: string;
}

export default function ShowDetailsPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [show, setShow] = useState<ShowDetails | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShow() {
      try {
        setLoading(true);
        setError(null);

        // Cargar detalles del show
        const showResponse = await fetch(`/api/shows/slug/${slug}`);
        if (!showResponse.ok) throw new Error("Show not found");
        const showData = await showResponse.json();
        setShow(showData.show);

        // Cargar tipos de tickets disponibles
        const ticketsResponse = await fetch(`/api/shows/${showData.show.id}/tickets`);
        if (ticketsResponse.ok) {
          const ticketsData = await ticketsResponse.json();
          setTicketTypes(ticketsData.ticketTypes || []);
        }
      } catch (err: any) {
        setError(err.message || "Error loading show");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      loadShow();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Cargando show...</div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Show no encontrado</h1>
          <Link
            href="/marketing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const startsDate = new Date(show.startsAt);
  const endsDate = show.endsAt ? new Date(show.endsAt) : null;

  const dateFormatted = startsDate.toLocaleDateString("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const timeFormatted = startsDate.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/marketing"
              className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </Link>
            <h1 className="text-xl font-bold text-[#FF4D2E]">El Lounge</h1>
            <div></div> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Image */}
        <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8">
          {show.imageWebpPath ? (
            <Image
              src={`/shows/${show.imageWebpPath}`}
              alt={show.title}
              fill
              className="object-cover"
              placeholder={show.imageBlurData ? "blur" : undefined}
              blurDataURL={show.imageBlurData || undefined}
            />
          ) : (
            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-400">Sin imagen</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>

        {/* Show Info */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{show.title}</h1>

            {/* Date & Time */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-5 h-5 text-[#FF4D2E]" />
                <span>{dateFormatted}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-5 h-5 text-[#FF4D2E]" />
                <span>{timeFormatted}</span>
                {endsDate && (
                  <span>
                    - {endsDate.toLocaleTimeString("es-PE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {show.slot && (
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin className="w-5 h-5 text-[#FF4D2E]" />
                  <span>Slot {show.slot}</span>
                </div>
              )}
            </div>

            {/* Details */}
            {show.details && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Detalles</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {show.details}
                  </p>
                </div>
              </div>
            )}

            {/* Special Guests */}
            {show.specialGuests && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-3">Invitados Especiales</h2>
                <div className="flex items-center gap-2 text-gray-300">
                  <Users className="w-5 h-5 text-[#FF4D2E]" />
                  <span>{show.specialGuests}</span>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Selector */}
          <div className="md:col-span-1">
            <div className="sticky top-24">
              <TicketSelector
                showId={show.id}
                ticketTypes={ticketTypes}
                showTitle={show.title}
                showDate={dateFormatted}
                showTime={timeFormatted}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}