import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from 'components/ui/button';
import analytics from '../utils/analytics';
import useAuthStore from '../store/authStore';

const NPS_STORAGE_KEY = 'todoria_nps_survey';
const SHOW_AFTER_DAYS = 30;

function NpsSurvey() {
  const [isVisible, setIsVisible] = useState(false);
  const [score, setScore] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const stored = localStorage.getItem(NPS_STORAGE_KEY);
    if (stored) return; // Already dismissed or submitted

    // Check if user account is old enough
    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    if (!createdAt) return;

    const daysSinceSignup = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup < SHOW_AFTER_DAYS) return;

    const timer = setTimeout(() => setIsVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(NPS_STORAGE_KEY, JSON.stringify({ dismissed: true, at: new Date().toISOString() }));
    setIsVisible(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (score === null) return;

    analytics.track('nps_survey_submitted', { score });
    localStorage.setItem(NPS_STORAGE_KEY, JSON.stringify({ score, at: new Date().toISOString() }));
    setSubmitted(true);

    setTimeout(() => setIsVisible(false), 2000);
  }, [score]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96" role="dialog" aria-label="Satisfaction survey">
      <div className="bg-card border border-border rounded-xl shadow-elevated p-5">
        {submitted ? (
          <p className="text-sm text-center text-muted-foreground py-2">
            Thank you for your feedback!
          </p>
        ) : (
          <>
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-medium text-foreground">
                How likely are you to recommend Todoria?
              </p>
              <button
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
                aria-label="Dismiss survey"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-between mb-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    score === i
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="flex justify-between mb-4">
              <span className="text-[10px] text-muted-foreground">Not likely</span>
              <span className="text-[10px] text-muted-foreground">Very likely</span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={score === null}
              size="sm"
              className="w-full"
            >
              Submit
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default NpsSurvey;
