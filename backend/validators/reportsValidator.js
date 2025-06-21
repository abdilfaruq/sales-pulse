const { z, ZodError } = require('zod');

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'must be in YYYY-MM-DD format' });

const timeSeriesSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  interval: z.string().optional(),
  category: z.string().optional(),
  state: z.string().optional(),
});

const kpiSchema = z.object({
  start_date: dateSchema,
  end_date: dateSchema,
  category: z.string().optional(),
  state: z.string().optional(),
});

const comparisonSchema = z.object({
  period1_start: dateSchema,
  period1_end: dateSchema,
  period2_start: dateSchema,
  period2_end: dateSchema,
  category: z.string().optional(),
  state: z.string().optional(),
});

function sanitizeQuery(req, res, next) {
  Object.keys(req.query).forEach(key => {
    if (req.query[key] === '') delete req.query[key];
  });
  next();
}

function validate(schema) {
  return [
    sanitizeQuery,
    (req, res, next) => {
      try {
        const parsed = schema.parse(req.query);
        req.query = parsed;
        next();
      } catch (err) {
        if (err instanceof ZodError) {
          const messages = err.errors.map(e => e.message);
          return res.status(400).json({ error: messages.join(', ') });
        }
        next(err);
      }
    },
  ];
}

module.exports = {
  validateTimeSeries: validate(timeSeriesSchema),
  validateKPI: validate(kpiSchema),
  validateComparison: validate(comparisonSchema),
};
