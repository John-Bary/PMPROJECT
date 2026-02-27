import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDraggable, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';

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

/* ── Interactive mini-view visuals for feature cards ── */

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const PRIORITY_PILL_STYLES = {
  urgent: { background: 'rgba(239,68,68,0.15)', color: 'rgb(252,165,165)' },
  high: { background: 'rgba(249,115,22,0.15)', color: 'rgb(253,186,116)' },
  medium: { background: 'rgba(234,179,8,0.15)', color: 'rgb(253,224,71)' },
  low: { background: 'rgba(59,130,246,0.15)', color: 'rgb(147,197,253)' },
};

/* ─── Board: Draggable card ─── */
function DraggableCard({ card }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isDragging ? 'transparent' : 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderLeft: `2px solid ${PRIORITY_COLORS[card.priority]}`,
        borderRadius: 6,
        padding: '6px 8px',
        fontSize: '0.7rem',
        color: 'var(--text-primary)',
        cursor: 'grab',
        opacity: isDragging ? 0.3 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.title}</span>
    </div>
  );
}

/* ─── Board: Droppable column ─── */
function DroppableColumn({ column, cards }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: 0,
        background: isOver ? 'rgba(59,130,246,0.08)' : 'transparent',
        borderRadius: 8,
        padding: 6,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: column.color, flexShrink: 0 }} />
        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {column.name}
        </span>
        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{cards.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

const BOARD_COLUMNS = [
  { id: 'todo', name: 'To Do', color: '#94a3b8' },
  { id: 'in_progress', name: 'In Progress', color: '#f97316' },
  { id: 'done', name: 'Done', color: '#22c55e' },
];

const INITIAL_BOARD_TASKS = [
  { id: 'b1', title: 'Design landing page', priority: 'high', column: 'todo' },
  { id: 'b2', title: 'Set up database', priority: 'urgent', column: 'todo' },
  { id: 'b3', title: 'API endpoints', priority: 'medium', column: 'in_progress' },
  { id: 'b4', title: 'Auth system', priority: 'high', column: 'in_progress' },
  { id: 'b5', title: 'Project setup', priority: 'low', column: 'done' },
  { id: 'b6', title: 'Define requirements', priority: 'medium', column: 'done' },
  { id: 'b7', title: 'Write unit tests', priority: 'low', column: 'todo' },
];

function BoardVisual() {
  const [tasks, setTasks] = useState(INITIAL_BOARD_TASKS);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeCard = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const overId = over.id;
    // Check if dropped over a column
    const isColumn = BOARD_COLUMNS.some((c) => c.id === overId);
    if (!isColumn) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === active.id ? { ...t, column: overId } : t))
    );
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <div style={{ marginTop: 16, height: 280, overflow: 'hidden' }}>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
        <div style={{ display: 'flex', gap: 6, height: '100%' }}>
          {BOARD_COLUMNS.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              cards={tasks.filter((t) => t.column === col.id)}
            />
          ))}
        </div>
        {createPortal(
          <DragOverlay>
            {activeCard ? (
              <div
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderLeft: `2px solid ${PRIORITY_COLORS[activeCard.priority]}`,
                  borderRadius: 6,
                  padding: '6px 8px',
                  fontSize: '0.7rem',
                  color: 'var(--text-primary)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <GripVertical size={10} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                {activeCard.title}
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  );
}

/* ─── List Visual ─── */

const INITIAL_LIST_TASKS = [
  { id: 'l1', title: 'Review pull request', priority: 'urgent', completed: false },
  { id: 'l2', title: 'Update documentation', priority: 'low', completed: true },
  { id: 'l3', title: 'Fix navigation bug', priority: 'high', completed: false },
  { id: 'l4', title: 'Deploy to staging', priority: 'medium', completed: false },
  { id: 'l5', title: 'Write migration script', priority: 'high', completed: false },
];

function ListVisual() {
  const [tasks, setTasks] = useState(INITIAL_LIST_TASKS);

  const toggleTask = useCallback((id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  return (
    <div style={{ marginTop: 16, height: 200, overflow: 'hidden' }}>
      {tasks.map((task, i) => {
        const pillStyle = PRIORITY_PILL_STYLES[task.priority];
        return (
          <div
            key={task.id}
            onClick={() => toggleTask(task.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 4px',
              borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: task.completed ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                background: task.completed ? 'var(--accent)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {task.completed && <Check size={10} style={{ color: '#fff' }} />}
            </div>

            {/* Title */}
            <span
              style={{
                fontSize: '0.75rem',
                color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                textDecoration: task.completed ? 'line-through' : 'none',
                opacity: task.completed ? 0.5 : 1,
                flex: 1,
                transition: 'all 0.15s',
              }}
            >
              {task.title}
            </span>

            {/* Priority pill */}
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 9999,
                textTransform: 'capitalize',
                ...pillStyle,
                flexShrink: 0,
              }}
            >
              {task.priority}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Calendar Visual ─── */

function CalendarVisual() {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Day of week for the 1st (0=Sun)
  const startDay = new Date(year, month, 1).getDay();

  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Mock tasks on specific days (relative to current month)
  const taskDays = {
    3: [{ color: PRIORITY_COLORS.urgent }],
    7: [{ color: PRIORITY_COLORS.low }],
    12: [{ color: PRIORITY_COLORS.high }, { color: PRIORITY_COLORS.medium }],
    18: [{ color: PRIORITY_COLORS.medium }],
    22: [{ color: PRIORITY_COLORS.urgent }, { color: PRIORITY_COLORS.low }],
    27: [{ color: PRIORITY_COLORS.high }],
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  return (
    <div style={{ marginTop: 16, height: 240, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <button
          onClick={prevMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex' }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {monthName} {year}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-secondary)', display: 'flex' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            style={{ textAlign: 'center', fontSize: '0.55rem', fontWeight: 600, color: 'var(--text-muted)', padding: '2px 0' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {/* Empty cells for offset */}
        {Array.from({ length: startDay }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isTodayCell = isToday(day);
          const isSelected = selectedDay === day;
          const dots = taskDays[day] || [];

          return (
            <div
              key={day}
              onClick={() => setSelectedDay(day === selectedDay ? null : day)}
              style={{
                textAlign: 'center',
                padding: '3px 0',
                borderRadius: 4,
                cursor: 'pointer',
                background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                border: '1px solid transparent',
                transition: 'background 0.1s',
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: isTodayCell ? 700 : 400,
                  color: isTodayCell ? '#fff' : 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: isTodayCell ? 'var(--accent)' : 'transparent',
                }}
              >
                {day}
              </span>
              {dots.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 1 }}>
                  {dots.map((dot, di) => (
                    <div
                      key={di}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: dot.color,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
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

      {/* ─────────── SOCIAL PROOF ─────────── */}
      <section className="py-20 sm:py-[100px]" style={{ background: 'var(--bg-secondary)' }}>
        <motion.div
          className="max-w-[1200px] mx-auto px-6"
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          variants={staggerContainer}
        >
          <motion.h2
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="font-display font-bold tracking-[-0.03em] text-center"
            style={{
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              color: 'var(--text-primary)',
            }}
          >
            Teams ship faster with Todoria
          </motion.h2>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mt-4 text-center mx-auto"
            style={{
              maxWidth: '520px',
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
            }}
          >
            Here's what our early adopters have to say.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
            {[
              {
                quote: "We ditched Asana overnight. Todoria does exactly what we need — nothing more, nothing less.",
                name: 'Laura M.',
                role: 'Product Lead at Pixelcraft',
                initials: 'LM',
                color: '#6366F1',
              },
              {
                quote: "Onboarding took 2 minutes. Our whole team was set up before the coffee got cold.",
                name: 'Tomas R.',
                role: 'CTO at Vektorai',
                initials: 'TR',
                color: '#10B981',
              },
              {
                quote: "The board view is buttery smooth. Drag-and-drop that actually works on mobile? Sold.",
                name: 'Ema K.',
                role: 'Design Manager at Norde Studio',
                initials: 'EK',
                color: '#F59E0B',
              },
            ].map((testimonial, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="rounded-2xl p-6 sm:p-8 flex flex-col"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} width="16" height="16" viewBox="0 0 16 16" fill="var(--accent)">
                      <path d="M8 0l2.47 4.94L16 5.78l-4 3.89.94 5.49L8 12.62l-4.94 2.54.94-5.49-4-3.89 5.53-.84z" />
                    </svg>
                  ))}
                </div>

                <p
                  className="flex-1 leading-[1.7]"
                  style={{
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  "{testimonial.quote}"
                </p>

                <div className="flex items-center gap-3 mt-6 pt-6" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ background: testimonial.color }}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {testimonial.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─────────── PRICING ─────────── */}
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
              Simple, transparent pricing
            </h2>
            <p
              className="mt-4 mx-auto max-w-[480px]"
              style={{ fontSize: '1.125rem', color: 'var(--text-secondary)' }}
            >
              Free for small teams. Upgrade when you're ready.
            </p>
          </motion.div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[800px] mx-auto">
            {/* Free card */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="rounded-2xl p-6 sm:p-10 flex flex-col"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h3
                className="font-display font-semibold"
                style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}
              >
                Free
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className="font-display font-bold"
                  style={{ fontSize: '2.5rem', color: 'var(--text-primary)', lineHeight: 1 }}
                >
                  €0
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>/month</span>
              </div>
              <ul className="mt-8 space-y-3 flex-1">
                {[
                  'Up to 3 members',
                  '50 tasks per workspace',
                  '1 workspace',
                  'Board + List views',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="mt-8 inline-block text-center font-display font-semibold rounded-full transition-all duration-200"
                style={{
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Get started
              </Link>
            </motion.div>

            {/* Pro card (highlighted) */}
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="rounded-2xl p-6 sm:p-10 flex flex-col relative"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid rgba(var(--accent-rgb, 99,102,241), 0.3)',
                boxShadow: '0 0 30px var(--accent-glow)',
              }}
            >
              {/* Most Popular badge */}
              <span
                className="absolute -top-3 left-6 text-[0.75rem] font-bold uppercase tracking-[0.05em] rounded-full"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '4px 12px',
                }}
              >
                Most Popular
              </span>
              <h3
                className="font-display font-semibold"
                style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}
              >
                Pro
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span
                  className="font-display font-bold"
                  style={{ fontSize: '2.5rem', color: 'var(--text-primary)', lineHeight: 1 }}
                >
                  €3
                </span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>/seat/month</span>
              </div>
              <p
                className="mt-2"
                style={{ fontSize: '0.85rem', color: 'var(--accent)' }}
              >
                14-day free trial included
              </p>
              <ul className="mt-6 space-y-3 flex-1">
                {[
                  'Up to 50 members',
                  'Unlimited tasks',
                  'Unlimited workspaces',
                  'Board + List + Calendar views',
                  'Email reminders',
                  'File attachments',
                  'Priority support',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="mt-8 inline-block text-center font-display font-semibold rounded-full transition-all duration-200"
                style={{
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  boxShadow: '0 0 20px var(--accent-glow)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.filter = 'brightness(1.15)';
                  e.currentTarget.style.boxShadow = '0 0 40px var(--accent-glow)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.filter = 'brightness(1)';
                  e.currentTarget.style.boxShadow = '0 0 20px var(--accent-glow)';
                }}
              >
                Start free trial
              </Link>
            </motion.div>
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
          <div className="flex items-center gap-2 flex-wrap justify-center text-[0.85rem]" style={{ color: 'var(--text-muted)' }}>
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
            <span>&middot;</span>
            <Link
              to="/terms"
              className="transition-colors duration-200"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Terms
            </Link>
            <span>&middot;</span>
            <Link
              to="/privacy"
              className="transition-colors duration-200"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
