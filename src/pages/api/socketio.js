const { Server } = require("socket.io");

let io;

export default function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("*First use, starting Socket.IO");

    io = new Server(res.socket.server, {
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
      socket.on("join-staff", (staffId) => {
        if (staffId) {
          socket.join(`staff-${staffId}`);
          console.log(`Staff ${staffId} se unió a su sala`);
        } else {
          socket.join("staff-general");
          console.log("Staff general se unió a la sala de staff");
        }
      });

      socket.on("join-cashier", () => {
        socket.join("cashier");
        console.log("Cajero se unió a la sala de caja");
      });

      socket.on("join-waiter", (waiterId) => {
        socket.join(`waiter-${waiterId}`);
        console.log(`Mozo ${waiterId} se unió a su sala`);
      });

      socket.on("join-table", (tableId) => {
        socket.join(`table-${tableId}`);
        console.log(`Mesa ${tableId} se unió a su sala`);
      });

      // Eventos de pedidos
      socket.on("new-order", (orderData) => {
        console.log("🍽️ Nuevo pedido recibido:", orderData);
        // Notificar a todos los mozos y caja
        io.to("cashier").emit("new-order", orderData);
        io.to("staff-general").emit("new-order", orderData);
        // Notificar a mozos específicos si es necesario
        socket.broadcast.emit("new-order", orderData);
      });

      socket.on("order-status-update", (orderData) => {
        console.log("📦 Estado de pedido actualizado:", orderData);
        // Notificar al cliente y staff relevante
        io.to(`table-${orderData.tableId}`).emit("order-status-update", orderData);
        io.to("cashier").emit("order-status-update", orderData);
        // Notificar a todos los miembros del staff
        io.to("staff-general").emit("order-status-update", orderData);
        if (orderData.staffId) {
          io.to(`staff-${orderData.staffId}`).emit("order-status-update", orderData);
        }
      });

      socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
      });
    });

    res.socket.server.io = io;
  } else {
    console.log("Socket.IO already running");
  }
  res.end();
}