import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, List, CalendarDays, Menu, X } from 'lucide-react';

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white scroll-smooth">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-neutral-900 tracking-tight">
            Todoria
          </Link>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              to="/demo"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200"
            >
              Try Demo
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-primary text-sm px-5 py-2"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="sm:hidden p-2 -mr-2 text-neutral-600 hover:text-neutral-900 transition-colors duration-200"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-neutral-100 bg-white/95 backdrop-blur-md px-5 py-4 flex flex-col gap-3 animate-fade-in">
            <Link
              to="/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200 py-1"
            >
              Try Demo
            </Link>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200 py-1"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-primary text-sm px-5 py-2 text-center"
            >
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-5 sm:px-6 pt-16 pb-16 sm:pt-28 sm:pb-24 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-neutral-900 leading-tight tracking-tight">
          No integrations. No bloat.
          <br />
          Just your work, done.
        </h1>
        <p className="mt-5 sm:mt-6 text-base sm:text-lg text-neutral-500 leading-relaxed max-w-2xl mx-auto">
          Todoria is the project management tool that does three things
          perfectly: boards, lists, and calendars. Nothing more. Nothing less.
        </p>
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="btn-primary text-base px-8 py-3"
          >
            Start for free
          </Link>
          <Link
            to="/demo"
            className="text-base font-medium text-neutral-600 hover:text-neutral-900 transition-colors duration-200 px-8 py-3 rounded-lg border border-neutral-200 hover:border-neutral-300"
          >
            Try the demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center tracking-tight">
          Three views. That&apos;s all you need.
        </h2>
        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="rounded-xl border border-neutral-150 p-6 sm:p-8 transition-all duration-200 hover:shadow-md hover:border-neutral-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Kanban className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-neutral-900">Board View</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Drag, drop, done. See your tasks as cards on a visual board.
              Move them across columns as work progresses.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-150 p-6 sm:p-8 transition-all duration-200 hover:shadow-md hover:border-neutral-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <List className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-neutral-900">List View</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Everything in one clean list. Sort, filter, and check off
              tasks without the clutter.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-150 p-6 sm:p-8 transition-all duration-200 hover:shadow-md hover:border-neutral-200">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-neutral-900">Calendar View</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              See deadlines at a glance. Plan your week with tasks
              mapped to dates.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section id="philosophy" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            We don&apos;t have integrations — and that&apos;s the point.
          </h2>
          <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6 text-neutral-500 text-base sm:text-lg leading-relaxed">
            <p>
              Most tools want to be the center of your universe. They pile on
              integrations, plugins, and dashboards until you spend more time
              configuring work than doing it. Todoria takes the opposite approach.
              We connect you to your work, not to everything else.
            </p>
            <p>
              There are no setup wizards. No API keys. No decisions about which
              Slack channel gets notifications. You sign up, create a workspace,
              and start working. That&apos;s the whole onboarding.
            </p>
            <p>
              We built Todoria for teams that are tired of tools that do a hundred
              things badly. Todoria does three things well: boards, lists, and
              calendars. That focus is a feature, not a limitation.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center tracking-tight">
          Up and running in under a minute.
        </h2>
        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <div>
            <span className="text-4xl sm:text-5xl font-bold text-teal-500">1</span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">Create a workspace</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              One click. Give it a name. You&apos;re in.
            </p>
          </div>
          <div>
            <span className="text-4xl sm:text-5xl font-bold text-teal-500">2</span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">Invite your team</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Share a link. They join. No permission spreadsheets.
            </p>
          </div>
          <div>
            <span className="text-4xl sm:text-5xl font-bold text-teal-500">3</span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">Start working</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Board, list, or calendar. Pick a view and go.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="final-cta" className="bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Ready to get things done without the bloat?
          </h2>
          <div className="mt-8">
            <Link
              to="/register"
              className="btn-primary text-base px-8 py-3"
            >
              Get started for free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="py-8 flex items-center justify-between border-t border-neutral-100">
          <span className="text-sm text-neutral-400">&copy; 2026 Todoria</span>
          <div className="flex items-center gap-6">
            <Link
              to="/demo"
              className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
            >
              Demo
            </Link>
            <Link
              to="/login"
              className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm text-neutral-400 hover:text-neutral-600 transition-colors duration-200"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
