"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Conectar al servidor Socket.IO
    const socketInstance = io(process.env.NODE_ENV === "production" ? "" : "http://localhost:3000", {
      path: "/api/socketio",
    });

    socketInstance.on("connect", () => {
      console.log("🔌 Conectado a Socket.IO");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("🔌 Desconectado de Socket.IO");
      setIsConnected(false);
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

export function useTableSocket(tableId?: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && tableId) {
      socket.emit("join-table", tableId);
    }
  }, [socket, isConnected, tableId]);

  return { socket, isConnected };
}