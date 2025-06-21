require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,
  etlFilePath: process.env.ETL_FILE_PATH || 'data/supermarket.xlsx'
};
