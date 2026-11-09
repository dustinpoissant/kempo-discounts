import SaleBanner from '/discounts/components/SaleBanner.js';
import { html } from '/kempo-ui/lit-all.min.js';

/*
  The Sale banner as the page builder shows it: the banner itself, from the sales chosen. When none is to be shown the place
  says so, rather than being empty.
*/
export default class SaleBannerEditor extends SaleBanner {
  render(){
    if(!this.loaded) return html`<p class="tc-muted">Loading the sales</p>`;
    if(!this.shown.length) return html`<p class="tc-muted">The sales to show go here. None is running now, so nothing shows on the page.</p>`;
    return super.render();
  }
}

customElements.define('k-discounts-sale-banner-editor', SaleBannerEditor);
