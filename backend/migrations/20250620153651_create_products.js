/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('products', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table
      .integer('subcategory_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('subcategories')
      .onDelete('CASCADE');
    table.unique(['name', 'subcategory_id']);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('products');
};