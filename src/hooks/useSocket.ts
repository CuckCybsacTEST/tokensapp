"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Determinar URL del servidor Socket.IO
    // En producción usa la misma URL, en desarrollo usa el hostname actual con el puerto
    const getSocketUrl = () => {
      if (typeof window === "undefined") return "";
      
      // En producción o si estamos en el mismo origen
      if (process.env.NODE_ENV === "production") {
        return window.location.origin;
      }
      
      // En desarrollo, usar el host actual (soporta cualquier puerto)
      return window.location.origin;
    };

    const socketUrl = getSocketUrl();
    console.log("🔌 Conectando a Socket.IO:", socketUrl);

    // Conectar al servidor Socket.IO (usa path por defecto /socket.io)
    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("🔌 Conectado a Socket.IO, ID:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 Desconectado de Socket.IO:", reason);
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("🔌 Error de conexión Socket.IO:", error.message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
}

export function useStaffSocket(staffId?: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && staffId) {
      socket.emit("join-staff", staffId);
    }
  }, [socket, isConnected, staffId]);

  return { socket, isConnected };
}

// Hook especial para la consola del DJ
export function useDJSocket() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("join-dj");
      console.log("🎧 DJ solicitando unirse a sala dj-console");
    }
  }, [socket, isConnected]);

  return { socket, isConnected };
}

export function useCashierSocket() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      socket.emit("join-cashier");
    }
  }, [socket, isConnected]);

  return { socket, isConnected };
}

export function useWaiterSocket(waiterId?: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && waiterId) {
      socket.emit("join-waiter", waiterId);
    }
  }, [socket, isConnected, waiterId]);

  return { socket, isConnected };
}

export function useMenuSocket() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      // Unirse a salas relevantes para el menú público
      socket.emit("join-cashier");
      socket.emit("join-staff", "general"); // Sala general para staff
    }
  }, [socket, isConnected]);

  return { socket, isConnected };
}

export function useLocationSocket(locationId?: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && locationId) {
      socket.emit("join-location", locationId);
    }
  }, [socket, isConnected, locationId]);

  return { socket, isConnected };
}

export function useServicePointSocket(servicePointId?: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && servicePointId) {
      socket.emit("join-service-point", servicePointId);
    }
  }, [socket, isConnected, servicePointId]);

  return { socket, isConnected };
}

export function useTableSocket(tableId?: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && tableId) {
      socket.emit("join-table", tableId);
    }
  }, [socket, isConnected, tableId]);

  return { socket, isConnected };
}
