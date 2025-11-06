"use client";

import { ReservationMessageModal } from "@/components/ReservationMessageModal";

interface ValidationError {
  field: "name" | "whatsapp" | "documento" | "date" | "pack" | "general";
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  suggestions: string[];
}

export function getValidationErrorDetails(errorMessage: string): ValidationError | null {
  // Mapeo de mensajes de error a detalles más específicos
  const errorMappings: Record<string, ValidationError> = {
    "El nombre es obligatorio": {
      field: "name",
      type: "error",
      title: "Nombre requerido",
      message: "Necesitamos saber el nombre del cumpleañero para personalizar tu celebración.",
      suggestions: [
        "Ingresa el nombre completo del cumpleañero",
        "Asegúrate de escribir tanto nombre como apellido"
      ]
    },
    "El nombre debe tener al menos 2 caracteres": {
      field: "name",
      type: "error",
      title: "Nombre muy corto",
      message: "El nombre debe tener al menos 2 caracteres para ser válido.",
      suggestions: [
        "Escribe el nombre completo",
        "Verifica que no haya espacios extra al inicio o final"
      ]
    },
    "Ingresa nombre y apellido (mínimo 2 palabras)": {
      field: "name",
      type: "error",
      title: "Nombre y apellido requeridos",
      message: "Para una mejor atención, necesitamos tanto el nombre como el apellido del cumpleañero.",
      suggestions: [
        "Ejemplo: Juan Pérez",
        "Ejemplo: María González López",
        "Separa nombre y apellido con espacios"
      ]
    },
    "WhatsApp es obligatorio": {
      field: "whatsapp",
      type: "error",
      title: "WhatsApp requerido",
      message: "Necesitamos tu número de WhatsApp para coordinar los detalles de tu celebración.",
      suggestions: [
        "Ingresa tu número de WhatsApp a 9 dígitos",
        "Ejemplo: 912345678",
        "No incluyas el +51 ni espacios"
      ]
    },
    "WhatsApp debe tener exactamente 9 dígitos (ej: 912345678)": {
      field: "whatsapp",
      type: "error",
      title: "Formato de WhatsApp incorrecto",
      message: "El número de WhatsApp debe tener exactamente 9 dígitos sin espacios ni prefijos.",
      suggestions: [
        "Ejemplo correcto: 912345678",
        "Solo números, sin +51",
        "Sin espacios ni guiones",
        "Debe comenzar con 9 (para Perú)"
      ]
    },
    "Documento es obligatorio": {
      field: "documento",
      type: "error",
      title: "Documento requerido",
      message: "Necesitamos tu documento de identidad para verificar tu reserva.",
      suggestions: [
        "Ingresa tu DNI (8 dígitos)",
        "O tu Carnet de Extranjería/Pasaporte",
        "Solo números, sin puntos ni espacios"
      ]
    },
    "Documento debe tener entre 8-12 dígitos": {
      field: "documento",
      type: "error",
      title: "Formato de documento incorrecto",
      message: "El documento debe tener entre 8 y 12 dígitos numéricos.",
      suggestions: [
        "DNI: 8 dígitos (ej: 12345678)",
        "CE/Pasaporte: hasta 12 dígitos",
        "Solo números, sin letras ni símbolos"
      ]
    },
    "Email no es válido": {
      field: "general",
      type: "warning",
      title: "Email opcional pero inválido",
      message: "El email que ingresaste no tiene un formato válido.",
      suggestions: [
        "Ejemplo: juan@email.com",
        "Verifica que tenga @ y un dominio válido",
        "Puedes dejar este campo vacío si no tienes email"
      ]
    },
    "Selecciona una fecha válida": {
      field: "date",
      type: "error",
      title: "Fecha requerida",
      message: "Necesitamos saber cuándo será tu celebración para poder organizarla.",
      suggestions: [
        "Selecciona una fecha en el calendario",
        "Puedes elegir hasta 10 días en el futuro",
        "La fecha debe ser posterior a hoy"
      ]
    },
    "Selecciona un horario": {
      field: "general",
      type: "error",
      title: "Horario requerido",
      message: "Elige el horario en que prefieres celebrar tu cumpleaños.",
      suggestions: [
        "Horarios disponibles: 20:00, 21:00, 22:00, 23:00, 00:00",
        "Selecciona el que mejor te convenga"
      ]
    },
    "Selecciona un Pack": {
      field: "pack",
      type: "error",
      title: "Pack requerido",
      message: "Elige el pack que mejor se adapte a tu celebración.",
      suggestions: [
        "Compara los diferentes packs disponibles",
        "Cada pack incluye diferentes beneficios",
        "Selecciona según la cantidad de invitados"
      ]
    },
    "Ya tienes una reserva de cumpleaños este año. Si necesitas cambiar la fecha, contacta con atención al cliente.": {
      field: "general",
      type: "warning",
      title: "Ya tienes una reserva este año",
      message: "Detectamos que ya realizaste una reserva de cumpleaños durante este año calendario.",
      suggestions: [
        "Contacta con nuestro equipo de atención al cliente",
        "Llama al: 912-345-678",
        "Pregunta por cambios de fecha o cancelaciones",
        "Podemos ayudarte a reorganizar tu celebración"
      ]
    },
    "No se pudieron cargar los packs": {
      field: "general",
      type: "error",
      title: "Error al cargar información",
      message: "No pudimos cargar la información de los packs disponibles.",
      suggestions: [
        "Verifica tu conexión a internet",
        "Recarga la página",
        "Si el problema persiste, contacta con soporte"
      ]
    }
  };

  return errorMappings[errorMessage] || null;
}

export function getServerErrorDetails(errorCode?: string, fallbackMessage?: string): ValidationError {
  const serverErrors: Record<string, ValidationError> = {
    "RATE_LIMITED": {
      field: "general",
      type: "warning",
      title: "Demasiadas solicitudes",
      message: "Estás haciendo muchas solicitudes en poco tiempo.",
      suggestions: [
        "Espera unos minutos antes de intentar nuevamente",
        "Recarga la página si es necesario",
        "Si el problema persiste, contacta con soporte"
      ]
    },
    "INVALID_BODY": {
      field: "general",
      type: "error",
      title: "Datos inválidos",
      message: "Algunos datos del formulario no son válidos.",
      suggestions: [
        "Revisa todos los campos del formulario",
        "Asegúrate de completar todos los campos requeridos",
        "Verifica el formato de WhatsApp y documento"
      ]
    },
    "INVALID_DATE": {
      field: "date",
      type: "error",
      title: "Fecha inválida",
      message: "La fecha seleccionada no es válida para reservas.",
      suggestions: [
        "Selecciona una fecha dentro de los próximos 10 días",
        "La fecha debe ser posterior a hoy",
        "Verifica que la fecha esté disponible"
      ]
    },
    "INVALID_NAME_MIN_WORDS": {
      field: "name",
      type: "error",
      title: "Nombre incompleto",
      message: "El nombre debe incluir tanto nombre como apellido.",
      suggestions: [
        "Ejemplo: Juan Pérez",
        "Ejemplo: María González López",
        "Separa nombre y apellido con espacios"
      ]
    },
    "DUPLICATE_DNI_YEAR": {
      field: "documento",
      type: "warning",
      title: "Reserva existente este año",
      message: "Ya tienes una reserva de cumpleaños registrada durante este año calendario.",
      suggestions: [
        "Contacta con nuestro equipo de atención al cliente",
        "Llama al: 912-345-678",
        "Pregunta por cambios de fecha o cancelaciones",
        "Podemos ayudarte a reorganizar tu celebración"
      ]
    },
    "NOT_FOUND": {
      field: "general",
      type: "error",
      title: "Servicio no disponible",
      message: "El servicio de reservas no está disponible en este momento.",
      suggestions: [
        "Intenta nuevamente en unos minutos",
        "Contacta con soporte si el problema persiste",
        "Llama al: 912-345-678"
      ]
    },
    "CREATE_RESERVATION_ERROR": {
      field: "general",
      type: "error",
      title: "Error al crear reserva",
      message: "No pudimos procesar tu reserva en este momento.",
      suggestions: [
        "Verifica tu conexión a internet",
        "Intenta nuevamente en unos minutos",
        "Si el problema persiste, contacta con soporte",
        "Llama al: 912-345-678"
      ]
    }
  };

  return serverErrors[errorCode || ''] || {
    field: "general",
    type: "error",
    title: "Error inesperado",
    message: fallbackMessage || "Ocurrió un error inesperado al procesar tu solicitud.",
    suggestions: [
      "Intenta nuevamente en unos minutos",
      "Recarga la página",
      "Contacta con soporte si el problema persiste"
    ]
  };
}