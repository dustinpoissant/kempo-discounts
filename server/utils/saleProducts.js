import { getProducts } from 'kempo-products/sdk';
import { covers } from './match.js';

const PAGE = 200;

/*
  The slugs of the published products a sale covers, in the catalog's order. Reads the catalog a page at a time, so a large
  catalog is read in full without asking for everything at once.
*/
export default async sale => {
  const slugs = [];
  for(let offset = 0; ; offset += PAGE){
    const [error, page] = await getProducts({ status: 'published', limit: PAGE, offset });
    if(error) return slugs;
    for(const product of page.items) if(covers(sale, product)) slugs.push(product.slug);
    if(page.items.length < PAGE) return slugs;
  }
};
