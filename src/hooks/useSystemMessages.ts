"use client";

import { useState, useCallback } from "react";

interface SystemMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
  };
}

export function useSystemMessages() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);

  const showMessage = useCallback((
    type: SystemMessage["type"],
    title: string,
    message: string,
    actionButton?: SystemMessage["actionButton"]
  ) => {
    const id = Date.now().toString();
    const newMessage: SystemMessage = {
      id,
      type,
      title,
      message,
      actionButton
    };

    setMessages(prev => [...prev, newMessage]);

    // Auto-close after 5 seconds for non-error messages
    if (type !== "error") {
      setTimeout(() => {
        closeMessage(id);
      }, 5000);
    }

    return id;
  }, []);

  const closeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, []);

  const clearAllMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((title: string, message: string, actionButton?: SystemMessage["actionButton"]) => {
    return showMessage("success", title, message, actionButton);
  }, [showMessage]);

  const showError = useCallback((title: string, message: string, actionButton?: SystemMessage["actionButton"]) => {
    return showMessage("error", title, message, actionButton);
  }, [showMessage]);

  const showWarning = useCallback((title: string, message: string, actionButton?: SystemMessage["actionButton"]) => {
    return showMessage("warning", title, message, actionButton);
  }, [showMessage]);

  const showInfo = useCallback((title: string, message: string, actionButton?: SystemMessage["actionButton"]) => {
    return showMessage("info", title, message, actionButton);
  }, [showMessage]);

  return {
    messages,
    showMessage,
    closeMessage,
    clearAllMessages,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
