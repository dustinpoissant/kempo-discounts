import ShadowComponent from '/kempo-ui/components/ShadowComponent.js';
import { html, nothing } from '/kempo-ui/lit-all.min.js';
import { displayMoney } from '/products/sdk.js';
import { quote } from '/discounts/sdk.js';

/*
  The price of a product with any running sale applied, for the `price` slot of a product card and of a product
  page (kempo-products' locations `products-card-price` and `products-detail-price`):

    <k-discounts-price slot="price"></k-discounts-price>

  With no sale it draws the normal price itself, from the card's `priceText` or the page's `priceLine`, so the slot
  looks as it did. With a sale it shows the original struck through, the price the customer pays and what the sales
  take off as they say it: "-$2.00" for a fixed amount, "-10%" for a percent, "-$2.00 and -10%" for both. The price comes from the same function the cart uses, with the
  unit price the page is showing (so a product page follows the options chosen).
*/
export default class DiscountsPrice extends ShadowComponent {
  static properties = {
    sale: { state: true },
    tick: { state: true },
  };

  constructor(){
    super();
    this.sale = null;
    this.tick = 0;
    this.asked = '';
    this.watching = null;
  }

  /*
    Lifecycle callbacks
  */
  connectedCallback(){
    super.connectedCallback();
    this.watching = this.closest('k-products-detail');
    this.watching?.addEventListener('selection-change', this.refresh);
    this.refresh();
  }

  disconnectedCallback(){
    super.disconnectedCallback();
    this.watching?.removeEventListener('selection-change', this.refresh);
  }

  /*
    Utility functions
  */
  get host(){
    return this.closest('k-products-card') ?? this.closest('k-products-detail');
  }

  get detail(){
    return this.host?.tagName === 'K-PRODUCTS-DETAIL';
  }

  /* The product and the unit price being shown, or nothing when there is no price to discount. */
  get subject(){
    const host = this.host;
    if(!host || host.config?.showPrices === false) return null;
    const product = host.product;
    const unit = this.detail ? host.price?.unit ?? product?.price : product?.price;
    return product && Number.isSafeInteger(unit) && unit > 0 ? { productId: product.id, unitPrice: unit } : null;
  }

  refresh = async () => {
    const subject = this.subject;
    if(!subject){
      /* The page may not have loaded its product yet: look again when it has. */
      if(!this.host?.product) setTimeout(() => this.isConnected && this.refresh(), 200);
      this.sale = null;
      this.tick++;
      return;
    }
    const key = `${subject.productId}:${subject.unitPrice}`;
    this.asked = key;
    const answer = await quote(subject.productId, subject.unitPrice);
    if(this.asked !== key) return;
    this.sale = answer;
    this.tick++;
  };

  /*
    Rendering
  */
  render(){
    const host = this.host;
    if(!host) return nothing;
    const config = host.config ?? { currency: 'usd', decimals: 2 };
    const money = minor => displayMoney(minor, config.currency, config.decimals);
    const detail = this.detail;

    if(!this.sale){
      const text = detail ? host.priceLine : host.priceText;
      if(!text) return nothing;
      return detail ? html`<div class="large mb" aria-live="polite">${text}</div>` : html`<div class="tc-muted">${text}</div>`;
    }

    const { unitPrice, salePrice, percentOff, parts } = this.sale;
    /* An older answer without `parts` falls back to the percent. */
    const saved = (parts ?? (percentOff >= 1 ? [{ kind: 'percent', value: percentOff }] : [])).map(part => (part.kind === 'fixed' ? `-${money(part.value)}` : `-${part.value}%`)).join(' and ');
    return html`<div class=${detail ? 'large mb' : ''} aria-live="polite">
      <s class="tc-muted">${money(unitPrice)}</s>
      <strong>${money(salePrice)}</strong>
      ${saved ? html`<span class="bg-danger" style="color: var(--tc_on_danger); padding: 0 var(--spacer_q, 0.25rem); border-radius: var(--radius);">${saved}</span>` : nothing}
    </div>`;
  }
}

customElements.define('k-discounts-price', DiscountsPrice);
