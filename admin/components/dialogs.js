import { html, render } from '/kempo-ui/lit-all.min.js';
import Toast from '/kempo-ui/components/Toast.js';
import Dialog from '/kempo-ui/components/Dialog.js';
import '/products/components/MoneyInput.js';
import { getConfig } from '/products/sdk.js';
import { getSales, createSale, addToSale } from '/discounts/sdk.js';
import { saleLabel, STATE_LABELS, fromLocalInput } from './format.js';

/*
  The two shortcuts on a product's page and on a category: put it in a sale that exists, or make a quick one with
  only the essentials. `subject` is `{ type: 'product' | 'category', key, name }`. Both say what happened in a message
  and resolve when the dialog closes; neither leaves the page.
*/

const PLACE = { product: 'product', category: 'category' };

/* Opens a dialog holding `content`. A failed save keeps it open and says why. */
const ask = (content, options) => Dialog.create(content, { overlayClose: false, cancelText: 'Cancel', ...options });

export const openAddToSale = async subject => {
  const [[configError, config], [salesError, data]] = await Promise.all([getConfig(), getSales()]);
  if(configError || salesError){
    Toast.error((configError || salesError).msg);
    return;
  }
  const sales = data.items.filter(sale => sale.state !== 'ended');
  const $root = document.createElement('div');
  $root.className = 'p';

  if(!sales.length){
    render(html`<p>There is no sale to add it to yet. Use <strong>Quick discount</strong> to make one with this ${PLACE[subject.type]} in it.</p>`, $root);
    ask($root, { title: 'Add to a sale', cancelText: 'Close' });
    return;
  }

  render(html`
    <p class="mb">Add <strong>${subject.name}</strong> to a sale. Whatever the sale takes off will apply to ${subject.type === 'category' ? 'everything in this category' : 'this product'}.</p>
    <label class="d-b mbq" for="saleChoice">Sale</label>
    <select id="saleChoice" class="full">
      ${sales.map(sale => html`<option value=${sale.id}>${saleLabel(sale, config)} (${STATE_LABELS[sale.state].toLowerCase()})</option>`)}
    </select>
  `, $root);

  const $dialog = ask($root, {
    title: 'Add to a sale',
    confirmText: 'Add',
    confirmAction: async event => {
      event.keepDialogOpen = true;
      const id = $root.querySelector('#saleChoice').value;
      const [error, result] = await addToSale(id, [{ type: subject.type, key: subject.key }]);
      if(error){
        Toast.error(error.msg);
        return;
      }
      $dialog.close();
      if(result.added) Toast.success(`Added to ${saleLabel(result.sale, config)}`);
      else Toast.warning(`Already in ${saleLabel(result.sale, config)}`);
    },
  });
};

export const openQuickSale = async subject => {
  const [configError, config] = await getConfig();
  if(configError){
    Toast.error(configError.msg);
    return;
  }
  const $root = document.createElement('div');
  $root.className = 'p';
  let kind = 'percent';
  let money = null;

  const draw = () => render(html`
    <p class="mb">A quick sale for <strong>${subject.name}</strong>. Open it from the sales list to change anything else.</p>
    <div class="d-f mb" style="gap: var(--spacer); align-items: flex-end;">
      <div style="width: 9rem;">
        <label class="d-b mbq" for="quickKind">Takes off</label>
        <select id="quickKind" class="full" @change=${event => { kind = event.target.value; draw(); }}>
          <option value="percent" ?selected=${kind === 'percent'}>A percent</option>
          <option value="fixed" ?selected=${kind === 'fixed'}>An amount</option>
        </select>
      </div>
      <div class="flex">
        <label class="d-b mbq" for="quickValue">${kind === 'percent' ? 'Percent off' : `Amount off (${config.currency.toUpperCase()})`}</label>
        ${kind === 'percent'
          ? html`<input type="number" id="quickValue" class="full" min="1" max="100" step="1" placeholder="20">`
          : html`<k-products-money id="quickMoney" decimals=${config.decimals} placeholder="10.00" label="Amount off" @change=${event => { money = event.detail.value; }}></k-products-money>`}
      </div>
    </div>
    <label class="checkbox mb"><input type="checkbox" id="quickStack"> Can be combined with other discounts</label>
    <div class="d-f" style="gap: var(--spacer); flex-wrap: wrap;">
      <div class="flex"><label class="d-b mbq" for="quickStart">Starts<small class="d-b tc-muted">Blank is now.</small></label><input type="datetime-local" id="quickStart" class="full"></div>
      <div class="flex"><label class="d-b mbq" for="quickEnd">Ends<small class="d-b tc-muted">Blank runs until you stop it.</small></label><input type="datetime-local" id="quickEnd" class="full"></div>
    </div>
  `, $root);
  draw();

  const $dialog = ask($root, {
    title: 'Quick discount',
    confirmText: 'Create sale',
    confirmAction: async event => {
      event.keepDialogOpen = true;
      const value = kind === 'percent' ? Number($root.querySelector('#quickValue').value) : money;
      const [error, data] = await createSale({
        kind,
        value,
        stackable: $root.querySelector('#quickStack').checked,
        targets: [{ type: subject.type, key: subject.key }],
        startsAt: fromLocalInput($root.querySelector('#quickStart').value),
        endsAt: fromLocalInput($root.querySelector('#quickEnd').value),
      });
      if(error){
        Toast.error(error.msg);
        return;
      }
      $dialog.close();
      Toast.success(`Created ${saleLabel(data.sale, config)}`);
    },
  });
};
