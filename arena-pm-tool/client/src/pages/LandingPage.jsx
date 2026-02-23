import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/* ── Animation helpers ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const heroStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

const sectionViewport = { once: true, margin: '-80px' };

/* ── Abstract SVG visuals for feature cards ── */
function BoardVisual() {
  return (
    <svg viewBox="0 0 280 120" fill="none" className="w-full mt-6 opacity-40">
      {[0, 96, 192].map((x, col) => (
        <g key={col}>
          <rect x={x} y={0} width={80} height={8} rx={4} fill="var(--border-subtle)" />
          {[20, 40, 60].slice(0, col === 1 ? 2 : 3).map((yy, i) => (
            <rect
              key={i}
              x={x}
              y={yy}
              width={80}
              height={16}
              rx={6}
              fill={i === 0 && col === 0 ? 'var(--accent)' : 'var(--border-subtle)'}
              opacity={i === 0 && col === 0 ? 0.3 : 1}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

function ListVisual() {
  return (
    <svg viewBox="0 0 280 100" fill="none" className="w-full mt-6 opacity-40">
      {[0, 24, 48, 72].map((y, i) => (
        <g key={i}>
          <circle cx={10} cy={y + 6} r={5} stroke="var(--border-subtle)" strokeWidth={1.5}
            fill={i === 0 ? 'var(--accent)' : 'none'} opacity={i === 0 ? 0.4 : 1} />
          <rect x={24} y={y + 1} width={i === 2 ? 160 : i === 0 ? 200 : 120} height={10}
            rx={5} fill="var(--border-subtle)" />
        </g>
      ))}
    </svg>
  );
}

function CalendarVisual() {
  const highlighted = [4, 11, 18, 24];
  return (
    <svg viewBox="0 0 280 120" fill="none" className="w-full mt-6 opacity-40">
      {Array.from({ length: 35 }, (_, i) => {
        const col = i % 7;
        const row = Math.floor(i / 7);
        const x = col * 40;
        const y = row * 24;
        return (
          <g key={i}>
            <rect x={x} y={y} width={36} height={20} rx={4}
              fill={highlighted.includes(i) ? 'var(--accent)' : 'var(--border-subtle)'}
              opacity={highlighted.includes(i) ? 0.25 : 1} />
            {highlighted.includes(i) && (
              <circle cx={x + 18} cy={y + 10} r={3} fill="var(--accent)" opacity={0.6} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════ */

function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-page min-h-screen overflow-x-hidden">

      {/* ─────────── NAVBAR ─────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'backdrop-blur-2xl border-b'
            : 'border-b border-transparent'
        }`}
        style={{
          borderColor: scrolled ? 'var(--border-subtle)' : 'transparent',
          backgroundColor: scrolled ? 'rgba(10, 10, 15, 0.8)' : 'transparent',
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Todoria
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              to="/login"
              className="text-sm font-medium transition-colors duration-200 min-h-[44px] flex items-center"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold rounded-full transition-all duration-200 min-h-[44px] flex items-center"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '10px 20px',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.filter = 'brightness(1.15)';
                e.currentTarget.style.boxShadow = '0 0 20px var(--accent-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─────────── HERO ─────────── */}
      <section
        className="relative flex items-center justify-center text-center"
        style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, var(--accent-glow), var(--bg-primary))',
        }}
      >
        <motion.div
          className="max-w-[800px] mx-auto px-6 pt-[72px]"
          variants={heroStagger}
          initial="hidden"
          animate="visible"
        >
          {/* Eyebrow */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="uppercase tracking-[0.15em] text-[0.85rem] mb-6"
            style={{ color: 'var(--text-muted)' }}
          >
            Task management, simplified
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="font-display font-black leading-[1.05] tracking-[-0.03em]"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              color: 'var(--text-primary)',
            }}
          >
            No integrations.<br />No bloat.<br />Just your work, done.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mx-auto mt-6 max-w-[560px] leading-relaxed"
            style={{
              fontSize: 'clamp(1.1rem, 2vw, 1.35rem)',
              color: 'var(--text-secondary)',
            }}
          >
            Three views. Board, list, and calendar. Nothing more, nothing less.
          </motion.p>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mt-10"
          >
            <Link
              to="/register"
              className="inline-block font-display font-semibold rounded-full transition-all duration-200"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '14px 32px',
                fontSize: '1.1rem',
                boxShadow: '0 0 30px var(--accent-glow)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.filter = 'brightness(1.15)';
                e.currentTarget.style.boxShadow = '0 0 50px var(--accent-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.boxShadow = '0 0 30px var(--accent-glow)';
              }}
            >
              Start for free &rarr;
            </Link>
          </motion.div>

          {/* Muted text */}
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mt-5 text-[0.85rem]"
            style={{ color: 'var(--text-muted)' }}
          >
            Free for small teams &middot; No credit card required
          </motion.p>
        </motion.div>
      </section>

      {/* ─────────── TRUST STRIP ─────────── */}
      <section className="pt-16 pb-16 sm:pt-[120px] sm:pb-[120px]">
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          {['Board view', 'List view', 'Calendar view'].map((label) => (
            <motion.span
              key={label}
              variants={fadeUp}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="rounded-full text-[0.85rem] px-5 py-2"
              style={{
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              {label}
            </motion.span>
          ))}
        </motion.div>
      </section>

      {/* ─────────── FEATURES ─────────── */}
      <section className="py-16 sm:py-[80px] md:pb-[100px]">
        <motion.div
          className="max-w-[1200px] mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          {/* Section heading */}
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="text-center mb-16">
            <h2
              className="font-display font-bold tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                color: 'var(--text-primary)',
              }}
            >
              Three views. That's all you need.
            </h2>
            <p
              className="mt-4 mx-auto max-w-[480px]"
              style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}
            >
              Every team works differently. Pick the view that fits.
            </p>
          </motion.div>

          {/* Bento grid: first card spans 2 cols on desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                tag: 'BOARD',
                heading: 'Drag, drop, done.',
                description:
                  'See your tasks as cards on a visual board. Move them across columns as work progresses. The classic way to stay organized.',
                Visual: BoardVisual,
                span: true,
              },
              {
                tag: 'LIST',
                heading: 'Everything at a glance.',
                description:
                  'One clean list. Sort, filter, and check off tasks without the clutter. For the people who think in rows.',
                Visual: ListVisual,
                span: false,
              },
              {
                tag: 'CALENDAR',
                heading: 'See deadlines before they see you.',
                description:
                  'Tasks mapped to dates. Plan your week, spot conflicts, never miss a deadline. Time management without the spreadsheet.',
                Visual: CalendarVisual,
                span: false,
              },
            ].map((card) => (
              <motion.div
                key={card.tag}
                variants={fadeUp}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`rounded-2xl p-6 sm:p-10 transition-all duration-300 group ${
                  card.span ? 'md:col-span-2' : ''
                }`}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <span
                  className="text-[0.75rem] font-bold uppercase tracking-[0.1em]"
                  style={{ color: 'var(--accent)' }}
                >
                  {card.tag}
                </span>
                <h3
                  className="mt-3 font-display font-bold tracking-[-0.02em]"
                  style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}
                >
                  {card.heading}
                </h3>
                <p
                  className="mt-2 max-w-[480px] leading-relaxed"
                  style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}
                >
                  {card.description}
                </p>
                <card.Visual />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─────────── PHILOSOPHY ─────────── */}
      <section className="py-20 sm:py-[140px]" style={{ background: 'var(--bg-secondary)' }}>
        <motion.div
          className="max-w-[900px] mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          {/* Accent line */}
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-8"
            style={{
              width: '60px',
              height: '2px',
              background: 'var(--accent)',
            }}
          />

          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="font-display font-bold tracking-[-0.03em] text-center"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: 'var(--text-primary)',
            }}
          >
            We don't do integrations. That's the point.
          </motion.h2>

          <div className="mt-10 space-y-6">
            {[
              "Other tools want to connect to everything. Your Slack, your email, your calendar, your grandma's fridge. We don't. Todoria connects you to your work and nothing else.",
              'No setup wizards. No API keys. No thirty-minute onboarding calls. You sign up, create a workspace, and start working. That\'s it.',
              'We built Todoria for teams who are tired of tools that do a hundred things badly. We do three things well.',
            ].map((text, i) => (
              <motion.p
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="leading-[1.7]"
                style={{
                  fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)',
                  color: 'var(--text-secondary)',
                }}
              >
                {text}
              </motion.p>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="py-20 sm:py-[120px]">
        <motion.div
          className="max-w-[1200px] mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} transition={{ duration: 0.6 }} className="text-center mb-10 sm:mb-16">
            <h2
              className="font-display font-bold tracking-[-0.03em]"
              style={{
                fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                color: 'var(--text-primary)',
              }}
            >
              Up and running in under a minute.
            </h2>
            <p
              className="mt-4"
              style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}
            >
              No onboarding marathon. No certification courses.
            </p>
          </motion.div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {/* Connecting line (desktop only) */}
            <div
              className="hidden md:block absolute top-[2rem] left-[16.67%] right-[16.67%] h-px"
              style={{ background: 'var(--border-subtle)' }}
            />

            {[
              { num: '01', title: 'Create a workspace', desc: "One click. Give it a name. You're in." },
              { num: '02', title: 'Invite your team', desc: 'Share a link. They join. No permission spreadsheets.' },
              { num: '03', title: 'Start working', desc: 'Board, list, or calendar. Pick your view and go.' },
            ].map((step) => (
              <motion.div
                key={step.num}
                variants={fadeUp}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative text-center md:text-left"
              >
                <p
                  className="font-display font-extralight"
                  style={{
                    fontSize: 'clamp(2.5rem, 4vw, 3.5rem)',
                    color: 'var(--accent)',
                    lineHeight: 1,
                  }}
                >
                  {step.num}
                </p>
                <h3
                  className="mt-4 font-semibold"
                  style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-2"
                  style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}
                >
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section
        className="relative text-center py-24 px-6 sm:py-[160px]"
        style={{
          background: 'radial-gradient(ellipse 50% 60% at 50% 50%, var(--accent-glow), var(--bg-primary))',
        }}
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="font-display font-bold tracking-[-0.03em]"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: 'var(--text-primary)',
            }}
          >
            Ready to ditch the bloat?
          </motion.h2>

          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mt-4"
            style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}
          >
            Free for teams up to 3 members. No credit card required.
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.95 },
              visible: { opacity: 1, scale: 1 },
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mt-8"
          >
            <Link
              to="/register"
              className="inline-block font-display font-semibold rounded-full transition-all duration-200"
              style={{
                background: 'var(--accent)',
                color: '#fff',
                padding: '14px 32px',
                fontSize: '1.1rem',
                boxShadow: '0 0 30px var(--accent-glow)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.filter = 'brightness(1.15)';
                e.currentTarget.style.boxShadow = '0 0 50px var(--accent-glow)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = 'brightness(1)';
                e.currentTarget.style.boxShadow = '0 0 30px var(--accent-glow)';
              }}
            >
              Get started for free &rarr;
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer
        className="border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ padding: '48px 24px' }}
        >
          <p className="text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} Todoria
          </p>
          <div className="flex items-center gap-2 text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
            <Link
              to="/login"
              className="transition-colors duration-200"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Sign in
            </Link>
            <span>&middot;</span>
            <Link
              to="/register"
              className="transition-colors duration-200"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
