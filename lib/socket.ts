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

// Variable global para acceder al io desde cualquier lugar
let globalIo: ServerIO | null = null;

export const getGlobalIo = () => globalIo;

// Función utilitaria para emitir eventos de socket desde cualquier lugar
export function emitSocketEvent(event: string, data: any, rooms?: string[]) {
  try {
    const io = getGlobalIo();
    if (io) {
      if (rooms && rooms.length > 0) {
        rooms.forEach(room => {
          io.to(room).emit(event, data);
        });
      } else {
        io.emit(event, data);
      }
      console.log(`📡 Evento '${event}' emitido:`, data);
    } else {
      console.warn("⚠️ Socket.IO no está disponible para emitir eventos");
    }
  } catch (error) {
    console.error("❌ Error al emitir evento de socket:", error);
  }
}

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

    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });

  // Asignar a variable global
  globalIo = io;

  return io;
};