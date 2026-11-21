import { catalog as defaultCatalog } from './travelia-destinations.js';

export { catalog } from './travelia-destinations.js';

export const labels = {
  types: { naturaleza: 'Playas y naturaleza', montaña: 'Montañas y aventura', cultura: 'Cultura e historia', ciudad: 'Gastronomía y ciudades', mixto: 'Una combinación de varios' },
  activities: { trekking: 'Caminatas y trekking', aventura: 'Deportes de aventura', cultura: 'Visitas culturales e históricas', comida: 'Gastronomía local', fotos: 'Fotografía y paisajes', descanso: 'Descanso y relajación', familia: 'Actividades familiares' },
  groups: { solo: 'Solo', pareja: 'En pareja', amigos: 'Con amigos', familia: 'En familia', organizado: 'En grupo organizado' },
  stays: { economico: 'Económico', estandar: 'Estándar', comodo: 'Cómodo', ninguno: 'No necesito alojamiento' },
  transport: { bus: 'Autobús', tren: 'Tren', avion: 'Avión', privado: 'Transporte privado', flexible: 'Sin preferencia' },
  pace: { relajado: 'Relajado', equilibrado: 'Equilibrado', intenso: 'Intenso' },
};

const budgetRanges = { bajo: [0, 300], medio: [300, 600], alto: [600, 1000], comodo: [1000, 1500], amplio: [1500, null] };
const durations = { breve: [1, 2], corto: [3, 4], semana: [5, 7], largo: [8, 30] };
const prices = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 });
const dayLabel = new Intl.DateTimeFormat('es-PE', { dateStyle: 'full', timeZone: 'UTC' });
const money = (amount) => prices.format(amount);
const owns = (object, key) => Object.hasOwn(object, key);
const integer = (value, min, max) => /^\d+$/.test(value) && +value >= min && +value <= max;
const dayMs = 86400000;

function utcDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function datedDuration(start, end) {
  const first = utcDate(start);
  const last = utcDate(end);
  return first && last && last >= first ? (+last - +first) / dayMs + 1 : null;
}

export function validateStep(step, a, today, catalog = defaultCatalog) {
  switch (step) {
    case 1:
      if (!['elegido', 'descubrir', 'recomendar'].includes(a.destinationMode)) return 'Elige cómo prefieres encontrar tu destino.';
      if (a.destinationMode === 'elegido' && !owns(catalog, a.destination) &&
          (a.destination !== 'otro' || !a.customDestination?.trim() || a.customDestination.length > 80)) return 'Selecciona un destino o escribe su nombre.';
      break;
    case 2: if (!a.types?.length || a.types.some((x) => !owns(labels.types, x))) return 'Elige al menos un tipo de destino.'; break;
    case 3: {
      if (!['flexible', 'fija'].includes(a.dateMode)) return 'Indica si tus fechas son flexibles.';
      if (a.dateMode === 'fija' && (!utcDate(a.startDate) || a.startDate < today || !datedDuration(a.startDate, a.endDate))) return 'Elige fechas válidas. El retorno debe ser el mismo día o posterior a la salida.';
      if (a.dateMode === 'fija' && datedDuration(a.startDate, a.endDate) > 30) return 'El planificador admite hasta 30 días.';
      break;
    }
    case 4:
      if (a.dateMode === 'flexible' && (!owns(durations, a.durationBand) || !integer(a.duration, ...durations[a.durationBand]))) return 'Selecciona un rango e indica la cantidad exacta de días.';
      break;
    case 5: if (!owns(labels.groups, a.group)) return 'Elige con quién viajarás.'; break;
    case 6: {
      if (!integer(a.adults, 1, 50) || !integer(a.children, 0, 49) || +a.adults + +a.children > 50) return 'Indica al menos un adulto y un máximo de 50 viajeros.';
      if (a.group === 'solo' && (+a.adults !== 1 || +a.children !== 0)) return 'Para viajar solo, indica un adulto y cero niños.';
      if (a.group === 'pareja' && (+a.adults !== 2 || +a.children !== 0)) return 'Para viajar en pareja, indica dos adultos y cero niños.';
      break;
    }
    case 7:
      if (!owns(budgetRanges, a.budgetBand) && a.budgetBand !== 'personalizado') return 'Selecciona un presupuesto.';
      if (a.budgetBand === 'personalizado' && (!/^\d+(\.\d{1,2})?$/.test(a.budget ?? '') || +a.budget < 1 || +a.budget > 100000)) return 'Ingresa un presupuesto entre S/ 1 y S/ 100,000.';
      break;
    case 8: if (!a.activities?.length || a.activities.some((x) => !owns(labels.activities, x))) return 'Selecciona al menos una actividad.'; break;
    case 9: if (!owns(labels.stays, a.stay) || !owns(labels.transport, a.transport)) return 'Selecciona alojamiento y transporte.'; break;
    case 10: if (!owns(labels.pace, a.pace)) return 'Elige el ritmo del viaje.'; break;
  }
  return '';
}

function score(profile, a, days, ceiling) {
  const typeMatches = profile.types.filter((type) => a.types.includes(type)).length;
  const activityMatches = profile.interests.filter((activity) => a.activities.includes(activity)).length;
  const budgetTier = [300, 600, 1000, 1500].filter((limit) => ceiling >= limit).length;
  const month = a.dateMode === 'fija' ? +a.startDate.slice(5, 7) : 0;
  const wetMonths = [1, 2, 3, 12].includes(month);
  const travelEffort = profile.band + (a.stay === 'ninguno' ? -1 : 0) + (a.transport === 'avion' ? 1 : 0);
  return typeMatches * 4 + activityMatches * 3 - Math.abs(profile.idealDays - days) * .45
    - Math.max(0, travelEffort - budgetTier) * 1.6
    + (profile.transport.includes(a.transport) ? 2 : 0)
    - (profile.altitude && days === 1 ? 7 : 0)
    - (profile.altitude && wetMonths && a.activities.includes('trekking') ? 2 : 0)
    - (profile.altitude && +a.children > 0 ? 2 : 0)
    + (a.pace === 'relajado' && profile.interests.includes('descanso') ? 2 : 0);
}

function getBudget(a, count) {
  if (a.budgetBand === 'personalizado') return { individual: money(+a.budget), total: money(+a.budget * count), ceiling: +a.budget };
  const [low, high] = budgetRanges[a.budgetBand];
  const display = (multiplier) => high === null ? 'Más de ' + money(low * multiplier) :
    low === 0 ? 'Menos de ' + money(high * multiplier) : money(low * multiplier) + ' – ' + money(high * multiplier);
  return { individual: display(1), total: display(count), ceiling: high ?? low };
}

function makeDays(profile, a, count, days, fixed) {
  const base = profile.base;
  const needsAcclimation = profile.altitude;
  const enoughTime = days >= (profile.minDays ?? 1);
  const options = {
    trekking: ['Caminata de reconocimiento', profile.nearby, 'Consulta senderos habilitados y elige una distancia acorde al grupo.'],
    aventura: ['Actividad de aventura', profile.nearby, 'Consulta opciones guiadas, condiciones y requisitos con un operador local.'],
    cultura: ['Historia y vida local', base, 'Elige una visita cultural o un recorrido por el centro.'],
    comida: ['Sabores de la región', profile.food, 'Dedica tiempo a probar especialidades y consultar opciones para el grupo.'],
    fotos: ['Paisajes y fotografía', profile.nearby, 'Busca un punto accesible para fotografiar el paisaje.'],
    descanso: ['Una pausa en el destino', base, 'Deja tiempo libre y elige un paseo corto si te apetece.'],
    familia: ['Recorrido en familia', base, 'Elige una actividad con pausas, servicios cercanos y dificultad adecuada.'],
  };

  const start = fixed ? utcDate(a.startDate) : null;
  const agenda = [];
  if (needsAcclimation || days > 2) agenda.push([needsAcclimation ? 'Llegada y aclimatación' : 'Llegada y orientación', base,
    needsAcclimation ? 'Deja el día libre para adaptarte a la altura y prioriza el descanso.' :
      'Organiza la llegada y explora los alrededores a pie si tienes tiempo.']);
  const highlightDay = agenda.length;
  if (enoughTime && agenda.length < days) agenda.push(['Visita principal', profile.highlight,
    profile.custom ? 'Elige un punto de interés de la zona y confirma su acceso con fuentes locales.' :
      'Confirma el acceso, disponibilidad y traslado antes de programar la visita.']);

  const queue = enoughTime ? a.activities.map((key) => options[key]) : [];
  if (!enoughTime && !agenda.length) agenda.push(['Orientación en destino', base, 'Confirma con un operador cuánto tiempo requiere el circuito.']);
  for (let index = 0; index < days; index++) {
    const entry = agenda[index] ?? queue.shift() ?? (index === days - 1 ?
      ['Cierre y regreso', base, 'Deja margen para el traslado de regreso.'] :
      ['Día libre', base, 'Ajusta la jornada según el presupuesto y el descanso del grupo.']);
    const [title, place, activity] = entry;
    const acclimationDay = needsAcclimation && index === 0;
    const items = [{ time: index === 0 || index === days - 1 ? 'Horario flexible' : 'Mañana sugerida', place, activity }];
    const extra = !acclimationDay && a.pace === 'intenso' && index < days - 1 ? queue.shift() : null;
    if (extra) items.push({ time: 'Tarde sugerida', place: extra[1], activity: extra[2] });
    if (index === highlightDay && a.pace === 'equilibrado' && index < days - 1) {
      items.push({ time: 'Tarde sugerida', place: base, activity: 'Deja margen para el retorno y una pausa.' });
    }
    if (index === days - 1 && title !== 'Cierre y regreso' && days > 1) {
      items.push({ time: 'Final de la jornada', place: base, activity: 'Reserva margen para el traslado de regreso.' });
    }
    const date = start ? dayLabel.format(new Date(+start + index * dayMs)) : '';
    agenda[index] = { day: index + 1, date, title, items };
  }
  return agenda;
}

export function buildItinerary(a, today, catalog = defaultCatalog) {
  for (let step = 1; step <= 10; step++) {
    const problem = validateStep(step, a, today, catalog);
    if (problem) throw new RangeError(problem);
  }
  const days = a.dateMode === 'fija' ? datedDuration(a.startDate, a.endDate) : +a.duration;
  const count = +a.adults + +a.children;
  const budget = getBudget(a, count);
  let id = a.destinationMode === 'elegido' ? a.destination : null;
  if (id === null) {
    const candidates = Object.entries(catalog).filter(([, destination]) =>
      destination.minDays <= days && (destination.band < 4 || !destination.visit || budget.ceiling >= 1000));
    const preferred = candidates.filter(([, destination]) => !a.area || destination.area === a.area);
    id = (preferred.length ? preferred : candidates)
      .sort(([, left], [, right]) => score(right, a, days, budget.ceiling) - score(left, a, days, budget.ceiling))[0][0];
  }
  const custom = id === 'otro';
  const name = custom ? a.customDestination.trim() : catalog[id].name;
  const profile = custom ? { name, base: name, highlight: name, nearby: name, food: name, custom } : catalog[id];
  const itinerary = makeDays(profile, a, count, days, a.dateMode === 'fija');
  const tips = ['Antes de reservar, verifica tarifas, traslados, accesos y condiciones.'];
  if (a.transport !== 'flexible') tips.push('Comprueba si hay rutas en el medio de transporte elegido. Puede hacer falta combinar varios medios.');
  if (+a.children > 0) tips.push('Confirma las restricciones de edad y consulta tarifas infantiles con cada proveedor.');
  if (profile.advice) tips.push(profile.advice);
  if (days < (profile.minDays ?? 1)) tips.push('El tiempo elegido puede quedarse corto. La propuesta deja fuera el circuito principal hasta que confirmes una duración viable.');
  if (a.area && profile.area && profile.area !== a.area && a.destinationMode !== 'elegido') tips.push('No encontramos una opción de la zona preferida para el tiempo y presupuesto indicados. Esta sugerencia pertenece a otra zona.');
  if (profile.altitude) tips.push('Prioriza la aclimatación y adapta el esfuerzo a las condiciones del grupo.');
  if (a.types.includes('naturaleza') && a.destinationMode !== 'elegido') tips.push('La recomendación compara catorce destinos del catálogo peruano. El tipo naturaleza incluye paisajes de costa, sierra y selva.');
  return {
    id, name, region: profile.region, photo: profile.photo, credit: profile.credit, handle: profile.handle, days, count,
    adults: +a.adults, children: +a.children, budget, itinerary, tips,
    companion: labels.groups[a.group], stay: labels.stays[a.stay], transport: labels.transport[a.transport],
    pace: labels.pace[a.pace], activities: a.activities.map((key) => labels.activities[key]),
    date: a.dateMode === 'fija' ? dayLabel.format(utcDate(a.startDate)) + ' – ' + dayLabel.format(utcDate(a.endDate)) : 'Fechas flexibles',
    recommended: a.destinationMode !== 'elegido',
  };
}
