const limaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
});

function todayInLima() {
  const parts = Object.fromEntries(limaDate.formatToParts().map(({ type, value }) => [type, value]));
  return [parts.year, parts.month, parts.day].join('-');
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

class TraveliaPlanner extends HTMLElement {
  #listeners;

  async connectedCallback() {
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    let engine;
    try {
      engine = await import(this.dataset.engine);
    } catch {
      if (!signal.aborted) this.querySelector('[data-load-error]').hidden = false;
      return;
    }
    if (signal.aborted) return;
    this.bindForm(engine, signal);
  }

  bindForm({ buildItinerary, catalog, datedDuration, validateStep }, signal) {
    const form = this.querySelector('form');
    const steps = [...form.querySelectorAll('fieldset')];
    const result = this.querySelector('[data-result]');
    const error = this.querySelector('[data-error]');
    const next = this.querySelector('[data-next]');
    const back = this.querySelector('[data-back]');
    const derived = this.querySelector('[data-derived-days]');
    const intro = this.querySelector('[data-intro]');
    const durationBands = { breve: [1, 2], corto: [3, 4], semana: [5, 7], largo: [8, 30] };
    let step = 1;

    const answers = () => {
      const data = new FormData(form);
      return { ...Object.fromEntries(data), types: data.getAll('types'), activities: data.getAll('activities') };
    };

    const syncFields = () => {
      const a = answers();
      const fixed = a.dateMode === 'fija';
      const show = {
        destination: a.destinationMode === 'elegido',
        customDestination: a.destinationMode === 'elegido' && a.destination === 'otro',
        dates: fixed,
        duration: !fixed,
        budget: a.budgetBand === 'personalizado',
      };
      for (const section of form.querySelectorAll('[data-conditional]')) {
        section.hidden = !show[section.dataset.conditional];
      }
      const days = fixed && datedDuration(a.startDate, a.endDate);
      derived.hidden = !days;
      derived.textContent = days ? `${days} ${days === 1 ? 'día' : 'días'} según tus fechas, contando la salida y el retorno.` : '';
      form.elements.startDate.min = todayInLima();
      form.elements.endDate.min = a.startDate || todayInLima();
      const [minimum, maximum] = durationBands[a.durationBand] ?? [1, 30];
      form.elements.duration.min = minimum;
      form.elements.duration.max = maximum;
    };

    const showStep = (newStep, focus = true) => {
      step = newStep;
      steps.forEach((panel, i) => { panel.hidden = i + 1 !== step; });
      this.querySelector('[data-step-label]').textContent = `Pregunta ${step} de ${steps.length}`;
      this.querySelector('progress').value = step;
      back.hidden = step === 1;
      next.textContent = step === steps.length ? 'Generar mi itinerario' : 'Continuar';
      error.hidden = true;
      syncFields();
      if (focus) steps[step - 1].querySelector('legend').focus();
    };

    const showError = (message) => {
      error.textContent = message;
      error.hidden = false;
    };

    form.addEventListener('change', ({ target }) => {
      if (target.name === 'group') {
        if (target.value === 'solo' || target.value === 'pareja') {
          form.elements.adults.value = target.value === 'solo' ? 1 : 2;
          form.elements.children.value = 0;
        }
      }
      syncFields();
    }, { signal });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const a = answers();
      const today = todayInLima();
      const problem = validateStep(step, a, today);
      if (problem) return showError(problem);
      if (step < steps.length) return showStep(step + 1);
      for (let index = 1; index < step; index++) {
        const previousProblem = validateStep(index, a, today);
        if (previousProblem) {
          showStep(index);
          return showError(previousProblem);
        }
      }
      const itinerary = buildItinerary(a, today);
      this.renderResult(itinerary);
      document.dispatchEvent(new CustomEvent('travelia:trip', { detail: itinerary }));
      form.hidden = true;
      intro.hidden = true;
      result.hidden = false;
      this.querySelector('[data-title]').focus();
    }, { signal });

    back.addEventListener('click', () => showStep(step - 1), { signal });
    this.querySelector('[data-reset]').addEventListener('click', () => {
      form.reset();
      document.dispatchEvent(new CustomEvent('travelia:trip', { detail: null }));
      result.hidden = true;
      intro.hidden = false;
      form.hidden = false;
      showStep(1);
    }, { signal });
    this.querySelector('[data-print]').addEventListener('click', () => {
      result.dataset.printActive = '';
      try {
        window.print();
      } finally {
        delete result.dataset.printActive;
      }
    }, { signal });
    const field = form.elements.destination;
    const other = field.querySelector('option[value="otro"]');
    for (const [id, data] of Object.entries(catalog)) {
      if (![...field.options].some((option) => option.value === id)) field.add(new Option(data.name, id), other);
    }
    const destination = new URLSearchParams(location.search).get('destino');
    if (destination && [...form.elements.destination.options].some(({ value }) => value === destination && value !== 'otro')) {
      form.elements.destinationMode.value = 'elegido';
      form.elements.destination.value = destination;
    }
    result.hidden = true;
    intro.hidden = false;
    form.hidden = false;
    showStep(1, false);
  }

  renderResult(plan) {
    const photo = this.querySelector('[data-photo]');
    photo.hidden = !plan.photo;
    if (plan.photo) {
      photo.src = plan.photo;
      photo.alt = plan.name;
    } else {
      photo.removeAttribute('src');
    }
    const credit = this.querySelector('[data-photo-credit]');
    credit.hidden = !plan.credit;
    credit.replaceChildren();
    if (plan.credit) {
      const source = element('a', 'Foto: ' + plan.credit.author);
      source.href = plan.credit.source;
      const license = element('a', plan.credit.label);
      license.href = plan.credit.license;
      credit.append(source, ' · ', license);
    }
    const duration = `${plan.days} ${plan.days === 1 ? 'día' : 'días'}`;
    const group = `${plan.count} ${plan.count === 1 ? 'viajero' : 'viajeros'}`;
    this.querySelector('[data-title]').textContent = `Tu viaje a ${plan.name}`;
    this.querySelector('[data-origin]').textContent = plan.recommended ? 'Destino sugerido por Travelia' : 'Tu destino elegido';
    this.querySelector('[data-subtitle]').textContent = plan.region ? `${plan.region} · ${plan.date}` : plan.date;
    this.querySelector('[data-hero-details]').textContent = [duration, group, plan.pace, plan.budget.individual + ' por persona'].join(' · ');

    const rows = [
      ['Destino principal', plan.name],
      ['Duración', duration],
      ['Viajeros', `${group} · ${plan.companion} · Adultos: ${plan.adults} · Niños: ${plan.children}`],
      ['Tipo de experiencia', `${plan.pace} · ${plan.activities.join(', ')}`],
      ['Presupuesto por persona', plan.budget.individual],
      ['Presupuesto para el grupo', plan.budget.total],
      ['Alojamiento', plan.stay],
      ['Transporte', plan.transport],
    ];
    this.querySelector('[data-summary]').replaceChildren(...rows.map(([label, value]) => {
      const row = element('div');
      row.append(element('dt', label), element('dd', value));
      return row;
    }));

    this.querySelector('[data-days]').replaceChildren(...plan.itinerary.map((day) => {
      const card = element('li', '', 'tp-day');
      const details = element('div');
      details.append(element('p', `Día ${day.day}${day.date ? ' · ' + day.date : ''}`, 'tp-day-tag'), element('h5', day.title));
      const activities = element('ul');
      for (const { time, place, activity } of day.items) {
        const item = element('li');
        item.append(element('strong', `${time} · ${place}`), document.createTextNode(' — ' + activity));
        activities.append(item);
      }
      details.append(activities);
      card.append(details);
      if (plan.photo) {
        const image = element('img', '', 'tp-day-photo');
        image.src = plan.photo;
        image.alt = '';
        image.loading = 'lazy';
        image.width = 240;
        image.height = 160;
        card.append(image);
      }
      return card;
    }));
    this.querySelector('[data-tips]').replaceChildren(...plan.tips.map((tip) => element('li', tip)));
    const link = this.querySelector('[data-packages]');
    if (!link.dataset.catalog) link.dataset.catalog = link.getAttribute('href');
    const related = [...this.querySelectorAll('[data-handle]')].find(({ dataset }) => dataset.handle === plan.handle);
    link.href = related ? related.href : link.dataset.catalog;
  }

  disconnectedCallback() {
    this.#listeners?.abort();
  }
}

if (!customElements.get('travelia-planner')) customElements.define('travelia-planner', TraveliaPlanner);
