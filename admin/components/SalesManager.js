import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, nothing } from '/kempo-ui/lit-all.min.js';
import Toast from '/kempo-ui/components/Toast.js';
import Dialog from '/kempo-ui/components/Dialog.js';
import '/kempo-ui/components/Icon.js';
import '/kempo-ui/components/Spinner.js';
import '/kempo-ui/components/Table.js';
import '/kempo-ui/components/controls/TcOpen.js';
import '/kempo-ui/components/controls/TcSearch.js';
import '/kempo-ui/components/controls/TcFieldSortHide.js';
import { getConfig, displayMoney } from '/products/sdk.js';
import { getSales, updateSale, deleteSale, duplicateSale } from '/discounts/sdk.js';
import { saleLabel, discountText, coverText, whenText, STATE_LABELS } from './format.js';
import './SaleAction.js';

/*
  The sales list: what each sale does, what it covers, when it runs, whether it is running, and how many
  orders it was used on and what it saved customers (net of refunds). A row opens the sale.

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

  editUrl = sale => `${BASE}/edit/?id=${encodeURIComponent(sale.id)}`;

  /* Refills the table whenever the sales change. */
  updated(changed){
    if(!changed.has('sales') || !this.config) return;
    this.renderRoot.querySelector('k-table')?.setData({
      records: this.sales.map(sale => ({ ...sale, _url: this.editUrl(sale) })),
      fields: [
        { name: 'name', label: 'Sale', editable: false, calculator: sale => sale.name ? `${saleLabel(sale, this.config)} · ${discountText(sale, this.config)}` : saleLabel(sale, this.config) },
        { name: 'cover', label: 'Applies to', size: 200, editable: false, calculator: coverText },
        { name: 'when', label: 'When', size: 200, editable: false, calculator: whenText },
        { name: 'state', label: 'State', size: 150, editable: false, calculator: sale => `${STATE_LABELS[sale.state]}${sale.stackable ? ' · combines' : ''}` },
        { name: 'orders', label: 'Orders', size: 90, editable: false },
        { name: 'saved', label: 'Saved', size: 120, editable: false, calculator: sale => this.money(sale.saved) },
      ],
    });
  }

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

  actOn = ({ action, record }) => {
    if(action === 'pause') this.togglePause(record);
    else if(action === 'duplicate') this.duplicate(record);
    else if(action === 'delete') this.remove(record);
  };

  /*
    View
  */
  render(){
    if(this.loading) return html`<k-spinner></k-spinner>`;
    if(this.error) return html`<p class="tc-danger">${this.error}</p>`;
    return html`<div>
      <k-table open-on-click placeholder="No sales yet. A sale takes a percent or an amount off the products and categories you add to it, between the dates you choose. You can also start one from a product's or a category's own page." @saleAction=${event => this.actOn(event.detail)}>
        <div slot="top" class="d-f full" style="align-items: center;"><kc-tc-search style="width: 16rem"></kc-tc-search><kc-tc-field-sort-hide></kc-tc-field-sort-hide><div class="flex"></div><a class="btn primary" id="newSale" href=${`${BASE}/new/`}><k-icon name="add"></k-icon> New sale</a></div>
        <kc-tc-open slot="before" title="Edit"><k-icon name="edit"></k-icon></kc-tc-open>
        <k-discounts-sale-action slot="after" action="pause"></k-discounts-sale-action>
        <k-discounts-sale-action slot="after" action="duplicate"></k-discounts-sale-action>
        <k-discounts-sale-action slot="after" action="delete"></k-discounts-sale-action>
      </k-table>
    </div>`;
  }
}

customElements.define('k-discounts-sales', SalesManager);
