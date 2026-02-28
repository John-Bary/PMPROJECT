import { act } from 'react';
import useHolidayStore from '../holidayStore';
import { holidaysAPI } from '../../utils/api';

jest.mock('../../utils/api', () => ({
  holidaysAPI: {
    getByYear: jest.fn(),
  },
}));

const initialState = {
  holidaysByYear: {},
  holidaysByDate: {},
  isLoading: false,
  error: null,
  loadedYears: [],
};

const mockHolidays = [
  { name: 'New Year', localName: 'Naujieji metai', date: '2026-01-01', type: 'National' },
  { name: 'Restoration Day', localName: 'Valstybės atkūrimo diena', date: '2026-02-16', type: 'National' },
];

describe('Holiday Store', () => {
  beforeEach(() => {
    useHolidayStore.setState(initialState);
    jest.clearAllMocks();
  });

  describe('fetchHolidays', () => {
    it('should fetch holidays for a year', async () => {
      holidaysAPI.getByYear.mockResolvedValueOnce({
        data: { data: { holidays: mockHolidays } },
      });

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2026);
      });

      const state = useHolidayStore.getState();
      expect(state.holidaysByYear[2026]).toEqual(mockHolidays);
      expect(state.loadedYears).toContain(2026);
      expect(state.isLoading).toBe(false);
      expect(holidaysAPI.getByYear).toHaveBeenCalledWith(2026);
    });

    it('should build date-keyed lookup map', async () => {
      holidaysAPI.getByYear.mockResolvedValueOnce({
        data: { data: { holidays: mockHolidays } },
      });

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2026);
      });

      const state = useHolidayStore.getState();
      expect(state.holidaysByDate['2026-01-01']).toEqual(mockHolidays[0]);
      expect(state.holidaysByDate['2026-02-16']).toEqual(mockHolidays[1]);
    });

    it('should skip fetch if year already loaded', async () => {
      useHolidayStore.setState({ loadedYears: [2026] });

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2026);
      });

      expect(holidaysAPI.getByYear).not.toHaveBeenCalled();
    });

    it('should fetch different years independently', async () => {
      holidaysAPI.getByYear.mockResolvedValueOnce({
        data: { data: { holidays: mockHolidays } },
      });

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2026);
      });

      const holiday2027 = [{ name: 'New Year 2027', localName: 'Naujieji metai', date: '2027-01-01', type: 'National' }];
      holidaysAPI.getByYear.mockResolvedValueOnce({
        data: { data: { holidays: holiday2027 } },
      });

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2027);
      });

      const state = useHolidayStore.getState();
      expect(state.loadedYears).toEqual([2026, 2027]);
      expect(state.holidaysByYear[2026]).toEqual(mockHolidays);
      expect(state.holidaysByYear[2027]).toEqual(holiday2027);
    });

    it('should handle API errors silently', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      holidaysAPI.getByYear.mockRejectedValueOnce({
        response: { data: { message: 'Service unavailable' } },
      });

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2026);
      });

      const state = useHolidayStore.getState();
      expect(state.error).toBe('Service unavailable');
      expect(state.isLoading).toBe(false);
      expect(state.loadedYears).not.toContain(2026);
      consoleSpy.mockRestore();
    });

    it('should use fallback error message', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      holidaysAPI.getByYear.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await useHolidayStore.getState().fetchHolidays(2026);
      });

      expect(useHolidayStore.getState().error).toBe('Failed to fetch holidays');
      consoleSpy.mockRestore();
    });
  });

  describe('getHolidayByDate', () => {
    it('should return holiday for a known date', () => {
      useHolidayStore.setState({
        holidaysByDate: { '2026-01-01': mockHolidays[0] },
      });

      const result = useHolidayStore.getState().getHolidayByDate('2026-01-01');
      expect(result).toEqual(mockHolidays[0]);
    });

    it('should return undefined for a non-holiday date', () => {
      useHolidayStore.setState({
        holidaysByDate: { '2026-01-01': mockHolidays[0] },
      });

      const result = useHolidayStore.getState().getHolidayByDate('2026-01-02');
      expect(result).toBeUndefined();
    });
  });

  describe('isHoliday', () => {
    it('should return true for a holiday date', () => {
      useHolidayStore.setState({
        holidaysByDate: { '2026-01-01': mockHolidays[0] },
      });

      expect(useHolidayStore.getState().isHoliday('2026-01-01')).toBe(true);
    });

    it('should return false for a non-holiday date', () => {
      useHolidayStore.setState({
        holidaysByDate: { '2026-01-01': mockHolidays[0] },
      });

      expect(useHolidayStore.getState().isHoliday('2026-03-15')).toBe(false);
    });
  });
});
