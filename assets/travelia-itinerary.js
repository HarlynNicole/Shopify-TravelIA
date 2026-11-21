const destinations = {
  colca: ['Cañón del Colca', 'Chivay', 'Mirador Cruz del Cóndor', 'pueblos del valle', 'mercado de Chivay'],
  gocta: ['Catarata de Gocta', 'Cocachimba', 'sendero a Gocta', 'bosque de la zona', 'comida regional de Amazonas'],
  kuelap: ['Kuélap', 'Nuevo Tingo', 'complejo arqueológico de Kuélap', 'miradores del valle', 'comida regional de Amazonas'],
  titicaca: ['Lago Titicaca', 'Puno', 'ruta lacustre por los Uros', 'ribera del Titicaca', 'mercado de Puno'],
  humantay: ['Laguna Humantay', 'Cusco', 'ruta a la laguna Humantay', 'miradores de Cusco', 'mercado de San Pedro'],
  machupicchu: ['Machu Picchu', 'Cusco', 'circuito autorizado de Machu Picchu', 'Valle Sagrado', 'mercado de San Pedro'],
  vinicunca: ['Montaña de 7 Colores', 'Cusco', 'ruta a Vinicunca', 'miradores de Cusco', 'mercado de San Pedro'],
  huacachina: ['Huacachina', 'Ica', 'paseo por el oasis de Huacachina', 'dunas de Ica', 'mercado de Ica'],
};

const interests = {
  cultura: 'Cultura',
  naturaleza: 'Naturaleza',
  aventura: 'Aventura',
  gastronomia: 'Gastronomía',
};

const groups = {
  solo: 'Por mi cuenta',
  pareja: 'En pareja',
  amigos: 'Con amigos',
  familia: 'En familia',
};

const highAltitude = new Set(['colca', 'titicaca', 'humantay', 'machupicchu', 'vinicunca']);
const formatter = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });

export function buildItinerary({ destination, date, duration, group, interest, budget }, today) {
  const profile = Object.hasOwn(destinations, destination) ? destinations[destination] : null;
  const days = Number(duration);
  const total = Number(budget);
  const parsedDate = new Date(`${date}T12:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === date && date >= today;

  if (!profile || !validDate || !Number.isInteger(days) || days < 1 || days > 14 ||
      !Object.hasOwn(groups, group) || !Object.hasOwn(interests, interest) ||
      !Number.isFinite(total) || total < 1 || total > 100000) {
    throw new RangeError('Revisa las seis respuestas antes de generar tu itinerario.');
  }

  const [name, base, highlight, outdoor, food] = profile;
  const elevated = highAltitude.has(destination);
  const optional = {
    cultura: `Explora el centro de ${base} y consulta las visitas culturales abiertas.`,
    naturaleza: `Dedica tiempo a ${outdoor} y respeta los senderos habilitados.`,
    aventura: `Consulta con operadores locales las rutas guiadas cerca de ${outdoor}.`,
    gastronomia: `Prueba especialidades locales en ${food}.`,
  };
  const dayPlans = Array.from({ length: days }, (_, i) => {
    const weekday = new Date(parsedDate);
    weekday.setUTCDate(weekday.getUTCDate() + i);
    let activity = optional[interest];
    if (i === 0 && (elevated || days > 2)) {
      activity = `Llega a ${base} y ${elevated ? 'reserva el día para aclimatarte' : 'recorre los alrededores'}.`;
    } else if (i === (elevated || days > 2 ? 1 : 0)) {
      activity = `Consulta el acceso y organiza tu visita a ${highlight}.`;
    } else if (i === days - 1) {
      activity = `${optional[interest]} Reserva tiempo para el regreso.`;
    } else if (i > 2) {
      activity = `Deja el día flexible para descansar o elegir otra actividad en ${base} según el presupuesto restante.`;
    }
    return {
      date: new Intl.DateTimeFormat('es-PE', { dateStyle: 'full', timeZone: 'UTC' }).format(weekday),
      activity,
    };
  });

  return {
    name,
    days,
    group: groups[group],
    interest: interests[interest],
    total: formatter.format(total),
    daily: formatter.format(total / days),
    dayPlans,
    recommendations: [
      'Confirma horarios, acceso, tarifas y transporte antes de reservar.',
      elevated && days === 1
        ? 'Considera ampliar el viaje si aún necesitas aclimatarte antes de la excursión.'
        : 'Reserva parte del presupuesto para imprevistos.',
      group === 'familia' ? 'Consulta la dificultad y las restricciones de edad de cada actividad.' :
        'Ajusta las actividades al ritmo de quienes viajan.',
    ],
  };
}
