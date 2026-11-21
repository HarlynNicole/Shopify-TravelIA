import { catalog } from './travelia-destinations.js';

const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' });
const normalize = (text) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const categories = ['Transporte', 'Alojamiento', 'Alimentación', 'Entradas', 'Actividades', 'Otros gastos'];

export function findDestination(message, trip) {
  const query = normalize(message);
  const aliases = { paracas: 'paracas', ballestas: 'paracas', chan: 'chanchan', manu: 'manu', pacaya: 'pacaya', manglares: 'manglares', titicaca: 'titicaca', huacachina: 'huacachina', colca: 'colca', gocta: 'gocta', vinicunca: 'vinicunca' };
  const match = Object.entries(catalog).find(([, profile]) => query.includes(normalize(profile.name)));
  return match?.[0] ?? Object.entries(aliases).find(([key]) => new RegExp('\\b' + key + '\\b').test(query))?.[1] ??
    (Object.hasOwn(catalog, trip?.id) ? trip.id : null);
}

export function budgetReport(trip, history) {
  const values = new Map();
  const units = new Map();
  const pattern = /(transporte|alojamiento|alimentacion|entradas|actividades|otros(?: gastos)?)\s*:\s*(?:s\/\s*)?(\d{1,7}(?:[.,]\d{1,2})?)(?![\d.,])(?:\s*(por persona|grupo|grupal))?/g;
  for (const message of history) {
    if (message.role !== 'user') continue;
    for (const [, category, number, unit] of normalize(message.content).matchAll(pattern)) {
      const key = category.startsWith('otros') ? 'otros gastos' : category;
      values.set(key, +number.replace(',', '.'));
      units.set(key, unit === 'por persona' ? 'individual' : 'group');
    }
  }
  const travelers = Number.isInteger(trip?.count) && trip.count >= 1 && trip.count <= 50 ? trip.count : null;
  let subtotal = 0;
  let individual = 0;
  const lines = categories.map((category) => {
    const key = normalize(category);
    if (!values.has(key)) return '• ' + category + ': pendiente de consulta.';
    const value = values.get(key);
    const personal = units.get(key) === 'individual';
    if (personal && !travelers) {
      individual += value;
      return '• ' + category + ': ' + money.format(value) + ' por persona, dato aportado; falta el número de viajeros.';
    }
    const groupValue = personal ? value * travelers : value;
    subtotal += groupValue;
    return '• ' + category + ': ' + money.format(groupValue) + ' para el grupo, dato aportado sin verificar.';
  });
  const totals = values.size ? [
    subtotal || individual === 0 ? 'Subtotal de conceptos con monto grupal: ' + money.format(subtotal) +
      (travelers ? ' (' + money.format(subtotal / travelers) + ' por persona en promedio).' : '.') : '',
    individual ? 'Subtotal de conceptos individuales: ' + money.format(individual) + ' por persona.' : '',
  ].filter(Boolean).join('\n') : 'Aún no hay importes de proveedores para calcular un subtotal.';
  const reference = trip?.budget?.total ? 'Presupuesto declarado para ' + trip.count + ' viajero(s) y ' +
    trip.days + ' día(s): ' + trip.budget.total + ' de referencia para el grupo (' + trip.budget.individual +
    ' por persona).\n' : '';
  return reference + lines.join('\n') + '\n' + totals +
    '\nEl desglose solo incluye montos aportados. Para sumar otro concepto escribe, por ejemplo, «Transporte: 120 grupo» o «Alimentación: 60 por persona».';
}

export function isBudgetQuestion(message, previousTopic) {
  const query = normalize(message);
  return /\b(costo|costos|costaria|precio|precios|cuesta|tarifa|tarifas|presupuesto|gastaria|gasto|gastos|desglose)\b/.test(query) ||
    /\b(transporte|alojamiento|alimentacion|entradas|actividades|otros(?: gastos)?)\s*:\s*(?:s\/\s*)?\d/.test(query) ||
    (previousTopic === 'budget' && /\b(total|cuanto|por persona|familia|subtotal)\b/.test(query));
}

export function localAdvice(message, trip, history, previousTopic) {
  const query = normalize(message);
  const previousDestination = history.slice(0, -1).findLast((entry) => entry.role === 'user' && findDestination(entry.content, null));
  const id = findDestination(message, trip) ?? (previousDestination && findDestination(previousDestination.content, null));
  const profile = catalog[id];
  if (isBudgetQuestion(message, previousTopic)) return { topic: 'budget', text: budgetReport(trip, history) };
  if (/\b(dia mas|otro dia|agrega un dia|modifica|cambia|ajusta)\b/.test(query)) {
    if (!trip) return { topic: 'change', text: 'Genera un itinerario para que pueda revisar los días disponibles.' };
    const extra = /\b(dia mas|otro dia|agrega un dia)\b/.test(query);
    if (extra && trip.days >= 30) return { topic: 'change', text: 'Tu itinerario ya tiene 30 días. Podemos revisar qué actividades intercambiar dentro de ese período.' };
    return { topic: 'change', text: 'Tu plan actual para ' + trip.name + ' dura ' + trip.days + ' día(s). ' +
      (extra ? 'Con un día adicional serían ' + (trip.days + 1) + '. Considera dejar ese día para una visita cercana o descanso y revisa alimentación, traslados y una posible noche adicional.' :
        'Indícame qué día o actividad quieres cambiar para acotar la sugerencia.') + ' La propuesta original sigue visible.' };
  }
  if (/\b(economica|economico|barato|similar|similares|alternativa)\b/.test(query) && profile) {
    const options = Object.values(catalog).filter((item) => item !== profile && item.types.some((type) => profile.types.includes(type)) &&
      item.band <= profile.band && item.minDays <= (trip?.days ?? 7)).slice(0, 3);
    return { topic: 'alternatives', text: options.length ? 'Compara estas alternativas de la guía: ' + options.map((option) => option.name).join(', ') + '. El costo real depende del punto de salida y de las tarifas que consigas.' :
      'Para buscar alternativas con menos traslados, indica desde dónde partes y cuántos días tienes.' };
  }
  if (/\b(incluye|itinerario|lugares|visitare|jornadas)\b/.test(query) && trip) {
    return { topic: 'itinerary', text: 'Tu itinerario orientativo: ' + trip.itinerary.slice(0, 10).map((day) => 'Día ' + day.day + ': ' + day.title).join(' · ') +
      (trip.days > 10 ? '. Puedes consultar las demás jornadas en el resultado.' : '.') + ' Las jornadas son sugerencias y no representan reservas.' };
  }
  if (!profile) return { topic: 'destination', text: 'Dime qué destino de la guía quieres consultar o genera tu itinerario para que pueda usar sus detalles.' };
  if (/\b(llegar|transporte|traslado|bus|tren|avion)\b/.test(query)) {
    return { topic: 'transport', text: 'Punto de referencia para ' + profile.name + ': ' + profile.base +
      (trip?.transport ? '. Marcaste «' + trip.transport + '» como preferencia' : '') +
      '. Indícame tu ciudad de salida y confirma las conexiones y el último tramo con un operador local.' };
  }
  if (/\b(alojamiento|hotel|dormir|hospedar)\b/.test(query)) {
    return { topic: 'stay', text: 'Consulta opciones cerca de ' + profile.base +
      (trip?.stay ? '. Tu preferencia es «' + trip.stay + '»' : '') +
      '. Antes de reservar, confirma la ubicación, el traslado al circuito y las condiciones para tu grupo.' };
  }
  if (/\b(llevar|ropa|equipaje|prepar)\w*/.test(query)) {
    return { topic: 'preparation', text: profile.advice ?? 'Lleva agua, protección solar y calzado cómodo. Consulta condiciones del clima y acceso antes de salir.' };
  }
  return { topic: 'destination', text: profile.description + ' Atractivos: ' + profile.highlight + ' y ' + profile.nearby +
    (profile.highlights ? '. Actividades: ' + profile.highlights.join(', ') : '') +
    (profile.visit ? '. Visita orientativa: ' + profile.visit : '') + '.' };
}
