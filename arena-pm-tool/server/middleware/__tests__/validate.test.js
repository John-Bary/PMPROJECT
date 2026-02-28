// Tests for Zod validation middleware
const { z } = require('zod');
const validate = require('../validate');

describe('Validate Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = createMockNext();
  });

  describe('body validation', () => {
    it('should call next when body matches schema', () => {
      const schema = {
        body: z.object({
          title: z.string(),
          priority: z.enum(['low', 'medium', 'high']),
        }),
      };
      req.body = { title: 'My Task', priority: 'high' };

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with error details when body fails validation', () => {
      const schema = {
        body: z.object({
          title: z.string(),
          priority: z.enum(['low', 'medium', 'high']),
        }),
      };
      req.body = { title: 123, priority: 'invalid' };

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          errors: expect.arrayContaining([
            expect.objectContaining({
              source: 'body',
              message: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should replace req.body with parsed/coerced values', () => {
      const schema = {
        body: z.object({
          count: z.coerce.number(),
          name: z.string().trim(),
        }),
      };
      req.body = { count: '42', name: '  hello  ' };

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ count: 42, name: 'hello' });
    });

    it('should return 400 when body is empty but schema requires fields', () => {
      const schema = {
        body: z.object({
          title: z.string().min(1),
        }),
      };
      req.body = {};

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return the first error message as the top-level message', () => {
      const schema = {
        body: z.object({
          email: z.string().email('Invalid email address'),
        }),
      };
      req.body = { email: 'not-an-email' };

      validate(schema)(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid email address',
        })
      );
    });

    it('should include field path in error details', () => {
      const schema = {
        body: z.object({
          user: z.object({
            name: z.string(),
          }),
        }),
      };
      req.body = { user: { name: 123 } };

      validate(schema)(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'user.name',
            }),
          ]),
        })
      );
    });
  });

  describe('params validation', () => {
    it('should validate params when schema includes params', () => {
      const schema = {
        params: z.object({
          id: z.string().uuid('Must be a valid UUID'),
        }),
      };
      req.params = { id: 'not-a-uuid' };

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              source: 'params',
              message: 'Must be a valid UUID',
            }),
          ]),
        })
      );
    });

    it('should pass when params match schema', () => {
      const schema = {
        params: z.object({
          id: z.string().uuid(),
        }),
      };
      req.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('query validation', () => {
    it('should validate query parameters when schema includes query', () => {
      const schema = {
        query: z.object({
          page: z.coerce.number().int().positive(),
          limit: z.coerce.number().int().positive().max(100),
        }),
      };
      req.query = { page: '1', limit: '20' };

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it('should return 400 when query params are invalid', () => {
      const schema = {
        query: z.object({
          page: z.coerce.number().int().positive(),
        }),
      };
      req.query = { page: '-5' };

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              source: 'query',
            }),
          ]),
        })
      );
    });
  });

  describe('multiple schema sources', () => {
    it('should validate body and params together and collect all errors', () => {
      const schema = {
        body: z.object({
          title: z.string().min(1),
        }),
        params: z.object({
          id: z.string().uuid('Invalid UUID'),
        }),
      };
      req.body = {};
      req.params = { id: 'bad' };

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      const call = res.json.mock.calls[0][0];
      const sources = call.errors.map((e) => e.source);
      expect(sources).toContain('body');
      expect(sources).toContain('params');
    });
  });

  describe('edge cases', () => {
    it('should rethrow non-Zod errors', () => {
      const schema = {
        body: {
          parse: () => {
            throw new TypeError('unexpected type error');
          },
        },
      };
      req.body = { anything: true };

      expect(() => validate(schema)(req, res, next)).toThrow(TypeError);
      expect(next).not.toHaveBeenCalled();
    });

    it('should skip null/undefined schemas in the schemas object', () => {
      const schema = {
        body: null,
        query: undefined,
        params: z.object({
          id: z.string().uuid(),
        }),
      };
      req.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

      validate(schema)(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle ZodError with empty issues array (no validation errors)', () => {
      const { ZodError } = require('zod');
      const schema = {
        body: {
          parse: () => {
            // ZodError with empty issues — e.g., programmatic throw with no details
            throw new ZodError([]);
          },
        },
      };
      req.body = {};

      validate(schema)(req, res, next);

      // Empty issues means no errors collected, so next() is called
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should map ZodError issues with missing path to empty field string', () => {
      const { ZodError } = require('zod');
      const schema = {
        body: {
          parse: () => {
            throw new ZodError([
              { code: 'custom', message: 'Something went wrong', path: [] },
            ]);
          },
        },
      };
      req.body = {};

      validate(schema)(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [
            expect.objectContaining({
              field: '',
              message: 'Something went wrong',
              source: 'body',
            }),
          ],
        })
      );
    });
  });
});
