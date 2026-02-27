import {
  priorityStyles,
  priorityDotColors,
  priorityPillStyles,
  priorityBorderColors,
  getPriorityColor,
  getPriorityPillStyle,
} from './priorityStyles';

// ---------------------------------------------------------------------------
// priorityStyles object
// ---------------------------------------------------------------------------
describe('priorityStyles', () => {
  it('has entries for all four priority levels', () => {
    expect(priorityStyles).toHaveProperty('urgent');
    expect(priorityStyles).toHaveProperty('high');
    expect(priorityStyles).toHaveProperty('medium');
    expect(priorityStyles).toHaveProperty('low');
  });

  it('contains expected CSS class substrings', () => {
    expect(priorityStyles.urgent).toContain('text-red');
    expect(priorityStyles.high).toContain('text-orange');
    expect(priorityStyles.medium).toContain('text-yellow');
    expect(priorityStyles.low).toContain('text-blue');
  });

  it('includes font-medium only for urgent', () => {
    expect(priorityStyles.urgent).toContain('font-medium');
    expect(priorityStyles.high).not.toContain('font-medium');
    expect(priorityStyles.medium).not.toContain('font-medium');
    expect(priorityStyles.low).not.toContain('font-medium');
  });
});

// ---------------------------------------------------------------------------
// priorityDotColors object
// ---------------------------------------------------------------------------
describe('priorityDotColors', () => {
  it('has entries for all four priority levels', () => {
    expect(priorityDotColors).toHaveProperty('urgent');
    expect(priorityDotColors).toHaveProperty('high');
    expect(priorityDotColors).toHaveProperty('medium');
    expect(priorityDotColors).toHaveProperty('low');
  });

  it('contains bg- class prefixes', () => {
    Object.values(priorityDotColors).forEach((value) => {
      expect(value).toMatch(/^bg-/);
    });
  });

  it('maps to the correct color families', () => {
    expect(priorityDotColors.urgent).toContain('red');
    expect(priorityDotColors.high).toContain('orange');
    expect(priorityDotColors.medium).toContain('yellow');
    expect(priorityDotColors.low).toContain('blue');
  });
});

// ---------------------------------------------------------------------------
// priorityPillStyles object
// ---------------------------------------------------------------------------
describe('priorityPillStyles', () => {
  it('has entries for all four priority levels', () => {
    expect(priorityPillStyles).toHaveProperty('urgent');
    expect(priorityPillStyles).toHaveProperty('high');
    expect(priorityPillStyles).toHaveProperty('medium');
    expect(priorityPillStyles).toHaveProperty('low');
  });

  it('each pill style includes bg, text, and border classes', () => {
    Object.values(priorityPillStyles).forEach((value) => {
      expect(value).toMatch(/bg-/);
      expect(value).toMatch(/text-/);
      expect(value).toMatch(/border-/);
    });
  });

  it('maps to the correct color families', () => {
    expect(priorityPillStyles.urgent).toContain('red');
    expect(priorityPillStyles.high).toContain('orange');
    expect(priorityPillStyles.medium).toContain('yellow');
    expect(priorityPillStyles.low).toContain('blue');
  });
});

// ---------------------------------------------------------------------------
// priorityBorderColors object
// ---------------------------------------------------------------------------
describe('priorityBorderColors', () => {
  it('has entries for all four priority levels', () => {
    expect(priorityBorderColors).toHaveProperty('urgent');
    expect(priorityBorderColors).toHaveProperty('high');
    expect(priorityBorderColors).toHaveProperty('medium');
    expect(priorityBorderColors).toHaveProperty('low');
  });

  it('all values start with border-l-', () => {
    Object.values(priorityBorderColors).forEach((value) => {
      expect(value).toMatch(/^border-l-/);
    });
  });

  it('maps to the correct color families', () => {
    expect(priorityBorderColors.urgent).toContain('red');
    expect(priorityBorderColors.high).toContain('orange');
    expect(priorityBorderColors.medium).toContain('yellow');
    expect(priorityBorderColors.low).toContain('blue');
  });
});

// ---------------------------------------------------------------------------
// getPriorityColor
// ---------------------------------------------------------------------------
describe('getPriorityColor', () => {
  it('returns the correct style for each valid priority', () => {
    expect(getPriorityColor('urgent')).toBe(priorityStyles.urgent);
    expect(getPriorityColor('high')).toBe(priorityStyles.high);
    expect(getPriorityColor('medium')).toBe(priorityStyles.medium);
    expect(getPriorityColor('low')).toBe(priorityStyles.low);
  });

  it('falls back to medium for unknown priority strings', () => {
    expect(getPriorityColor('critical')).toBe(priorityStyles.medium);
    expect(getPriorityColor('none')).toBe(priorityStyles.medium);
    expect(getPriorityColor('HIGH')).toBe(priorityStyles.medium); // case-sensitive
  });

  it('falls back to medium for null and undefined', () => {
    expect(getPriorityColor(null)).toBe(priorityStyles.medium);
    expect(getPriorityColor(undefined)).toBe(priorityStyles.medium);
  });

  it('falls back to medium for empty string', () => {
    expect(getPriorityColor('')).toBe(priorityStyles.medium);
  });

  it('falls back to medium for non-string inputs', () => {
    expect(getPriorityColor(42)).toBe(priorityStyles.medium);
    expect(getPriorityColor(true)).toBe(priorityStyles.medium);
    expect(getPriorityColor({})).toBe(priorityStyles.medium);
  });
});

// ---------------------------------------------------------------------------
// getPriorityPillStyle
// ---------------------------------------------------------------------------
describe('getPriorityPillStyle', () => {
  it('returns the correct pill style for each valid priority', () => {
    expect(getPriorityPillStyle('urgent')).toBe(priorityPillStyles.urgent);
    expect(getPriorityPillStyle('high')).toBe(priorityPillStyles.high);
    expect(getPriorityPillStyle('medium')).toBe(priorityPillStyles.medium);
    expect(getPriorityPillStyle('low')).toBe(priorityPillStyles.low);
  });

  it('falls back to medium for unknown priority strings', () => {
    expect(getPriorityPillStyle('critical')).toBe(priorityPillStyles.medium);
    expect(getPriorityPillStyle('URGENT')).toBe(priorityPillStyles.medium); // case-sensitive
  });

  it('falls back to medium for null and undefined', () => {
    expect(getPriorityPillStyle(null)).toBe(priorityPillStyles.medium);
    expect(getPriorityPillStyle(undefined)).toBe(priorityPillStyles.medium);
  });

  it('falls back to medium for empty string', () => {
    expect(getPriorityPillStyle('')).toBe(priorityPillStyles.medium);
  });

  it('falls back to medium for non-string inputs', () => {
    expect(getPriorityPillStyle(0)).toBe(priorityPillStyles.medium);
    expect(getPriorityPillStyle([])).toBe(priorityPillStyles.medium);
  });
});
