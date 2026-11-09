import WidgetSettings from '/kempo-ui/components/pagebuilder/WidgetSettings.js';
import { html } from '/kempo-ui/lit-all.min.js';
import { getSales } from '/discounts/sdk.js';
import { getConfig, displayMoney } from '/products/sdk.js';

/*
  The settings of the Sale banner: which sales it shows, ticked from the sales that exist (running or not yet started), in the
  order ticked. The rest of the settings are the default fields.
*/
export default class SaleBannerSettings extends WidgetSettings {
  static properties = {
    ...WidgetSettings.properties,
    all: { state: true },
    config: { state: true },
    failed: { state: true }
  };

  constructor(){
    super();
    this.all = null;
    this.config = null;
    this.failed = false;
    this.started = false;
  }

  /*
    Lifecycle callbacks
  */
  willUpdate(){
    if(this.started) return;
    this.started = true;
    this.load();
  }

  /*
    Public methods
  */
  load = async () => {
    const [[configError, config], [error, data]] = await Promise.all([getConfig(), getSales()]);
    this.config = configError ? null : config;
    this.failed = !!error;
    this.all = error ? [] : data.items.filter(sale => sale.state !== 'ended');
  };

  /* What tells two sales apart: the amount off, when it runs, what it covers, and its state. */
  describe(sale){
    const off = sale.kind === 'percent' ? `${sale.value}% off` : `${displayMoney(sale.value, this.config?.currency ?? 'usd', this.config?.decimals ?? 2)} off`;
    const date = value => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const when = sale.startsAt && sale.endsAt ? `${date(sale.startsAt)} to ${date(sale.endsAt)}`
      : sale.startsAt ? `from ${date(sale.startsAt)}`
      : sale.endsAt ? `until ${date(sale.endsAt)}`
      : 'no dates';
    const covers = sale.allProducts ? 'every product' : `${(sale.targets ?? []).length} product${(sale.targets ?? []).length === 1 ? '' : 's'} or categories`;
    return `${off} · ${when} · ${covers} · ${sale.state}`;
  }

  /*
    Utility methods
  */
  chosen(){
    return (this.node.attrs?.sales || '').split(',').filter(Boolean);
  }

  /*
    Event handlers
  */
  toggle(id, on){
    const chosen = this.chosen().filter(other => other !== id);
    this.set('sales', (on ? [...chosen, id] : chosen).join(','), false);
  }

  /*
    Rendering
  */
  render(){
    const chosen = this.chosen();
    return html`
      <div class="mb">
        <span class="d-b mbq">Sales<small class="d-b tc-muted">Tick the sales to show, in the order ticked. Leave them all unticked to show every sale that is running.</small></span>
        ${this.failed ? html`<p class="tc-danger">The sales could not be loaded.</p>` : ''}
        ${(this.all ?? []).map(sale => html`
          <label class="checkbox d-b mbq"><input type="checkbox" .checked=${chosen.includes(sale.id)} @change=${event => this.toggle(sale.id, event.target.checked)}> <strong>${sale.name || 'Untitled sale'}</strong><small class="d-b tc-muted">${this.describe(sale)}</small></label>
        `)}
      </div>
      ${this.renderFields(['sales'])}
    `;
  }
}

customElements.define('k-discounts-sale-banner-settings', SaleBannerSettings);
