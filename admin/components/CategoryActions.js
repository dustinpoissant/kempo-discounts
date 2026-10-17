import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, nothing } from '/kempo-ui/lit-all.min.js';
import '/kempo-ui/components/Icon.js';
import { openAddToSale, openQuickSale } from './dialogs.js';

/*
  The same two shortcuts on each product category (kempo-products' `products-admin-category-actions` location):
  put the whole category in a sale that exists, or make a quick one for it.

    <k-discounts-category-actions slot="actions"></k-discounts-category-actions>

  It finds its category from the row the list put it in.
*/
const ICON = '/admin/extension/kempo-discounts/icons/discounts.svg';

export default class CategoryActions extends ShadowComponent {
  get subject(){
    const category = this.closest('k-products-category-actions')?.category;
    return category ? { type: 'category', key: category.key, name: category.name } : null;
  }

  render(){
    const subject = this.subject;
    if(!subject) return nothing;
    return html`
      <button type="button" class="btn" title=${`Add ${subject.name} to a sale`} @click=${() => openAddToSale(this.subject)}><k-icon src=${ICON}></k-icon> Add to a sale</button>
      <button type="button" class="btn" title=${`Make a quick sale for ${subject.name}`} @click=${() => openQuickSale(this.subject)}><k-icon name="add"></k-icon> Quick discount</button>
    `;
  }
}

customElements.define('k-discounts-category-actions', CategoryActions);
