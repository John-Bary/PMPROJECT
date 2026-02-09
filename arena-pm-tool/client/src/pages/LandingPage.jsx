import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, X, Check, Plus, Minus, ArrowRight,
  Shield, Kanban, List, CalendarDays,
} from 'lucide-react';

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    navigate(`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  };

  const painPoints = [
    {
      title: 'Too many features, too little focus',
      description: 'Most PM tools pack in hundreds of features. Your team ends up using 10% and configuring the rest.',
    },
    {
      title: 'Scattered across apps',
      description: 'Tasks in one tool, calendar in another, notes somewhere else. Context-switching kills productivity.',
    },
    {
      title: 'Setup takes forever',
      description: 'Permissions, integrations, workflows — by the time you\'re configured, you\'ve lost all momentum.',
    },
  ];

  const features = [
    {
      icon: Kanban,
      title: 'Three views, zero clutter',
      description: 'Board, list, and calendar — the only views your team actually needs, each built to perfection.',
    },
    {
      icon: List,
      title: 'One place for everything',
      description: 'Tasks, deadlines, and team collaboration in a single clean interface. No tab-switching.',
    },
    {
      icon: CalendarDays,
      title: 'Ready in 60 seconds',
      description: 'Create a workspace, invite your team, and start working. No setup wizards or onboarding calls.',
    },
  ];

  const steps = [
    { number: '1', title: 'Create your workspace', description: 'Sign up and name your workspace. One click, you\'re in.' },
    { number: '2', title: 'Invite your team', description: 'Share a link. They join instantly. No permission spreadsheets.' },
    { number: '3', title: 'Start shipping', description: 'Pick board, list, or calendar view and get to work immediately.' },
  ];

  const faqs = [
    {
      q: 'Is there really a free plan?',
      a: 'Yes! Our free plan includes up to 50 tasks, 1 workspace, and 3 team members. No credit card required, no time limits.',
    },
    {
      q: 'How is Todoria different from Trello or Asana?',
      a: 'We intentionally do less. No integrations, no plugins, no bloat. Just boards, lists, and calendars — done right. That focus means everything works faster and simpler.',
    },
    {
      q: 'Can I upgrade or cancel anytime?',
      a: 'Absolutely. Upgrade to Pro when your team grows, and cancel anytime — no questions asked, no hidden fees.',
    },
  ];

  const trustedByLogos = [
    'FlowHQ', 'Buildstack', 'LaunchPad', 'NovaCraft', 'Pixelwave',
  ];

  return (
    <div className="min-h-screen bg-white scroll-smooth">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-neutral-900 tracking-tight">
            Todoria
          </Link>

          {/* Desktop: trust badges + nav */}
          <div className="hidden sm:flex items-center gap-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-3 py-1 rounded-full">
              <Shield size={13} />
              Free Plan Available
            </span>
            <Link
              to="/login"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
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
            className="sm:hidden p-2 -mr-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-neutral-100 bg-white/95 backdrop-blur-md px-5 py-4 flex flex-col gap-3">
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 py-1">
              Sign In
            </Link>
            <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn-primary text-sm px-5 py-2 text-center">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-14 pb-16 sm:pt-24 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy + Form */}
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-neutral-900 leading-tight tracking-tight">
              Manage projects without the chaos.
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-neutral-500 leading-relaxed max-w-lg">
              The simple, focused project management tool for teams that want to get work done — not configure tools.
            </p>

            <form onSubmit={handleHeroSubmit} className="mt-8 space-y-3 max-w-sm">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
              />
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition"
              />
              <button
                type="submit"
                className="btn-primary w-full text-sm py-3"
              >
                Start for Free
              </button>
            </form>
            <p className="mt-3 text-xs text-neutral-400">
              Free forever for small teams. No credit card required.
            </p>
          </div>

          {/* Right: Product preview placeholder */}
          <div className="relative hidden lg:block">
            <div className="rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-100 border border-neutral-200 p-6 shadow-sm">
              {/* Mini board mockup */}
              <div className="flex gap-3">
                {['To Do', 'In Progress', 'Done'].map((col) => (
                  <div key={col} className="flex-1">
                    <div className="text-xs font-semibold text-neutral-500 mb-2">{col}</div>
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm"
                        >
                          <div className="h-2 w-3/4 bg-neutral-200 rounded" />
                          <div className="h-2 w-1/2 bg-neutral-100 rounded mt-2" />
                        </div>
                      ))}
                      {col === 'To Do' && (
                        <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm">
                          <div className="h-2 w-2/3 bg-neutral-200 rounded" />
                          <div className="h-2 w-1/3 bg-neutral-100 rounded mt-2" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Decorative blur */}
            <div className="absolute -z-10 -top-8 -right-8 w-40 h-40 bg-teal-100 rounded-full blur-3xl opacity-40" />
          </div>
        </div>
      </section>

      {/* ─── The Problem ─── */}
      <section className="bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center tracking-tight">
            The Problem
          </h2>
          <p className="mt-3 text-neutral-500 text-center max-w-xl mx-auto">
            Project management tools promise simplicity, then deliver the opposite.
          </p>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {painPoints.map((point, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 font-bold text-lg">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{point.title}</h3>
                <p className="mt-2 text-neutral-500 leading-relaxed text-sm">{point.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How We Solve This ─── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center tracking-tight">
          How We Solve This
        </h2>
        <p className="mt-3 text-neutral-500 text-center max-w-xl mx-auto">
          Todoria does three things perfectly — boards, lists, and calendars. Nothing more.
        </p>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="rounded-xl border border-neutral-150 p-6 sm:p-8 transition-all duration-200 hover:shadow-md hover:border-neutral-200"
              >
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-teal-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-2 text-neutral-500 leading-relaxed text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Trusted By ─── */}
      <section className="border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
          <p className="text-sm font-medium text-neutral-400 text-center uppercase tracking-widest">
            Trusted By
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {trustedByLogos.map((logo) => (
              <span
                key={logo}
                className="text-lg sm:text-xl font-bold text-neutral-300 select-none"
              >
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center tracking-tight">
          How It Works
        </h2>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 items-start">
          {steps.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center px-4">
              {/* Arrow connector (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 -right-3 text-neutral-300">
                  <ArrowRight size={24} />
                </div>
              )}
              <span className="text-4xl sm:text-5xl font-bold text-teal-500">{step.number}</span>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">{step.title}</h3>
              <p className="mt-2 text-neutral-500 leading-relaxed text-sm max-w-xs">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Product Showcase + Benefits ─── */}
      <section className="bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Product image placeholder */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200/60 p-8 sm:p-10">
              <div className="space-y-3">
                {/* Mini list view mockup */}
                {['Design landing page', 'Set up CI/CD pipeline', 'Write onboarding emails', 'Launch v1.0'].map((task, i) => (
                  <div
                    key={task}
                    className="flex items-center gap-3 bg-white rounded-lg border border-neutral-200 px-4 py-3 shadow-sm"
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${i === 0 ? 'border-teal-500 bg-teal-500' : 'border-neutral-300'}`}>
                      {i === 0 && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`text-sm ${i === 0 ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>
                      {task}
                    </span>
                    {i === 1 && (
                      <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        In Progress
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Key benefits */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
                Built for focus, not feature-creep.
              </h2>
              <div className="mt-8 space-y-5">
                {[
                  {
                    title: 'Intuitive drag-and-drop',
                    description: 'Move tasks between columns with a simple drag. No learning curve, no manual required.',
                  },
                  {
                    title: 'Real-time team collaboration',
                    description: 'See updates instantly. Assign tasks, set deadlines, and track progress together.',
                  },
                  {
                    title: 'Works on every device',
                    description: 'Fully responsive design means you can manage projects from your phone, tablet, or desktop.',
                  },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-teal-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 text-center tracking-tight">
          Frequently Asked Questions
        </h2>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-neutral-900 pr-4">{faq.q}</span>
                  {isOpen ? (
                    <Minus size={18} className="text-neutral-400 flex-shrink-0" />
                  ) : (
                    <Plus size={18} className="text-neutral-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 text-sm text-neutral-500 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="bg-neutral-50 border-y border-neutral-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-tight">
            Ready to Get Started?
          </h2>
          <div className="mt-8">
            <Link
              to="/register"
              className="btn-primary text-base px-8 py-3"
            >
              Start Managing Projects for Free
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            No commitment, cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="max-w-6xl mx-auto px-5 sm:px-6">
        <div className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-100">
          <span className="text-sm font-semibold text-neutral-500">Todoria</span>
          <div className="flex items-center gap-1 text-sm text-neutral-400">
            <Link to="/privacy" className="hover:text-neutral-600 transition-colors px-2">Privacy</Link>
            <span>&middot;</span>
            <Link to="/terms" className="hover:text-neutral-600 transition-colors px-2">Terms</Link>
            <span>&middot;</span>
            <a href="mailto:support@todoria.app" className="hover:text-neutral-600 transition-colors px-2">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
