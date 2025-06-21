const reportsService = require('../services/reportsService');
const logger = require('../logger');

async function getSalesTimeseries(req, res, next) {
  try {
    const { start_date, end_date, interval, category, state } = req.query;
    const data = await reportsService.getSalesTimeSeries({ start_date, end_date, interval, category, state });
    res.json({ data, meta: { start_date, end_date, interval: interval || 'month', category, state } });
    logger.info('Fetched sales timeseries', { query: req.query, count: data.length });
  } catch (err) {
    next(err);
  }
}


async function getKPI(req, res, next) {
  try {
    const { start_date, end_date, category, state } = req.query;
    const summary = await reportsService.getKPISummary({ start_date, end_date, category, state });
    res.json({ data: summary, meta: { start_date, end_date, category, state } });
    logger.info('Fetched KPI summary', { query: req.query, summary });
  } catch (err) {
    next(err);
  }
}

async function getComparison(req, res, next) {
  try {
    const { period1_start, period1_end, period2_start, period2_end, category, state } = req.query;
    const comp = await reportsService.getComparison({
      period1_start,
      period1_end,
      period2_start,
      period2_end,
      category,
      state,
    });
    res.json({ data: comp, meta: { period1: { start: period1_start, end: period1_end }, period2: { start: period2_start, end: period2_end }, category, state } });
    logger.info('Fetched KPI comparison', { query: req.query, result: comp });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSalesTimeseries, getKPI, getComparison };
