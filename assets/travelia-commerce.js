function catalogByHandle(url) {
  return import(url).then(({ catalog }) => new Map(
    Object.values(catalog).filter(({ handle }) => handle).map((destination) => [destination.handle, destination]),
  )).catch(() => new Map());
}

const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
const regionByDepartment = {
  amazonas: 'Selva', ancash: 'Sierra', arequipa: 'Sierra', cusco: 'Sierra', ica: 'Costa',
  'la libertad': 'Costa', lima: 'Costa', loreto: 'Selva', 'madre de dios': 'Selva', puno: 'Sierra', tumbes: 'Costa',
};
const filterTypes = ['Aventura', 'Naturaleza', 'Cultura e historia', 'Relajación'];

function categories(profile, productType) {
  if (!profile) {
    const match = filterTypes.filter((type) => normalize(productType).includes(normalize(type)));
    return match.length ? match : [productType].filter(Boolean);
  }
  const groups = new Set();
  if (profile.types.includes('montaña') || profile.interests.some((interest) => ['aventura', 'trekking'].includes(interest))) groups.add('Aventura');
  if (profile.types.includes('naturaleza')) groups.add('Naturaleza');
  if (profile.types.includes('cultura')) groups.add('Cultura e historia');
  if (profile.interests.includes('descanso')) groups.add('Relajación');
  return [...groups];
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
    const search = this.querySelector('[data-search]');
    const budget = this.querySelector('[data-budget-filter]');
    const clear = this.querySelector('[data-clear-filters]');
    const result = this.querySelector('[data-filter-result]');
    const data = cards.map((card) => {
      const profile = catalog.get(card.dataset.handle);
      const department = card.dataset.region ?? '';
      const types = categories(profile, card.dataset.productType ?? '');
      const label = card.querySelector('[data-experience-type]');
      if (label && types.length) {
        label.textContent = types.join(' · ');
        label.hidden = false;
      }
      return {
        card,
        region: profile?.area ?? regionByDepartment[normalize(department)] ?? '',
        types,
        price: Number(card.dataset.price),
        searchable: normalize([card.querySelector('h3')?.textContent, profile?.name, department].filter(Boolean).join(' ')),
      };
    });

    const filter = () => {
      let shown = 0;
      const terms = normalize(search.value).split(/\s+/).filter(Boolean);
      const maximum = budget.value !== '' && budget.validity.valid ? Math.round(budget.valueAsNumber * 100) : Infinity;
      for (const item of data) {
        item.card.hidden = Boolean(
          (region.value && item.region !== region.value) ||
          (type.value && !item.types.includes(type.value)) ||
          (Number.isFinite(maximum) && !(item.price <= maximum)) ||
          terms.some((term) => !item.searchable.includes(term))
        );
        if (!item.card.hidden) shown++;
      }
      result.textContent = shown ? shown + (shown === 1 ? ' experiencia' : ' experiencias') : 'Ninguna experiencia coincide con los filtros.';
    };
    for (const field of [region, type]) field.addEventListener('change', filter, { signal });
    for (const field of [search, budget]) field.addEventListener('input', filter, { signal });
    clear.addEventListener('click', () => {
      for (const field of [search, budget, region, type]) field.value = '';
      search.focus();
      filter();
    }, { signal });
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
