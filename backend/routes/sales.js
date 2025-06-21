const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { validateProductSales, validateCorrelation, validateHeatmap } = require('../validators/salesValidator');

router.get('/products/sales', validateProductSales, salesController.getProductSales);
router.get('/sales/correlation', validateCorrelation, salesController.getCorrelation);
router.get('/sales/heatmap', validateHeatmap, salesController.getHeatmap);
router.get('/catalog/subcategories-with-products', salesController.getProductsBySubcategory);

module.exports = router;