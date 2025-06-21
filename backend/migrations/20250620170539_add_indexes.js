/**
 * @param {import("knex").Knex} knex
 */
exports.up = function(knex) {
  return Promise.all([
    knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sales_order_date ON sales(order_date)'),
    knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sales_state ON sales(state)'),
    knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id)'),
    knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sales_country ON sales(country)'),
    knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_sales_region ON sales(region)'),
    knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id)')
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.raw('DROP INDEX IF EXISTS idx_sales_order_date'),
    knex.schema.raw('DROP INDEX IF EXISTS idx_sales_state'),
    knex.schema.raw('DROP INDEX IF EXISTS idx_sales_product_id'),
    knex.schema.raw('DROP INDEX IF EXISTS idx_sales_country'),
    knex.schema.raw('DROP INDEX IF EXISTS idx_sales_region'),
    knex.schema.raw('DROP INDEX IF EXISTS idx_products_subcategory_id')
  ]);
};