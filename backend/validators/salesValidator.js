const { z, ZodError } = require('zod');

function sanitizeQuery(req, res, next) {
  Object.keys(req.query).forEach(key => {
    if (req.query[key] === '') delete req.query[key];
  });
  next();
}

const paginationSchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .refine(n => !isNaN(n) && n > 0, { message: 'page must be a positive integer' })
    .optional(),
  pageSize: z.string()
    .transform(val => parseInt(val, 10))
    .refine(n => !isNaN(n) && n > 0 && n <= 1000, { message: 'pageSize must be between 1 and 1000' })
    .optional()
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'must be in YYYY-MM-DD format' }).optional();

const productSalesSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  category: z.string().optional(),
  state: z.string().optional()
}).merge(paginationSchema);

const correlationSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  state: z.string().optional()
}).merge(paginationSchema);

const heatmapSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  country: z.string().optional()
}).merge(paginationSchema);

function validate(schema) {
  return [sanitizeQuery, (req, res, next) => {
    try {
      const parsed = schema.parse(req.query);
      const { page = 1, pageSize = 100, ...rest } = parsed;
      req.query = { ...rest, page, pageSize };
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const messages = err.errors.map(e => e.message);
        return res.status(400).json({ error: messages.join(', ') });
      }
      next(err);
    }
  }];
}

module.exports = {
  validateProductSales: validate(productSalesSchema),
  validateCorrelation: validate(correlationSchema),
  validateHeatmap: validate(heatmapSchema)
};