import { Link } from 'react-router-dom';
import { Kanban, List, CalendarDays } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-neutral-900 tracking-tight">
            Todoria
          </Link>
          <div className="flex items-center gap-4">
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
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-3xl mx-auto px-6 pt-28 pb-24 text-center">
        <h1 className="text-5xl font-bold text-neutral-900 leading-tight tracking-tight">
          No integrations. No bloat.
          <br />
          Just your work, done.
        </h1>
        <p className="mt-6 text-lg text-neutral-500 leading-relaxed max-w-2xl mx-auto">
          Todoria is the project management tool that does three things
          perfectly: boards, lists, and calendars. Nothing more. Nothing less.
        </p>
        <div className="mt-10">
          <Link
            to="/register"
            className="btn-primary text-base px-8 py-3"
          >
            Start for free
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-neutral-900 text-center tracking-tight">
          Three views. That&apos;s all you need.
        </h2>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-xl border border-neutral-150 p-8">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Kanban className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-neutral-900">Board View</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Drag, drop, done. See your tasks as cards on a visual board.
              Move them across columns as work progresses.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-150 p-8">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <List className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-neutral-900">List View</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Everything in one clean list. Sort, filter, and check off
              tasks without the clutter.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-150 p-8">
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
      <section id="philosophy" className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
            We don&apos;t have integrations — and that&apos;s the point.
          </h2>
          <div className="mt-8 space-y-6 text-neutral-500 text-lg leading-relaxed">
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
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-neutral-900 text-center tracking-tight">
          Up and running in under a minute.
        </h2>
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
          <div>
            <span className="text-5xl font-bold text-teal-500">1</span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">Create a workspace</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              One click. Give it a name. You&apos;re in.
            </p>
          </div>
          <div>
            <span className="text-5xl font-bold text-teal-500">2</span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">Invite your team</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Share a link. They join. No permission spreadsheets.
            </p>
          </div>
          <div>
            <span className="text-5xl font-bold text-teal-500">3</span>
            <h3 className="mt-4 text-lg font-semibold text-neutral-900">Start working</h3>
            <p className="mt-2 text-neutral-500 leading-relaxed">
              Board, list, or calendar. Pick a view and go.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="final-cta" className="bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
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
      <footer id="footer" className="max-w-6xl mx-auto px-6">
        <div className="py-8 flex items-center justify-between border-t border-neutral-100">
          <span className="text-sm text-neutral-400">&copy; 2025 Todoria</span>
          <div className="flex items-center gap-6">
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
