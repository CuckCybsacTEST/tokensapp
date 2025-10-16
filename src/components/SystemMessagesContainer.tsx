"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SystemMessageModal } from "./SystemMessageModal";

interface SystemMessagesContainerProps {
  messages: Array<{
    id: string;
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
    actionButton?: {
      label: string;
      onClick: () => void;
      variant?: "primary" | "secondary" | "danger";
    };
  }>;
  onCloseMessage: (id: string) => void;
}

export function SystemMessagesContainer({
  messages,
  onCloseMessage
}: SystemMessagesContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      <AnimatePresence>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300
            }}
            className="max-w-sm"
          >
            <SystemMessageModal
              isOpen={true}
              onClose={() => onCloseMessage(message.id)}
              type={message.type}
              title={message.title}
              message={message.message}
              actionButton={message.actionButton}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}