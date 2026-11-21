const types = {
  naturaleza: 'Naturaleza', montaña: 'Montaña y aventura', cultura: 'Cultura e historia', ciudad: 'Gastronomía y ciudad',
};

function catalogByHandle(url) {
  return import(url).then(({ catalog }) => new Map(
    Object.values(catalog).filter(({ handle }) => handle).map((destination) => [destination.handle, destination]),
  )).catch(() => new Map());
}

function addOptions(select, values) {
  for (const value of [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'))) {
    select.add(new Option(value, value));
  }
}

class TraveliaExperiences extends HTMLElement {
  #listeners;

  async connectedCallback() {
    this.#listeners?.abort();
    this.#listeners = new AbortController();
    const { signal } = this.#listeners;
    const cards = [...this.querySelectorAll('[data-experience]')];
    if (!cards.length) return;
    const catalog = await catalogByHandle(this.dataset.catalog);
    if (signal.aborted) return;
    const region = this.querySelector('[data-region-filter]');
    const type = this.querySelector('[data-type-filter]');
    const result = this.querySelector('[data-filter-result]');
    const data = cards.map((card) => {
      const profile = catalog.get(card.dataset.handle);
      return { card, region: card.dataset.region, types: profile?.types.map((key) => types[key]) ?? [card.dataset.productType] };
    });
    region.options.length = type.options.length = 1;
    addOptions(region, data.map((item) => item.region));
    addOptions(type, data.flatMap((item) => item.types));
    region.closest('label').hidden = region.options.length < 2;
    type.closest('label').hidden = type.options.length < 3;
    if (region.closest('label').hidden && type.closest('label').hidden) return;

    const filter = () => {
      let shown = 0;
      for (const item of data) {
        item.card.hidden = Boolean((region.value && item.region !== region.value) || (type.value && !item.types.includes(type.value)));
        if (!item.card.hidden) shown++;
      }
      result.textContent = shown ? shown + (shown === 1 ? ' experiencia' : ' experiencias') : 'Ninguna experiencia coincide con los filtros.';
    };
    region.addEventListener('change', filter, { signal });
    type.addEventListener('change', filter, { signal });
    filter();
    this.querySelector('[data-filters]').hidden = false;
  }

  disconnectedCallback() { this.#listeners?.abort(); }
}

if (!customElements.get('travelia-experiences')) customElements.define('travelia-experiences', TraveliaExperiences);

const catalogScript = document.querySelector('script[data-commerce-catalog]');
const attractions = document.querySelector('[data-guide-attractions]');
if (catalogScript && attractions) {
  catalogByHandle(catalogScript.dataset.commerceCatalog).then((catalog) => {
    const profile = catalog.get(attractions.dataset.handle);
    if (!profile) return;
    attractions.textContent = [profile.highlight, profile.nearby].filter(Boolean).join(' · ');
    attractions.hidden = false;
    attractions.previousElementSibling.hidden = false;
  });
}
