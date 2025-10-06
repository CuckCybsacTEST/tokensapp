"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { brand } from "../../styles/brand";

export function BirthdayForm() {
  // Estado para el formulario
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    guests: 10,
    date: "",
    time: "",
  });

  // Estado para manejar el envío del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manejador para los cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Manejador para el envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Simulamos un envío de formulario con un delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Aquí iría la lógica para enviar los datos a un endpoint
      console.log("Datos del formulario:", form);

      setSubmitted(true);
    } catch (err) {
      setError("Ocurrió un error al enviar el formulario. Por favor intenta nuevamente.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className="rounded-xl backdrop-blur-sm p-6 md:p-8"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: `0 20px 40px -20px ${brand.primary}50`,
        }}
      >
        <h3 className="text-2xl font-bold mb-6 text-center">Reserva tu celebración</h3>

        {submitted ? (
          <div className="text-center py-10">
            <div className="text-4xl mb-4">✨</div>
            <h4 className="text-xl font-bold mb-2">¡Gracias por tu reserva!</h4>
            <p className="opacity-80 mb-6">
              Hemos recibido tu solicitud y nos pondremos en contacto contigo a la brevedad para
              confirmar los detalles.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-2 rounded-full transition-all"
              style={{
                background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
                boxShadow: `0 4px 20px -5px ${brand.primary}`,
              }}
            >
              Realizar otra reserva
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1 opacity-80">
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="¿Quién celebra?"
                  required
                  className="w-full rounded-lg px-4 py-3 bg-transparent border focus:ring-1 focus:outline-none"
                  style={{
                    borderColor: "rgba(255,255,255,0.1)",
                    color: "#fff",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
              </div>

              {/* WhatsApp */}
              <div>
                <label htmlFor="whatsapp" className="block text-sm font-medium mb-1 opacity-80">
                  Número de WhatsApp
                </label>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={form.whatsapp}
                  onChange={handleChange}
                  placeholder="+51 999 888 777"
                  required
                  className="w-full rounded-lg px-4 py-3 bg-transparent border focus:ring-1 focus:outline-none"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              {/* Cantidad de invitados */}
              <div>
                <label htmlFor="guests" className="block text-sm font-medium mb-1 opacity-80">
                  Cantidad de invitados
                </label>
                <input
                  type="number"
                  id="guests"
                  name="guests"
                  min="5"
                  max="50"
                  value={form.guests}
                  onChange={handleChange}
                  className="w-full rounded-lg px-4 py-3 bg-transparent border focus:ring-1 focus:outline-none"
                  style={{ borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>

              {/* Fecha y Hora en Fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fecha */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium mb-1 opacity-80">
                    Fecha
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={form.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg px-4 py-3 bg-transparent border focus:ring-1 focus:outline-none"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>

                {/* Hora */}
                <div>
                  <label htmlFor="time" className="block text-sm font-medium mb-1 opacity-80">
                    Hora de llegada
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={form.time}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg px-4 py-3 bg-transparent border focus:ring-1 focus:outline-none"
                    style={{ borderColor: "rgba(255,255,255,0.1)", color: "#fff" }}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-opacity-20 text-red-300 bg-red-900">{error}</div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 rounded-lg font-medium transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${brand.primary}, ${brand.secondary})`,
                    boxShadow: `0 4px 20px -5px ${brand.primary}`,
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                >
                  {isSubmitting ? "Enviando..." : "Reservar Ahora"}
                </button>
              </div>

              <p className="text-sm opacity-60 text-center mt-4">
                Te contactaremos para confirmar disponibilidad y coordinar detalles adicionales.
              </p>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
