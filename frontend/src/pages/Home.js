import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: '⚡', title: 'Queue-Based Workflow', desc: 'Global task queue with FIFO order. Pick a task and it lands on your personal board instantly.' },
  { icon: '⏱️', title: 'Auto Time Tracking', desc: 'Live timer starts the moment a task is picked. Zero manual logging.' },
  { icon: '🤖', title: 'Optional AI Generation', desc: 'Bring your own OpenAI or Gemini key. AI task generation when you want it, off when you don\'t.' },
  { icon: '💬', title: 'Integrated Chat', desc: 'Per-project chat rooms with mentions, reactions, and optional WhatsApp / Teams bridge.' },
  { icon: '📄', title: 'Project Docs', desc: 'Collaborative multi-section docs with live presence indicators built into every project.' },
  { icon: '🏢', title: 'Multi-Tenant', desc: 'Every organization gets its own isolated database. No data bleed between tenants.' },
];

const plans = [
  { name: 'Basic', price: '₹499', period: '/mo', desc: 'Core queue, boards, time logs', highlight: false },
  { name: 'Starter', price: '₹999', period: '/mo', desc: 'Docs, chat, project management', highlight: true },
  { name: 'Business', price: '₹2,499', period: '/mo', desc: 'AI add-ons + external chat bridges', highlight: false },
];

export default function Home() {
  return (
    <div className="lp-root">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-icon">▦</span>
          <span>TaskFlow</span>
        </div>
        <div className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="lp-nav-cta">
          <Link to="/login" className="lp-btn-ghost">Sign in</Link>
          <Link to="/register-organization" className="lp-btn-primary">Get started →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-badge">✦ Multi-tenant · Queue-first · Auto time tracking</div>
        <h1 className="lp-hero-h1">
          Manage your team<br />
          <span className="lp-accent">without the bloat.</span>
        </h1>
        <p className="lp-hero-sub">
          A lean task manager built for small startups and four-person dev teams.
          Queues, boards, docs, chat — and AI only when you actually need it.
        </p>
        <div className="lp-hero-actions">
          <Link to="/register-organization" className="lp-btn-primary lp-btn-lg">Create your organization</Link>
          <Link to="/login" className="lp-btn-ghost lp-btn-lg">Sign in →</Link>
        </div>

        {/* Mock product window */}
        <div className="lp-mockup">
          <div className="lp-mock-bar">
            <span className="lp-dot red" /><span className="lp-dot yellow" /><span className="lp-dot green" />
            <span className="lp-mock-url">app.taskflow.io / dashboard</span>
          </div>
          <div className="lp-mock-body">
            <div className="lp-mock-sidebar">
              <div className="lp-mock-proj active">🗂 Frontend v2</div>
              <div className="lp-mock-proj">🐛 Bug Sprint</div>
              <div className="lp-mock-proj">✨ API Redesign</div>
            </div>
            <div className="lp-mock-main">
              <div className="lp-mock-col">
                <div className="lp-mock-col-hd"><span>Global Queue</span><span className="lp-mock-badge">5</span></div>
                <div className="lp-mock-card blue">Fix auth token expiry · <em>Bug 🐛</em></div>
                <div className="lp-mock-card">Add CSV export · <em>Feature ✨</em></div>
                <div className="lp-mock-card">Refactor DB layer · <em>Enhancement ⚡</em></div>
              </div>
              <div className="lp-mock-col">
                <div className="lp-mock-col-hd"><span>In Progress</span><span className="lp-mock-badge green">2</span></div>
                <div className="lp-mock-card green">Redesign dashboard · <em>Feature ✨</em><div className="lp-mock-timer">⏱ 01:24:09</div></div>
                <div className="lp-mock-card green">Write unit tests · <em>Enhancement ⚡</em><div className="lp-mock-timer">⏱ 00:47:32</div></div>
              </div>
              <div className="lp-mock-col">
                <div className="lp-mock-col-hd"><span>In QA</span><span className="lp-mock-badge purple">1</span></div>
                <div className="lp-mock-card purple">Login page UI · <em>Feature ✨</em></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-label">Features</div>
        <h2 className="lp-section-h2">Everything a small team needs. Nothing it doesn't.</h2>
        <div className="lp-feature-grid">
          {features.map(f => (
            <div className="lp-feature-card" key={f.title}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-how">
        <div className="lp-section-label">Workflow</div>
        <h2 className="lp-section-h2">From signup to shipping in minutes.</h2>
        <div className="lp-steps">
          {[
            ['01', 'Create org', 'Register with a unique org name, pick a plan, complete mock payment.'],
            ['02', 'Add your team', 'Invite developers, QA, and managers. Each gets a role-scoped view.'],
            ['03', 'Push tasks to the queue', 'Create Bug / Feature / Enhancement tasks. They land in the global queue.'],
            ['04', 'Pick & ship', 'Developers pick tasks — timer starts, board updates, QA reviews, done.'],
          ].map(([n, t, d]) => (
            <div className="lp-step" key={n}>
              <div className="lp-step-num">{n}</div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section" id="pricing">
        <div className="lp-section-label">Pricing</div>
        <h2 className="lp-section-h2">Flat pricing. No per-seat surprises.</h2>
        <p className="lp-section-sub">Mock payment is live so you can test the full onboarding flow right now.</p>
        <div className="lp-pricing-grid">
          {plans.map(p => (
            <div className={`lp-plan${p.highlight ? ' lp-plan-highlight' : ''}`} key={p.name}>
              {p.highlight && <div className="lp-popular">Most popular</div>}
              <div className="lp-plan-name">{p.name}</div>
              <div className="lp-plan-price">{p.price}<span>{p.period}</span></div>
              <div className="lp-plan-desc">{p.desc}</div>
              <Link to="/register-organization" className={p.highlight ? 'lp-btn-primary' : 'lp-btn-outline'}>
                Get started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <h2>Ready to cut the noise?</h2>
        <p>Set up your organization in under two minutes. No credit card required for the mock trial.</p>
        <Link to="/register-organization" className="lp-btn-primary lp-btn-lg">Create your organization →</Link>
      </section>

      <footer className="lp-footer">
        <span className="lp-brand"><span className="lp-brand-icon">▦</span> TaskFlow</span>
        <span>Built for lean teams.</span>
      </footer>
    </div>
  );
}
