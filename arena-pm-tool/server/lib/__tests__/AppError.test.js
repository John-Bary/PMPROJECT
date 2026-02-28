const AppError = require('../AppError');

describe('AppError', () => {
  describe('Constructor', () => {
    it('sets message and statusCode', () => {
      const err = new AppError('Something went wrong', 422);

      expect(err.message).toBe('Something went wrong');
      expect(err.statusCode).toBe(422);
    });

    it('defaults statusCode to 500', () => {
      const err = new AppError('Server failure');

      expect(err.statusCode).toBe(500);
    });

    it('defaults isOperational to true', () => {
      const err = new AppError('Oops', 400);

      expect(err.isOperational).toBe(true);
    });

    it('sets isOperational from options', () => {
      const err = new AppError('Fatal', 500, { isOperational: false });

      expect(err.isOperational).toBe(false);
    });

    it('sets internalMessage from options', () => {
      const err = new AppError('Bad input', 400, {
        internalMessage: 'DB constraint violation on column X',
      });

      expect(err.internalMessage).toBe('DB constraint violation on column X');
    });

    it('defaults internalMessage to null', () => {
      const err = new AppError('Nope', 400);

      expect(err.internalMessage).toBeNull();
    });

    it("has name 'AppError'", () => {
      const err = new AppError('test');

      expect(err.name).toBe('AppError');
    });

    it('is an instance of Error', () => {
      const err = new AppError('test');

      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('Static factories', () => {
    it('badRequest creates 400 error with internalMessage', () => {
      const err = AppError.badRequest('Invalid email', 'email field failed regex');

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe('Invalid email');
      expect(err.internalMessage).toBe('email field failed regex');
      expect(err.isOperational).toBe(true);
    });

    it('unauthorized creates 401 error with default message', () => {
      const err = AppError.unauthorized();

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Authentication required');
    });

    it('unauthorized accepts custom message', () => {
      const err = AppError.unauthorized('Token expired');

      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Token expired');
    });

    it('forbidden creates 403 error with default message', () => {
      const err = AppError.forbidden();

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(403);
      expect(err.message).toBe('Access denied');
    });

    it('notFound creates 404 error with default message', () => {
      const err = AppError.notFound();

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Resource not found');
    });

    it('conflict creates 409 error with internalMessage', () => {
      const err = AppError.conflict('Email already exists', 'unique_violation on users.email');

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(409);
      expect(err.message).toBe('Email already exists');
      expect(err.internalMessage).toBe('unique_violation on users.email');
      expect(err.isOperational).toBe(true);
    });

    it('internal creates 500 error with isOperational: false', () => {
      const err = AppError.internal('Internal server error', 'null ref in userService.getById');

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Internal server error');
      expect(err.internalMessage).toBe('null ref in userService.getById');
      expect(err.isOperational).toBe(false);
    });

    it('internal uses default userMessage when called with no arguments', () => {
      const err = AppError.internal();

      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Internal server error');
      expect(err.internalMessage).toBeNull();
      expect(err.isOperational).toBe(false);
    });
  });
});
