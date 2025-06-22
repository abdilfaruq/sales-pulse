# Sales Pulse Backend Service

## 📖 Description

Sales Pulse is a backend service for retail sales analytics based on supermarket dataset. It provides RESTful endpoints for data ingestion, querying sales data, and lightweight reporting including time series aggregations, KPI summaries, and period comparisons. The service is built with Node.js, Express, Knex (PostgreSQL), Zod for input validation, Winston for structured logging, and streaming ETL practices.

## 🔥 Key Features

* **Streaming ETL**: Efficient ingestion of large Excel files using `xlsx-stream-reader`, processing data in batches to minimize memory usage.
* **Database Migrations & Indexes**: Schema definitions and performance indexes via Knex migrations.
* **Input Validation**: Zod schemas to sanitize and validate query parameters.
* **Structured Logging**: Winston produces JSON-formatted logs with timestamps and metadata for easier integration with log aggregators or APM.
* **Pagination & Filtering**: Endpoints support pagination (`page`, `pageSize`) and filters (`start_date`, `end_date`, `category`, `state`, `country`, etc.).
* **Health Check Endpoint**: `/health` to verify database connectivity and service health.
* **Sales Data Endpoints**: Query product sales, correlation data, and heatmap data for analytics dashboards.
* **Reporting Endpoints**: Lightweight reporting including:

  * **Time Series**: Aggregated sales and profit over specified intervals (day, week, month, year).
  * **KPI Summary**: Total sales, total profit, average discount, and total orders over a date range.
  * **Period Comparison**: Compare metrics between two date ranges.
* **Environment Configuration**: Environment variables for database connection, server port, logging level, CORS origin, and ETL file path.
* **Robust Error Handling**: Centralized error handling middleware to return consistent error responses without leaking internals.

## 📦 Prerequisites

* **Node.js**: v20.x or higher.
* **PostgreSQL**: v17+ (or compatible version).
* **Git**: For cloning the repository.
* **Hosting**: (Optional) Platforms such as Render, Heroku, AWS, or Docker environment.

## 🚀 Installation and Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/abdilfaruq/sales-pulse.git

# Navigate into the project directory
cd sales-pulse

# Go to the backend folder
cd backend

# Install dependencies
npm install
```

### 2. Environment Variables

Create a `.env` file at the project root based on `.env.example`. Example variables:

```env
# PostgreSQL settings\ nPG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=your_database

# Logging
LOG_LEVEL=info

# Server
PORT=3001

# ETL
ETL_FILE_PATH=data/supermarket.xlsx

# CORS origin (frontend URL)
CORS_ORIGIN=http://localhost:5173
```

### 3. Database Setup & Migrations

* Ensure the PostgreSQL database exists:

  ```bash
  psql -h $PG_HOST -U $PG_USER -c "CREATE DATABASE $PG_DATABASE;"
  ```
* Run Knex migrations:

  ```bash
  npm run migrate
  ```
* Verify indexes or add new migrations if needed.

### 4. Running the Server

* **Development** (with auto-reload via nodemon):

  ```bash
  npm run dev
  ```
* **Production**:

  ```bash
  npm start
  ```

Server listens on `http://localhost:3001` (or configured `PORT`).

## 🛠 ETL Process

The ETL script ingests Excel data into PostgreSQL:

1. **Trigger ETL**: `npm run etl` reads `ETL_FILE_PATH` from environment.
2. **Streaming**: Uses `xlsx-stream-reader` to read rows sequentially, reducing memory footprint.
3. **Header Mapping**: First row defines headers; supports case-insensitive matching for known columns.
4. **Upsert Hierarchy**:

   * Insert categories if not exist.
   * Insert subcategories if not exist.
   * Insert products if not exist.
   * Insert sales rows with `ON CONFLICT DO NOTHING` for idempotency.
5. **Batch Processing**: Default batch size is 500 rows; adjustable in `scripts/etl.js`.
6. **Error Handling**: Rollback batch on error; skip invalid rows (e.g., invalid dates) with warnings.
7. **Completion**: Close DB pool when done; log summary of processing.

> **Tip**: Monitor logs for performance and errors. Adjust batch size and ETL path as needed.

## 🔍 API Documentation

Base URL: `http://{HOST}:{PORT}/api`

### 1. Health Check

* **GET** `/health`

  * **200 OK**: `{ "status": "ok" }` if database reachable.
  * **500 Internal Server Error**: `{ "status": "error", "error": "<message>" }` if database unreachable.

### 2. Product Sales Endpoint

* **GET** `/api/products/sales`
* **Query Parameters**:

  * `start_date` (YYYY-MM-DD) optional
  * `end_date` (YYYY-MM-DD) optional
  * `category` (string) optional
  * `state` (string) optional
  * `page` (integer ≥1) optional, default 1
  * `pageSize` (integer 1–1000) optional, default 100
  * `product` (string) optional: when provided, returns sales aggregated per state for that product (if `state` not provided), or aggregated per product in given state (if `state` provided).
* **Response 200 OK**:

  ```json
  {
    "data": [
      { "product": "Product A", "total_sold": "123" },
      ...
    ],
    "meta": { "page": 1, "pageSize": 100, "total": 250 }
  }
  ```
* **400 Bad Request**: If parameters invalid (e.g., wrong date format or page < 1).

### 3. Correlation Data Endpoint

* **GET** `/api/sales/correlation`
* **Query Parameters**:

  * `start_date`, `end_date` optional
  * `state` optional
  * `page`, `pageSize` optional
* **Response 200 OK**:

  ```json
  {
    "data": [
      { "state": "California", "discount": "5.00", "quantity": 10, "product": "Product A" },
      ...
    ],
    "meta": { "page": 1, "pageSize": 100, "total": 10000 }
  }
  ```
* **Description**: Returns raw records for correlation analyses (discount vs quantity/profit, etc.).

### 4. Heatmap Data Endpoint

* **GET** `/api/sales/heatmap`
* **Query Parameters**:

  * `start_date`, `end_date` optional
  * `country` optional
  * `page`, `pageSize` optional
* **Response 200 OK**:

  ```json
  {
    "data": [
      { "state": "Texas", "product": "Product A", "total_sold": "500" },
      ...
    ],
    "meta": { "page": 1, "pageSize": 100 }
  }
  ```
* **Description**: Data for generating heatmaps by state-product, optionally filtered by country.

### 5. Catalog Endpoint

* **GET** `/api/catalog/subcategories-with-products`
* **Response 200 OK**:

  ```json
  {
    "data": [
      {
        "subcategory_id": 1,
        "subcategory_name": "Paper",
        "products": [
          { "product_id": 372, "name": "Easy-staple paper" },
          ...
        ]
      },
      ...
    ]
  }
  ```
* **Description**: Retrieves mapping of subcategories and products for frontend filters or catalogs.

### 6. Reporting Endpoints

#### 6.1 Time Series Aggregation

* **GET** `/api/reports/sales/timeseries`
* **Query Parameters**:

  * `start_date` (YYYY-MM-DD) **required**
  * `end_date` (YYYY-MM-DD) **required**
  * `interval` (enum: `day`, `week`, `month`, `year`) **required**
* **Response 200 OK**:

  ```json
  {
    "data": [
      { "period": "2014-01-01", "total_sales": 90860, "total_profit": -16385 },
      { "period": "2014-02-01", "total_sales": 59770, "total_profit": 14070 },
      ...
    ]
  }
  ```

  * `period` is the start date of each interval, formatted `YYYY-MM-DD`.
* **400 Bad Request**: If parameters missing or invalid.
* **Notes**: Ensure correct column names (`sales` or `sales_amount`) in queries matching your schema.

#### 6.2 KPI Summary

* **GET** `/api/reports/kpi`
* **Query Parameters**:

  * `start_date` (YYYY-MM-DD) **required**
  * `end_date` (YYYY-MM-DD) **required**
* **Response 200 OK**:

  ```json
  {
    "data": {
      "total_sales": 3492760,
      "total_profit": 445680,
      "avg_discount": 0.1563,
      "total_orders": 1509
    },
    "meta": { "start_date": "2014-01-01", "end_date": "2015-06-30" }
  }
  ```
* **400 Bad Request**: If parameters invalid.

#### 6.3 Period Comparison

* **GET** `/api/reports/sales/comparison`
* **Query Parameters**:

  * `period1_start` (YYYY-MM-DD) **required**
  * `period1_end` (YYYY-MM-DD) **required**
  * `period2_start` (YYYY-MM-DD) **required**
  * `period2_end` (YYYY-MM-DD) **required**
* **Response 200 OK**:

  ```json
  {
    "data": {
      "period1": {
        "total_sales": 2352800,
        "total_profit": 308030,
        "avg_discount": 0.1556,
        "total_orders": 1038
      },
      "period2": {
        "total_sales": 1139960,
        "total_profit": 137650,
        "avg_discount": 0.1580,
        "total_orders": 471
      },
      "diff": {
        "sales_diff": -1212840,
        "profit_diff": -170380,
        "avg_discount_diff": 0.0024,
        "orders_diff": -567
      }
    }
  }
  ```
* **400 Bad Request**: If parameters invalid or date ranges invalid.
* **Description**: Compare metrics between two periods.

### Validation & Error Handling

* Implement validators (e.g., Zod) to check date formats and allowed values.
* Return 400 Bad Request with clear error messages for invalid inputs.
* Global error handler logs errors via Winston and returns generic error response.

## ⚙️ Configuration & Environment

* **config/default.js**: Reads environment variables for port and ETL path.
* **knexfile.js**: Connection settings from environment for development and production; production pool settings.
* **CORS**: Configured in `server.js` with `CORS_ORIGIN` environment variable.
* **Logging**: Winston configured via `LOG_LEVEL`, outputs JSON logs. Integrate with log management in production.
* **Environment Variables**: Set in hosting environment (Render, Heroku, etc.) matching `.env.example`.

## 🔍 Performance & Optimization

* **Indexes**: Ensure indexes on `order_date`, `state`, `country`, `product_id`.
* **Pagination Strategy**: Offset-based pagination; consider keyset pagination for large datasets.
* **Connection Pooling**: Adjust Knex pool size in production.
* **Batch Size ETL**: Tune batch size in `scripts/etl.js` for throughput and memory trade-offs.
* **Caching**: For repeated reporting queries, consider caching layer (e.g., Redis).
* **Monitoring**: Integrate logs and metrics (latency, error rates) via APM (Datadog, New Relic, etc.).
* **Health Checks & Alerts**: Monitor `/health`, set up alerts when service or database is unhealthy.
* **Load Testing**: Test heavy reporting queries to identify bottlenecks; optimize SQL queries or add materialized views if necessary.

## 🔒 Security

* **Input Validation**: Zod to validate and sanitize all query parameters.
* **SQL Injection**: Knex parameterized queries mitigate risk.
* **CORS**: Restrict to frontend origins only.
* **Rate Limiting**: Use `express-rate-limit` or similar for public endpoints, especially reporting endpoints which may be compute-intensive.
* **Error Exposure**: In production, hide stack traces; return generic error messages.
* **Authentication & Authorization**: If needed, add JWT or API key middleware to protect endpoints.
* **Database Security**: Restrict database access network; use least-privilege credentials.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
