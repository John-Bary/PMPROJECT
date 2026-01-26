// Holiday State Management with Zustand
import { create } from 'zustand';
import { holidaysAPI } from '../utils/api';

const useHolidayStore = create((set, get) => ({
  // State
  holidaysByYear: {},   // { 2026: [holiday1, holiday2, ...] }
  holidaysByDate: {},   // { '2026-01-01': { name, localName, ... } }
  isLoading: false,
  error: null,
  loadedYears: [],      // Track which years have been loaded

  // Fetch holidays for a specific year
  fetchHolidays: async (year) => {
    // Skip if already loaded
    if (get().loadedYears.includes(year)) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await holidaysAPI.getByYear(year);
      const holidays = response.data.data.holidays;

      // Create a date-keyed map for O(1) lookups
      const newHolidaysByDate = { ...get().holidaysByDate };
      holidays.forEach(holiday => {
        newHolidaysByDate[holiday.date] = holiday;
      });

      set((state) => ({
        holidaysByYear: {
          ...state.holidaysByYear,
          [year]: holidays,
        },
        holidaysByDate: newHolidaysByDate,
        loadedYears: [...state.loadedYears, year],
        isLoading: false,
      }));

    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch holidays';
      set({
        error: errorMessage,
        isLoading: false,
      });
      // Silent fail - don't toast error for holidays (non-critical feature)
      console.error('Holiday fetch error:', errorMessage);
    }
  },

  // Get holiday for a specific date (returns undefined if not a holiday)
  getHolidayByDate: (dateKey) => {
    return get().holidaysByDate[dateKey];
  },

  // Check if a date is a holiday
  isHoliday: (dateKey) => {
    return !!get().holidaysByDate[dateKey];
  },
}));

export default useHolidayStore;
