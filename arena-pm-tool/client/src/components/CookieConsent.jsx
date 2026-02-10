import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from 'components/ui/button';

const COOKIE_CONSENT_KEY = 'todoria_cookie_consent';

function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on first render
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6" role="dialog" aria-label="Cookie consent">
      <div className="max-w-lg mx-auto bg-neutral-900 text-white rounded-xl shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-neutral-300 flex-1">
          We use essential cookies only for authentication. No tracking. No ads.{' '}
          <Link to="/privacy" className="text-neutral-100 hover:text-white underline">
            Privacy Policy
          </Link>
        </p>
        <Button
          onClick={handleAccept}
          variant="secondary"
          size="sm"
          className="bg-white hover:bg-neutral-100 text-neutral-900 font-medium flex-shrink-0"
        >
          Got it
        </Button>
      </div>
    </div>
  );
}

export default CookieConsent;
