export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface RegulationVersion {
  version: number;
  title: string;
  content: string[]; // Parrafos
  trivia: TriviaQuestion[];
}

export const CURRENT_REGULATION: RegulationVersion = {
  version: 1,
  title: "Reglamento Interno y Compromiso de Colaborador",
  content: [
    "Bienvenidos al equipo de El Lounge. Este reglamento establece las pautas fundamentales para nuestra convivencia y éxito operativo.",
    "El uso de la plataforma digital es OBLIGATORIO para todos los colaboradores. A través de ella registramos asistencia, tareas y métricas de desempeño.",
    "La puntualidad es fundamental. Todos los registros de entrada y salida deben realizarse en el local y de manera honesta.",
    "El cuidado de la información es prioridad. No compartas capturas de pantalla de datos sensibles, ventas o información de clientes en redes sociales o grupos externos.",
    "Las herramientas de trabajo y el mobiliario son responsabilidad de todos. El mal uso o negligencia será reportado.",
    "La atención al cliente debe ser de excelencia. Nuestro objetivo es que cada visita sea memorable.",
    "El incumplimiento de estas normas conlleva a medidas correctivas según el reglamento interno de trabajo."
  ],
  trivia: [
    {
      id: "t1",
      question: "¿Es obligatorio el uso de la plataforma digital para registrar tareas?",
      options: ["No, es opcional", "Sí, es obligatorio para todos", "Solo para los mozos"],
      correctIndex: 1,
      explanation: "El uso de la plataforma es fundamental para medir el desempeño y la operatividad de todo el equipo."
    },
    {
      id: "t2",
      question: "¿Qué se debe hacer con la información sensible de ventas o clientes?",
      options: ["Publicarla si es interesante", "Compartirla solo en grupos de WhatsApp de amigos", "No compartirla ni publicarla en medios externos"],
      correctIndex: 2,
      explanation: "La confidencialidad es un pilar de nuestra seguridad operativa."
    },
    {
      id: "t3",
      question: "¿Cuándo se debe realizar el registro de asistencia?",
      options: ["Desde casa antes de salir", "Exactamente al llegar y retirarse del local", "Al final del día para todo el turno"],
      correctIndex: 1,
      explanation: "El registro honesto y a tiempo permite una gestión de turnos eficiente."
    }
  ]
};
