const knex = require('../db/knex');

async function getSalesTimeSeries({ start_date, end_date, interval = 'month', category, state }) {
  const validIntervals = ['day', 'week', 'month', 'year'];
  const intv = validIntervals.includes(interval) ? interval : 'month';

  const dateTruncSql = (() => {
    switch (intv) {
      case 'day':
        return `to_char(DATE_TRUNC('day', s.order_date), 'YYYY-MM-DD')`;
      case 'week':
        return `to_char(DATE_TRUNC('week', s.order_date), 'YYYY-MM-DD')`;
      case 'year':
        return `to_char(DATE_TRUNC('year', s.order_date), 'YYYY-01-01')`;
      case 'month':
      default:
        return `to_char(DATE_TRUNC('month', s.order_date), 'YYYY-MM-DD')`;
    }
  })();

  let query = knex('sales as s')
    .select(knex.raw(`${dateTruncSql} AS period`))
    .sum({ total_sales: 's.sales' })
    .sum({ total_profit: 's.profit' })
    .whereBetween('s.order_date', [start_date, end_date]);

  if (category) {
    query = query
      .join('products as p', 's.product_id', 'p.id')
      .join('subcategories as sc', 'p.subcategory_id', 'sc.id')
      .join('categories as c', 'sc.category_id', 'c.id')
      .andWhere('c.name', category);
  }
  if (state) {
    query = query.andWhere('s.state', state);
  }

  query = query.groupBy('period').orderBy('period');

  const rows = await query;

  return rows.map(r => ({
    period: r.period,
    total_sales: parseFloat(r.total_sales) || 0,
    total_profit: parseFloat(r.total_profit) || 0,
  }));
}


async function getKPISummary({ start_date, end_date, category, state }) {
  let query = knex('sales as s').whereBetween('s.order_date', [start_date, end_date]);

  if (category) {
    query = query
      .join('products as p', 's.product_id', 'p.id')
      .join('subcategories as sc', 'p.subcategory_id', 'sc.id')
      .join('categories as c', 'sc.category_id', 'c.id')
      .andWhere('c.name', category);
  }
  if (state) {
    query = query.andWhere('s.state', state);
  }

  const result = await query
    .clone()
    .select(
      knex.raw('COALESCE(SUM(s.sales),0)::float AS total_sales'),
      knex.raw('COALESCE(SUM(s.profit),0)::float AS total_profit'),
      knex.raw('COALESCE(AVG(s.discount),0)::float AS avg_discount'),
      knex.raw('COUNT(DISTINCT s.order_id) AS total_orders')
    )
    .first();

  return {
    total_sales: parseFloat(result.total_sales) || 0,
    total_profit: parseFloat(result.total_profit) || 0,
    avg_discount: parseFloat(result.avg_discount) || 0,
    total_orders: parseInt(result.total_orders, 10) || 0,
  };
}

async function getComparison({ period1_start, period1_end, period2_start, period2_end, category, state }) {
  const summary1 = await getKPISummary({ start_date: period1_start, end_date: period1_end, category, state });
  const summary2 = await getKPISummary({ start_date: period2_start, end_date: period2_end, category, state });

  const calcPct = (v2, v1) => {
    if (v1 === 0) return null;
    return ((v2 - v1) / Math.abs(v1)) * 100;
  };

  const diff = {
    sales_diff: summary2.total_sales - summary1.total_sales,
    profit_diff: summary2.total_profit - summary1.total_profit,
    avg_discount_diff: summary2.avg_discount - summary1.avg_discount,
    orders_diff: summary2.total_orders - summary1.total_orders,
  };
  const percent = {
    sales_pct: calcPct(summary2.total_sales, summary1.total_sales),
    profit_pct: calcPct(summary2.total_profit, summary1.total_profit),
    avg_discount_pct: calcPct(summary2.avg_discount, summary1.avg_discount),
    orders_pct: calcPct(summary2.total_orders, summary1.total_orders),
  };

  return {
    period1: summary1,
    period2: summary2,
    diff,
    percent,
  };
}

module.exports = {
  getSalesTimeSeries,
  getKPISummary,
  getComparison,
};
