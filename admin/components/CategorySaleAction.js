import AdminTableControl from '/admin/components/AdminTableControl.js';
import { html } from '/kempo-ui/lit-all.min.js';
import '/kempo-ui/components/Icon.js';
import { openAddToSale, openQuickSale } from './dialogs.js';

/*
  One sale shortcut on a product category's row: put the whole category in a sale that exists (`action="add"`),
  or make a quick sale for it (`action="quick"`). The category is the row's record.

    <k-discounts-category-sale-action slot="after" action="add"></k-discounts-category-sale-action>
*/
const ICON = '/admin/extension/kempo-discounts/icons/discounts.svg';

export default class CategorySaleAction extends AdminTableControl {
  static properties = {
    ...AdminTableControl.properties,
    action: { type: String },
  };

  constructor(){
    super();
    this.action = '';
  }

  connectedCallback(){
    super.connectedCallback();
    if(!this.hasAttribute('title')) this.title = this.action === 'add' ? 'Add to a sale' : 'Quick discount';
  }

  handleAction(){
    const category = this.record;
    if(!category) return;
    const subject = { type: 'category', key: category.key, name: category.name };
    if(this.action === 'add') openAddToSale(subject);
    else openQuickSale(subject);
  }

  render(){
    return html`<slot>${this.action === 'add' ? html`<k-icon src=${ICON}></k-icon>` : html`<k-icon name="add"></k-icon>`}</slot>`;
  }
}

customElements.define('k-discounts-category-sale-action', CategorySaleAction);
