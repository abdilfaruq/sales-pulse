exports.up = function(knex) {
  return knex.schema.alterTable('sales', table => {
    table.unique(['order_id', 'product_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('sales', table => {
    table.dropUnique(['order_id', 'product_id']);
  });
};