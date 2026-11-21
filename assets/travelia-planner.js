const limaDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
});

function todayInLima() {
  const parts = Object.fromEntries(limaDate.formatToParts().map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

class TraveliaPlanner extends HTMLElement {
  #listeners;

  connectedCallback() {
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    const form = this.querySelector('form');
    const steps = [...form.querySelectorAll('fieldset')];
    const back = this.querySelector('[data-back]');
    const next = this.querySelector('[data-next]');
    const error = this.querySelector('[data-error]');
    const result = this.querySelector('[data-result]');
    const title = this.querySelector('[data-result-title]');
    let activeStep = 0;

    const showStep = (index, focus = true) => {
      activeStep = index;
      form.elements.date.min = todayInLima();
      steps.forEach((step, position) => {
        step.hidden = step.disabled = position !== index;
      });
      this.querySelector('[data-progress]').textContent = `Paso ${index + 1} de ${steps.length}`;
      back.hidden = index === 0;
      next.textContent = index === steps.length - 1 ? 'Ver mi itinerario' : 'Continuar';
      error.hidden = true;
      if (focus) steps[index].querySelector('input, select').focus();
    };

    const renderList = (selector, values) => {
      this.querySelector(selector).replaceChildren(...values.map((value) => {
        const li = document.createElement('li');
        li.textContent = value;
        return li;
      }));
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (activeStep < steps.length - 1) {
        showStep(activeStep + 1);
        return;
      }
      for (const step of steps) step.disabled = false;
      const answers = Object.fromEntries(new FormData(form));
      steps.forEach((step, index) => { step.disabled = index !== activeStep; });
      next.disabled = true;
      back.disabled = true;
      error.hidden = true;
      try {
        const { buildItinerary } = await import(this.dataset.engine);
        if (signal.aborted) return;
        const itinerary = buildItinerary(answers, todayInLima());
        title.textContent = `Tu viaje a ${itinerary.name}`;
        this.querySelector('[data-summary]').textContent =
          `${itinerary.days} días · ${itinerary.group} · ${itinerary.interest} · ${itinerary.total} por persona (${itinerary.daily} al día)`;
        renderList('[data-days]', itinerary.dayPlans.map(({ date, activity }) => `${date}. ${activity}`));
        renderList('[data-tips]', itinerary.recommendations);
        form.hidden = true;
        result.hidden = false;
        title.focus();
      } catch (failure) {
        error.textContent = failure instanceof RangeError ? failure.message :
          'El planificador no está disponible en este momento. Inténtalo de nuevo.';
        error.hidden = false;
      } finally {
        next.disabled = false;
        back.disabled = false;
      }
    }, { signal });

    back.addEventListener('click', () => showStep(activeStep - 1), { signal });
    this.querySelector('[data-reset]').addEventListener('click', () => {
      form.reset();
      result.hidden = true;
      form.hidden = false;
      showStep(0);
    }, { signal });

    result.hidden = true;
    form.hidden = false;
    showStep(0, false);
  }

  disconnectedCallback() {
    this.#listeners?.abort();
  }
}

if (!customElements.get('travelia-planner')) {
  customElements.define('travelia-planner', TraveliaPlanner);
}
