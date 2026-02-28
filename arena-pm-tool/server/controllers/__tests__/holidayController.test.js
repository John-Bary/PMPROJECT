// We need to set the env var BEFORE requiring the controller,
// because the controller reads ABSTRACT_API_KEY at module load time.
const MOCK_API_KEY = 'test-abstract-api-key';
process.env.ABSTRACT_API_KEY = MOCK_API_KEY;

jest.mock('../../lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { getHolidays } = require('../holidayController');

describe('Holiday Controller', () => {
  let req, res;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    jest.clearAllMocks();

    // Clear the module-level holiday cache between tests by
    // re-importing is impractical, so we just use unique years.
    global.fetch = jest.fn();
  });

  afterEach(() => {
    delete global.fetch;
  });

  const mockAbstractApiResponse = [
    {
      name: 'New Year',
      name_local: 'Naujieji metai',
      date_year: '2026',
      date_month: '1',
      date_day: '1',
      type: 'National',
    },
    {
      name: 'Restoration of the State Day',
      name_local: 'Valstybės atkūrimo diena',
      date_year: '2026',
      date_month: '2',
      date_day: '16',
      type: 'National',
    },
  ];

  it('should return holidays from Abstract API on success', async () => {
    req.query = { year: '2050' };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAbstractApiResponse,
    });

    await getHolidays(req, res);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`api_key=${MOCK_API_KEY}`)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('country=LT')
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('year=2050')
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'success',
      data: expect.objectContaining({
        fromCache: false,
        holidays: expect.arrayContaining([
          expect.objectContaining({
            name: 'New Year',
            localName: 'Naujieji metai',
            date: '2026-01-01',
            type: 'National',
            isPublic: true,
          }),
        ]),
      }),
    }));
  });

  it('should return cached response on subsequent call for the same year', async () => {
    // First call — populates cache
    req.query = { year: '2051' };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAbstractApiResponse,
    });

    await getHolidays(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fromCache: false }),
    }));

    // Second call — same year, should come from cache
    jest.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
    req.query = { year: '2051' };

    await getHolidays(req, res);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ fromCache: true }),
    }));
  });

  it('should return 400 for missing year parameter', async () => {
    req.query = {};

    await getHolidays(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Valid year parameter is required',
    }));
  });

  it('should return 400 for non-numeric year parameter', async () => {
    req.query = { year: 'abc' };

    await getHolidays(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Valid year parameter is required',
    }));
  });

  it('should return 500 when Abstract API returns a non-OK response', async () => {
    req.query = { year: '2052' };
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await getHolidays(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Error fetching holidays',
    }));
  });

  it('should return 500 when fetch throws a network error', async () => {
    req.query = { year: '2053' };
    global.fetch.mockRejectedValueOnce(new Error('Network failure'));

    await getHolidays(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'Error fetching holidays',
    }));
  });

  it('should return 500 when ABSTRACT_API_KEY is not configured', async () => {
    // Re-import the controller without the API key set
    let getHolidaysNoKey;
    const originalKey = process.env.ABSTRACT_API_KEY;
    delete process.env.ABSTRACT_API_KEY;

    jest.isolateModules(() => {
      getHolidaysNoKey = require('../holidayController').getHolidays;
    });

    // Restore the key for other tests
    process.env.ABSTRACT_API_KEY = originalKey;

    req.query = { year: '2054' };

    await getHolidaysNoKey(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      message: 'ABSTRACT_API_KEY environment variable not configured',
    }));
  });
});
