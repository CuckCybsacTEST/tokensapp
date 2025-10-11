import { Server as NetServer } from "http";
import { NextApiResponse } from "next";
import { Server as ServerIO } from "socket.io";

export type NextApiResponseServerIo = NextApiResponse & {
  socket: {
    server: NetServer & {
      io: ServerIO;
    };
  };
};

export const initSocketIO = (httpServer: NetServer): ServerIO => {
  const io = new ServerIO(httpServer, {
    path: "/api/socketio",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Configurar eventos de Socket.IO
  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    // Unirse a salas por rol
    socket.on("join-staff", (staffId: string) => {
      socket.join(`staff-${staffId}`);
      console.log(`Staff ${staffId} se unió a su sala`);
    });

    socket.on("join-cashier", () => {
      socket.join("cashier");
      console.log("Cajero se unió a la sala de caja");
    });

    socket.on("join-waiter", (waiterId: string) => {
      socket.join(`waiter-${waiterId}`);
      console.log(`Mozo ${waiterId} se unió a su sala`);
    });

    socket.on("join-table", (tableId: string) => {
      socket.join(`table-${tableId}`);
      console.log(`Mesa ${tableId} se unió a su sala`);
    });

    // Eventos de pedidos
    socket.on("order-created", (orderData) => {
      // Notificar a todos los mozos y caja
      io.to("cashier").emit("new-order", orderData);
      // Notificar a mozos específicos si es necesario
      socket.broadcast.emit("new-order", orderData);
    });

    socket.on("order-status-changed", (orderData) => {
      // Notificar al cliente y staff relevante
      io.to(`table-${orderData.tableId}`).emit("order-status-update", orderData);
      io.to("cashier").emit("order-status-update", orderData);
      if (orderData.staffId) {
        io.to(`staff-${orderData.staffId}`).emit("order-status-update", orderData);
      }
    });

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  return io;
};