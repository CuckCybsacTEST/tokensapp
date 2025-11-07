import { Server as ServerIO } from "socket.io";
import { emitSocketEvent } from "../socket";

// Eventos de socket para ofertas
export const OFFERS_EVENTS = {
  // Eventos para clientes
  OFFER_PURCHASED: 'offer:purchased',
  OFFER_UPDATED: 'offer:updated',
  OFFER_CREATED: 'offer:created',
  OFFER_DELETED: 'offer:deleted',

  // Eventos para admin
  ADMIN_OFFER_PURCHASE: 'admin:offer:purchase',
  ADMIN_OFFER_UPDATE: 'admin:offer:update',
  ADMIN_OFFER_CREATE: 'admin:offer:create',
  ADMIN_OFFER_DELETE: 'admin:offer:delete',
} as const;

// Función para emitir cuando se crea una oferta
export function emitOfferCreated(offer: any) {
  emitSocketEvent(OFFERS_EVENTS.OFFER_CREATED, {
    offer,
    timestamp: new Date().toISOString()
  });
}

// Función para emitir cuando se actualiza una oferta
export function emitOfferUpdated(offer: any) {
  emitSocketEvent(OFFERS_EVENTS.OFFER_UPDATED, {
    offer,
    timestamp: new Date().toISOString()
  });
}

// Función para emitir cuando se elimina una oferta
export function emitOfferDeleted(offerId: string) {
  emitSocketEvent(OFFERS_EVENTS.OFFER_DELETED, {
    offerId,
    timestamp: new Date().toISOString()
  });
}

// Función para emitir cuando se realiza una compra
export function emitOfferPurchased(purchase: any) {
  // Emitir a todos los clientes
  emitSocketEvent(OFFERS_EVENTS.OFFER_PURCHASED, {
    purchase: {
      id: purchase.id,
      offerId: purchase.offerId,
      amount: purchase.amount,
      status: purchase.status,
      createdAt: purchase.createdAt
    },
    timestamp: new Date().toISOString()
  });

  // Emitir a administradores
  emitSocketEvent(OFFERS_EVENTS.ADMIN_OFFER_PURCHASE, {
    purchase: {
      id: purchase.id,
      offerId: purchase.offerId,
      offerTitle: purchase.offer?.title,
      userName: purchase.user?.name,
      userEmail: purchase.user?.email,
      amount: purchase.amount,
      status: purchase.status,
      createdAt: purchase.createdAt
    },
    timestamp: new Date().toISOString()
  });
}

// Función para configurar eventos de socket para ofertas
export function setupOffersSocketEvents(io: ServerIO) {
  io.on("connection", (socket) => {
    // Unirse a sala de ofertas para clientes
    socket.on("join-offers", () => {
      socket.join("offers");
      console.log(`Cliente ${socket.id} se unió a la sala de ofertas`);
    });

    // Unirse a sala de admin de ofertas
    socket.on("join-admin-offers", () => {
      socket.join("admin-offers");
      console.log(`Admin ${socket.id} se unió a la sala de admin de ofertas`);
    });

    // Solicitar actualización de ofertas
    socket.on("request-offers-update", () => {
      // Emitir actualización de ofertas a este cliente específico
      socket.emit("offers-updated", {
        message: "Ofertas actualizadas",
        timestamp: new Date().toISOString()
      });
    });
  });
}
