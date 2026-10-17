import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, nothing } from '/kempo-ui/lit-all.min.js';
import '/kempo-ui/components/Icon.js';
import { openAddToSale, openQuickSale } from './dialogs.js';

/*
  Two buttons on a product's edit page, beside Save and Cancel (kempo-products' `products-admin-product-actions`
  location): put this product in a sale that exists, or make a quick one for it.

    <k-discounts-product-actions slot="actions"></k-discounts-product-actions>

  It finds the form with closest() and reads the product from it. A product that is not saved yet has nothing to
  put in a sale, so the buttons wait for it.
*/
const ICON = '/admin/extension/kempo-discounts/icons/discounts.svg';

export default class ProductActions extends ShadowComponent {
  static properties = {
    tick: { state: true },
  };

  constructor(){
    super();
    this.tick = 0;
    this.form = null;
  }

  connectedCallback(){
    super.connectedCallback();
    this.form = this.closest('k-products-form');
    this.form?.addEventListener('product-saved', this.changed);
    this.form?.addEventListener('draft-change', this.changed);
  }

  disconnectedCallback(){
    super.disconnectedCallback();
    this.form?.removeEventListener('product-saved', this.changed);
    this.form?.removeEventListener('draft-change', this.changed);
  }

  changed = () => {
    this.tick++;
  };

  get subject(){
    const id = this.form?.productId;
    return id ? { type: 'product', key: id, name: this.form.draft?.name || this.form.original?.name || 'this product' } : null;
  }

  render(){
    const subject = this.subject;
    if(!subject) return nothing;
    return html`
      <button type="button" class="btn" id="addToSale" @click=${() => openAddToSale(this.subject)}><k-icon src=${ICON}></k-icon> Add to a sale</button>
      <button type="button" class="btn" id="quickSale" @click=${() => openQuickSale(this.subject)}><k-icon name="add"></k-icon> Quick discount</button>
    `;
  }
}

customElements.define('k-discounts-product-actions', ProductActions);
