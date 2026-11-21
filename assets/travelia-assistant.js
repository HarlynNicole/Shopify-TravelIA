class TraveliaAssistant extends HTMLElement {
  #listeners;
  #trip = null;
  #revision = 0;

  connectedCallback() {
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    const launcher = this.querySelector('.ta-launch');
    const panel = this.querySelector('.ta-panel');
    const chat = this.querySelector('.ta-chat');
    const status = this.querySelector('[data-chat-status]');
    const note = this.querySelector('[data-note]');
    const close = this.querySelector('[data-close]');
    const form = this.querySelector('form');
    const input = form.elements.message;
    const send = form.querySelector('[type=submit]');
    const prompts = [...this.querySelectorAll('.ta-prompts button')];
    const welcome = chat.firstElementChild.cloneNode(true);
    const endpoint = this.dataset.endpoint.startsWith('https://') ? this.dataset.endpoint : '';
    let messages = [];
    let topic;
    let busy = false;
    let core;
    if (endpoint) note.textContent = 'Al enviar, tu pregunta, historial y datos del itinerario se comparten con el servicio de IA. Evita compartir datos personales.';

    const open = (show) => {
      panel.hidden = !show;
      launcher.setAttribute('aria-expanded', String(show));
      (show ? input : launcher).focus();
    };
    const add = (role, content, source) => {
      const message = document.createElement('p');
      message.className = 'ta-message';
      if (role === 'user') message.dataset.user = '';
      message.textContent = source ? source + '\n' + content : content;
      chat.append(message);
      chat.scrollTop = chat.scrollHeight;
      return message;
    };
    launcher.addEventListener('click', () => open(panel.hidden), { signal });
    close.addEventListener('click', () => open(false), { signal });
    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        open(false);
      }
    }, { signal });
    document.addEventListener('travelia:trip', ({ detail }) => {
      this.#trip = detail;
      this.#revision++;
      messages = [];
      topic = undefined;
      chat.replaceChildren(welcome.cloneNode(true));
      this.querySelector('[data-trip]').textContent = detail ? 'Itinerario: ' + detail.name : 'Guía de viaje';
    }, { signal });
    prompts.forEach((button) => button.addEventListener('click', () => {
      input.value = button.textContent.trim();
      form.requestSubmit();
    }, { signal }));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question || busy) return;
      const revision = this.#revision;
      const trip = this.#trip;
      input.value = '';
      add('user', question);
      messages.push({ role: 'user', content: question });
      const conversation = messages.slice(-16);
      busy = send.disabled = true;
      prompts.forEach((button) => { button.disabled = true; });
      status.textContent = endpoint ? 'Consultando a Gemini… El primer mensaje puede tardar alrededor de un minuto.' : 'Preparando respuesta…';
      status.hidden = false;
      try {
        let reply;
        let source = 'Orientación de Travelia';
        if (endpoint) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: conversation, trip, topic }),
              signal: AbortSignal.any([signal, AbortSignal.timeout(85000)]),
            });
            if (response.status === 429) {
              if (!signal.aborted && revision === this.#revision) add('assistant', 'El asistente alcanzó su límite de consultas. Inténtalo más tarde.');
              return;
            }
            if (!response.headers.get('content-type')?.includes('application/json') &&
                (response.ok || [502, 503, 504].includes(response.status))) {
              if (revision === this.#revision) add('assistant', 'El servidor del asistente puede estar iniciando. Espera un momento y vuelve a enviar tu pregunta.');
              return;
            }
            const answer = await response.json();
            if (!response.ok) {
              const verified = ['gemini_configuration', 'gemini_timeout', 'gemini_unavailable', 'gemini_empty'].includes(answer?.code);
              const reference = typeof answer?.requestId === 'string' && /^[a-f0-9-]{36}$/.test(answer.requestId) ? ' Referencia: ' + answer.requestId : '';
              if (!signal.aborted && revision === this.#revision) {
                add('assistant', (verified && typeof answer.error === 'string' ? answer.error.slice(0, 240) : 'Gemini no está disponible en este momento. Inténtalo más tarde.') + reference);
              }
              return;
            }
            if (typeof answer.text !== 'string' || !answer.text.trim()) throw new Error('Respuesta inválida');
            reply = { text: answer.text.slice(0, 6000), topic: answer.topic };
            if (answer.source !== 'ai' || answer.provider !== 'gemini') throw new Error('Respuesta de Gemini no verificable');
            source = answer.generated === false ? 'Cálculo de Travelia · Gemini consultado' : 'Respuesta de Gemini · ' + String(answer.model ?? '').slice(0, 80);
          } catch (error) {
            if (signal.aborted) return;
            if (revision === this.#revision) {
              const message = error?.name === 'TimeoutError'
                ? 'El asistente tardó más de lo esperado. Si el servidor estaba inactivo, puede seguir iniciando. Inténtalo de nuevo en un momento.'
                : 'Gemini no está disponible en este momento. Inténtalo más tarde.';
              add('assistant', message);
            }
            return;
          }
        }
        if (!reply) {
          core ??= await import(this.dataset.core);
          reply = core.localAdvice(question, trip, conversation, topic);
        }
        if (signal.aborted || revision !== this.#revision) return;
        topic = reply.topic;
        add('assistant', reply.text, source);
        messages.push({ role: 'assistant', content: reply.text });
        messages = messages.slice(-16);
      } catch {
        if (!signal.aborted && revision === this.#revision) add('assistant', 'No pudimos preparar una respuesta. Vuelve a intentarlo.');
      } finally {
        if (revision === this.#revision && messages.at(-1)?.role === 'user') messages.pop();
        if (!signal.aborted) {
          busy = send.disabled = false;
          prompts.forEach((button) => { button.disabled = false; });
          status.hidden = true;
        }
      }
    }, { signal });
  }

  disconnectedCallback() {
    this.#listeners?.abort();
  }
}

if (!customElements.get('travelia-assistant')) customElements.define('travelia-assistant', TraveliaAssistant);
