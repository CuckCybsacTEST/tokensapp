/**
 * Servicio de reservas mock para la aplicación Go Lounge!
 * 
 * Este servicio simula la interacción con un backend para procesar reservas
 */

// Tipo para los datos de la reserva
export interface ReservationData {
  name: string;
  date: string;
  people: number;
  phone: string;
}

/**
 * Simula el envío de una solicitud de reserva al servidor
 * @param data Datos de la reserva a enviar
 * @returns Una promesa que se resuelve cuando la reserva ha sido "procesada"
 */
export const submitReservation = async (data: ReservationData): Promise<{ success: boolean, message: string }> => {
  // Simulamos un retraso de red de 1-2 segundos
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
  
  // Validación básica del formulario
  if (!data.name || !data.date || !data.phone) {
    return {
      success: false,
      message: 'Por favor, completa todos los campos requeridos.'
    };
  }

  // Validación del número de teléfono
  if (data.phone.length < 6) {
    return {
      success: false,
      message: 'Por favor, ingresa un número de teléfono válido.'
    };
  }
  
  // Validación de la fecha
  const reservationDate = new Date(data.date);
  const today = new Date();
  if (reservationDate < today) {
    return {
      success: false,
      message: 'No se pueden hacer reservas para fechas pasadas.'
    };
  }
  
  // En un caso real, aquí se enviarían los datos a un endpoint de API
  console.log('Enviando datos de reserva:', data);
  
  // Simulamos una respuesta exitosa (95% de éxito)
  if (Math.random() > 0.05) {
    return {
      success: true,
      message: 'Reserva recibida correctamente. Te hemos enviado una confirmación.'
    };
  } else {
    // Simulamos un error ocasional del servidor
    return {
      success: false,
      message: 'Nuestro sistema está experimentando problemas. Por favor, intenta de nuevo en unos minutos.'
    };
  }
};

/**
 * Comprueba la disponibilidad para la fecha seleccionada (mock)
 * @param date Fecha para verificar disponibilidad
 * @returns Una promesa que se resuelve con la disponibilidad
 */
export const checkAvailability = async (date: string): Promise<{ available: boolean, message: string }> => {
  // Simulamos un retraso de red
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulamos que algunas fechas están completas
  const dateObj = new Date(date);
  const isFriday = dateObj.getDay() === 5; // 5 = viernes
  const isSaturday = dateObj.getDay() === 6; // 6 = sábado
  
  if (isFriday || isSaturday) {
    return {
      available: Math.random() > 0.7, // 30% de probabilidad de estar completo en fin de semana
      message: 'Esta fecha tiene alta demanda. Reserva pronto.'
    };
  }
  
  return {
    available: true,
    message: 'Hay disponibilidad para esta fecha.'
  };
};
