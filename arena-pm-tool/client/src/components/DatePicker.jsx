import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import './DatePicker.css';
import { Button } from 'components/ui/button';

function DatePicker({ selected, onSelect, onClose, triggerRef }) {
  const portalRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const normalizeDay = useCallback((day) => {
    if (!day) return undefined;
    const d = new Date(day);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const [internalSelected, setInternalSelected] = useState(() => normalizeDay(selected));

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    if (!triggerRef?.current || isMobile) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const calendarHeight = 320; // Approximate calendar height
    const calendarWidth = 280;  // Approximate calendar width

    let top = rect.bottom + 4;
    let left = rect.left;

    // Keep within viewport - flip above if not enough space below
    if (top + calendarHeight > window.innerHeight) {
      top = rect.top - calendarHeight - 4;
    }

    // Keep within viewport horizontally
    if (left + calendarWidth > window.innerWidth) {
      left = window.innerWidth - calendarWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setPosition({ top, left });
  }, [triggerRef, isMobile]);

  useEffect(() => {
    setInternalSelected(normalizeDay(selected));
  }, [normalizeDay, selected]);

  useEffect(() => {
    // Create portal container if it doesn't exist
    if (!portalRef.current) {
      portalRef.current = document.createElement('div');
      portalRef.current.style.position = 'fixed';
      portalRef.current.style.zIndex = '9999';
      document.body.appendChild(portalRef.current);
    }

    // Initial position calculation
    updatePosition();

    // Update position on scroll (capture phase to catch all scrollable containers)
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
      if (portalRef.current && document.body.contains(portalRef.current)) {
        document.body.removeChild(portalRef.current);
        portalRef.current = null;
      }
    };
  }, [updatePosition]);

  // Handle click outside to close the picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!portalRef.current) return;
      const clickedInPortal = portalRef.current.contains(event.target);
      const clickedInTrigger = triggerRef?.current && triggerRef.current.contains(event.target);

      if (!clickedInPortal && !clickedInTrigger) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, triggerRef]);

  const handleDayClick = (day, modifiers, e) => {
    // Directly handle the day click - this is more reliable than onSelect
    if (day) {
      const normalizedDay = normalizeDay(day);
      setInternalSelected(normalizedDay);
      onSelect(normalizedDay);
    }
    onClose();
  };

  const content = isMobile ? (
    // Mobile: Full screen modal-style picker
    <>
      <div className="fixed inset-0 bg-black/20 z-[9998]" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-sm p-4 z-[9999]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-foreground">Select Date</span>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <DayPicker
          mode="single"
          selected={internalSelected}
          onDayClick={handleDayClick}
          modifiersClassNames={{
            selected: 'rdp-day_selected',
            today: 'rdp-day_today',
          }}
        />
      </div>
    </>
  ) : (
    // Desktop: Positioned dropdown
    <div className="bg-card border border-border rounded-lg shadow-sm p-4">
      <DayPicker
        mode="single"
        selected={internalSelected}
        onDayClick={handleDayClick}
        modifiersClassNames={{
          selected: 'rdp-day_selected',
          today: 'rdp-day_today',
        }}
      />
    </div>
  );

  // Update portal position whenever position state changes
  useEffect(() => {
    if (portalRef.current) {
      portalRef.current.style.top = `${position.top}px`;
      portalRef.current.style.left = `${position.left}px`;
    }
  }, [position]);

  // Mobile: Render directly without portal positioning
  if (isMobile) {
    return content;
  }

  // Desktop: Render using portal if triggerRef is provided, otherwise render normally
  if (triggerRef && portalRef.current) {
    return createPortal(content, portalRef.current);
  }

  return content;
}

export default DatePicker;
