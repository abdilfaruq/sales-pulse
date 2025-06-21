const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { validateTimeSeries, validateKPI, validateComparison } = require('../validators/reportsValidator');

router.get('/sales/timeseries', validateTimeSeries, reportsController.getSalesTimeseries);
router.get('/kpi', validateKPI, reportsController.getKPI);
router.get('/sales/comparison', validateComparison, reportsController.getComparison);

module.exports = router;
