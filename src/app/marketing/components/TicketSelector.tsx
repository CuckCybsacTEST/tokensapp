"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Ticket, Plus, Minus, ShoppingCart } from "lucide-react";
import { CheckoutModal } from "./CheckoutModal";

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

interface TicketSelectorProps {
  showId: string;
  ticketTypes: TicketType[];
  showTitle: string;
  showDate: string;
  showTime: string;
}

export function TicketSelector({
  showId,
  ticketTypes,
  showTitle,
  showDate,
  showTime,
}: TicketSelectorProps) {
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [showCheckout, setShowCheckout] = useState(false);

  const updateQuantity = (ticketId: string, quantity: number) => {
    if (quantity < 0) return;

    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket) return;

    const available = ticket.capacity - ticket.soldCount;
    if (quantity > available) return;

    setSelectedTickets(prev => {
      const newSelected = { ...prev };
      if (quantity === 0) {
        delete newSelected[ticketId];
      } else {
        newSelected[ticketId] = quantity;
      }
      return newSelected;
    });
  };

  const getTotalQuantity = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalAmount = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId);
      return total + (ticket ? ticket.price * quantity : 0);
    }, 0);
  };

  const handlePurchase = () => {
    if (getTotalQuantity() > 0) {
      setShowCheckout(true);
    }
  };

  if (ticketTypes.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        <div className="text-center text-gray-400">
          <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Entradas próximamente</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/50 backdrop-blur-sm border border-white/10 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Ticket className="w-5 h-5 text-[#FF4D2E]" />
          Entradas Disponibles
        </h3>

        <div className="space-y-4">
          {ticketTypes.map((ticket) => {
            const available = ticket.capacity - ticket.soldCount;
            const selected = selectedTickets[ticket.id] || 0;

            return (
              <div
                key={ticket.id}
                className="border border-white/10 rounded-lg p-4 bg-black/20"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-white">{ticket.name}</h4>
                    {ticket.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {ticket.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#FF4D2E]">
                      S/ {ticket.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {available} disponibles
                    </div>
                  </div>
                </div>

                {available > 0 ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(ticket.id, selected - 1)}
                        disabled={selected === 0}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {selected}
                      </span>
                      <button
                        onClick={() => updateQuantity(ticket.id, selected + 1)}
                        disabled={selected >= available}
                        className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {selected > 0 && (
                      <div className="text-sm font-medium text-[#FF4D2E]">
                        S/ {(ticket.price * selected).toFixed(2)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 text-sm py-2">
                    Agotado
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {getTotalQuantity() > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 pt-4 border-t border-white/10"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Total:</span>
              <span className="text-xl font-bold text-[#FF4D2E]">
                S/ {getTotalAmount().toFixed(2)}
              </span>
            </div>
            <button
              onClick={handlePurchase}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#FF4D2E] text-white rounded-lg hover:bg-[#FF4D2E]/90 transition-colors font-semibold"
            >
              <ShoppingCart className="w-5 h-5" />
              Comprar {getTotalQuantity()} {getTotalQuantity() === 1 ? 'entrada' : 'entradas'}
            </button>
          </motion.div>
        )}
      </motion.div>

      <CheckoutModal
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        showId={showId}
        showTitle={showTitle}
        showDate={showDate}
        showTime={showTime}
        selectedTickets={selectedTickets}
        ticketTypes={ticketTypes}
        onPurchaseComplete={() => {
          setShowCheckout(false);
          setSelectedTickets({});
        }}
      />
    </>
  );
}