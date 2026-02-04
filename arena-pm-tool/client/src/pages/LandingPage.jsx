import { Link } from 'react-router-dom';

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

      {/* Features — placeholder */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20" />

      {/* Philosophy — placeholder */}
      <section id="philosophy" className="max-w-6xl mx-auto px-6 py-20" />

      {/* How It Works — placeholder */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-20" />

      {/* Final CTA — placeholder */}
      <section id="final-cta" className="max-w-6xl mx-auto px-6 py-20" />

      {/* Footer — placeholder */}
      <footer id="footer" className="max-w-6xl mx-auto px-6 py-20" />
    </div>
  );
}

export default LandingPage;
