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
  title: "Reglamento Interno y Compromiso de Colaborador - 2026",
  content: [
    "Bienvenidos al equipo de El Lounge. Este reglamento establece las pautas fundamentales para nuestra convivencia y éxito operativo en el año 2026.",
    "El uso de la plataforma digital es OBLIGATORIO para todos los colaboradores. A través de ella registramos asistencia, tareas, métricas de desempeño y mantenemos la comunicación efectiva del equipo.",
    "La puntualidad es fundamental. Todos los registros de entrada y salida deben realizarse en el local de manera honesta y precisa. El sistema de asistencia es intransferible y personal.",
    "El cuidado de la información es prioridad absoluta. NO compartas capturas de pantalla de datos sensibles, ventas, información de clientes, inventarios o métricas operativas en redes sociales, grupos externos o cualquier medio no autorizado.",
    "Las herramientas de trabajo, mobiliario, equipos y espacios comunes son responsabilidad de todos. El mal uso, negligencia o daño será reportado y puede conllevar medidas correctivas según el reglamento interno de trabajo.",
    "La atención al cliente debe ser de excelencia excepcional. Nuestro objetivo es que cada visita sea memorable, creando experiencias únicas que fidelicen a nuestros clientes y generen recomendaciones positivas.",
    "El uniforme y presentación personal deben mantener los estándares de calidad de El Lounge. La higiene, aseo y actitud profesional son requisitos mínimos para todos los colaboradores.",
    "El respeto mutuo entre compañeros, la comunicación asertiva y el trabajo en equipo son valores fundamentales. Cualquier forma de discriminación, acoso o comportamiento inapropiado será sancionado.",
    "La seguridad laboral es responsabilidad de todos. Reportar inmediatamente cualquier riesgo, accidente o condición insegura. El uso correcto de equipos de protección personal es obligatorio.",
    "Los recursos tecnológicos (computadoras, teléfonos, tablets) son herramientas de trabajo. Su uso personal debe ser mínimo y nunca interferir con las responsabilidades laborales.",
    "La confidencialidad se extiende a toda información relacionada con el negocio, clientes, proveedores, estrategias comerciales y datos financieros.",
    "El cumplimiento de horarios de comida, breaks y descansos debe respetar las normativas laborales vigentes y no afectar el servicio al cliente.",
    "La participación en capacitaciones y entrenamientos es obligatoria. El crecimiento profesional continuo es parte de nuestra cultura organizacional.",
    "El manejo de efectivo, tarjetas y transacciones debe seguir estrictos protocolos de seguridad y control interno.",
    "La limpieza y orden de áreas de trabajo es responsabilidad compartida. Un ambiente limpio refleja nuestro compromiso con la calidad.",
    "El incumplimiento de estas normas conlleva a medidas correctivas progresivas según el reglamento interno de trabajo, que pueden incluir desde amonestaciones verbales hasta la terminación del contrato laboral."
  ],
  trivia: [
    {
      id: "t1",
      question: "¿Es obligatorio el uso de la plataforma digital para todos los colaboradores?",
      options: ["No, es opcional", "Sí, es obligatorio para registrar asistencia, tareas y métricas", "Solo para los supervisores"],
      correctIndex: 1,
      explanation: "La plataforma digital es fundamental para la gestión operativa, medición del desempeño y comunicación efectiva de todo el equipo."
    },
    {
      id: "t2",
      question: "¿Qué NO se debe compartir en redes sociales o grupos externos?",
      options: ["Fotos del local", "Datos sensibles, ventas, información de clientes e inventarios", "Horarios de trabajo"],
      correctIndex: 1,
      explanation: "La confidencialidad es un pilar fundamental de nuestra seguridad operativa y protección de datos."
    },
    {
      id: "t3",
      question: "¿Dónde deben realizarse los registros de entrada y salida?",
      options: ["Desde casa antes de salir", "Únicamente en el local de manera honesta y precisa", "Al final del día para todo el turno"],
      correctIndex: 1,
      explanation: "El registro honesto y preciso en el local permite una gestión eficiente de turnos y control de asistencia."
    },
    {
      id: "t4",
      question: "¿Qué aspectos incluye la presentación personal según el reglamento?",
      options: ["Solo el uniforme", "Uniforme, higiene, aseo y actitud profesional", "Únicamente la actitud"],
      correctIndex: 1,
      explanation: "La presentación completa refleja nuestro compromiso con la calidad y la imagen de El Lounge."
    },
    {
      id: "t5",
      question: "¿Cuál es la política respecto al uso de recursos tecnológicos durante el trabajo?",
      options: ["Uso libre y sin restricciones", "Uso personal mínimo que no interfiera con responsabilidades laborales", "Prohibido cualquier uso personal"],
      correctIndex: 1,
      explanation: "Los recursos tecnológicos son herramientas de trabajo; el uso personal debe ser responsable y no afectar el desempeño."
    }
  ]
};
