import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, nothing } from '/kempo-ui/lit-all.min.js';
import Toast from '/kempo-ui/components/Toast.js';
import '/kempo-ui/components/Icon.js';
import '/kempo-ui/components/Spinner.js';
import '/products/components/MoneyInput.js';
import { getConfig, getProducts, getCategories, getTypes, displayMoney } from '/products/sdk.js';
import { getSale, createSale, updateSale } from '/discounts/sdk.js';
import { exampleText, toLocalInput, fromLocalInput } from './format.js';

/*
  The form for one sale, to make a new one or change one that exists. It says what the sale takes off, whether it may
  combine with other discounts, what it covers (every product, or products, categories and product types added to it),
  and when it runs.

    <k-discounts-sale-form from-url></k-discounts-sale-form>      reads ?id= for the sale to change

  Saving returns to the list.
*/
const BASE = '/admin/extension/kempo-discounts';

const BLANK = { name: '', kind: 'percent', value: null, stackable: false, allProducts: false, paused: false, startsAt: '', endsAt: '', targets: [] };

export default class SaleForm extends ShadowComponent {
  static properties = {
    saleId: { type: String, attribute: 'sale-id' },
    fromUrl: { type: Boolean, attribute: 'from-url' },
    config: { state: true },
    draft: { state: true },
    categories: { state: true },
    types: { state: true },
    names: { state: true },
    results: { state: true },
    searching: { state: true },
    loading: { state: true },
    saving: { state: true },
    error: { state: true },
  };

  constructor(){
    super();
    this.saleId = '';
    this.fromUrl = false;
    this.config = null;
    this.draft = { ...BLANK, targets: [] };
    this.categories = [];
    this.types = [];
    this.names = new Map();
    this.results = [];
    this.searching = false;
    this.loading = true;
    this.saving = false;
    this.error = '';
    this.searchTimer = null;
  }

  /*
    Lifecycle callbacks
  */
  connectedCallback(){
    super.connectedCallback();
    if(this.fromUrl) this.saleId = new URLSearchParams(location.search).get('id') ?? '';
    this.load();
  }

  /*
    Utility functions
  */
  get editing(){
    return Boolean(this.saleId);
  }

  load = async () => {
    const [[configError, config], [categoriesError, categories], [typesError, types]] = await Promise.all([getConfig(), getCategories(), getTypes()]);
    if(configError || categoriesError || typesError){
      this.error = (configError || categoriesError || typesError).msg;
      this.loading = false;
      return;
    }
    this.config = config;
    this.categories = categories.categories ?? [];
    this.types = types.types ?? types.items ?? [];

    if(this.editing){
      const [error, data] = await getSale(this.saleId);
      if(error){
        this.error = error.msg;
        this.loading = false;
        return;
      }
      const { sale } = data;
      this.draft = {
        name: sale.name, kind: sale.kind, value: sale.value, stackable: sale.stackable, allProducts: sale.allProducts, paused: sale.paused,
        startsAt: toLocalInput(sale.startsAt), endsAt: toLocalInput(sale.endsAt), targets: sale.targets,
      };
      await this.loadNames(sale.targets.filter(target => target.type === 'product').map(target => target.key));
    }
    this.loading = false;
  };

  /* The names of the products in the sale, which it only holds the ids of. */
  loadNames = async ids => {
    if(!ids.length) return;
    const [, data] = await getProducts({ ids: ids.join(','), limit: ids.length });
    this.names = new Map([...this.names, ...(data?.items ?? []).map(product => [product.id, product.name])]);
  };

  set = changes => {
    this.draft = { ...this.draft, ...changes };
  };

  has = (type, key) => this.draft.targets.some(target => target.type === type && target.key === key);

  toggle = (type, key) => {
    this.set({ targets: this.has(type, key) ? this.draft.targets.filter(target => !(target.type === type && target.key === key)) : [...this.draft.targets, { type, key }] });
  };

  /*
    Event handlers
  */
  handleSearch = event => {
    clearTimeout(this.searchTimer);
    const q = event.target.value.trim();
    if(!q){
      this.results = [];
      return;
    }
    this.searchTimer = setTimeout(async () => {
      this.searching = true;
      const [, data] = await getProducts({ q, limit: 8 });
      this.searching = false;
      this.results = data?.items ?? [];
    }, 250);
  };

  addProduct = product => {
    this.names = new Map([...this.names, [product.id, product.name]]);
    if(!this.has('product', product.id)) this.toggle('product', product.id);
  };

  save = async event => {
    event.preventDefault();
    const { draft } = this;
    const body = {
      name: draft.name,
      kind: draft.kind,
      value: draft.value,
      stackable: draft.stackable,
      allProducts: draft.allProducts,
      paused: draft.paused,
      targets: draft.targets,
      startsAt: fromLocalInput(draft.startsAt),
      endsAt: fromLocalInput(draft.endsAt),
    };
    this.saving = true;
    const [error] = this.editing ? await updateSale(this.saleId, body) : await createSale(body);
    this.saving = false;
    if(error){
      Toast.error(error.msg);
      return;
    }
    Toast.success(this.editing ? 'Saved' : 'Sale created');
    setTimeout(() => location.assign(`${BASE}/`), 500);
  };

  /*
    View
  */
  renderValue(){
    const { draft, config } = this;
    return draft.kind === 'percent'
      ? html`<input type="number" id="value" class="full" min="1" max="100" step="1" placeholder="20" .value=${draft.value === null ? '' : String(draft.value)} @input=${event => this.set({ value: event.target.value === '' ? null : Number(event.target.value) })}>`
      : html`<k-products-money decimals=${config.decimals} .value=${draft.value} placeholder="10.00" label="Amount off" @change=${event => this.set({ value: event.detail.value })}></k-products-money>`;
  }

  renderCovers(){
    const { draft } = this;
    if(draft.allProducts) return html`<p class="tc-muted">Every product in the catalog is in this sale (credit packs are never discounted).</p>`;
    const chosen = draft.targets.filter(target => target.type === 'product');
    return html`
      <div class="mb">
        <label class="d-b mbq" for="productSearch">Products</label>
        <input type="search" id="productSearch" class="full" placeholder="Search products to add" @input=${this.handleSearch}>
        ${this.searching ? html`<k-spinner size="xs"></k-spinner>` : nothing}
        ${this.results.length ? html`<div class="mt">${this.results.map(product => html`<div class="d-f pyq bb" style="align-items: center;"><span class="flex">${product.name} <span class="tc-muted">${product.price === null ? '' : displayMoney(product.price, this.config.currency, this.config.decimals)}</span></span><button type="button" class="btn" ?disabled=${this.has('product', product.id)} @click=${() => this.addProduct(product)}>${this.has('product', product.id) ? 'Added' : 'Add'}</button></div>`)}</div>` : nothing}
        ${chosen.length ? html`<div class="mt d-f" style="flex-wrap: wrap; gap: var(--spacer_h);">${chosen.map(target => html`<span class="b r" style="padding: 0 var(--spacer_h); display: inline-flex; align-items: center; gap: var(--spacer_q, 0.25rem);">${this.names.get(target.key) ?? target.key}<button type="button" class="no-btn" aria-label=${`Remove ${this.names.get(target.key) ?? target.key}`} @click=${() => this.toggle('product', target.key)}><k-icon name="close"></k-icon></button></span>`)}</div>` : nothing}
      </div>
      ${this.categories.length ? html`<div class="mb"><div class="mbq">Categories<small class="d-b tc-muted">Everything in a category, including products added to it later.</small></div>
        ${this.categories.map(category => html`<label class="checkbox d-b"><input type="checkbox" ?checked=${this.has('category', category.key)} @change=${() => this.toggle('category', category.key)}> ${category.name}</label>`)}</div>` : nothing}
      ${this.types.length ? html`<div class="mb"><div class="mbq">Product types</div>
        ${this.types.map(type => html`<label class="checkbox d-b"><input type="checkbox" ?checked=${this.has('type', type.key)} @change=${() => this.toggle('type', type.key)}> ${type.name}</label>`)}</div>` : nothing}
    `;
  }

  render(){
    if(this.loading) return html`<k-spinner></k-spinner>`;
    if(this.error) return html`<p class="tc-danger">${this.error}</p>`;
    const { draft, config } = this;
    return html`<form @submit=${this.save} style="max-width: 44rem;">
      <div class="mb"><label class="d-b mbq" for="name">Name<small class="d-b tc-muted">Optional. Only you see it, to tell your sales apart. Customers just see "Sale".</small></label><input type="text" id="name" class="full" maxlength="100" placeholder="Fall sale" .value=${draft.name} @input=${event => this.set({ name: event.target.value })}></div>

      <h4>Discount</h4>
      <div class="d-f mb" style="gap: var(--spacer); align-items: flex-end;">
        <div style="width: 10rem;">
          <label class="d-b mbq" for="kind">Takes off</label>
          <select id="kind" class="full" @change=${event => this.set({ kind: event.target.value, value: null })}>
            <option value="percent" ?selected=${draft.kind === 'percent'}>A percent</option>
            <option value="fixed" ?selected=${draft.kind === 'fixed'}>An amount</option>
          </select>
        </div>
        <div class="flex">
          <label class="d-b mbq" for="value">${draft.kind === 'percent' ? 'Percent off' : `Amount off each one (${config.currency.toUpperCase()})`}</label>
          ${this.renderValue()}
        </div>
      </div>
      <p class="tc-muted mb">${exampleText(draft.kind, draft.value, config)}</p>
      <label class="checkbox d-b mbq"><input type="checkbox" id="stackable" .checked=${draft.stackable} @change=${event => this.set({ stackable: event.target.checked })}> Can be combined with other discounts</label>
      <p class="tc-muted small mb">Off by default. Sales and codes that can be combined add up (amounts come off first, then the percents are added up and taken off what is left); one that cannot be combined applies alone, and the customer gets whichever saves more. A product's minimum price is never broken.</p>

      <h4>Applies to</h4>
      <label class="checkbox d-b mb"><input type="checkbox" id="allProducts" .checked=${draft.allProducts} @change=${event => this.set({ allProducts: event.target.checked })}> Every product</label>
      ${this.renderCovers()}

      <h4>When</h4>
      <div class="d-f mb" style="gap: var(--spacer); flex-wrap: wrap;">
        <div class="flex"><label class="d-b mbq" for="startsAt">Starts<small class="d-b tc-muted">Blank is as soon as it is saved.</small></label><input type="datetime-local" id="startsAt" class="full" .value=${draft.startsAt} @input=${event => this.set({ startsAt: event.target.value })}></div>
        <div class="flex"><label class="d-b mbq" for="endsAt">Ends<small class="d-b tc-muted">Blank runs until you stop it.</small></label><input type="datetime-local" id="endsAt" class="full" .value=${draft.endsAt} @input=${event => this.set({ endsAt: event.target.value })}></div>
      </div>
      <label class="checkbox d-b mb"><input type="checkbox" id="paused" .checked=${draft.paused} @change=${event => this.set({ paused: event.target.checked })}> Paused (it does not apply until you turn this off)</label>

      <div class="d-f" style="gap: var(--spacer_h);">
        <button type="submit" class="btn success" id="saveSale" ?disabled=${this.saving}>${this.saving ? 'Saving…' : this.editing ? 'Save' : 'Create sale'}</button>
        <a class="btn" href=${`${BASE}/`}>Cancel</a>
      </div>
    </form>`;
  }
}

customElements.define('k-discounts-sale-form', SaleForm);
