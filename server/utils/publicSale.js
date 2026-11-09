/* What a page may know about a sale that is running: its name, what it takes off and when it ends. Not what it covers or who used it. */
export default sale => ({ id: sale.id, slug: sale.slug, name: sale.name, kind: sale.kind, value: sale.value, startsAt: sale.startsAt, endsAt: sale.endsAt });
