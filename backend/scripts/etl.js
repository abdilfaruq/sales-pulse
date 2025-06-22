require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XlsxStreamReader = require('xlsx-stream-reader');
const { Pool } = require('pg');
const logger = require('../logger');
const { Readable } = require('stream');

const fetchFn = (typeof fetch === 'function')
  ? fetch
  : (() => {
      try {
        return require('node-fetch');
      } catch (_) {
        logger.error('Fetch tidak tersedia, dan module node-fetch tidak ditemukan. Pastikan Node v18+ atau install node-fetch.');
        process.exit(1);
      }
    })();

if (!process.env.DATABASE_URL) {
  const reqDbEnvs = ['PG_HOST', 'PG_PORT', 'PG_USER', 'PG_PASSWORD', 'PG_DATABASE'];
  for (const key of reqDbEnvs) {
    if (!process.env[key]) {
      console.error(`Environment variable ${key} is not set or empty. Please set it or provide DATABASE_URL.`);
      process.exit(1);
    }
  }
  logger.info('Using individual PG_* vars for connection');
} else {
  logger.info('DATABASE_URL ditemukan, akan menggunakan DATABASE_URL untuk koneksi');
}
if (!process.env.ETL_BATCH_SIZE) {
  console.error('Environment variable ETL_BATCH_SIZE is not set or empty. Please set it.');
  process.exit(1);
}
if (!process.env.LOG_LEVEL) {
  console.error('Environment variable LOG_LEVEL is not set or empty. Please set it.');
  process.exit(1);
}
logger.info('All required environment variables are set.');

let etlFilePath = null;
if (process.env.ETL_FILE_PATH && process.env.ETL_FILE_PATH.trim() !== '') {
  const raw = process.env.ETL_FILE_PATH.trim();
  etlFilePath = path.isAbsolute(raw) ? raw : path.resolve(__dirname, '..', raw);
  if (!fs.existsSync(etlFilePath)) {
    logger.error('File not found: %s', etlFilePath);
    process.exit(1);
  }
  try {
    fs.accessSync(etlFilePath, fs.constants.R_OK);
    logger.info('ETL file is readable: %s', etlFilePath);
  } catch (err) {
    logger.error('Cannot read ETL file: %s', err.message);
    process.exit(1);
  }
} else {
  logger.info('No ETL_FILE_PATH provided or empty; akan mengandalkan ETL_FILE_URL jika ada.');
}

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 5
  });
} else {
  pool = new Pool({
    host: process.env.PG_HOST,
    port: parseInt(process.env.PG_PORT, 10),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    max: 5
  });
}

(async () => {
  try {
    const client = await pool.connect();
    logger.info('Database connection successful');

    const resDb = await client.query('SELECT current_database()');
    logger.info('ETL connected to database: %o', resDb.rows[0]);
    const resUser = await client.query('SELECT current_user');
    logger.info('ETL connected as user: %o', resUser.rows[0]);
    const resTime = await client.query('SELECT NOW()');
    logger.info('DB time: %o', resTime.rows[0]);

    const resTables = await client.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name IN ('categories','subcategories','products','sales')
    `);
    logger.info('ETL sees these tables: %o', resTables.rows);

    client.release();

    startStreaming();
  } catch (err) {
    logger.error('Database connection failed: %o', err);
    process.exit(1);
  }
})();

function excelSerialToDate(serial) {
  const excelEpoch = Date.UTC(1899, 11, 30);
  const offset = serial > 59 ? serial - 1 : serial;
  return new Date(excelEpoch + offset * 24 * 60 * 60 * 1000);
}
function parseDate(val) {
  if (val == null) return null;
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === 'number') {
    const d = excelSerialToDate(val);
    return isNaN(d) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d) ? null : d;
}
function normalizeHeaderName(h) {
  if (h == null) return '';
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_');
}
function cleanNumber(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  let s = String(val).trim();
  if (/^\(.*\)$/.test(s)) {
    s = '-' + s.slice(1, -1);
  }
  s = s.replace(/[^0-9\.\-]+/g, '');
  if (s === '' || s === '.' || s === '-' || s === '-.') return null;
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

async function upsertCategories(client, categoryNames) {
  const uniqueNames = Array.from(new Set(categoryNames.filter(n => n && n.trim())));
  logger.debug('upsertCategories: uniqueNames count=%d', uniqueNames.length);
  if (!uniqueNames.length) return {};
  const resExist = await client.query(
    `SELECT name FROM categories WHERE name = ANY($1)`,
    [uniqueNames]
  );
  const existSet = new Set(resExist.rows.map(r => r.name));
  const namesToInsert = uniqueNames.filter(n => !existSet.has(n));
  if (namesToInsert.length) {
    await client.query(
      `INSERT INTO categories(name) SELECT unnest($1::text[])`,
      [namesToInsert]
    );
    logger.info('upsertCategories: Inserted %d new categories', namesToInsert.length);
  }
  const resAll = await client.query(
    `SELECT id, name FROM categories WHERE name = ANY($1)`,
    [uniqueNames]
  );
  const map = {};
  resAll.rows.forEach(r => {
    map[r.name] = Number(r.id);
  });
  return map;
}

async function upsertSubcategories(client, subcategoryEntries) {
  const uniqMap = new Map();
  for (const e of subcategoryEntries) {
    if (e.name && e.category_id != null) {
      const catIdNum = Number(e.category_id);
      if (!isNaN(catIdNum)) {
        uniqMap.set(`${e.name}||${catIdNum}`, { name: e.name, category_id: catIdNum });
      }
    }
  }
  const uniques = Array.from(uniqMap.values());
  if (!uniques.length) return {};
  const EXIST_CHUNK = 200;
  const existSet = new Set();
  for (let i = 0; i < uniques.length; i += EXIST_CHUNK) {
    const chunk = uniques.slice(i, i + EXIST_CHUNK);
    const namesChunk = chunk.map(e => e.name);
    const catIdsChunk = chunk.map(e => e.category_id);
    const res = await client.query(
      `SELECT s.name, s.category_id
       FROM subcategories s
       JOIN UNNEST($1::text[], $2::int[]) AS u(name, category_id)
         ON s.name = u.name AND s.category_id = u.category_id`,
      [namesChunk, catIdsChunk]
    );
    res.rows.forEach(r => existSet.add(`${r.name}||${r.category_id}`));
  }
  const toInsert = uniques.filter(e => !existSet.has(`${e.name}||${e.category_id}`));
  if (toInsert.length) {
    const insNames = toInsert.map(e => e.name);
    const insCatIds = toInsert.map(e => e.category_id);
    await client.query(
      `INSERT INTO subcategories(name, category_id)
       SELECT u.name, u.category_id
       FROM UNNEST($1::text[], $2::int[]) AS u(name, category_id)`,
      [insNames, insCatIds]
    );
    logger.info('upsertSubcategories: Inserted %d new subcategories', toInsert.length);
  }
  const map = {};
  for (let i = 0; i < uniques.length; i += EXIST_CHUNK) {
    const chunk = uniques.slice(i, i + EXIST_CHUNK);
    const namesChunk = chunk.map(e => e.name);
    const catIdsChunk = chunk.map(e => e.category_id);
    const resAll = await client.query(
      `SELECT s.id, s.name, s.category_id
       FROM subcategories s
       JOIN UNNEST($1::text[], $2::int[]) AS u(name, category_id)
         ON s.name = u.name AND s.category_id = u.category_id`,
      [namesChunk, catIdsChunk]
    );
    resAll.rows.forEach(r => {
      map[`${r.name}||${r.category_id}`] = Number(r.id);
    });
  }
  return map;
}

async function upsertProducts(client, productEntries) {
  const uniqMap = new Map();
  for (const e of productEntries) {
    if (e.name && e.subcategory_id != null) {
      const subIdNum = Number(e.subcategory_id);
      if (!isNaN(subIdNum)) {
        uniqMap.set(`${e.name}||${subIdNum}`, { name: e.name, subcategory_id: subIdNum });
      }
    }
  }
  const uniques = Array.from(uniqMap.values());
  if (!uniques.length) return {};
  const EXIST_CHUNK = 200;
  const existSet = new Set();
  for (let i = 0; i < uniques.length; i += EXIST_CHUNK) {
    const chunk = uniques.slice(i, i + EXIST_CHUNK);
    const namesChunk = chunk.map(e => e.name);
    const subIdsChunk = chunk.map(e => e.subcategory_id);
    const res = await client.query(
      `SELECT p.name, p.subcategory_id
       FROM products p
       JOIN UNNEST($1::text[], $2::int[]) AS u(name, subcategory_id)
         ON p.name = u.name AND p.subcategory_id = u.subcategory_id`,
      [namesChunk, subIdsChunk]
    );
    res.rows.forEach(r => existSet.add(`${r.name}||${r.subcategory_id}`));
  }
  const toInsert = uniques.filter(e => !existSet.has(`${e.name}||${e.subcategory_id}`));
  if (toInsert.length) {
    const insNames = toInsert.map(e => e.name);
    const insSubIds = toInsert.map(e => e.subcategory_id);
    await client.query(
      `INSERT INTO products(name, subcategory_id)
       SELECT u.name, u.subcategory_id
       FROM UNNEST($1::text[], $2::int[]) AS u(name, subcategory_id)`,
      [insNames, insSubIds]
    );
    logger.info('upsertProducts: Inserted %d new products', toInsert.length);
  }
  const map = {};
  for (let i = 0; i < uniques.length; i += EXIST_CHUNK) {
    const chunk = uniques.slice(i, i + EXIST_CHUNK);
    const namesChunk = chunk.map(e => e.name);
    const subIdsChunk = chunk.map(e => e.subcategory_id);
    const resAll = await client.query(
      `SELECT p.id, p.name, p.subcategory_id
       FROM products p
       JOIN UNNEST($1::text[], $2::int[]) AS u(name, subcategory_id)
         ON p.name = u.name AND p.subcategory_id = u.subcategory_id`,
      [namesChunk, subIdsChunk]
    );
    resAll.rows.forEach(r => {
      map[`${r.name}||${r.subcategory_id}`] = Number(r.id);
    });
  }
  return map;
}

async function batchInsertSales(client, salesRows) {
  if (!salesRows.length) {
    logger.debug('batchInsertSales: no rows to insert');
    return;
  }
  const rowMap = new Map();
  for (const row of salesRows) {
    const key = `${row.order_id}||${row.product_id}`;
    if (!rowMap.has(key)) {
      rowMap.set(key, row);
    }
  }
  const dedupedRows = Array.from(rowMap.values());
  logger.debug('batchInsertSales: dedupedRows count=%d (from %d)', dedupedRows.length, salesRows.length);

  const uniquePairs = dedupedRows.map(r => ({ order_id: r.order_id, product_id: r.product_id }));
  if (!uniquePairs.length) {
    logger.debug('batchInsertSales: no unique pairs');
    return;
  }

  const EXIST_CHUNK = 200;
  const existingSet = new Set();
  for (let i = 0; i < uniquePairs.length; i += EXIST_CHUNK) {
    const chunk = uniquePairs.slice(i, i + EXIST_CHUNK);
    const orderIdsChunk = chunk.map(p => p.order_id);
    const prodIdsChunk = chunk.map(p => p.product_id);
    const res = await client.query(
      `SELECT s.order_id, s.product_id
       FROM sales s
       JOIN UNNEST($1::text[], $2::int[]) AS u(order_id, product_id)
         ON s.order_id = u.order_id AND s.product_id = u.product_id`,
      [orderIdsChunk, prodIdsChunk]
    );
    res.rows.forEach(r => existingSet.add(`${r.order_id}||${r.product_id}`));
  }

  const rowsToInsert = dedupedRows.filter(r => !existingSet.has(`${r.order_id}||${r.product_id}`));
  logger.debug('batchInsertSales: rowsToInsert count=%d', rowsToInsert.length);
  if (!rowsToInsert.length) return;

  const columns = Object.keys(rowsToInsert[0]);
  const insertValues = [];
  const placeholders = rowsToInsert.map((row, i) => {
    const ph = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(',');
    insertValues.push(...columns.map(col => row[col]));
    return `(${ph})`;
  }).join(',');
  const insertSQL = `INSERT INTO sales(${columns.join(',')}) VALUES ${placeholders} ON CONFLICT(order_id, product_id) DO NOTHING`;
  logger.info('batchInsertSales: inserting %d rows with ON CONFLICT DO NOTHING', rowsToInsert.length);
  await client.query(insertSQL, insertValues);
}

async function processBatch(batch, batchIndexInfo = '') {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    logger.info('processBatch%s: start, batch size=%d', batchIndexInfo, batch.length);

    const categoryNames = batch.map(r => r.category).filter(v => v);
    const categoryMap = await upsertCategories(client, categoryNames);

    const subEntries = batch.map(r => {
      const catId = categoryMap[r.category];
      return { name: r.subcategory, category_id: catId != null ? Number(catId) : null };
    }).filter(e => e.name && e.category_id != null);
    const subMap = await upsertSubcategories(client, subEntries);

    const prodEntries = batch.map(r => {
      const catId = categoryMap[r.category];
      const subKey = `${r.subcategory}||${catId}`;
      const subId = subMap[subKey];
      return { name: r.product, subcategory_id: subId != null ? Number(subId) : null };
    }).filter(e => e.name && e.subcategory_id != null);
    const prodMap = await upsertProducts(client, prodEntries);

    const salesRows = [];
    for (const r of batch) {
      const catId = categoryMap[r.category];
      const subKey = `${r.subcategory}||${catId}`;
      const subId = subMap[subKey];
      const prodKey = `${r.product}||${subId}`;
      const prodId = prodMap[prodKey];
      if (!prodId) {
        logger.warn('processBatch%s: Product ID not found, skipping row %s / %s / %s', batchIndexInfo, r.order_id, r.product, r.subcategory);
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
    logger.info('processBatch%s: prepared salesRows count=%d', batchIndexInfo, salesRows.length);
    await batchInsertSales(client, salesRows);

    await client.query('COMMIT');
    logger.info('processBatch%s: COMMIT success', batchIndexInfo);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('processBatch%s: ROLLBACK due to error: %o', batchIndexInfo, err);
  } finally {
    client.release();
  }
}

function startStreaming() {
  const BATCH_SIZE = parseInt(process.env.ETL_BATCH_SIZE, 10) || 500;
  logger.info('Starting ETL streaming...');
  const workBookReader = new XlsxStreamReader();

  const pendingBatches = new Set();
  let sheetsRemaining = 0;
  let poolClosed = false;

  function runProcessBatch(batchToProcess, info) {
    const p = processBatch(batchToProcess, info)
      .catch(err => {
        logger.error('Unexpected error in processBatch%s: %o', info, err);
      })
      .finally(() => {
        pendingBatches.delete(p);
      });
    pendingBatches.add(p);
    return p;
  }

  workBookReader.on('error', err => {
    logger.error('ETL workbook error: %o', err);
  });

  workBookReader.on('worksheet', sheet => {
    sheetsRemaining++;
    logger.info('*** Processing worksheet: %s (sheetsRemaining=%d) ***', sheet.name, sheetsRemaining);

    let headerMap = null;
    let batch = [];
    let rowCount = 0;
    let batchCount = 0;
    let isProcessing = false;
    let skipSheet = false;

    async function tryProcessBatch() {
      if (isProcessing) return;
      if (batch.length === 0) return;
      const batchToProcess = batch;
      batch = [];
      batchCount++;
      const info = ` [sheet ${sheet.name}, batch #${batchCount}]`;
      isProcessing = true;
      logger.info('tryProcessBatch: invoking processBatch%s, size=%d', info, batchToProcess.length);
      await runProcessBatch(batchToProcess, info);
      isProcessing = false;
      if (batch.length >= BATCH_SIZE) {
        setImmediate(tryProcessBatch);
      }
    }

    sheet.on('row', row => {
      rowCount++;
      const rowNum = Number(row.attributes.r);
      if (rowNum === 1) {
        headerMap = row.values.slice(1).map(h => normalizeHeaderName(h));
        logger.info('Detected headers (normalized) in sheet "%s": %o', sheet.name, headerMap);
        const neededCols = ['order_id', 'order_date', 'ship_date', 'product_name', 'sales'];
        const hasNeeded = neededCols.every(col => headerMap.includes(col));
        if (!hasNeeded) {
          skipSheet = true;
          logger.info('Sheet "%s" tidak mengandung kolom penting %o, di-skip.', sheet.name, neededCols);
        }
        return;
      }
      if (skipSheet) return;
      if (!headerMap) return;

      const rowObj = {};
      headerMap.forEach((colName, idx) => {
        rowObj[colName] = row.values[idx + 1];
      });
      const order_date = parseDate(rowObj['order_date']);
      const ship_date = parseDate(rowObj['ship_date']);
      if (!order_date || !ship_date) {
        logger.warn('Row %d di sheet "%s": invalid dates, skip', rowNum, sheet.name);
        return;
      }
      const parsedRow = {
        order_id: String(rowObj['order_id'] || '').trim(),
        order_date,
        ship_date,
        ship_mode: String(rowObj['ship_mode'] || '').trim(),
        quantity: parseInt(rowObj['quantity'] || 0, 10) || 0,
        discount: cleanNumber(rowObj['discount']) || 0,
        sales_amount: cleanNumber(rowObj['sales']) || 0,
        profit: cleanNumber(rowObj['profit']) || 0,
        category: rowObj['category'] ? String(rowObj['category']).trim() : null,
        subcategory: rowObj['sub_category'] ? String(rowObj['sub_category']).trim() : null,
        product: rowObj['product_name'] ? String(rowObj['product_name']).trim() : null,
        state: rowObj['state'] ? String(rowObj['state']).trim() : null,
        country: rowObj['country'] ? String(rowObj['country']).trim() : null,
        region: rowObj['region'] ? String(rowObj['region']).trim() : null
      };
      if (!parsedRow.order_id) {
        logger.warn('Row %d di sheet "%s": missing order_id, skip', rowNum, sheet.name);
        return;
      }
      if (rowCount <= 5) {
        logger.info('Row %d parsedRow: %o', rowNum, parsedRow);
      }
      batch.push(parsedRow);
      if (batch.length >= BATCH_SIZE) {
        tryProcessBatch();
      }
    });

    sheet.on('end', async () => {
      if (skipSheet) {
        logger.info('Sheet "%s" diakhiri: di-skip karena header tidak sesuai', sheet.name);
      } else {
        if (batch.length > 0) {
          await tryProcessBatch();
          const waitFinish = () => new Promise(resolve => {
            const check = () => {
              if (!isProcessing) resolve();
              else setTimeout(check, 100);
            };
            check();
          });
          await waitFinish();
        }
        logger.info('Finished sheet "%s", total rows read=%d, total batches=%d', sheet.name, rowCount, batchCount);
      }
      sheetsRemaining--;
      logger.info('Sheets remaining after finishing "%s": %d', sheet.name, sheetsRemaining);
      if (sheetsRemaining === 0) {
        logger.info('All sheets done; waiting for pending batches (%d) to finish before closing pool...', pendingBatches.size);
        try {
          await Promise.all(Array.from(pendingBatches));
          if (!poolClosed) {
            logger.info('All pending batches finished; now closing pool');
            await pool.end();
            poolClosed = true;
            logger.info('Pool closed');
          } else {
            logger.info('Pool already closed earlier, skip pool.end()');
          }
        } catch (err) {
          logger.error('Error waiting pending batches atau closing pool: %o', err);
        }
      }
    });

    sheet.process();
  });

  workBookReader.on('end', () => {
    logger.info('Workbook parsing done (workBookReader end). sheetsRemaining=%d, pendingBatches=%d', sheetsRemaining, pendingBatches.size);
  });

  const etlFileUrl = process.env.ETL_FILE_URL && process.env.ETL_FILE_URL.trim() !== ''
    ? process.env.ETL_FILE_URL.trim()
    : null;
  if (etlFileUrl) {
    (async () => {
      try {
        logger.info('Fetching ETL file from URL: %s', etlFileUrl);
        const response = await fetchFn(etlFileUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch ETL_FILE_URL, status ${response.status}`);
        }
        const webStream = response.body;
        const nodeStream = Readable.fromWeb(webStream);
        nodeStream.on('error', err => {
          logger.error('Error reading ETL file from URL stream: %o', err);
        });
        nodeStream.pipe(workBookReader);
        logger.info('Piped HTTP response stream into XlsxStreamReader');
      } catch (err) {
        logger.error('Error fetching ETL file from URL: %o', err);
        process.exit(1);
      }
    })();
  } else {
    if (!etlFilePath) {
      logger.error('Neither ETL_FILE_URL nor valid ETL_FILE_PATH diberikan. Set salah satu di .env.');
      process.exit(1);
    }
    const stream = fs.createReadStream(etlFilePath);
    stream.on('open', () => logger.info('ReadStream opened for ETL file'));
    stream.on('error', err => logger.error('Error reading ETL file: %o', err));
    stream.pipe(workBookReader);
    logger.info('Piped file stream into XlsxStreamReader');
  }
}
