import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import AmbientBackground from '../components/three/AmbientScene';

const WORDS = ['for freelancers.', 'for small product teams.', 'queue-first.', 'actually lean.'];

const COUNTERS = [
  { end: 500,   suffix: '+', label: 'Freelancers & teams' },
  { end: 12000, suffix: '+', label: 'Tasks shipped' },
  { end: 99,    suffix: '%', label: 'Uptime SLA' },
];

const FEATURES = [
  { icon: '⚡', title: 'Queue-Based Workflow',   desc: 'Global task queue with FIFO order. Pick a task and it lands on your personal board instantly.' },
  { icon: '⏱️', title: 'Auto Time Tracking',     desc: 'Live timer starts the moment a task is picked. Zero manual logging.' },
  { icon: '🤖', title: 'Optional AI Generation', desc: 'Bring your own OpenAI or Gemini key. AI task generation when you want it, off when you don\'t.' },
  { icon: '💬', title: 'Integrated Chat',         desc: 'Per-project chat rooms with mentions, reactions, and optional WhatsApp / Teams bridge.' },
  { icon: '📄', title: 'Project Docs',            desc: 'Collaborative multi-section docs with live presence indicators built into every project.' },
  { icon: '🏢', title: 'Multi-Tenant',            desc: 'Every organization gets its own isolated database. No data bleed between tenants.' },
];

const DEFAULT_PLANS = [
  { name: 'Basic',    price: '₹499',   period: '/mo', desc: 'Core queue, boards, time logs',     highlight: false },
  { name: 'Starter',  price: '₹999',   period: '/mo', desc: 'Docs, chat, project management',     highlight: true  },
  { name: 'Business', price: '₹2,499', period: '/mo', desc: 'AI add-ons + external chat bridges', highlight: false },
];

/* ── Flow stages — roles are illustrative; any org can use custom roles ── */
const FLOW_STAGES = [
  {
    color: '#6366f1', label: 'Backlog',
    icon: '📋',
    desc: 'A manager (or any lead role your org defines) creates tasks — Bug, Feature, or Enhancement — with type, priority, and description.',
    roles: ['Manager', 'Your Lead Role'],
    note: 'Any role with manager access can create tasks.',
  },
  {
    color: '#8b5cf6', label: 'Global Queue',
    icon: '🗂️',
    desc: 'Tasks enter the shared FIFO queue. Every executor role (developer, designer, analyst, or whatever you define) sees the same ordered list.',
    roles: ['All Executors'],
    note: 'Works for devs, designers, analysts — any custom role.',
  },
  {
    color: '#38bdf8', label: 'In Progress',
    icon: '🔄',
    desc: 'An executor picks the task. The timer starts automatically and the task moves to their personal board in real-time.',
    roles: ['Developer', 'Designer', 'Custom Role…'],
    note: 'Your custom executor roles plug in here directly.',
  },
  {
    color: '#f59e0b', label: 'In QA / Review',
    icon: '🔍',
    desc: 'The executor marks done → task enters the review queue. A reviewer (QA, validator, approver — your choice) approves or rejects with comments.',
    roles: ['QA Engineer', 'Reviewer', 'Custom Role…'],
    note: 'Custom reviewer roles work exactly like QA.',
  },
  {
    color: '#10b981', label: 'Done',
    icon: '✅',
    desc: 'Reviewer approves. Task is closed, time is logged, and the manager dashboard updates. Full audit trail is always kept.',
    roles: ['Manager', 'Admin'],
    note: 'Visible to all roles with dashboard access.',
  },
];

const EFFICIENCY_BARS = [
  { label: 'Task throughput',   before: 35, after: 82,  color: '#6366f1' },
  { label: 'QA turnaround',     before: 28, after: 74,  color: '#10b981' },
  { label: 'Time log accuracy', before: 42, after: 100, color: '#38bdf8' },
  { label: 'Team visibility',   before: 20, after: 95,  color: '#f59e0b' },
];

const EFFICIENCY_CARDS = [
  { stat: '40%',  label: 'Less time in standups', desc: 'Everyone sees the live board. No "what are you working on?" — just pick and go.',         icon: '📉' },
  { stat: '0',    label: 'Manual time logs',       desc: 'Timer runs from the moment a task is picked to the moment it hits review. Automatic.',   icon: '⏱️' },
  { stat: '3×',   label: 'Faster review cycles',  desc: 'Review queue is always fresh. Tasks appear the second they\'re ready — no pinging.',      icon: '🚀' },
  { stat: '100%', label: 'Audit trail coverage',   desc: 'Every status change, comment, and time log is recorded. Complete history, always.',       icon: '🔒' },
];

/* ── hooks ── */
function useCountUp(end, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);
  return val;
}

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function Counter({ end, suffix, label, start }) {
  const val = useCountUp(end, 1800, start);
  return (
    <div className="lp-counter">
      <strong className="lp-counter-num">{val.toLocaleString()}{suffix}</strong>
      <span className="lp-counter-label">{label}</span>
    </div>
  );
}

function MockTimer({ initial }) {
  const [secs, setSecs] = useState(initial);
  useEffect(() => { const id = setInterval(() => setSecs(s => s + 1), 1000); return () => clearInterval(id); }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return <div className="lp-mock-timer">⏱ {h}:{m}:{s}</div>;
}

function Particles() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    const pts = Array.from({ length: 56 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.35, dy: (Math.random() - 0.5) * 0.35,
      o: Math.random() * 0.45 + 0.1,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.o})`; ctx.fill();
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - d / 120)})`; ctx.lineWidth = 0.6; ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="lp-particles" />;
}

/* ── Wire thread flow diagram ── */
function WireFlow({ active, onSelect, inView }) {
  const svgRef = useRef(null);
  const nodeRefs = useRef([]);
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const newPaths = [];
    for (let i = 0; i < FLOW_STAGES.length - 1; i++) {
      const a = nodeRefs.current[i];
      const b = nodeRefs.current[i + 1];
      if (!a || !b) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const x1 = ra.right - svgRect.left;
      const y1 = ra.top + ra.height / 2 - svgRect.top;
      const x2 = rb.left - svgRect.left;
      const y2 = rb.top + rb.height / 2 - svgRect.top;
      const cx = (x1 + x2) / 2;
      newPaths.push({ x1, y1, x2, y2, cx, i });
    }
    setPaths(newPaths);
  }, [inView]);

  return (
    <div className="wf-root" ref={svgRef}>
      {/* SVG wire layer */}
      <svg className="wf-svg" aria-hidden="true">
        <defs>
          {FLOW_STAGES.map((s, i) => (
            <linearGradient key={i} id={`wg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={s.color} />
              <stop offset="100%" stopColor={FLOW_STAGES[Math.min(i + 1, FLOW_STAGES.length - 1)].color} />
            </linearGradient>
          ))}
          <filter id="wireGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {paths.map(({ x1, y1, x2, y2, cx, i }) => {
          const passed = active > i;
          const current = active === i;
          return (
            <g key={i}>
              {/* base dim wire */}
              <path
                d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2"
              />
              {/* animated active wire */}
              {(passed || current) && (
                <path
                  className={`wf-wire-path ${current ? 'wf-wire-current' : 'wf-wire-passed'}`}
                  d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                  fill="none"
                  stroke={`url(#wg${i})`}
                  strokeWidth={current ? 2.5 : 2}
                  filter={current ? 'url(#wireGlow)' : 'none'}
                  strokeDasharray={current ? '6 4' : 'none'}
                />
              )}
              {/* data packet dot travelling along wire */}
              {current && (
                <circle r="4" fill={FLOW_STAGES[i].color} filter="url(#wireGlow)">
                  <animateMotion
                    dur="1.6s" repeatCount="indefinite"
                    path={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* nodes */}
      <div className="wf-nodes">
        {FLOW_STAGES.map((stage, i) => (
          <button
            key={stage.label}
            ref={el => nodeRefs.current[i] = el}
            className={`wf-node lp-reveal ${inView ? 'visible' : ''} ${active === i ? 'active' : ''} ${active > i ? 'done' : ''}`}
            style={{ transitionDelay: `${i * 0.12}s`, '--nc': stage.color }}
            onClick={() => onSelect(i)}
          >
            <div className="wf-node-ring">
              <div className="wf-node-icon">{stage.icon}</div>
            </div>
            <span className="wf-node-label">{stage.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [wordIdx, setWordIdx]     = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting]   = useState(false);
  const [displayPlans, setDisplayPlans] = useState(DEFAULT_PLANS);
  const [activeStage, setActiveStage]   = useState(0);
  const [mobileNav, setMobileNav]       = useState(false);

  /* typewriter */
  useEffect(() => {
    const word = WORDS[wordIdx];
    let t;
    if (!deleting && displayed.length < word.length)       t = setTimeout(() => setDisplayed(word.slice(0, displayed.length + 1)), 70);
    else if (!deleting && displayed.length === word.length) t = setTimeout(() => setDeleting(true), 2200);
    else if (deleting && displayed.length > 0)              t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
    else { setDeleting(false); setWordIdx(i => (i + 1) % WORDS.length); }
    return () => clearTimeout(t);
  }, [displayed, deleting, wordIdx]);

  /* visit tracking + plans */
  useEffect(() => {
    const key = 'platformVisitorId';
    const vid = localStorage.getItem(key) || (() => { const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(key, id); return id; })();
    api.post('/tenants/track-visit', { visitorId: vid, path: '/' }).catch(() => {});
    api.get('/tenants/plans').then(({ data }) => {
      setDisplayPlans(prev => prev.map(plan => {
        const r = data.plans?.find(p => p.name === plan.name || p.key === plan.name.toLowerCase());
        if (!r) return plan;
        return { ...plan, desc: r.description || plan.desc, price: new Intl.NumberFormat('en-IN', { style: 'currency', currency: r.currency || 'INR', maximumFractionDigits: 0 }).format(r.amount || 0) };
      }));
    }).catch(() => {});
  }, []);

  const [featRef, featInView]       = useInView(0.1);
  const [stepsRef, stepsInView]     = useInView(0.1);
  const [counterRef, counterInView] = useInView(0.2);
  const [pricingRef, pricingInView] = useInView(0.1);
  const [flowRef, flowInView]       = useInView(0.08);
  const [effRef, effInView]         = useInView(0.08);

  /* auto-advance flow */
  useEffect(() => {
    if (!flowInView) return;
    const id = setInterval(() => setActiveStage(s => (s + 1) % FLOW_STAGES.length), 2200);
    return () => clearInterval(id);
  }, [flowInView]);

  return (
    <div className="lp-root">
      <AmbientBackground variant="hero" fallback={<Particles />} />

      {/* ── Top info strip ── */}
      <div className="lp-topstrip">
        <span>📧 hello@taskflow.io</span>
        <span className="lp-topstrip-sep">·</span>
        <span>📞 +91 98765 43210</span>
        <span className="lp-topstrip-sep">·</span>
        <span>🇮🇳 Made in India · Serving globally</span>
      </div>

      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-icon">▦</span>
          <span>TaskFlow</span>
        </div>
        <div className={`lp-nav-links ${mobileNav ? 'open' : ''}`}>
          <a href="#features"  onClick={() => setMobileNav(false)}>Features</a>
          <a href="#flow"      onClick={() => setMobileNav(false)}>How it works</a>
          <a href="#pricing"   onClick={() => setMobileNav(false)}>Pricing</a>
          <a href="#contact"   onClick={() => setMobileNav(false)}>Contact</a>
          <a href="#about"     onClick={() => setMobileNav(false)}>About</a>
        </div>
        <div className="lp-nav-cta">
          <Link to="/login" className="lp-btn-ghost">Sign in</Link>
          <Link to="/register-organization" className="lp-btn-primary">Get started →</Link>
          <button className="lp-hamburger" onClick={() => setMobileNav(v => !v)} aria-label="Menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-badge lp-fadein-up" style={{ animationDelay: '0.1s' }}>
          ✦ Multi-tenant · Queue-first · Auto time tracking
        </div>
        <h1 className="lp-hero-h1 lp-fadein-up" style={{ animationDelay: '0.25s' }}>
          Manage your team<br />
          <span className="lp-accent lp-typewriter">
            {displayed}<span className="lp-cursor">|</span>
          </span>
        </h1>
        <p className="lp-hero-sub lp-fadein-up" style={{ animationDelay: '0.4s' }}>
          A lean task manager built for small startups and dev teams.
          Queues, boards, docs, chat — and AI only when you actually need it.
        </p>
        <div className="lp-hero-actions lp-fadein-up" style={{ animationDelay: '0.55s' }}>
          <Link to="/register-organization" className="lp-btn-primary lp-btn-lg lp-btn-glow">Create your organization</Link>
          <Link to="/login" className="lp-btn-ghost lp-btn-lg">Sign in →</Link>
        </div>
        <div className="lp-counters lp-fadein-up" ref={counterRef} style={{ animationDelay: '0.65s' }}>
          {COUNTERS.map(c => <Counter key={c.label} {...c} start={counterInView} />)}
        </div>
        <div className="lp-mockup lp-fadein-up" style={{ animationDelay: '0.75s' }}>
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
                <div className="lp-mock-card green">Redesign dashboard · <em>Feature ✨</em><MockTimer initial={5049} /></div>
                <div className="lp-mock-card green">Write unit tests · <em>Enhancement ⚡</em><MockTimer initial={2852} /></div>
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
      <section className="lp-section" id="features" ref={featRef}>
        <div className="lp-section-label">Features</div>
        <h2 className="lp-section-h2">Everything a small team needs. Nothing it doesn't.</h2>
        <div className="lp-feature-grid">
          {FEATURES.map((f, i) => (
            <div className={`lp-feature-card lp-reveal ${featInView ? 'visible' : ''}`} key={f.title} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="lp-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="lp-section lp-how" ref={stepsRef}>
        <div className="lp-section-label">Workflow</div>
        <h2 className="lp-section-h2">From signup to shipping in minutes.</h2>
        <div className="lp-steps">
          {[
            ['01', 'Create org',              'Register with a unique org name, pick a plan, complete mock payment.'],
            ['02', 'Add your team',           'Invite members with any role — developer, QA, designer, analyst, or a custom role you define.'],
            ['03', 'Push tasks to the queue', 'Create Bug / Feature / Enhancement tasks. They land in the global queue.'],
            ['04', 'Pick & ship',             'Team members pick tasks — timer starts, board updates, reviewer approves, done.'],
          ].map(([n, t, d], i) => (
            <div className={`lp-step lp-reveal ${stepsInView ? 'visible' : ''}`} key={n} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="lp-step-num">{n}</div>
              <h3>{t}</h3>
              <p>{d}</p>
              {i < 3 && <div className="lp-step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── PROJECT FLOW (wire thread) ── */}
      <section className="lp-section lp-flow-section" id="flow" ref={flowRef}>
        <div className="lp-section-label">Project Flow</div>
        <h2 className="lp-section-h2">How a task travels from idea to done.</h2>
        <p className="lp-section-sub">
          The pipeline is the same regardless of your industry — tech, design, marketing, ops.
          Just map your team's roles to each stage and the system works exactly the same way.
        </p>

        {/* custom role callout */}
        <div className={`lp-flow-roles-note lp-reveal ${flowInView ? 'visible' : ''}`}>
          <span className="lp-flow-roles-icon">🎭</span>
          <div>
            <strong>Not a dev team?</strong> No problem. Your org can define custom roles — Designer, Analyst, Copywriter, Sales Rep — and they slot into the exact same pipeline.
            The executor and reviewer roles are fully customizable per organization.
          </div>
        </div>

        <WireFlow active={activeStage} onSelect={setActiveStage} inView={flowInView} />

        {/* detail panel */}
        <div className="lp-flow-detail">
          {FLOW_STAGES.map((stage, i) => (
            <div key={stage.label} className={`lp-flow-detail-card ${activeStage === i ? 'active' : ''}`} style={{ '--node-color': stage.color }}>
              <div className="lp-flow-detail-left">
                <div className="lp-flow-detail-icon" style={{ background: stage.color + '22', borderColor: stage.color }}>{stage.icon}</div>
              </div>
              <div className="lp-flow-detail-body">
                <div className="lp-flow-detail-step">Stage {i + 1} of {FLOW_STAGES.length}</div>
                <h3 className="lp-flow-detail-title" style={{ color: stage.color }}>{stage.label}</h3>
                <p className="lp-flow-detail-desc">{stage.desc}</p>
                <div className="lp-flow-detail-roles">
                  {stage.roles.map(r => (
                    <span key={r} className="lp-flow-role-chip" style={{ borderColor: stage.color + '55', color: stage.color }}>{r}</span>
                  ))}
                </div>
                <p className="lp-flow-detail-note">💡 {stage.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lp-flow-dots">
          {FLOW_STAGES.map((s, i) => (
            <button key={i} className={`lp-flow-dot ${activeStage === i ? 'active' : ''}`}
              style={activeStage === i ? { background: s.color } : {}} onClick={() => setActiveStage(i)} />
          ))}
        </div>
      </section>

      {/* ── EFFICIENCY ── */}
      <section className="lp-section lp-efficiency-section" ref={effRef}>
        <div className="lp-section-label">Efficiency</div>
        <h2 className="lp-section-h2">Built to remove every bottleneck.</h2>
        <p className="lp-section-sub">TaskFlow isn't just a board — it's a system designed to eliminate the hidden time drains that slow every team down.</p>
        <div className="lp-eff-cards">
          {EFFICIENCY_CARDS.map((c, i) => (
            <div key={c.label} className={`lp-eff-card lp-reveal ${effInView ? 'visible' : ''}`} style={{ transitionDelay: `${i * 0.09}s` }}>
              <span className="lp-eff-icon">{c.icon}</span>
              <strong className="lp-eff-stat">{c.stat}</strong>
              <span className="lp-eff-label">{c.label}</span>
              <p className="lp-eff-desc">{c.desc}</p>
            </div>
          ))}
        </div>
        <div className={`lp-eff-bars lp-reveal ${effInView ? 'visible' : ''}`} style={{ transitionDelay: '0.3s' }}>
          <div className="lp-eff-bars-header">
            <h3>Before vs. After TaskFlow</h3>
            <div className="lp-eff-legend">
              <span className="lp-legend-dot" style={{ background: '#334155' }} />Before
              <span className="lp-legend-dot" style={{ background: '#6366f1' }} />After
            </div>
          </div>
          {EFFICIENCY_BARS.map(bar => (
            <div key={bar.label} className="lp-eff-bar-row">
              <span className="lp-eff-bar-label">{bar.label}</span>
              <div className="lp-eff-bar-track">
                <div className="lp-eff-bar-before" style={{ width: `${bar.before}%` }} />
                <div className="lp-eff-bar-after" style={{ width: effInView ? `${bar.after}%` : '0%', background: bar.color }} />
              </div>
              <div className="lp-eff-bar-nums">
                <span style={{ color: '#475569' }}>{bar.before}%</span>
                <span style={{ color: bar.color, fontWeight: 700 }}>{bar.after}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="lp-section" id="pricing" ref={pricingRef}>
        <div className="lp-section-label">Pricing</div>
        <h2 className="lp-section-h2">Flat pricing. No per-seat surprises.</h2>
        <p className="lp-section-sub">Mock payment is live so you can test the full onboarding flow right now.</p>
        <div className="lp-pricing-grid">
          {displayPlans.map((p, i) => (
            <div className={`lp-plan lp-reveal ${pricingInView ? 'visible' : ''} ${p.highlight ? 'lp-plan-highlight' : ''}`} key={p.name} style={{ transitionDelay: `${i * 0.12}s` }}>
              {p.highlight && <div className="lp-popular">Most popular</div>}
              <div className="lp-plan-name">{p.name}</div>
              <div className="lp-plan-price">{p.price}<span>{p.period}</span></div>
              <div className="lp-plan-desc">{p.desc}</div>
              <Link to="/register-organization" className={p.highlight ? 'lp-btn-primary' : 'lp-btn-outline'}>Get started</Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-cta-glow" />
        <h2 className="lp-fadein-up">Ready to cut the noise?</h2>
        <p className="lp-fadein-up" style={{ animationDelay: '0.15s' }}>Set up your organization in under two minutes. No credit card required for the mock trial.</p>
        <Link to="/register-organization" className="lp-btn-primary lp-btn-lg lp-btn-glow lp-fadein-up" style={{ animationDelay: '0.28s' }}>
          Create your organization →
        </Link>
      </section>

      {/* ── Contact ── */}
      <section className="lp-section lp-contact-section" id="contact">
        <div className="lp-section-label">Contact</div>
        <h2 className="lp-section-h2">Get in touch.</h2>
        <p className="lp-section-sub">Questions about plans, custom integrations, or enterprise pricing? We're happy to help.</p>
        <div className="lp-contact-grid">
          <div className="lp-contact-card">
            <div className="lp-contact-icon">📧</div>
            <h3>Email us</h3>
            <p>hello@taskflow.io</p>
            <a href="mailto:hello@taskflow.io" className="lp-contact-link">Send an email →</a>
          </div>
          <div className="lp-contact-card">
            <div className="lp-contact-icon">📞</div>
            <h3>Call us</h3>
            <p>+91 98765 43210</p>
            <a href="tel:+919876543210" className="lp-contact-link">Call now →</a>
          </div>
          <div className="lp-contact-card">
            <div className="lp-contact-icon">💬</div>
            <h3>Sales & Enterprise</h3>
            <p>sales@taskflow.io</p>
            <a href="mailto:sales@taskflow.io" className="lp-contact-link">Talk to sales →</a>
          </div>
          <div className="lp-contact-card">
            <div className="lp-contact-icon">🐛</div>
            <h3>Support</h3>
            <p>support@taskflow.io</p>
            <a href="mailto:support@taskflow.io" className="lp-contact-link">Get help →</a>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="lp-section lp-about-section" id="about">
        <div className="lp-section-label">About</div>
        <h2 className="lp-section-h2">Built for the teams that build things.</h2>
        <div className="lp-about-grid">
          <div className="lp-about-text">
            <p>TaskFlow started as a frustration. Too many tools, too much ceremony, too many standups just to find out who's doing what. We built a system that answers all of that automatically.</p>
            <p>The queue is the source of truth. The timer is automatic. The review flow is enforced. And every role — whether you call it Developer, Designer, Analyst, or something only your org would understand — follows the same simple pipeline.</p>
            <p>We're a small team, we eat our own cooking, and we ship fast. Every feature you see was something we needed ourselves.</p>
            <div className="lp-about-badges">
              <span className="lp-about-badge">🇮🇳 Made in India</span>
              <span className="lp-about-badge">🔒 Data isolated per org</span>
              <span className="lp-about-badge">⚡ Built on Node + React</span>
              <span className="lp-about-badge">🤝 Fair pricing</span>
            </div>
          </div>
          <div className="lp-about-values">
            {[
              { icon: '🎯', title: 'Focused',     desc: 'We don\'t add features for the sake of it. Every addition has to earn its place.' },
              { icon: '🔍', title: 'Transparent', desc: 'No hidden limits, no per-seat surprises, no enterprise pricing walls for basic features.' },
              { icon: '🚀', title: 'Fast',        desc: 'Opinionated defaults mean you\'re up and running in minutes, not days.' },
              { icon: '🏗️', title: 'Extensible',  desc: 'Custom roles, custom integrations, custom chat bridges. Your workflow, your rules.' },
            ].map(v => (
              <div key={v.title} className="lp-value-card">
                <span className="lp-value-icon">{v.icon}</span>
                <div>
                  <strong>{v.title}</strong>
                  <p>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer-full">
        <div className="lp-footer-top">
          <div className="lp-footer-brand-col">
            <div className="lp-brand lp-footer-brand">
              <span className="lp-brand-icon">▦</span>
              <span>TaskFlow</span>
            </div>
            <p className="lp-footer-tagline">A lean task manager built for teams that ship.</p>
            <div className="lp-footer-contact">
              <span>📧 hello@taskflow.io</span>
              <span>📞 +91 98765 43210</span>
              <span>🇮🇳 India · Global</span>
            </div>
          </div>
          <div className="lp-footer-links-col">
            <div className="lp-footer-link-group">
              <strong>Product</strong>
              <a href="#features">Features</a>
              <a href="#flow">How it works</a>
              <a href="#pricing">Pricing</a>
              <Link to="/register-organization">Get started</Link>
            </div>
            <div className="lp-footer-link-group">
              <strong>Company</strong>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="mailto:sales@taskflow.io">Sales</a>
              <a href="mailto:support@taskflow.io">Support</a>
            </div>
            <div className="lp-footer-link-group">
              <strong>Account</strong>
              <Link to="/login">Sign in</Link>
              <Link to="/register-organization">Register org</Link>
            </div>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© {new Date().getFullYear()} TaskFlow. Built for lean teams.</span>
          <span>hello@taskflow.io · +91 98765 43210</span>
        </div>
      </footer>
    </div>
  );
}
