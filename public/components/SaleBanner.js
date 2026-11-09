import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, css, nothing } from '/kempo-ui/lit-all.min.js';
import { displayMoney, getConfig } from '/products/sdk.js';
import { getRunningSales } from '/discounts/sdk.js';

/*
  A banner for the sales running now, for a page built in the page builder. Its settings choose the sales (`sales`, the ids
  in the order chosen; empty is every sale running) and whether to show the date it ends. Each strip links to the sale's own
  page, /sales/<slug>. Any text around it is a Text widget. The colours and alignment are the Styles tab's. With no sale to
  show it shows nothing, so the page has no gap.
*/
export default class SaleBanner extends ShadowComponent {
  static properties = {
    sales: { type: String },
    showEnd: { type: Boolean, attribute: 'show-end' },
    running: { state: true },
    config: { state: true },
    loaded: { state: true }
  };

  static styles = css`
    :host { display: block; }
  `;

  constructor(){
    super();
    this.sales = '';
    this.showEnd = false;
    this.running = [];
    this.config = null;
    this.loaded = false;
  }

  /*
    Lifecycle callbacks
  */
  connectedCallback(){
    super.connectedCallback();
    this.load();
  }

  /*
    Public methods
  */
  load = async () => {
    const [[configError, config], [error, data]] = await Promise.all([getConfig(), getRunningSales()]);
    this.config = configError ? null : config;
    this.running = error ? [] : data.items;
    this.loaded = true;
  };

  /* The sales to show: the ones chosen, in the order chosen (those no longer running are left out), or every running sale. */
  get shown(){
    const chosen = (this.sales || '').split(',').filter(Boolean);
    if(!chosen.length) return this.running;
    return chosen.map(id => this.running.find(sale => sale.id === id)).filter(Boolean);
  }

  /*
    Utility methods
  */
  offOf(sale){
    if(sale.kind === 'percent') return `${sale.value}%`;
    return displayMoney(sale.value, this.config?.currency ?? 'usd', this.config?.decimals ?? 2);
  }

  renderSale(sale){
    const ends = this.showEnd && sale.endsAt ? ` until ${new Date(sale.endsAt).toLocaleDateString()}` : '';
    const body = html`<strong>${sale.name || 'Sale'}</strong>: ${this.offOf(sale)} off${ends}`;
    return sale.slug
      ? html`<a class="d-b p r mb" href=${`/sales/${sale.slug}`}>${body}</a>`
      : html`<div class="p r mb">${body}</div>`;
  }

  /*
    Rendering
  */
  render(){
    if(!this.loaded || !this.shown.length) return nothing;
    return html`${this.shown.map(sale => this.renderSale(sale))}`;
  }
}

customElements.define('k-discounts-sale-banner-widget', SaleBanner);
