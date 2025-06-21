const knex = require('../db/knex');

async function fetchProductSales({ product = null, state = null, page = 1, pageSize = 100, start_date, end_date, category }) {
  const startTime = Date.now();
  const base = knex('sales as s')
    .join('products as p', 's.product_id', 'p.id')
    .join('subcategories as sc', 'p.subcategory_id', 'sc.id')
    .join('categories as c', 'sc.category_id', 'c.id')
    .modify(qb => {
      if (start_date) qb.where('s.order_date', '>=', start_date);
      if (end_date) qb.where('s.order_date', '<=', end_date);
      if (category) qb.where('c.name', category);
    });

  let query;
  if (product && !state) {
    query = base
      .where('p.name', product)
      .select('s.state as state', knex.raw('SUM(s.quantity) as total_sold'))
      .groupBy('s.state')
      .orderBy('total_sold', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  } else {
    if (state) {
      base.where('s.state', state);
    }
    query = base
      .select('p.name as product', knex.raw('SUM(s.quantity) as total_sold'))
      .groupBy('p.name')
      .orderBy('total_sold', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize);
  }

  const rows = await query;
  rows.durationMs = Date.now() - startTime;
  return rows;
}

async function fetchCorrelation({ page, pageSize, start_date, end_date, state }) {
  const startTime = Date.now();
  const query = knex('sales as s')
    .select('s.state', 's.discount', 's.quantity', 'p.name as product')
    .join('products as p', 's.product_id', 'p.id')
    .modify(qb => {
      if (start_date) qb.where('s.order_date', '>=', start_date);
      if (end_date) qb.where('s.order_date', '<=', end_date);
      if (state) qb.where('s.state', state);
    })
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const rows = await query;
  rows.durationMs = Date.now() - startTime;
  return rows;
}

async function fetchHeatmap({ page, pageSize, start_date, end_date, country }) {
  const startTime = Date.now();
  const query = knex('sales as s')
    .select('s.state', 'p.name as product', knex.raw('SUM(s.quantity) as total_sold'))
    .join('products as p', 's.product_id', 'p.id')
    .modify(qb => {
      if (start_date) qb.where('s.order_date', '>=', start_date);
      if (end_date) qb.where('s.order_date', '<=', end_date);
      if (country) qb.where('s.country', country);
    })
    .groupBy('s.state', 'p.name')
    .orderBy([{ column: 's.state' }, { column: 'total_sold', order: 'desc' }])
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const rows = await query;
  rows.durationMs = Date.now() - startTime;
  return rows;
}

async function fetchProductsBySubcategory() {
  const rows = await knex('subcategories as sc')
    .select(
      'sc.id as subcategory_id',
      'sc.name as subcategory_name',
      'p.id as product_id',
      'p.name as product_name'
    )
    .join('products as p', 'p.subcategory_id', 'sc.id')
    .orderBy(['sc.name', 'p.name']);

  const grouped = rows.reduce((acc, row) => {
    const { subcategory_id, subcategory_name, product_id, product_name } = row;
    if (!acc[subcategory_id]) {
      acc[subcategory_id] = { subcategory_id, subcategory_name, products: [] };
    }
    acc[subcategory_id].products.push({ product_id, name: product_name });
    return acc;
  }, {});

  return Object.values(grouped);
}

module.exports = {
  fetchProductSales,
  fetchCorrelation,
  fetchHeatmap,
  fetchProductsBySubcategory
};