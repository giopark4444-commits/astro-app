// Textos legales de Aluna (ES) — BORRADOR razonable para pre-lanzamiento,
// PENDIENTE DE REVISIÓN LEGAL PROFESIONAL antes de cobrar o de tráfico real.
// Cada documento: título + secciones {h, p[]}. La página /legal/* los renderiza.

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: Array<{ h: string; p: string[] }>;
}

export const TERMS_ES: LegalDoc = {
  title: "Términos de uso",
  updated: "Julio 2026",
  intro:
    "Bienvenida, bienvenido a Aluna. Al crear una cuenta o usar la aplicación aceptas estos términos. Léelos con calma: son cortos y honestos.",
  sections: [
    {
      h: "Qué es Aluna",
      p: [
        "Aluna es una herramienta de autoconocimiento que calcula e interpreta tu carta astral, numerología, horóscopo y Cuatro Pilares (Ba Zi/Saju) a partir de tus datos de nacimiento.",
        "Los cálculos astronómicos se realizan con efemérides de precisión profesional; las interpretaciones son contenido editorial y, cuando actives las lecturas extendidas, texto generado con ayuda de inteligencia artificial.",
      ],
    },
    {
      h: "Tu cuenta",
      p: [
        "Necesitas una cuenta con correo verificado. Eres responsable de mantener tu contraseña segura y de la actividad que ocurra bajo tu cuenta.",
        "Puedes cerrar tu cuenta cuando quieras; al hacerlo eliminaremos tus datos personales conforme a la Política de privacidad.",
      ],
    },
    {
      h: "Uso aceptable",
      p: [
        "No uses Aluna para actividades ilegales, para vulnerar la privacidad de otras personas ni para revender el contenido sin autorización.",
        "Los perfiles de otras personas que agregues (familiares, amistades, pareja) deben usarse con su conocimiento y respeto.",
      ],
    },
    {
      h: "Planes de pago",
      p: [
        "Algunas funciones son de pago por suscripción. Los precios, periodos y renovación se muestran antes de confirmar la compra y se gestionan a través de nuestro procesador de pagos.",
        "Puedes cancelar en cualquier momento desde Ajustes; la cancelación aplica al final del periodo ya pagado.",
      ],
    },
    {
      h: "Propiedad intelectual",
      p: [
        "El diseño, los textos interpretativos y el software de Aluna nos pertenecen o están licenciados a nosotros. Tus datos de nacimiento y tus notas personales son tuyos.",
      ],
    },
    {
      h: "Limitación de responsabilidad",
      p: [
        "Aluna se ofrece “tal cual”, como herramienta de reflexión y entretenimiento. No garantizamos resultados y no somos responsables de decisiones tomadas con base en el contenido de la app (ver Descargo de responsabilidad).",
      ],
    },
    {
      h: "Cambios a estos términos",
      p: [
        "Podemos actualizar estos términos; si el cambio es significativo te lo anunciaremos dentro de la app. Seguir usando Aluna después del aviso implica aceptar la versión vigente.",
      ],
    },
  ],
};

export const PRIVACY_ES: LegalDoc = {
  title: "Política de privacidad",
  updated: "Julio 2026",
  intro:
    "Tu cielo es tuyo. Esta política explica qué datos guardamos, para qué, y cómo puedes borrarlos.",
  sections: [
    {
      h: "Datos que recogemos",
      p: [
        "Cuenta: tu correo electrónico y credenciales de acceso (gestionadas por nuestro proveedor de autenticación).",
        "Perfil de nacimiento: nombre, fecha, hora y lugar de nacimiento, y género gramatical para las lecturas. Puedes añadir perfiles de otras personas bajo tu responsabilidad.",
        "Contenido personal: tus intenciones, manifestaciones y notas de diario, si decides escribirlas.",
      ],
    },
    {
      h: "Para qué los usamos",
      p: [
        "Para calcular tu carta, números y pilares, y personalizar las lecturas. Nada más.",
        "Si activas las lecturas con IA, el contenido necesario para generar tu lectura se envía al proveedor de IA configurado; no se usa para publicidad.",
        "No vendemos tus datos. No hay publicidad de terceros en Aluna.",
      ],
    },
    {
      h: "Dónde viven tus datos",
      p: [
        "En nuestra base de datos gestionada (Supabase), con acceso restringido por reglas de seguridad a nivel de fila: solo tu cuenta puede leer tus perfiles y notas.",
      ],
    },
    {
      h: "Tus derechos",
      p: [
        "Puedes ver, corregir o borrar tus datos desde la app, o escribirnos para ejercer acceso, rectificación, eliminación o portabilidad.",
        "Al eliminar tu cuenta, tus perfiles, notas y lecturas se borran de la base de datos activa.",
      ],
    },
    {
      h: "Contacto",
      p: [
        "Para cualquier tema de privacidad, escríbenos desde Ajustes → Ayuda y soporte.",
      ],
    },
  ],
};

export const DISCLAIMER_ES: LegalDoc = {
  title: "Descargo de responsabilidad",
  updated: "Julio 2026",
  intro:
    "Aluna está hecha con rigor técnico y cariño por las tradiciones que interpreta. Aun así, es importante decir esto claro:",
  sections: [
    {
      h: "Naturaleza del contenido",
      p: [
        "La astrología, la numerología y los Cuatro Pilares son sistemas simbólicos de autoconocimiento. Aluna los ofrece como herramienta de reflexión, inspiración y entretenimiento — no como ciencia predictiva.",
      ],
    },
    {
      h: "No es consejo profesional",
      p: [
        "Nada en Aluna constituye consejo médico, psicológico, legal ni financiero. Para decisiones de salud, dinero, trabajo o relaciones importantes, consulta a profesionales cualificados.",
        "Si atraviesas una crisis emocional, busca apoyo profesional o líneas de ayuda de tu país. Aluna no sustituye terapia.",
      ],
    },
    {
      h: "Lecturas generadas con IA",
      p: [
        "Las lecturas extendidas se generan con modelos de inteligencia artificial a partir de tus datos astrológicos. Pueden contener imprecisiones; tómalas como un espejo poético, no como una verdad literal.",
      ],
    },
    {
      h: "Tus decisiones son tuyas",
      p: [
        "Usa lo que resuene y suelta lo que no. La última palabra sobre tu vida siempre la tienes tú.",
      ],
    },
  ],
};
