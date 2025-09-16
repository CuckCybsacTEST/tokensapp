import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { brand } from '../styles/brand';
import { SectionTitle } from './ui/SectionTitle';
import { submitReservation, checkAvailability, ReservationData } from '../services/reservationService';

/**
 * Componente de formulario de reservas
 * 
 * Permite a los usuarios enviar solicitudes de reserva para eventos o mesas
 * Incluye feedback visual cuando el formulario es enviado
 * Integra servicios mock para simular la interacción con un backend
 */
export function ReservationForm() {
  // Estado para el formulario de reservas
  const [form, setForm] = useState<ReservationData>({ 
    name: "", 
    date: "", 
    people: 2, 
    phone: "" 
  });
  
  // Estados adicionales para gestionar UI
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'limited' | 'unavailable' | null>(null);
  
  // Manejador para los cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'people' ? parseInt(value) : value
    }));
    
    // Reset errors on change
    if (error) setError(null);
  };
  
  // Verifica disponibilidad cuando la fecha cambia
  useEffect(() => {
    if (form.date) {
      const checkDateAvailability = async () => {
        try {
          const result = await checkAvailability(form.date);
          setAvailabilityMessage(result.message);
          setAvailabilityStatus(result.available ? 'available' : 'limited');
        } catch (err) {
          setAvailabilityMessage(null);
          setAvailabilityStatus(null);
        }
      };
      
      checkDateAvailability();
    }
  }, [form.date]);
  
  // Manejador para el envío del formulario
  const onSubmit = async (e: React.FormEvent) => { 
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Enviar datos al servicio mock
      const result = await submitReservation(form);
      
      if (result.success) {
        setSent(true);
        
        // Reset del formulario después de 5 segundos en caso de éxito
        setTimeout(() => {
          setSent(false);
          setForm({ name: "", date: "", people: 2, phone: "" });
        }, 5000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Ha ocurrido un error al procesar tu reserva. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="reservas" className="py-16 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div 
        className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 70% 50%, ${brand.primary}33 0%, transparent 50%), 
                           radial-gradient(circle at 30% 50%, ${brand.secondary}22 0%, transparent 40%)`,
        }}
      />
      
      <div className="container mx-auto max-w-5xl px-4 md:px-8 relative z-10">
        <SectionTitle
          kicker="Reservaciones"
          title="Asegura tu lugar"
          subtitle="Reserva con anticipación para garantizar tu entrada y ubicación preferida"
        />
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Columna izquierda - Información */}
          <div className="flex flex-col justify-center">
            <h3 
              className="text-xl md:text-2xl font-bold mb-6" 
              style={{ color: brand.text.primary }}
            >
              ¿Por qué reservar anticipadamente?
            </h3>
            
            <ul className="space-y-4">
              {[
                "Garantiza tu ingreso sin hacer fila",
                "Obtén ubicaciones preferenciales",
                "Recibe atención personalizada",
                "Acceso a beneficios exclusivos"
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <div 
                    className="mt-1 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0" 
                    style={{ background: brand.primary }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p style={{ color: brand.text.secondary }}>{item}</p>
                </motion.li>
              ))}
            </ul>
            
            <div className="mt-10 p-6 rounded-xl backdrop-blur-sm" 
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.08)' 
              }}
            >
              <h4 className="font-bold mb-2">Horario de atención</h4>
              <p style={{ color: brand.text.secondary }}>
                Miércoles a Domingo: 7:00 PM - 3:00 AM<br />
                Para reservas grupales o corporativas, contáctanos directamente.
              </p>
            </div>
          </div>
          
          {/* Columna derecha - Formulario */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="backdrop-blur-md rounded-xl p-6 md:p-8"
              style={{ 
                background: 'rgba(255,255,255,0.04)', 
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: `0 25px 50px -12px ${brand.primary}33` 
              }}
            >
              {!sent ? (
                <form onSubmit={onSubmit} className="space-y-6">
                  <div>
                    <label 
                      htmlFor="name" 
                      className="block text-sm font-medium mb-2" 
                      style={{ color: brand.text.secondary }}
                    >
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-lg"
                      style={{ 
                        background: 'rgba(255,255,255,0.06)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        color: brand.text.primary 
                      }}
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  
              <div>
                <label 
                  htmlFor="date" 
                  className="block text-sm font-medium mb-2" 
                  style={{ color: brand.text.secondary }}
                >
                  Fecha de visita
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg"
                  style={{ 
                    background: 'rgba(255,255,255,0.06)', 
                    border: `1px solid ${availabilityStatus === 'limited' ? brand.primary : 'rgba(255,255,255,0.1)'}`, 
                    color: brand.text.primary 
                  }}
                />
                {availabilityMessage && (
                  <p className="mt-1 text-xs" style={{ 
                    color: availabilityStatus === 'limited' ? brand.primary : brand.text.secondary 
                  }}>
                    {availabilityStatus === 'limited' && (
                      <span className="inline-block mr-1">⚠️</span>
                    )}
                    {availabilityMessage}
                  </p>
                )}
              </div>                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        htmlFor="people" 
                        className="block text-sm font-medium mb-2" 
                        style={{ color: brand.text.secondary }}
                      >
                        Número de personas
                      </label>
                      <select
                        id="people"
                        name="people"
                        value={form.people}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-lg appearance-none"
                        style={{ 
                          background: 'rgba(255,255,255,0.06)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: brand.text.primary 
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                          <option key={num} value={num}>{num} {num === 1 ? 'persona' : 'personas'}</option>
                        ))}
                        <option value={15}>15+ personas</option>
                      </select>
                    </div>
                    
                    <div>
                      <label 
                        htmlFor="phone" 
                        className="block text-sm font-medium mb-2" 
                        style={{ color: brand.text.secondary }}
                      >
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-lg"
                        style={{ 
                          background: 'rgba(255,255,255,0.06)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: brand.text.primary 
                        }}
                        placeholder="+51 999 888 777"
                      />
                    </div>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 rounded-lg font-medium text-center transition-all ${isSubmitting ? 'opacity-70' : ''}`}
                    style={{ 
                      background: brand.primary,
                      boxShadow: `0 8px 20px -8px ${brand.primary}BB`,
                      color: '#fff'
                    }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Procesando...
                      </span>
                    ) : (
                      "Confirmar Reserva"
                    )}
                  </button>
                  
                  {error && (
                    <p className="text-sm text-center mt-3 p-2 rounded" style={{ 
                      color: '#fff', 
                      background: `${brand.primary}33`,
                      border: `1px solid ${brand.primary}66`
                    }}>
                      {error}
                    </p>
                  )}
                  
                  <p className="text-xs text-center mt-4" style={{ color: brand.text.secondary }}>
                    Al enviar este formulario, aceptas recibir confirmación por mensaje de texto.
                  </p>
                </form>
              ) : (
                <motion.div 
                  className="py-10 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <div 
                      className="h-16 w-16 mx-auto rounded-full flex items-center justify-center" 
                      style={{ background: brand.primary }}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </motion.div>
                  
                  <h3 className="text-xl font-bold mt-6">¡Reserva enviada!</h3>
                  <p className="mt-2" style={{ color: brand.text.secondary }}>
                    Te hemos enviado un mensaje de confirmación.<br />
                    Revisa tu teléfono para los detalles.
                  </p>
                  
                  <motion.div 
                    className="mt-6 flex justify-center"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-lg" style={{ 
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <span className="text-lg">✅</span>
                      <div className="text-left">
                        <p className="font-medium">{form.name}</p>
                        <p className="text-xs" style={{ color: brand.text.secondary }}>
                          {new Date(form.date).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long'
                          })} · {form.people} {form.people === 1 ? 'persona' : 'personas'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
