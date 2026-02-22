import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, X, Check, Plus, Minus, ArrowRight,
  Shield, Kanban, List, CalendarDays,
  Sparkles, ChevronLeft, ChevronRight,
  Users, Zap, Clock, Heart,
  Lock, Globe,
} from 'lucide-react';
import useInView from '../hooks/useInView';
import { Button } from 'components/ui/button';
import HeroOrbits from '../components/landing/HeroOrbits';
import FloatingShapes from '../components/landing/FloatingShapes';
import ShimmerDivider from '../components/landing/ShimmerDivider';

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [email, setEmail] = useState('');
  const [activeShowcase, setActiveShowcase] = useState('list');
  const navigate = useNavigate();

  // Scroll animation refs
  const [socialRef, socialInView] = useInView();
  const [problemRef, problemInView] = useInView();
  const [featuresRef, featuresInView] = useInView();
  const [stepsRef, stepsInView] = useInView();
  const [showcaseRef, showcaseInView] = useInView();
  const [compareRef, compareInView] = useInView();
  const [pricingRef, pricingInView] = useInView();
  const [faqRef, faqInView] = useInView();
  const [ctaRef, ctaInView] = useInView();

  const handleHeroSubmit = (e) => {
    e.preventDefault();
    navigate(`/register${email ? `?email=${encodeURIComponent(email)}` : ''}`);
  };

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  const painPoints = [
    {
      icon: Zap,
      title: 'Too many features, too little focus',
      description: 'Most PM tools pack in hundreds of features. Your team ends up using 10% and configuring the rest.',
    },
    {
      icon: Globe,
      title: 'Scattered across apps',
      description: 'Tasks in one tool, calendar in another, notes somewhere else. Context-switching kills productivity.',
    },
    {
      icon: Clock,
      title: 'Setup takes forever',
      description: "Permissions, integrations, workflows — by the time you're configured, you've lost all momentum.",
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
      description: 'Tasks, deadlines, and team collaboration in a single clean interface. No tab-switching required.',
    },
    {
      icon: CalendarDays,
      title: 'Ready in 60 seconds',
      description: 'Create a workspace, invite your team, and start working. No setup wizards or onboarding calls.',
    },
    {
      icon: Users,
      title: 'Built for small teams',
      description: 'Designed for teams of 2–20. Every feature is optimized for speed and simplicity, not enterprise bureaucracy.',
    },
    {
      icon: Lock,
      title: 'Secure by default',
      description: 'SSL encryption, daily backups, GDPR compliance, and httpOnly auth. Your data is safe without extra config.',
    },
    {
      icon: Heart,
      title: 'Delightfully simple',
      description: 'Drag-and-drop tasks, keyboard shortcuts, and a clean UI that your team will actually enjoy using.',
    },
  ];

  const steps = [
    { number: '1', title: 'Create your workspace', description: "Sign up and name your workspace. One click, you're in." },
    { number: '2', title: 'Invite your team', description: 'Share a link. They join instantly. No permission spreadsheets.' },
    { number: '3', title: 'Start shipping', description: 'Pick board, list, or calendar view and get to work immediately.' },
  ];

  const boardColumns = [
    {
      title: 'To Do',
      color: 'bg-neutral-400',
      cards: [
        { title: 'Research competitors', priority: 'medium', avatar: 'A', avatarColor: 'bg-blue-500' },
        { title: 'Draft PRD document', priority: 'low', avatar: 'K', avatarColor: 'bg-purple-500' },
        { title: 'Design system audit', priority: 'high', avatar: null, avatarColor: null },
      ],
    },
    {
      title: 'In Progress',
      color: 'bg-amber-400',
      cards: [
        { title: 'Build onboarding flow', priority: 'high', avatar: 'M', avatarColor: 'bg-neutral-600' },
        { title: 'API integration tests', priority: 'urgent', avatar: 'J', avatarColor: 'bg-pink-500' },
      ],
    },
    {
      title: 'Done',
      color: 'bg-neutral-400',
      cards: [
        { title: 'Setup CI/CD pipeline', priority: 'low', avatar: 'A', avatarColor: 'bg-blue-500', done: true },
        { title: 'Landing page v1', priority: 'medium', avatar: 'K', avatarColor: 'bg-purple-500', done: true },
      ],
    },
  ];

  const listTasks = [
    { title: 'Design landing page', status: 'completed', priority: 'high', assignee: 'AK', color: 'bg-blue-500', date: 'Jan 15' },
    { title: 'Set up CI/CD pipeline', status: 'in_progress', priority: 'urgent', assignee: 'MJ', color: 'bg-neutral-600', date: 'Jan 18' },
    { title: 'Write onboarding emails', status: 'todo', priority: 'medium', assignee: 'KL', color: 'bg-purple-500', date: 'Jan 22' },
    { title: 'Launch v1.0', status: 'todo', priority: 'high', assignee: 'AK', color: 'bg-blue-500', date: 'Feb 1' },
    { title: 'User testing round 1', status: 'todo', priority: 'medium', assignee: null, color: null, date: 'Feb 5' },
  ];

  const calendarTasks = [
    { day: 3, title: 'Sprint planning', color: 'bg-neutral-400' },
    { day: 7, title: 'Design review', color: 'bg-purple-400' },
    { day: 12, title: 'API deadline', color: 'bg-red-400' },
    { day: 15, title: 'Team sync', color: 'bg-blue-400' },
    { day: 18, title: 'Demo day', color: 'bg-amber-400' },
    { day: 22, title: 'Launch prep', color: 'bg-neutral-400' },
  ];

  const comparisonRows = [
    { feature: 'Price per seat', todoria: '€5/month', asana: '€11/month', monday: '€9/month' },
    { feature: 'Free plan', todoria: '50 tasks, 3 members', asana: '10 users, limited', monday: '2 seats only' },
    { feature: 'Setup time', todoria: '60 seconds', asana: '~30 minutes', monday: '~20 minutes' },
    { feature: 'Board view', todoria: true, asana: true, monday: true },
    { feature: 'List view', todoria: true, asana: true, monday: true },
    { feature: 'Calendar view', todoria: true, asana: 'Premium only', monday: 'Pro only' },
    { feature: 'Drag & drop', todoria: true, asana: true, monday: true },
    { feature: 'Learning curve', todoria: 'None', asana: 'Moderate', monday: 'Moderate' },
    { feature: 'Features you\'ll never use', todoria: 'Zero', asana: 'Hundreds', monday: 'Hundreds' },
  ];

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '\u20AC0',
      period: '/month',
      description: 'For individuals getting started',
      features: [
        'Up to 50 tasks',
        '1 workspace',
        'Up to 3 members',
        'Board + List views',
        'Community support',
      ],
      cta: 'Start for Free',
      highlighted: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '\u20AC5',
      period: '/seat/month',
      description: 'For small teams who need more',
      icon: Sparkles,
      features: [
        'Unlimited tasks',
        'Unlimited workspaces',
        'Unlimited members',
        'Board + List + Calendar views',
        'Email reminders',
        'File attachments',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
      badge: 'Most Popular',
    },
  ];

  const faqs = [
    {
      q: 'Is there really a free plan?',
      a: 'Yes! Our free plan includes up to 50 tasks, 1 workspace, and 3 team members. No credit card required, no time limits. Use it forever.',
    },
    {
      q: 'How is Todoria different from Trello or Asana?',
      a: "We intentionally do less. No integrations, no plugins, no bloat. Just boards, lists, and calendars — done right. That focus means everything works faster and simpler. And at €5/seat/month, it's significantly cheaper too.",
    },
    {
      q: 'Can I upgrade or cancel anytime?',
      a: 'Absolutely. Upgrade to Pro when your team grows, and cancel anytime — no questions asked, no hidden fees. Your data stays accessible even after downgrading.',
    },
    {
      q: 'Is my data secure?',
      a: 'Yes. All data is encrypted with SSL in transit and at rest. We use httpOnly authentication cookies, CSRF protection, rate limiting, and run daily backups. We\'re also GDPR compliant.',
    },
    {
      q: 'Do you offer a trial for the Pro plan?',
      a: "Yes — when you upgrade, you get a full-featured trial period. If it's not for you, cancel before the trial ends and you won't be charged a cent.",
    },
    {
      q: 'Can I import tasks from another tool?',
      a: "Not yet, but it's on our roadmap. For now, getting started is so fast that most teams are up and running within minutes.",
    },
    {
      q: 'What happens to my data if I cancel?',
      a: 'Your data remains accessible. You can export everything (GDPR data export) before canceling, and we keep your data for 30 days after account deletion in case you change your mind.',
    },
    {
      q: 'Do you have a mobile app?',
      a: 'Todoria is fully responsive and works beautifully on any device — phone, tablet, or desktop. A dedicated mobile app is on our roadmap.',
    },
  ];

  const priorityColor = (p) =>
    p === 'urgent' ? 'bg-red-500' :
    p === 'high' ? 'bg-orange-500' :
    p === 'medium' ? 'bg-yellow-500' : 'bg-neutral-400';

  const priorityBadge = (p) =>
    p === 'urgent' ? 'bg-red-50 text-red-600' :
    p === 'high' ? 'bg-orange-50 text-orange-600' :
    'bg-yellow-50 text-yellow-600';

  // Shared animation classes
  const sectionAnim = (inView) =>
    `transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;

  const cardAnim = (inView, i) => ({
    className: `transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`,
    style: { transitionDelay: `${i * 100}ms` },
  });

  // ── Board mockup (shared between hero and showcase) ──
  const renderBoardMockup = (compact = false) => (
    <div className="flex gap-3">
      {boardColumns.map((col) => (
        <div key={col.title} className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2">
            <div className={`w-2 h-2 rounded-full ${col.color}`} />
            <span className="text-xs font-semibold text-muted-foreground">{col.title}</span>
            <span className="text-xs text-muted-foreground ml-auto">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {(compact ? col.cards.slice(0, 2) : col.cards).map((card, i) => (
              <div
                key={i}
                className={`bg-card rounded-lg border border-border p-2.5 shadow-xs ${card.done ? 'opacity-60' : ''}`}
              >
                <p className={`text-xs font-medium ${card.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {card.title}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${priorityColor(card.priority)}`} />
                  {card.avatar && (
                    <div className={`w-5 h-5 rounded-full ${card.avatarColor} flex items-center justify-center`}>
                      <span className="text-[9px] font-bold text-white">{card.avatar}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-foreground tracking-tight">
            Todoria
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-accent px-3 py-1 rounded-full">
              <Shield size={13} />
              Free Plan Available
            </span>
            <Link
              to="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link to="/register">
                Get Started
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md px-5 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-1"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-border" />
            <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground py-1">
              Sign In
            </Link>
            <Button asChild size="sm" className="w-full">
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                Get Started
              </Link>
            </Button>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative max-w-6xl mx-auto px-5 sm:px-6 pt-14 pb-16 sm:pt-24 sm:pb-24">
        <HeroOrbits />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy + Form */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full mb-6">
              <Sparkles size={13} />
              The simple Asana &amp; Monday alternative
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
              Project management,<br />
              <span className="text-primary">minus the bloat.</span>
            </h1>
            <p className="mt-4 sm:mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Three views. Real-time collaboration. 60-second setup.
              Everything your team needs, nothing it doesn't — starting at <strong className="text-foreground">€0/month</strong>.
            </p>

            <form onSubmit={handleHeroSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md">
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-ring transition"
              />
              <Button type="submit" className="whitespace-nowrap px-6">
                Get Started Free
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              Free forever for small teams. No credit card required.
            </p>
          </div>

          {/* Right: Rich board mockup */}
          <div className="relative hidden lg:block animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="rounded-2xl bg-gradient-to-br from-muted to-accent border border-border p-5 shadow-md">
              {/* Window chrome */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="ml-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <Kanban size={12} />
                  <span className="font-medium">Board View</span>
                </div>
              </div>

              {renderBoardMockup()}
            </div>
            {/* Decorative blur */}
            <div className="absolute -z-10 -top-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-6 -left-6 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          </div>
        </div>
      </section>

      {/* ─── Social Proof Bar ─── */}
      <section
        ref={socialRef}
        className={`border-y border-border bg-muted/50 ${sectionAnim(socialInView)}`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">
            Trusted by growing teams who value simplicity
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {/* Placeholder logos — replace with real customer logos */}
            {['TechStart', 'Velo Studio', 'BrightPath', 'Koda Labs', 'Nimbus'].map((name) => (
              <span
                key={name}
                className="text-base font-bold tracking-tight text-muted-foreground/40 select-none"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Problem ─── */}
      <section
        ref={problemRef}
        className={`${sectionAnim(problemInView)}`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            Sound familiar?
          </h2>
          <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
            Project management tools promise simplicity, then deliver the opposite.
          </p>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
            {painPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <div
                  key={i}
                  {...cardAnim(problemInView, i)}
                  className={`rounded-xl border border-border bg-card p-6 sm:p-8 hover:shadow-md transition-shadow ${cardAnim(problemInView, i).className}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <Icon size={20} className="text-red-500" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{point.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed text-sm">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section
        id="features"
        ref={featuresRef}
        className={`relative scroll-mt-20 bg-muted border-y border-border ${sectionAnim(featuresInView)}`}
      >
        <FloatingShapes />
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            Everything you need. Nothing you don't.
          </h2>
          <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
            Todoria does six things perfectly — and that's it. No feature creep, no bloat.
          </p>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className={`group rounded-xl border border-border bg-card p-6 sm:p-8 hover:shadow-md hover:border-primary/20 transition-all duration-200 ${cardAnim(featuresInView, i).className}`}
                  style={cardAnim(featuresInView, i).style}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        id="how-it-works"
        ref={stepsRef}
        className={`scroll-mt-20 ${sectionAnim(stepsInView)}`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            Up and running in 3 steps
          </h2>
          <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
            No onboarding calls. No setup wizards. Just start working.
          </p>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 items-start">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`relative flex flex-col items-center text-center px-4 ${cardAnim(stepsInView, i).className}`}
                style={cardAnim(stepsInView, i).style}
              >
                {/* Arrow connector (desktop only) */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 -right-3 text-muted-foreground">
                    <ArrowRight size={24} />
                  </div>
                )}
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-2xl font-bold text-primary">{step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed text-sm max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild size="lg">
              <Link to="/register">
                Try It Free
                <ArrowRight size={16} className="ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Product Showcase + Benefits ─── */}
      <section
        id="showcase"
        ref={showcaseRef}
        className={`bg-muted border-y border-border ${sectionAnim(showcaseInView)}`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Tabbed mockups */}
            <div className="rounded-2xl bg-gradient-to-br from-background to-accent border border-border p-6 sm:p-8">
              {/* Tab bar */}
              <div className="flex gap-1 mb-5 bg-muted rounded-lg p-1 w-fit">
                {[
                  { id: 'board', label: 'Board', icon: Kanban },
                  { id: 'list', label: 'List', icon: List },
                  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
                ].map((tab) => {
                  const TabIcon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveShowcase(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        activeShowcase === tab.id
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <TabIcon size={13} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Board View */}
              {activeShowcase === 'board' && renderBoardMockup(true)}

              {/* List View */}
              {activeShowcase === 'list' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span className="w-4" />
                    <span className="flex-1">Task</span>
                    <span className="w-14 text-center hidden sm:block">Priority</span>
                    <span className="w-10 text-center">Assignee</span>
                    <span className="w-12 text-right hidden sm:block">Due</span>
                  </div>
                  {listTasks.map((task, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-card rounded-lg border border-border px-3 py-2.5 shadow-xs"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        task.status === 'completed' ? 'border-primary bg-primary' : 'border-input'
                      }`}>
                        {task.status === 'completed' && <Check size={10} className="text-primary-foreground" />}
                      </div>
                      <span className={`flex-1 text-xs font-medium truncate ${
                        task.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}>
                        {task.title}
                      </span>
                      <span className={`w-14 text-center text-[10px] font-medium px-1.5 py-0.5 rounded hidden sm:block ${priorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                      <div className="w-10 flex justify-center">
                        {task.assignee ? (
                          <div className={`w-5 h-5 rounded-full ${task.color} flex items-center justify-center`}>
                            <span className="text-[8px] font-bold text-white">{task.assignee}</span>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-dashed border-input" />
                        )}
                      </div>
                      <span className="w-12 text-right text-[10px] text-muted-foreground hidden sm:block">{task.date}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Calendar View */}
              {activeShowcase === 'calendar' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-foreground">January 2026</span>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded bg-card/60 flex items-center justify-center text-muted-foreground">
                        <ChevronLeft size={14} />
                      </div>
                      <div className="w-6 h-6 rounded bg-card/60 flex items-center justify-center text-muted-foreground">
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} className="text-center text-[9px] font-medium text-muted-foreground">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 35 }, (_, i) => {
                      const day = i - 2;
                      const dayNum = day >= 1 && day <= 31 ? day : null;
                      const task = calendarTasks.find(t => t.day === dayNum);
                      const isToday = dayNum === 9;
                      return (
                        <div
                          key={i}
                          className={`aspect-square rounded-md text-[9px] p-0.5 flex flex-col ${
                            dayNum ? 'bg-card border border-border' : ''
                          } ${isToday ? 'ring-1 ring-primary/40' : ''}`}
                        >
                          {dayNum && (
                            <>
                              <span className="font-medium text-muted-foreground">{dayNum}</span>
                              {task && (
                                <div className={`mt-auto h-1 rounded-full ${task.color}`} title={task.title} />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Key benefits */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Built for focus,<br />not feature-creep.
              </h2>
              <p className="mt-3 text-muted-foreground max-w-md">
                Every feature in Todoria earns its place. If it doesn't help your team ship faster, it doesn't exist.
              </p>
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
                  {
                    title: 'Keyboard shortcuts',
                    description: 'Power users love our keyboard shortcuts. Navigate, create, and manage tasks without touching your mouse.',
                  },
                ].map((benefit, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check size={14} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Comparison Table ─── */}
      <section
        ref={compareRef}
        className={`scroll-mt-20 ${sectionAnim(compareInView)}`}
      >
        <div className="max-w-4xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            How Todoria compares
          </h2>
          <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
            We're not trying to replace enterprise tools. We're the better choice for small teams who want simplicity.
          </p>

          <div className="mt-10 sm:mt-14 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-primary">Todoria</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Asana</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Monday</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-foreground font-medium">{row.feature}</td>
                    {['todoria', 'asana', 'monday'].map((tool) => (
                      <td key={tool} className={`py-3 px-4 text-center ${tool === 'todoria' ? 'font-medium' : 'text-muted-foreground'}`}>
                        {row[tool] === true ? (
                          <Check size={18} className={`inline-block ${tool === 'todoria' ? 'text-primary' : 'text-muted-foreground'}`} />
                        ) : row[tool] === false ? (
                          <X size={18} className="inline-block text-muted-foreground/40" />
                        ) : (
                          <span className={tool === 'todoria' ? 'text-primary' : ''}>{row[tool]}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Pricing based on publicly available information as of 2026. Competitor prices may vary by region.
          </p>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section
        id="pricing"
        ref={pricingRef}
        className={`scroll-mt-20 bg-muted border-y border-border ${sectionAnim(pricingInView)}`}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
            Start free. Upgrade when your team grows. No hidden fees, no surprises.
          </p>

          <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan, i) => {
              const PlanIcon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-xl border-2 p-6 sm:p-8 bg-card ${
                    cardAnim(pricingInView, i).className
                  } ${plan.highlighted ? 'border-primary ring-2 ring-primary/10' : 'border-border'}`}
                  style={cardAnim(pricingInView, i).style}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      {PlanIcon && <PlanIcon size={18} className="text-primary" />}
                      <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm">
                        <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to="/register"
                    className={`w-full py-3 rounded-lg font-medium text-sm text-center transition-all block ${
                      plan.highlighted
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-accent text-foreground hover:bg-input'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            All plans include SSL encryption, daily backups, and GDPR compliance. Cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section
        id="faq"
        ref={faqRef}
        className={`scroll-mt-20 ${sectionAnim(faqInView)}`}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-16 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-muted-foreground text-center max-w-xl mx-auto">
            Got questions? We've got answers.
          </p>

          <div className="mt-10 space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="font-medium text-foreground pr-4">{faq.q}</span>
                    {isOpen ? (
                      <Minus size={18} className="text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Plus size={18} className="text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      isOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA Divider ─── */}
      <ShimmerDivider />

      {/* ─── Final CTA ─── */}
      <section
        ref={ctaRef}
        className={`bg-muted border-y border-border ${sectionAnim(ctaInView)}`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Your team deserves a simpler tool.
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto text-base sm:text-lg">
            Stop paying for features you'll never use. Start managing projects the way you actually work.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/register">
                Get Started for Free
                <ArrowRight size={16} className="ml-1.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="#pricing">
                See Pricing
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Free plan available. No credit card required. Set up in 60 seconds.
          </p>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="bg-background border-t border-border">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="text-lg font-bold text-foreground tracking-tight">
                Todoria
              </Link>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
                Simple project management for focused teams. Boards, lists, and calendars — nothing more, nothing less.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a></li>
                <li><a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><a href="mailto:support@todoria.app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</a></li>
                <li><Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link to="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Get Started</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/dpa" className="text-sm text-muted-foreground hover:text-foreground transition-colors">DPA</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Todoria. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Lock size={13} />
              <span>SSL encrypted &middot; GDPR compliant &middot; Daily backups</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
