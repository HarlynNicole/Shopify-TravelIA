const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

class TraveliaDirectory extends HTMLElement {
  #listeners;

  async connectedCallback() {
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    const count = this.querySelector('[data-count]');
    try {
      const { catalog } = await import(this.dataset.catalog);
      if (signal.aborted) return;
      const list = this.querySelector('[data-cards]');
      const filters = this.querySelector('.td-filters');
      const buttons = [...filters.querySelectorAll('[data-area]')];
      const overrides = new Map([...this.querySelectorAll('[data-destination]')].map((item) => [item.dataset.destination, item]));
      const cards = Object.entries(catalog).map(([id, data]) => [data.area, this.createCard(id, data, overrides.get(id))]);
      function filter(area) {
        let shown = 0;
        for (const [cardArea, card] of cards) {
          card.hidden = Boolean(area && area !== cardArea);
          if (!card.hidden) shown++;
        }
        count.textContent = shown + (shown === 1 ? ' destino' : ' destinos');
        buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.area === area)));
      }
      list.replaceChildren(...cards.map(([, card]) => card));
      buttons.forEach((button) => button.addEventListener('click', () => filter(button.dataset.area), { signal }));
      filter('');
      filters.hidden = false;
    } catch {
      if (!signal.aborted) count.textContent = 'No pudimos cargar la guía. Vuelve a cargar esta página.';
    }
  }

  createCard(id, data, override) {
    const card = node('li', '', 'destination td-card');
    const imageBox = node('div', '', 'destination-photo');
    const image = node('img');
    const merchantPhoto = override?.querySelector('[data-photo]')?.dataset.photo;
    image.src = merchantPhoto || data.photo;
    image.alt = data.name;
    image.loading = 'lazy';
    image.width = 800;
    image.height = 600;
    imageBox.append(image);
    const copy = node('div', '', 'destination-copy');
    copy.append(node('p', data.area + ' · ' + data.region, 'eyebrow'), node('h3', data.name), node('p', data.description));
    if (data.highlights) {
      const details = node('details');
      details.append(node('summary', 'Qué ver y cómo prepararte'),
        node('p', 'Visita orientativa: ' + data.visit),
        node('p', 'Experiencia: ' + data.types.map((type) => ({naturaleza:'Naturaleza',montaña:'Montaña y aventura',cultura:'Cultura e historia',ciudad:'Gastronomía y ciudad'})[type]).join(' · ')),
        node('p', 'Atractivos: ' + [data.highlight, data.nearby].join(' · ')),
        node('p', 'Actividades: ' + data.highlights.join(' · ')), node('p', data.advice));
      copy.append(details);
    }
    if (data.credit && !merchantPhoto) {
      const credit = node('small', '', 'td-credit');
      const source = node('a', 'Foto: ' + data.credit.author);
      const license = node('a', data.credit.label);
      source.href = data.credit.source;
      license.href = data.credit.license;
      credit.append(source, ' · ', license);
      copy.append(credit);
    }
    const actions = node('div', '', 'td-actions');
    const planning = node('a', 'Planificar este destino');
    const url = new URL(this.dataset.home, location.origin);
    url.searchParams.set('destino', id);
    url.hash = 'planifica';
    planning.href = url.href;
    actions.append(planning);
    const product = override?.querySelector('[data-price]');
    if (product) {
      const experience = node('a', 'Ver experiencia · ' + product.dataset.price);
      experience.href = product.href;
      actions.append(experience);
    }
    copy.append(actions);
    card.append(imageBox, copy);
    return card;
  }

  disconnectedCallback() {
    this.#listeners?.abort();
  }
}

if (!customElements.get('travelia-directory')) customElements.define('travelia-directory', TraveliaDirectory);
