import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const slugify = (v) => String(v || '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const DEFAULT_PLANS = [
  {
    key: 'basic', name: 'Basic', price: 499, badge: '',
    features: [
      'Task queues & boards',
      'Time tracking',
      'Project docs',
      'Manager dashboard',
      'Up to 5 users',
    ],
    limits: { ai: false, externalChat: false, users: 5 },
  },
  {
    key: 'starter', name: 'Starter', price: 999, badge: 'Popular',
    features: [
      'Everything in Basic',
      'Unlimited users',
      'Project chat (internal)',
      'AI task generation',
    ],
    limits: { ai: true, externalChat: false, users: Infinity },
  },
  {
    key: 'business', name: 'Business', price: 2499, badge: 'Best value',
    features: [
      'Everything in Starter',
      'WhatsApp / Teams / Google Chat',
      'External chat bridge',
      'Priority support',
    ],
    limits: { ai: true, externalChat: true, users: Infinity },
  },
  {
    key: 'enterprise', name: 'Enterprise', price: null, badge: '',
    features: [
      'Everything in Business',
      'Custom integrations',
      'Dedicated support',
      'SLA & invoicing',
    ],
    limits: { ai: true, externalChat: true, users: Infinity },
  },
];

const formatPlanPrice = (plan) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: plan.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(plan.price || 0);

const PRESET_COLORS = ['#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316','#f59e0b','#10b981','#06b6d4','#3b82f6','#64748b'];
const STEPS = ['plan', 'payment', 'setup'];
const STEP_META = {
  plan:    { label: 'Choose plan',  num: 1 },
  payment: { label: 'Payment',      num: 2 },
  setup:   { label: 'Organization', num: 3 },
};

function Field({ label, hint, children }) {
  return (
    <div className="rg-field">
      <label className="rg-label">{label}</label>
      {children}
      {hint && <span className="rg-hint">{hint}</span>}
    </div>
  );
}

export default function RegisterOrganization() {
  const { registerOrganization } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]               = useState('plan');
  const [plans, setPlans]             = useState(DEFAULT_PLANS);
  const [plan, setPlan]               = useState(DEFAULT_PLANS[1]);
  const [mockPayment, setMockPayment] = useState(null);
  const [form, setForm] = useState({
    organizationName: '', slug: '', ownerEmail: '',
    username: '', password: '', logoUrl: '', primaryColor: '#6366f1',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const previewSlug = useMemo(
    () => slugify(form.slug || form.organizationName),
    [form.slug, form.organizationName]
  );

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    let mounted = true;
    api.get('/tenants/plans').then(({ data }) => {
      if (!mounted) return;
      const nextPlans = DEFAULT_PLANS.map(defaultPlan => {
        const remote = data.plans?.find(p => p.key === defaultPlan.key);
        if (!remote) return defaultPlan;
        return {
          ...defaultPlan,
          name: remote.name || defaultPlan.name,
          features: remote.features?.length ? remote.features : defaultPlan.features,
          price: remote.amount,
          currency: remote.currency || 'INR',
          badge: remote.badge ?? defaultPlan.badge,
          description: remote.description || '',
          contactOnly: !!remote.contactOnly,
          limits: {
            ai: remote.ai,
            externalChat: remote.externalChat,
            users: remote.maxUsers || Infinity,
          },
        };
      });
      setPlans(nextPlans);
      setPlan(prev => nextPlans.find(p => p.key === prev.key) || nextPlans[1]);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const tenant = await registerOrganization({
        ...form,
        slug: previewSlug,
        subscriptionPlan: plan.key,
        mockPayment,
        // features off by default — admin enables from settings after onboarding
        features: {
          ai: { enabled: false },
          chatIntegration: { enabled: false },
        },
      });
      localStorage.setItem('tenantSlug', tenant.slug);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create organization');
    } finally { setLoading(false); }
  };

  const stepIdx = STEPS.indexOf(step);

  return (
    <div className="rg-root">

      {/* ── Left aside ── */}
      <aside className="rg-aside">
        <div className="rg-aside-top">
          <Link to="/" className="rg-aside-brand">
            <span className="lp-brand-icon">▦</span> TaskFlow
          </Link>
          <p className="rg-aside-tagline">Set up your organization in 3 quick steps.</p>
        </div>

        <nav className="rg-aside-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={`rg-aside-step ${step === s ? 'active' : stepIdx > i ? 'done' : ''}`}>
              <div className="rg-aside-dot">{stepIdx > i ? '✓' : i + 1}</div>
              <div className="rg-aside-step-text">
                <span className="rg-aside-step-num">Step {i + 1}</span>
                <span className="rg-aside-step-label">{STEP_META[s].label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="rg-aside-connector" />}
            </div>
          ))}
        </nav>

        {/* selected plan summary shown after step 1 */}
        {stepIdx >= 1 && (
          <div className="rg-aside-plan-summary">
            <span className="rg-aside-plan-label">Selected plan</span>
            <span className="rg-aside-plan-name">{plan.name}</span>
            <span className="rg-aside-plan-price">{formatPlanPrice(plan)}/mo</span>
            <div className="rg-aside-plan-limits">
              <span className={plan.limits.ai ? 'limit-on' : 'limit-off'}>🤖 AI {plan.limits.ai ? 'included' : 'not included'}</span>
              <span className={plan.limits.externalChat ? 'limit-on' : 'limit-off'}>💬 Ext. chat {plan.limits.externalChat ? 'included' : 'not included'}</span>
              <span className="limit-on">👥 {plan.limits.users === Infinity ? 'Unlimited users' : `Up to ${plan.limits.users} users`}</span>
            </div>
          </div>
        )}

        <div className="rg-aside-bottom">
          <p>Already have an account?</p>
          <Link to="/login">Sign in →</Link>
        </div>
      </aside>

      {/* ── Right main ── */}
      <main className="rg-main">
        <div className="rg-form-wrap">

          {/* ══ STEP 1 — PLAN ══ */}
          {step === 'plan' && (
            <div className="rg-step-content">
              <div className="rg-step-header">
                <h1>Choose your plan</h1>
                <p>You can upgrade or change anytime. Payment is mocked for testing.</p>
              </div>
              <div className="rg-plan-grid">
                {plans.map(p => (
                  p.contactOnly ? (
                    <a key={p.key} href="mailto:sales@taskflow.io" className="rg-plan-card rg-plan-enterprise">
                      <div className="rg-plan-name">{p.name}</div>
                      <div className="rg-plan-price rg-plan-contact">
                        {p.price > 0 ? `${formatPlanPrice(p)}/mo` : 'Contact us'}
                      </div>
                      <ul className="rg-plan-features">
                        {p.features.map(f => <li key={f}><span>✓</span>{f}</li>)}
                      </ul>
                      <div className="rg-plan-limits-row">
                        <span className={p.limits.ai ? 'limit-pill on' : 'limit-pill'}>🤖 AI</span>
                        <span className={p.limits.externalChat ? 'limit-pill on' : 'limit-pill'}>💬 Ext. Chat</span>
                        <span className="limit-pill on">👥 {p.limits.users === Infinity ? '∞' : p.limits.users}</span>
                      </div>
                      <div className="rg-enterprise-cta">Get in touch →</div>
                    </a>
                  ) : (
                  <button key={p.key}
                    className={`rg-plan-card ${plan.key === p.key ? 'selected' : ''}`}
                    onClick={() => setPlan(p)}>
                    {p.badge && <div className="rg-plan-badge">{p.badge}</div>}
                    <div className="rg-plan-name">{p.name}</div>
                    <div className="rg-plan-price">{formatPlanPrice(p)}<span>/mo</span></div>
                    <ul className="rg-plan-features">
                      {p.features.map(f => <li key={f}><span>✓</span>{f}</li>)}
                    </ul>
                    <div className="rg-plan-limits-row">
                      <span className={p.limits.ai ? 'limit-pill on' : 'limit-pill'}>🤖 AI</span>
                      <span className={p.limits.externalChat ? 'limit-pill on' : 'limit-pill'}>💬 Ext. Chat</span>
                      <span className="limit-pill on">👥 {p.limits.users === Infinity ? '∞' : p.limits.users}</span>
                    </div>
                    <div className={`rg-plan-select-indicator ${plan.key === p.key ? 'on' : ''}`} />
                  </button>
                  )
                ))}
              </div>
              <div className="rg-actions">
                <button className="rg-btn-primary" onClick={() => setStep('payment')}>
                  Continue to Payment →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 2 — PAYMENT ══ */}
          {step === 'payment' && (
            <div className="rg-step-content">
              <div className="rg-step-header">
                <h1>Mock payment</h1>
                <p>This is a simulated checkout. No real charge is made.</p>
              </div>

              <div className="rg-payment-summary">
                <div className="rg-payment-plan">
                  <span className="rg-payment-plan-name">{plan.name} plan</span>
                  <span className="rg-payment-plan-badge">Selected</span>
                </div>
                <div className="rg-payment-amount">{formatPlanPrice(plan)}<span>/month</span></div>
              </div>

              <div className="rg-card-preview">
                <div className="rg-card-chip" />
                <div className="rg-card-number">4242  4242  4242  4242</div>
                <div className="rg-card-bottom">
                  <div><span>Cardholder</span><b>TEST USER</b></div>
                  <div><span>Expires</span><b>12/30</b></div>
                  <div><span>CVV</span><b>123</b></div>
                </div>
              </div>

              <div className="rg-actions">
                <button className="rg-btn-primary" onClick={() => {
                  setMockPayment({ paid: true, paymentId: `mock_${Date.now()}`, amount: plan.price, currency: plan.currency || 'INR' });
                  setStep('setup');
                }}>✓ Confirm Mock Payment</button>
                <button className="rg-btn-ghost" onClick={() => setStep('plan')}>← Back</button>
              </div>
            </div>
          )}

          {/* ══ STEP 3 — SETUP ══ */}
          {step === 'setup' && (
            <div className="rg-step-content">
              <div className="rg-step-header">
                <h1>Set up your organization</h1>
                <p>Creates your workspace and the first admin account. You can configure AI, chat, and team roles after logging in.</p>
              </div>

              <form onSubmit={submit}>
                <div className="rg-section-label">Organization</div>
                <div className="rg-field-row">
                  <Field label="Organization name">
                    <input className="rg-input" placeholder="Acme Corp" value={form.organizationName}
                      onChange={e => upd('organizationName', e.target.value)} required />
                  </Field>
                  <Field label="Login slug" hint={previewSlug ? `Login as: ${previewSlug}` : ''}>
                    <input className="rg-input" placeholder="acme-corp" value={form.slug}
                      onChange={e => upd('slug', e.target.value)} />
                  </Field>
                </div>
                <Field label="Billing email (optional)">
                  <input className="rg-input" type="email" placeholder="billing@acme.com" value={form.ownerEmail}
                    onChange={e => upd('ownerEmail', e.target.value)} />
                </Field>

                <div className="rg-section-label" style={{ marginTop: 24 }}>Admin account</div>
                <div className="rg-field-row">
                  <Field label="Username">
                    <input className="rg-input" placeholder="admin" value={form.username}
                      onChange={e => upd('username', e.target.value)} required />
                  </Field>
                  <Field label="Password">
                    <input className="rg-input" type="password" placeholder="••••••••" value={form.password}
                      onChange={e => upd('password', e.target.value)} required />
                  </Field>
                </div>

                <div className="rg-section-label" style={{ marginTop: 24 }}>Branding (optional)</div>
                <div className="rg-field-row">
                  <Field label="Logo URL">
                    <input className="rg-input" placeholder="https://..." value={form.logoUrl}
                      onChange={e => upd('logoUrl', e.target.value)} />
                  </Field>
                  <Field label="Brand color">
                    <div className="rg-color-row">
                      {PRESET_COLORS.slice(0, 8).map(c => (
                        <button key={c} type="button"
                          className={`color-swatch ${form.primaryColor === c ? 'selected' : ''}`}
                          style={{ background: c }}
                          onClick={() => upd('primaryColor', c)} />
                      ))}
                      <input type="color" className="color-picker-sm" value={form.primaryColor}
                        onChange={e => upd('primaryColor', e.target.value)} />
                    </div>
                  </Field>
                </div>

                {/* plan capability notice */}
                <div className="rg-plan-notice">
                  <div className="rg-plan-notice-icon">ℹ️</div>
                  <div>
                    <strong>{plan.name} plan</strong>
                    <span> — AI is {plan.limits.ai ? 'included' : 'not included'} and external chat is {plan.limits.externalChat ? 'included' : 'not included'} on this plan.</span>
                    <button type="button" className="rg-change-plan-btn" onClick={() => setStep('plan')}>Change plan</button>
                  </div>
                </div>

                {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
                <div className="rg-actions" style={{ marginTop: 24 }}>
                  <button type="submit" className="rg-btn-primary" disabled={loading || !previewSlug}>
                    {loading ? 'Creating…' : '🚀 Create Organization'}
                  </button>
                  <button type="button" className="rg-btn-ghost" onClick={() => setStep('payment')} disabled={loading}>← Back</button>
                </div>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
