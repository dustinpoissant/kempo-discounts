import AdminTableControl from '/admin/components/AdminTableControl.js';
import { html } from '/kempo-ui/lit-all.min.js';
import '/kempo-ui/components/Icon.js';

/*
  One action on a sale's row: pause or resume, duplicate, or delete. The page owns the request and the dialog,
  so this only reports the choice, as a `saleAction` event on the table: { action, record }.

    <k-discounts-sale-action action="pause"></k-discounts-sale-action>
*/
const ICONS = { duplicate: 'content_copy', delete: 'delete' };

export default class SaleAction extends AdminTableControl {
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
    this.title = this.action === 'pause' ? (this.record?.paused ? 'Resume' : 'Pause') : this.action[0].toUpperCase() + this.action.slice(1);
  }

  handleAction(){
    if(!this.record) return;
    this.table.dispatchEvent(new CustomEvent('saleAction', { detail: { action: this.action, record: this.record } }));
  }

  render(){
    const icon = this.action === 'pause' ? (this.record?.paused ? 'play' : 'pause') : ICONS[this.action];
    return html`<k-icon name=${icon}></k-icon>`;
  }
}

customElements.define('k-discounts-sale-action', SaleAction);
