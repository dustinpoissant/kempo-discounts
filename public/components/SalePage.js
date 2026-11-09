import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, css, nothing } from '/kempo-ui/lit-all.min.js';
import { displayMoney, getConfig } from '/products/sdk.js';
import '/kempo-ui/components/Spinner.js';

/*
  The page of one sale, at /sales/<slug>: its name, what it takes off, when it ends, and the products it covers, shown as the
  product list with their sale prices. The address names the sale, so there is nothing to choose on the page.
*/
export default class SalePage extends ShadowComponent {
  static properties = {
    sale: { state: true },
    slugs: { state: true },
    config: { state: true },
    loading: { state: true },
    failed: { state: true }
  };

  static styles = css`
    :host { display: block; }
  `;

  constructor(){
    super();
    this.sale = null;
    this.slugs = [];
    this.config = null;
    this.loading = true;
    this.failed = false;
  }

  connectedCallback(){
    super.connectedCallback();
    this.load();
  }

  load = async () => {
    const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() ?? '');
    const [[, config], response] = await Promise.all([getConfig(), fetch(`/discounts/api/sale/${encodeURIComponent(slug)}`)]);
    const data = await response.json().catch(() => ({}));
    this.config = config ?? null;
    this.failed = !response.ok;
    this.sale = response.ok ? data.sale : null;
    this.slugs = response.ok ? data.slugs : [];
    this.loading = false;
    if(this.sale?.name) document.title = this.sale.name;
  };

  offOf(sale){
    if(sale.kind === 'percent') return `${sale.value}%`;
    return displayMoney(sale.value, this.config?.currency ?? 'usd', this.config?.decimals ?? 2);
  }

  render(){
    if(this.loading) return html`<k-spinner></k-spinner>`;
    if(this.failed || !this.sale) return html`<p class="tc-muted">This sale is not available.</p>`;
    const { sale } = this;
    const date = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const ends = sale.endsAt ? ` until ${date(sale.endsAt)}` : '';
    return html`
      <h1>${sale.name || 'Sale'}</h1>
      <p class="large">${this.offOf(sale)} off${ends}</p>
      ${sale.state === 'ended' ? html`<p class="tc-muted">This sale has ended.</p>` : nothing}
      ${sale.state === 'scheduled' && sale.startsAt ? html`<p class="tc-muted">This sale starts ${date(sale.startsAt)}.</p>` : nothing}
      ${this.slugs.length
        ? html`<k-products-list slugs=${this.slugs.join(',')} hide-controls></k-products-list>`
        : html`<p class="tc-muted">No products are in this sale yet.</p>`}
    `;
  }
}

customElements.define('k-discounts-sale-page', SalePage);
