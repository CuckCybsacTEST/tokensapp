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
  version: 2,
  title: "REGLAMENTO INTERNO — 2026",
  content: [
    "Mediante el presente se establecen normas complementarias para el cumplimiento eficiente de las labores dentro de la empresa. No obstante, las sanciones o término no contempladas en este documento serán discutidos con las áreas pertinentes y establecidas posteriormente por la administración.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📋 1. ÁREAS",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "La empresa consta de las siguientes áreas de trabajo: Seguridad, Atención al Cliente (mozos, barman, cajeros), Servicios Especiales, Marketing y Escenario.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🔐 1.1 SEGURIDAD",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Son deberes estrictos del área de seguridad:",

    "▸ 1.1.1 Prohibición de consumo con clientes:",
    "• Queda completamente prohibido acompañar a los clientes a consumir bebidas alcohólicas dentro o fuera del establecimiento.",
    "• Solo podrán presentarse excepciones por motivo de fuerza mayor y previa autorización del administrador.",
    "⚠️ El incumplimiento de esta norma será sancionado con S/ 50.00 y estará sujeto a evaluación de los hechos, pudiendo derivar en la suspensión de labores.",

    "▸ 1.1.2 Horario de cierre de puertas:",
    "• Las puertas del establecimiento no tienen un horario fijo de cierre. Este deberá ser consultado con el administrador.",
    "⚠️ El incumplimiento será sancionado al personal encargado del horario con S/ 20.00.",
    "• En caso de presentarse alguna eventualidad que genere riesgo para colaboradores, clientes o la infraestructura del local, se podrá proceder al cierre de puertas en el horario que se requiera.",

    "▸ Juegos de entretenimiento:",
    "• Los juegos de entretenimiento serán utilizados de martes a sábado, sin excepción.",
    "• El personal designado será responsable de su uso y cuidado, debiendo entregar como mínimo 10 premios.",
    "• La administración podrá suspender el uso de los juegos cuando lo considere conveniente.",
    "• En caso de deterioro o pérdida, el costo será asumido por el personal encargado del turno.",
    "• Si el daño fue ocasionado por un cliente, se comunicará a la administración para definir la forma de subsanación.",

    "▸ 1.1.3 Trato al cliente:",
    "• Queda prohibido agredir física o verbalmente a los clientes.",
    "• Si un cliente incurre en faltas dentro del local (agresión, comportamiento indebido u otros actos que comprometan la integridad de asistentes o personal), se le negará todo tipo de atención y se le solicitará retirarse del local sin hacer uso de la violencia.",
    "🚨 El incumplimiento de esta norma conlleva la separación definitiva de la empresa, salvo que el administrador determine lo contrario según la gravedad del caso.",

    "▸ 1.1.4 Cuidado de pertenencias:",
    "• Es obligación del personal de seguridad resguardar las pertenencias de clientes que se encuentren en estado vulnerable o etílico.",
    "• Dicho procedimiento deberá quedar registrado en cámaras de seguridad.",
    "• El personal que omita esta función o no comunique la retención de algún bien podrá ser separado de la empresa, previa evaluación de la administración.",

    "▸ 1.1.5 Registro de eventualidades:",
    "• Toda eventualidad ocurrida durante el horario de trabajo deberá ser registrada tanto en el grupo de WhatsApp como en el cuaderno de informes.",
    "⚠️ El incumplimiento será sancionado con S/ 10.00.",

    "▸ 1.1.6 Recepción y pulseras:",
    "• El personal designado para la recepción de clientes deberá colocar las pulseras y, de ser necesario, orientar sobre el uso de los códigos QR.",
    "⚠️ El incumplimiento tendrá una sanción de S/ 20.00.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🍸 2.1 ATENCIÓN AL CLIENTE",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🚨 Está prohibido alterar los precios establecidos en la carta o realizar cobros indebidos. Esta falta será sancionada con la separación definitiva de la empresa.",
    "⚠️ Queda prohibido ingerir bebidas alcohólicas hasta comprometer el rendimiento laboral. Sanción: S/ 50.00, y de ser reincidente, la separación de la empresa.",

    "▸ Personal de Caja:",
    "• Deberá entregar los equipos de venta (tarjeteros) al inicio de labores a todo el personal de atención al cliente, sin excepción.",
    "• El servicio de carga de celulares se prestará hasta las 2:00 a.m.",
    "• Si el cliente se encuentra en estado etílico al recoger su celular, se deberá registrar la entrega mediante fotografía enviada al grupo de WhatsApp y anotarla en el cuaderno de informes, indicando fecha y hora.",
    "⚠️ El incumplimiento será sancionado con S/ 20.00.",
    "• Es deber del encargado de caja informar sobre objetos olvidados por los clientes en la barra, comunicándolo a la administración y al grupo de WhatsApp.",

    "▸ Requerimientos y compras:",
    "• Los requerimientos deberán solicitarse al término de las labores. De lo contrario, el responsable del área asumirá el costo de las compras.",
    "• Toda solicitud de compra deberá ser autorizada por el administrador y sustentada con la boleta correspondiente.",
    "• De no presentarse la boleta, el responsable asumirá el monto en efectivo.",

    "▸ Barman:",
    "• Deberá presentar las degustaciones elaboradas de la mejor manera posible al inicio de las labores.",
    "• Las promociones (barra libre, jarras de cortesía u otras no estipuladas) deberán coordinarse con el administrador y registrarse en el grupo de WhatsApp con fotografías.",
    "• Es obligación mantener la barra limpia y ordenada, evitando productos en mal estado o próximos a vencer.",

    "📌 Es obligatorio asistir al trabajo correctamente uniformado, sin excepción.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🚻 3.1 SERVICIOS ESPECIALES",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "• Enviar el informe del área diariamente.",
    "• Usar la indumentaria necesaria para el desempeño de sus labores.",
    "• No descansar durante el horario de trabajo.",
    "• Brindar buen trato a los clientes que hagan uso de los SS.HH.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "🎤 4.1 ESCENARIO",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",

    "▸ 4.1.1 DJ — DISCJOCKEY:",
    "• Gestionar su biblioteca musical para atender pedidos acordes al horario y al tipo de público del local, considerando la opinión de los clientes.",
    "• Actualizar versiones, mashups y remixes para brindar una experiencia variada y no repetitiva.",
    "• Participar en la elaboración de temáticas programadas y preparar sus sets según los shows.",
    "• Los fines de semana (jueves, viernes y sábado) se realizarán turnos para cuidar los equipos ubicados en el segundo piso.",
    "⚠️ El incumplimiento será sancionado con S/ 30.00.",
    "• Elegir la música de acuerdo con el horario y la respuesta del público. De no cumplirse, se evaluará un descanso temporal.",
    "• Cuidar adecuadamente los equipos (parlantes, consolas, monitores, cables, etc.). Los daños serán asumidos por quien los ocasione.",
    "• El personal que cierre turno deberá enviar un informe breve sobre los equipos y requerimientos.",
    "⚠️ El incumplimiento será sancionado con S/ 10.00.",

    "▸ 4.2 Showman — Animadores:",
    "• Dirigirse al público con respeto, evitando insultos, groserías o comentarios mal interpretables.",
    "• Preparar dinámicas de interacción con el público, gestionando premios con la administración.",
    "• Hacer uso adecuado del escenario para su desenvolvimiento.",
    "• Considerar los saludos de los clientes sin excepción, salvo indicación contraria de la administración.",
    "• Evitar enfrentamientos con los clientes, priorizando siempre el buen trato.",
    "• Cuidar los equipos asignados (micrófonos, máquina de humo, etc.).",
    "• El personal que cierre turno deberá enviar un informe breve.",
    "⚠️ El incumplimiento será sancionado con S/ 10.00.",
    "• Participar en la elaboración de temáticas en coordinación con los DJs.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📸 5.1 ÁREA DE GESTIÓN MULTIMEDIA",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "• Responsabilizarse del uso y cuidado de los equipos multimedia asignados (celulares, cámaras, trípodes, filmadoras, cables, computadoras, memorias, entre otros).",
    "🚨 La pérdida o deterioro será asumida en su totalidad por el encargado del área.",
    "• Gestionar material fotográfico y audiovisual (reels, shorts, TikToks) con la participación de las áreas correspondientes.",
    "⚠️ El incumplimiento será sancionado con S/ 50.00 por trabajo no realizado.",
    "• Actualizar los fondos de pantalla según los shows programados.",
    "• Registrar momentos espontáneos dentro del local sin afectar la integridad de los clientes ni de la empresa.",
    "• Cumplir las tareas asignadas por el área de marketing.",

    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "📝 APUNTES IMPORTANTES",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Aplica a todas las áreas:",

    "▸ PERMISOS Y FALTAS JUSTIFICADAS:",
    "• Los permisos deberán solicitarse con 5 días de anticipación y presentar un reemplazo.",
    "• En casos de fuerza mayor (enfermedad, familiar o riesgo), este plazo podrá omitirse.",
    "⚠️ El incumplimiento será considerado falta injustificada y sancionado con S/ 50.00.",
    "🚨 Más de dos reincidencias se considerará abandono de trabajo y se procederá a la separación.",

    "▸ INGRESO Y SALIDA:",
    "• El ingreso y salida deberá registrarse mediante código QR.",
    "⚠️ El incumplimiento será sancionado con S/ 10.00 por cada omisión.",

    "▸ TARDANZAS:",
    "• Se tolerarán 10 minutos como máximo.",
    "⚠️ Sanción: S/ 10.00, incrementándose según el tiempo de retraso.",
    "• Se evaluarán excepciones justificadas por la administración.",

    "▸ REUNIONES:",
    "• La asistencia a reuniones presenciales o virtuales es obligatoria.",
    "⚠️ La inasistencia será sancionada con S/ 50.00, salvo fuerza mayor evaluada por la administración.",

    "▸ UNIFORMIDAD:",
    "• Todo el personal deberá asistir correctamente uniformado y con buena presentación.",
    "⚠️ El incumplimiento será sancionado con S/ 50.00.",

    "▸ CONSUMO DE ALCOHOL:",
    "• Prohibido ingerir alcohol hasta comprometer el desempeño laboral.",
    "⚠️ Sanción: S/ 50.00 y separación en caso de reincidencia.",

    "▸ ABANDONO DE TRABAJO:",
    "• Se considera abandono no cumplir el horario sin justificación válida.",
    "🚨 Sanción: Descuento de un día de sueldo y separación en la segunda reincidencia.",

    "▸ PROPINAS Y PRODUCTOS:",
    "• Las propinas deberán ser voluntarias y comunicadas a la administración.",
    "• Los productos compartidos por clientes no podrán devolverse a caja y podrán ser retirados por el personal.",

    "▸ CONTENIDO MULTIMEDIA:",
    "• Todo el personal está obligado a participar en la generación de contenido para redes sociales.",
    "🚨 El incumplimiento amerita suspensión temporal."
  ],
  trivia: [
    {
      id: "t1",
      question: "¿Qué sanción aplica por acompañar a clientes a consumir bebidas alcohólicas sin autorización?",
      options: ["S/ 20.00", "S/ 50.00 y posible suspensión", "Solo una advertencia verbal"],
      correctIndex: 1,
      explanation: "El incumplimiento de la prohibición de consumo con clientes es sancionado con S/ 50.00 y está sujeto a evaluación, pudiendo derivar en suspensión."
    },
    {
      id: "t2",
      question: "¿Cuál es la sanción por no registrar el ingreso y salida mediante código QR?",
      options: ["No hay sanción", "S/ 10.00 por cada omisión", "S/ 50.00 por día"],
      correctIndex: 1,
      explanation: "El registro de ingreso y salida mediante QR es obligatorio. El incumplimiento se sanciona con S/ 10.00 por cada omisión."
    },
    {
      id: "t3",
      question: "¿Con cuántos días de anticipación deben solicitarse los permisos?",
      options: ["1 día", "3 días", "5 días"],
      correctIndex: 2,
      explanation: "Los permisos deben solicitarse con 5 días de anticipación y presentar un reemplazo, salvo casos de fuerza mayor."
    },
    {
      id: "t4",
      question: "¿Qué sucede si un colaborador altera los precios de la carta o realiza cobros indebidos?",
      options: ["Sanción de S/ 50.00", "Advertencia escrita", "Separación definitiva de la empresa"],
      correctIndex: 2,
      explanation: "Alterar precios o realizar cobros indebidos es una falta grave sancionada con la separación definitiva de la empresa."
    },
    {
      id: "t5",
      question: "¿Cuál es la tolerancia máxima de tardanza permitida?",
      options: ["5 minutos", "10 minutos", "15 minutos"],
      correctIndex: 1,
      explanation: "Se toleran 10 minutos como máximo. La sanción es de S/ 10.00, incrementándose según el tiempo de retraso."
    },
    {
      id: "t6",
      question: "¿Qué debe hacer el personal de seguridad con las pertenencias de clientes en estado etílico?",
      options: ["Ignorarlas", "Resguardarlas y registrar el procedimiento en cámaras", "Entregarlas a cualquier persona"],
      correctIndex: 1,
      explanation: "Es obligación del personal de seguridad resguardar las pertenencias de clientes vulnerables, dejando registro en cámaras de seguridad."
    }
  ]
};
