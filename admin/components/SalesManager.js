import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, nothing } from '/kempo-ui/lit-all.min.js';
import Toast from '/kempo-ui/components/Toast.js';
import Dialog from '/kempo-ui/components/Dialog.js';
import '/kempo-ui/components/Icon.js';
import '/kempo-ui/components/Spinner.js';
import { getConfig, displayMoney } from '/products/sdk.js';
import { getSales, updateSale, deleteSale, duplicateSale } from '/discounts/sdk.js';
import { saleLabel, discountText, coverText, whenText, STATE_LABELS, STATE_CLASSES } from './format.js';

/*
  The sales list: what each sale does, what it covers, when it runs, whether it is running, and how many
  orders it was used on and what it saved customers (net of refunds).

    <k-discounts-sales></k-discounts-sales>
*/
const BASE = '/admin/extension/kempo-discounts';

export default class SalesManager extends ShadowComponent {
  static properties = {
    sales: { state: true },
    config: { state: true },
    loading: { state: true },
    error: { state: true },
  };

  constructor(){
    super();
    this.sales = [];
    this.config = null;
    this.loading = true;
    this.error = '';
  }

  /*
    Lifecycle callbacks
  */
  connectedCallback(){
    super.connectedCallback();
    this.load();
  }

  /*
    Utility functions
  */
  load = async () => {
    const [[configError, config], [salesError, data]] = await Promise.all([getConfig(), getSales()]);
    this.loading = false;
    if(configError || salesError){
      this.error = (configError || salesError).msg;
      return;
    }
    this.config = config;
    this.sales = data.items;
  };

  money = minor => displayMoney(minor, this.config.currency, this.config.decimals);

  /*
    Event handlers
  */
  togglePause = async sale => {
    const [error] = await updateSale(sale.id, { paused: !sale.paused });
    if(error) Toast.error(error.msg);
    else Toast.success(sale.paused ? 'Resumed' : 'Paused');
    this.load();
  };

  duplicate = async sale => {
    const [error] = await duplicateSale(sale.id);
    if(error) Toast.error(error.msg);
    else Toast.success('Copied. The copy is paused until you resume it.');
    this.load();
  };

  remove = sale => {
    const used = sale.orders ? ` It was used on ${sale.orders} order${sale.orders === 1 ? '' : 's'}, which keep their discount.` : '';
    Dialog.confirm(`Delete "${saleLabel(sale, this.config)}"? It stops applying at once.${used}`, async confirmed => {
      if(!confirmed) return;
      const [error] = await deleteSale(sale.id);
      if(error) Toast.error(error.msg);
      else Toast.success('Deleted');
      this.load();
    });
  };

  /*
    View
  */
  renderRow = sale => html`<tr>
    <td><a href=${`${BASE}/edit/?id=${encodeURIComponent(sale.id)}`}><strong>${saleLabel(sale, this.config)}</strong></a>${sale.name ? html`<div class="tc-muted">${discountText(sale, this.config)}</div>` : nothing}</td>
    <td>${coverText(sale)}</td>
    <td>${whenText(sale)}</td>
    <td><span class=${STATE_CLASSES[sale.state]} style="padding: 0 var(--spacer_q, 0.25rem); border-radius: var(--radius);">${STATE_LABELS[sale.state]}</span>${sale.stackable ? html` <span class="tc-muted" title="Can be combined with other discounts">combines</span>` : nothing}</td>
    <td>${sale.orders}</td>
    <td>${this.money(sale.saved)}</td>
    <td style="white-space: nowrap;">
      <a class="btn" title="Edit" aria-label=${`Edit ${saleLabel(sale, this.config)}`} href=${`${BASE}/edit/?id=${encodeURIComponent(sale.id)}`}><k-icon name="edit"></k-icon></a>
      <button type="button" class="btn" title=${sale.paused ? 'Resume' : 'Pause'} aria-label=${`${sale.paused ? 'Resume' : 'Pause'} ${saleLabel(sale, this.config)}`} @click=${() => this.togglePause(sale)}><k-icon name=${sale.paused ? 'play' : 'pause'}></k-icon></button>
      <button type="button" class="btn" title="Duplicate" aria-label=${`Duplicate ${saleLabel(sale, this.config)}`} @click=${() => this.duplicate(sale)}><k-icon name="content_copy"></k-icon></button>
      <button type="button" class="btn" title="Delete" aria-label=${`Delete ${saleLabel(sale, this.config)}`} @click=${() => this.remove(sale)}><k-icon name="delete"></k-icon></button>
    </td>
  </tr>`;

  render(){
    if(this.loading) return html`<k-spinner></k-spinner>`;
    if(this.error) return html`<p class="tc-danger">${this.error}</p>`;
    return html`<div>
      <div class="mb"><a class="btn primary" id="newSale" href=${`${BASE}/new/`}><k-icon name="add"></k-icon> New sale</a></div>
      ${this.sales.length ? html`<div class="table-wrapper"><table>
        <thead><tr><th>Sale</th><th>Applies to</th><th>When</th><th>State</th><th>Orders</th><th>Saved</th><th></th></tr></thead>
        <tbody>${this.sales.map(this.renderRow)}</tbody>
      </table></div>` : html`<p class="tc-muted">No sales yet. A sale takes a percent or an amount off the products and categories you add to it, between the dates you choose. You can also start one from a product's or a category's own page.</p>`}
    </div>`;
  }
}

customElements.define('k-discounts-sales', SalesManager);
