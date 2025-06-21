const fs = require('fs');
const XlsxStreamReader = require('xlsx-stream-reader');
const { Pool } = require('pg');
const logger = require('../logger');
require('dotenv').config();

const etlFilePath = process.env.ETL_FILE_PATH;
if (!etlFilePath) {
  logger.error('ETL_FILE_PATH not set');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  max: 5
});

let headerMap = null;
let poolEnded = false;

async function upsertCategories(client, categoryNames) {
  if (!categoryNames.length) return {};
  const uniqueNames = [...new Set(categoryNames)];
  for (const name of uniqueNames) {
    await client.query(
      `INSERT INTO categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING`,
      [name]
    );
  }
  const res = await client.query(
    `SELECT id, name FROM categories WHERE name = ANY($1)`,
    [uniqueNames]
  );
  const map = {};
  res.rows.forEach(r => { map[r.name] = r.id; });
  return map;
}

async function upsertSubcategories(client, subcategoryEntries) {
  if (!subcategoryEntries.length) return {};
  const uniqueKeys = Array.from(new Set(subcategoryEntries.map(e => `${e.name}||${e.category_id}`)));
  const uniques = uniqueKeys.map(key => {
    const [name, catId] = key.split('||');
    return { name, category_id: parseInt(catId, 10) };
  });
  for (const { name, category_id } of uniques) {
    await client.query(
      `INSERT INTO subcategories(name, category_id) VALUES($1, $2) ON CONFLICT(name, category_id) DO NOTHING`,
      [name, category_id]
    );
  }
  const rows = [];
  const chunkSize = 100;
  for (let i = 0; i < uniques.length; i += chunkSize) {
    const chunk = uniques.slice(i, i + chunkSize);
    const conditions = chunk.map((_, idx) => `(name=$${idx*2+1} AND category_id=$${idx*2+2})`).join(' OR ');
    const values = chunk.flatMap(e => [e.name, e.category_id]);
    const res = await client.query(
      `SELECT id, name, category_id FROM subcategories WHERE ${conditions}`,
      values
    );
    rows.push(...res.rows);
  }
  const map = {};
  rows.forEach(r => { map[`${r.name}||${r.category_id}`] = r.id; });
  return map;
}

async function upsertProducts(client, productEntries) {
  if (!productEntries.length) return {};
  const uniqueKeys = Array.from(new Set(productEntries.map(e => `${e.name}||${e.subcategory_id}`)));
  const uniques = uniqueKeys.map(key => {
    const [name, subId] = key.split('||');
    return { name, subcategory_id: parseInt(subId, 10) };
  });
  for (const { name, subcategory_id } of uniques) {
    await client.query(
      `INSERT INTO products(name, subcategory_id) VALUES($1, $2) ON CONFLICT(name, subcategory_id) DO NOTHING`,
      [name, subcategory_id]
    );
  }
  const rows = [];
  const chunkSize = 100;
  for (let i = 0; i < uniques.length; i += chunkSize) {
    const chunk = uniques.slice(i, i + chunkSize);
    const conditions = chunk.map((_, idx) => `(name=$${idx*2+1} AND subcategory_id=$${idx*2+2})`).join(' OR ');
    const values = chunk.flatMap(e => [e.name, e.subcategory_id]);
    const res = await client.query(
      `SELECT id, name, subcategory_id FROM products WHERE ${conditions}`,
      values
    );
    rows.push(...res.rows);
  }
  const map = {};
  rows.forEach(r => { map[`${r.name}||${r.subcategory_id}`] = r.id; });
  return map;
}

async function batchInsertSales(client, salesRows) {
  if (!salesRows.length) return;
  const columns = Object.keys(salesRows[0]);
  const values = [];
  const placeholders = salesRows.map((row, i) => {
    const ph = columns.map((col, j) => `$${i * columns.length + j + 1}`).join(',');
    values.push(...columns.map(col => row[col]));
    return `(${ph})`;
  }).join(',');
  const conflictCols = ['order_id', 'product_id'];
  const sql = `INSERT INTO sales(${columns.join(',')}) VALUES ${placeholders} ON CONFLICT(${conflictCols.join(',')}) DO NOTHING`;
  await client.query(sql, values);
}

function parseDate(val) {
  if (val instanceof Date) return val;
  const d = new Date(val);
  if (!isNaN(d)) return d;
  return null;
}

async function processBatch(batch) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryNames = batch.map(r => r.category).filter(v => v);
    const categoryMap = await upsertCategories(client, categoryNames);

    const subEntries = batch.map(r => ({ name: r.subcategory, category_id: categoryMap[r.category] })).filter(e => e.name && e.category_id);
    const subMap = await upsertSubcategories(client, subEntries);

    const prodEntries = batch.map(r => ({ name: r.product, subcategory_id: subMap[`${r.subcategory}||${categoryMap[r.category]}`] })).filter(e => e.name && e.subcategory_id);
    const prodMap = await upsertProducts(client, prodEntries);

    const salesRows = [];
    for (const r of batch) {
      const catId = categoryMap[r.category];
      const subKey = `${r.subcategory}||${catId}`;
      const subId = subMap[subKey];
      const prodKey = `${r.product}||${subId}`;
      const prodId = prodMap[prodKey];
      if (!prodId) {
        logger.warn('Product ID not found, skipping row', { product: r.product, subcategory: r.subcategory });
        continue;
      }
      salesRows.push({
        order_id: r.order_id,
        order_date: r.order_date,
        ship_date: r.ship_date,
        ship_mode: r.ship_mode,
        quantity: r.quantity,
        discount: r.discount,
        sales_amount: r.sales_amount,
        profit: r.profit,
        product_id: prodId,
        state: r.state,
        country: r.country,
        region: r.region
      });
    }
    await batchInsertSales(client, salesRows);
    await client.query('COMMIT');
    logger.info(`Batch of ${batch.length} rows processed, inserted ${salesRows.length} sales rows`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('ETL batch error', { error: err });
  } finally {
    client.release();
  }
}

function streamETL(filePath) {
  const workBookReader = new XlsxStreamReader();
  workBookReader.on('error', err => {
    logger.error('ETL workbook error', { error: err });
  });
  workBookReader.on('worksheet', sheet => {
    let batch = [];
    const BATCH_SIZE = 500;
    sheet.on('row', async row => {
      if (row.attributes.r === 1) {
        headerMap = row.values.slice(1).map(h => h && String(h).trim());
        return;
      }
      if (!headerMap) return;
      const rowObj = {};
      headerMap.forEach((colName, idx) => {
        rowObj[colName] = row.values[idx+1];
      });
      const order_date = parseDate(rowObj['order_date'] || rowObj['Order Date']);
      const ship_date = parseDate(rowObj['ship_date'] || rowObj['Ship Date']);
      if (!order_date || !ship_date) {
        logger.warn('Skipping row with invalid dates', { row: row.values });
        return;
      }
      const parsedRow = {
        order_id: String(rowObj['order_id'] || rowObj['Order ID']),
        order_date,
        ship_date,
        ship_mode: String(rowObj['ship_mode'] || rowObj['Ship Mode']),
        quantity: parseInt(rowObj['quantity'] || rowObj['Quantity'], 10) || 0,
        discount: parseFloat(rowObj['discount'] || rowObj['Discount']) || 0,
        sales_amount: parseFloat(rowObj['sales_amount'] || rowObj['Sales'] || rowObj['Sales Amount']) || 0,
        profit: parseFloat(rowObj['profit'] || rowObj['Profit']) || 0,
        category: rowObj['category'] ? String(rowObj['category']).trim() : (rowObj['Category']?String(rowObj['Category']).trim():null),
        subcategory: rowObj['subcategory'] ? String(rowObj['subcategory']).trim() : (rowObj['Sub-Category']?String(rowObj['Sub-Category']).trim():null),
        product: rowObj['product'] ? String(rowObj['product']).trim() : (rowObj['Product Name']?String(rowObj['Product Name']).trim():null),
        state: rowObj['state'] ? String(rowObj['state']).trim() : (rowObj['State']?String(rowObj['State']).trim():null),
        country: rowObj['country'] ? String(rowObj['country']).trim() : (rowObj['Country']?String(rowObj['Country']).trim():null),
        region: rowObj['region'] ? String(rowObj['region']).trim() : (rowObj['Region']?String(rowObj['Region']).trim():null)
      };
      batch.push(parsedRow);
      if (batch.length >= BATCH_SIZE) {
        sheet.pause();
        await processBatch(batch);
        batch = [];
        sheet.resume();
      }
    });
    sheet.on('end', async () => {
      if (batch.length) {
        await processBatch(batch);
      }
      if (!poolEnded) {
        poolEnded = true;
        await pool.end();
        logger.info('ETL completed');
      }
    });
    sheet.process();
  });
  workBookReader.on('end', () => {
    if (!poolEnded) {
      poolEnded = true;
      pool.end().then(() => logger.info('Pool closed after workbook end')).catch(err => logger.error('Error closing pool', { error: err }));
    }
  });
  fs.createReadStream(filePath).pipe(workBookReader);
}

streamETL(etlFilePath);