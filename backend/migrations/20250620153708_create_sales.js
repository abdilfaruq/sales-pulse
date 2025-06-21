/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('sales', table => {
    table.increments('id').primary();
    table.string('order_id').notNullable();
    table.date('order_date').notNullable();
    table.date('ship_date').notNullable();
    table.string('ship_mode').notNullable();
    table.integer('quantity').notNullable();
    table.decimal('discount', 5, 2).notNullable();
    table.decimal('sales_amount', 10, 2).notNullable();
    table.decimal('profit', 10, 2).notNullable();
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table.string('state').notNullable();
    table.string('country').notNullable();
    table.string('region').notNullable();

    table.unique(['order_id', 'product_id']);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('sales');
};