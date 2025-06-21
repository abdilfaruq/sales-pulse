const salesService = require('../services/salesService');
const logger = require('../logger');
const knex = require('../db/knex');

async function getProductSales(req, res, next) {
  try {
    const { page = 1, pageSize = 100, start_date, end_date, category, state, product } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 100;

    const serviceArgs = {
      product: product || null,
      state: state || null,
      page: pageNum,
      pageSize: pageSizeNum,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      category: category || undefined,
    };
    const data = await salesService.fetchProductSales(serviceArgs);

    logger.info('Fetched product sales', { query: req.query, count: data.length });

    res.json({ data, meta: { page: pageNum, pageSize: pageSizeNum } });
  } catch (err) {
    next(err);
  }
}

async function getCorrelation(req, res, next) {
  try {
    const { page, pageSize, start_date, end_date, state } = req.query;

    const countQuery = knex('sales as s')
      .modify(qb => {
        if (start_date) qb.where('s.order_date', '>=', start_date);
        if (end_date) qb.where('s.order_date', '<=', end_date);
        if (state) qb.where('s.state', state);
      })
      .count('* as total');
    const countResult = await countQuery;
    const total = parseInt(countResult[0].total, 10);

    const data = await salesService.fetchCorrelation({ page, pageSize, start_date, end_date, state });
    logger.info('Fetched correlation data', { query: req.query, count: data.length, total });
    res.json({ data, meta: { page, pageSize, total } });
  } catch (err) {
    next(err);
  }
}

async function getHeatmap(req, res, next) {
  try {
    const { page, pageSize, start_date, end_date, country } = req.query;

    const countQuery = knex('sales as s')
      .modify(qb => {
        if (start_date) qb.where('s.order_date', '>=', start_date);
        if (end_date) qb.where('s.order_date', '<=', end_date);
        if (country) qb.where('s.country', country);
      })
      .countDistinct(knex.raw("concat(s.state, '-', s.product_id)") + ' as total');

    const data = await salesService.fetchHeatmap({ page, pageSize, start_date, end_date, country });
    logger.info('Fetched heatmap data', { query: req.query, count: data.length });
    res.json({ data, meta: { page, pageSize } });
  } catch (err) {
    next(err);
  }
}

async function getProductsBySubcategory(req, res, next) {
  try {
    const data = await salesService.fetchProductsBySubcategory();
    logger.info('Fetched products by subcategory', { count: data.length });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProductSales,
  getCorrelation,
  getHeatmap,
  getProductsBySubcategory
};