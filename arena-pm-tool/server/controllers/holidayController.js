// Holiday Controller
// Proxies requests to Abstract API with caching for Lithuanian holidays

const logger = require('../lib/logger');

// Helper: sanitize error for response (hide internals in production)
const safeError = (error) => process.env.NODE_ENV === 'production' ? undefined : error.message;

const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY;
const ABSTRACT_API_URL = 'https://holidays.abstractapi.com/v1/';
const COUNTRY_CODE = 'LT';

// In-memory cache: Map<year, { data, timestamp }>
const holidayCache = new Map();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalize date from Abstract API format (MM/DD/YYYY) to YYYY-MM-DD
 */
const normalizeDate = (holiday) => {
  const year = holiday.date_year;
  const month = String(holiday.date_month).padStart(2, '0');
  const day = String(holiday.date_day).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get holidays for a given year
 * GET /api/holidays?year=2026
 */
const getHolidays = async (req, res) => {
  try {
    // Validate API key is configured
    if (!ABSTRACT_API_KEY) {
      return res.status(500).json({
        status: 'error',
        message: 'ABSTRACT_API_KEY environment variable not configured'
      });
    }

    const { year } = req.query;

    // Validate year parameter
    if (!year || isNaN(parseInt(year))) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid year parameter is required'
      });
    }

    const yearInt = parseInt(year);

    // Check cache first
    const cached = holidayCache.get(yearInt);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return res.json({
        status: 'success',
        data: { holidays: cached.data, fromCache: true }
      });
    }

    // Fetch from Abstract API
    const url = `${ABSTRACT_API_URL}?api_key=${ABSTRACT_API_KEY}&country=${COUNTRY_CODE}&year=${yearInt}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Abstract API error: ${response.status}`);
    }

    const holidays = await response.json();

    // Normalize holidays to consistent format
    const normalizedHolidays = holidays.map(h => ({
      name: h.name,
      localName: h.name_local || h.name,
      date: normalizeDate(h),
      type: h.type,
      isPublic: h.type === 'National'
    }));

    // Cache the result
    holidayCache.set(yearInt, {
      data: normalizedHolidays,
      timestamp: Date.now()
    });

    res.json({
      status: 'success',
      data: { holidays: normalizedHolidays, fromCache: false }
    });

  } catch (error) {
    logger.error({ err: error }, 'Get holidays error');
    res.status(500).json({
      status: 'error',
      message: 'Error fetching holidays',
      error: safeError(error)
    });
  }
};

module.exports = { getHolidays };
