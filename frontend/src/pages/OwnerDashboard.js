import React, { useEffect, useState } from 'react';
import api from '../api';

const fmtCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);

const fmtDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_META = {
  active:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Active' },
  trial:     { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Trial' },
  past_due:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Past Due' },
  cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Cancelled' },
};

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

const PLAN_COLORS = {
  basic:      { accent: '#64748b', glow: 'rgba(100,116,139,0.15)' },
  starter:    { accent: '#6366f1', glow: 'rgba(99,102,241,0.18)' },
  business:   { accent: '#10b981', glow: 'rgba(16,185,129,0.18)' },
  enterprise: { accent: '#f59e0b', glow: 'rgba(245,158,11,0.18)' },
};

function PlanPreviewCard({ draft, planKey }) {
  const { accent, glow } = PLAN_COLORS[planKey] || PLAN_COLORS.basic;
  const features = draft.features
    ? String(draft.features).split('\n').map(f => f.trim()).filter(Boolean)
    : [];

  return (
    <div className="spl-preview-card" style={{ '--plan-accent': accent, '--plan-glow': glow }}>
      {draft.badge && <div className="spl-preview-badge">{draft.badge}</div>}
      <div className="spl-preview-top">
        <span className="spl-preview-name">{draft.name || planKey}</span>
        <p className="spl-preview-desc">{draft.description || 'No description'}</p>
      </div>
      <div className="spl-preview-price">
        {draft.contactOnly ? (
          <span className="spl-preview-contact">Contact us</span>
        ) : (
          <>
            <span className="spl-preview-amount">
              {fmtCurrency(Number(draft.amount) || 0, draft.currency)}
            </span>
            <span className="spl-preview-period">/ month</span>
          </>
        )}
      </div>
      <div className="spl-preview-divider" />
      <ul className="spl-preview-features">
        {features.length === 0 && <li className="spl-preview-feat spl-feat-empty">No features added</li>}
        {features.map((f, i) => (
          <li key={i} className="spl-preview-feat">
            <span className="spl-feat-check" style={{ color: accent }}>✓</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="spl-preview-caps">
        <span className={`spl-cap ${draft.ai ? 'on' : ''}`} style={draft.ai ? { borderColor: accent, color: accent } : {}}>
          🤖 AI {draft.ai ? 'included' : 'not included'}
        </span>
        <span className={`spl-cap ${draft.externalChat ? 'on' : ''}`} style={draft.externalChat ? { borderColor: accent, color: accent } : {}}>
          💬 Ext. chat {draft.externalChat ? 'included' : 'not included'}
        </span>
        <span className="spl-cap on" style={{ borderColor: accent, color: accent }}>
          👥 {draft.maxUsers ? `Up to ${draft.maxUsers} users` : 'Unlimited users'}
        </span>
      </div>
      <button className="spl-preview-cta" style={{ background: accent }}>
        {draft.contactOnly ? 'Get in touch →' : 'Subscribe now →'}
      </button>
    </div>
  );
}

function PlansTab({ plans, planDrafts, updDraft, savePlan, savingPlan, pricingMsg, pricingErr }) {
  const [selected, setSelected] = useState(plans[0]?.key || '');
  const draft = planDrafts[selected] || {};
  const plan  = plans.find(p => p.key === selected) || {};

  return (
    <div className="spl-root">

      {/* ── left: plan selector sidebar ── */}
      <aside className="spl-sidebar">
        <div className="spl-sidebar-head">Plans</div>
        {plans.map(p => {
          const { accent } = PLAN_COLORS[p.key] || PLAN_COLORS.basic;
          const d = planDrafts[p.key] || {};
          return (
            <button key={p.key}
              className={`spl-plan-item ${selected === p.key ? 'active' : ''}`}
              style={selected === p.key ? { borderLeftColor: accent } : {}}
              onClick={() => setSelected(p.key)}>
              <div className="spl-plan-item-top">
                <span className="spl-plan-item-name">{d.name || p.name}</span>
                {d.badge && <span className="spl-plan-item-badge" style={{ background: accent }}>{d.badge}</span>}
              </div>
              <span className="spl-plan-item-price">
                {d.contactOnly ? 'Contact' : fmtCurrency(Number(d.amount) || 0, d.currency) + '/mo'}
              </span>
              <div className="spl-plan-item-pills">
                {d.ai && <span className="spl-item-pill">🤖</span>}
                {d.externalChat && <span className="spl-item-pill">💬</span>}
                <span className="spl-item-pill">👥 {d.maxUsers || '∞'}</span>
              </div>
            </button>
          );
        })}
      </aside>

      {/* ── center: live preview ── */}
      <div className="spl-preview-col">
        <div className="spl-col-label">Live preview</div>
        <PlanPreviewCard draft={draft} planKey={selected} />
      </div>

      {/* ── right: editor ── */}
      <div className="spl-editor-col">
        <div className="spl-col-label">Edit plan — <span style={{ color: '#a5b4fc' }}>{plan.key}</span></div>

        {pricingErr && <p className="error spl-feedback">{pricingErr}</p>}
        {pricingMsg && <p className="success-msg spl-feedback">{pricingMsg}</p>}

        <div className="spl-editor-form">

          {/* ── identity ── */}
          <div className="spl-section-label">Identity</div>
          <div className="spl-field-row">
            <div className="spl-field">
              <label>Display name</label>
              <input value={draft.name ?? ''} placeholder="e.g. Starter"
                onChange={e => updDraft(selected, 'name', e.target.value)} />
            </div>
            <div className="spl-field">
              <label>Badge <span className="spl-optional">optional</span></label>
              <input value={draft.badge ?? ''} placeholder="e.g. Popular"
                onChange={e => updDraft(selected, 'badge', e.target.value)} />
            </div>
          </div>
          <div className="spl-field">
            <label>Description</label>
            <input value={draft.description ?? ''} placeholder="One-line plan description"
              onChange={e => updDraft(selected, 'description', e.target.value)} />
          </div>

          {/* ── pricing ── */}
          <div className="spl-section-label" style={{ marginTop: 18 }}>Pricing</div>
          <div className="spl-field-row">
            <div className="spl-field spl-field-grow">
              <label>Amount</label>
              <input type="number" min="0" value={draft.amount ?? ''} placeholder="0"
                onChange={e => updDraft(selected, 'amount', e.target.value)} />
            </div>
            <div className="spl-field" style={{ width: 100 }}>
              <label>Currency</label>
              <select value={draft.currency || 'INR'}
                onChange={e => updDraft(selected, 'currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* ── limits ── */}
          <div className="spl-section-label" style={{ marginTop: 18 }}>Limits & capabilities</div>
          <div className="spl-field-row">
            <div className="spl-field">
              <label>Max users <span className="spl-optional">blank = unlimited</span></label>
              <input type="number" min="1" value={draft.maxUsers ?? ''} placeholder="Unlimited"
                onChange={e => updDraft(selected, 'maxUsers', e.target.value)} />
            </div>
          </div>
          <div className="spl-toggles-row">
            {[
              { field: 'ai',          label: 'AI generation',   icon: '🤖' },
              { field: 'externalChat', label: 'External chat',   icon: '💬' },
              { field: 'contactOnly',  label: 'Contact-only',    icon: '📞' },
            ].map(({ field, label, icon }) => (
              <label key={field} className="spl-toggle">
                <input type="checkbox" checked={!!draft[field]}
                  onChange={e => updDraft(selected, field, e.target.checked)} />
                <span className="spl-toggle-track"><span className="spl-toggle-thumb" /></span>
                <span className="spl-toggle-text">{icon} {label}</span>
              </label>
            ))}
          </div>

          {/* ── features ── */}
          <div className="spl-section-label" style={{ marginTop: 18 }}>Features <span className="spl-optional">one per line</span></div>
          <textarea className="spl-features-textarea" rows={6}
            value={draft.features ?? ''} placeholder="Task queues & boards&#10;Time tracking&#10;AI task generation"
            onChange={e => updDraft(selected, 'features', e.target.value)} />

          {/* ── payment gateway IDs ── */}
          <div className="spl-section-label" style={{ marginTop: 18 }}>Payment gateway IDs</div>
          <div className="spl-gateway-grid">
            <div className="spl-field">
              <label>
                <svg className="spl-gw-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9h18M3 15h18M12 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Stripe Product ID
              </label>
              <input value={draft.stripeProductId ?? ''} placeholder="prod_XXXXXXXXXXXXXXXXX"
                onChange={e => updDraft(selected, 'stripeProductId', e.target.value)}
                className="spl-mono-input" />
            </div>
            <div className="spl-field">
              <label>
                <svg className="spl-gw-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9h18M3 15h18M12 3v18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Stripe Price ID
              </label>
              <input value={draft.stripePriceId ?? ''} placeholder="price_XXXXXXXXXXXXXXXXX"
                onChange={e => updDraft(selected, 'stripePriceId', e.target.value)}
                className="spl-mono-input" />
            </div>
            <div className="spl-field">
              <label>
                <svg className="spl-gw-icon" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Razorpay Plan ID
              </label>
              <input value={draft.razorpayPlanId ?? ''} placeholder="plan_XXXXXXXXXXXXXXXXX"
                onChange={e => updDraft(selected, 'razorpayPlanId', e.target.value)}
                className="spl-mono-input" />
            </div>
          </div>

          {/* ── save ── */}
          <button className="btn btn-create spl-save-btn"
            onClick={() => savePlan(selected)} disabled={savingPlan === selected}>
            {savingPlan === selected ? '⏳ Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function OwnerDashboard() {
  const [tab, setTab]             = useState('overview');
  const [stats, setStats]         = useState(null);
  const [planDrafts, setPlanDrafts] = useState({});
  const [pricingMsg, setPricingMsg] = useState('');
  const [pricingErr, setPricingErr] = useState('');
  const [savingPlan, setSavingPlan] = useState('');
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const applyStats = (data) => {
    setStats(data);
    setPlanDrafts((data.plans || []).reduce((acc, plan) => ({
      ...acc,
      [plan.key]: {
        name: plan.name || '',
        description: plan.description || '',
        amount: String(plan.amount ?? 0),
        currency: plan.currency || 'INR',
        features: (plan.features || []).join('\n'),
        ai: !!plan.ai,
        externalChat: !!plan.externalChat,
        maxUsers: plan.maxUsers ?? '',
        badge: plan.badge || '',
        contactOnly: !!plan.contactOnly,
        stripeProductId: plan.stripeProductId || '',
        stripePriceId:   plan.stripePriceId   || '',
        razorpayPlanId:  plan.razorpayPlanId  || '',
      },
    }), {}));
  };

  useEffect(() => {
    let mounted = true;
    api.get('/tenants/owner/stats')
      .then(({ data }) => { if (mounted) applyStats(data); })
      .catch(err => { if (mounted) setError(err.response?.data?.message || 'Failed to load owner stats'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const updDraft = (key, field, value) =>
    setPlanDrafts(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const savePlan = async (planKey) => {
    setPricingMsg(''); setPricingErr(''); setSavingPlan(planKey);
    try {
      const draft = planDrafts[planKey];
      const { data } = await api.patch(`/tenants/owner/plans/${planKey}`, {
        name: draft.name, description: draft.description,
        amount: Number(draft.amount), currency: draft.currency,
        features: draft.features, ai: draft.ai,
        externalChat: draft.externalChat, maxUsers: draft.maxUsers,
        badge: draft.badge, contactOnly: draft.contactOnly,
        stripeProductId: draft.stripeProductId,
        stripePriceId:   draft.stripePriceId,
        razorpayPlanId:  draft.razorpayPlanId,
      });
      applyStats({ ...stats, plans: data.plans });
      setPricingMsg('Plan saved successfully.');
    } catch (err) {
      setPricingErr(err.response?.data?.message || 'Could not save plan');
    } finally { setSavingPlan(''); }
  };

  if (loading) return (
    <div className="od-loading">
      <div className="od-loading-spinner" />
      <p>Loading platform overview…</p>
    </div>
  );
  if (error) return <div className="od-error"><span>⚠️</span>{error}</div>;

  const totals             = stats?.totals || {};
  const recentOrgs         = stats?.recentOrganizations || [];
  const plans              = stats?.plans || [];
  const planBreakdown      = Object.entries(stats?.planBreakdown || {});
  const subscriptionStatus = Object.entries(stats?.subscriptionStatus || {});

  return (
    <div className="manager-panel od-panel">

      {/* ── Tabs ── */}
      <div className="manager-main">
        <div className="manager-tabs">
          {[
            { key: 'overview',  label: '📊 Overview' },
            { key: 'orgs',      label: `🏢 Organizations (${totals.organizations || 0})` },
            { key: 'plans',     label: '💳 Plans' },
            { key: 'analytics', label: '📈 Analytics' },
          ].map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ══ OVERVIEW ══ */}
        {tab === 'overview' && (
          <div className="overview-panel">
            <h3>Platform Overview</h3>

            {/* revenue hero */}
            <div className="od-rev-hero">
              <div className="od-rev-hero-inner">
                <span className="od-rev-label">Monthly Revenue</span>
                <strong className="od-rev-amount">{fmtCurrency(totals.monthlyRevenue)}</strong>
                <span className="od-rev-sub">{totals.subscribedOrganizations || 0} paying organizations</span>
              </div>
            </div>

            {/* stat cards */}
            <div className="stats-row" style={{ flexWrap: 'wrap' }}>
              {[
                { label: 'Organizations',    value: totals.organizations || 0,           sub: `${totals.allTenants || 0} total incl. owner`,    color: '#6366f1' },
                { label: 'Subscribed',       value: totals.subscribedOrganizations || 0, sub: `${totals.trialOrganizations || 0} on trial`,      color: '#10b981' },
                { label: 'Joined This Month',value: totals.joinedThisMonth || 0,         sub: `${totals.activeOrganizations || 0} active`,       color: '#38bdf8' },
                { label: 'Suspended',        value: totals.suspendedOrganizations || 0,  sub: 'orgs suspended',                                  color: '#ef4444' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
                  <span className="stat-num" style={{ color }}>{value}</span>
                  <span className="stat-label">{label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{sub}</span>
                </div>
              ))}
            </div>

            {/* plan distribution + subscription status */}
            <div className="od-overview-grid" style={{ marginTop: 20 }}>
              <div className="queue-board">
                <div className="queue-board-header">
                  <h3>Plan Distribution</h3>
                  <span className="queue-count">{totals.organizations || 0} orgs</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {planBreakdown.length === 0 && <p className="no-data" style={{ padding: '16px 0' }}>No customer organizations yet.</p>}
                  {planBreakdown.map(([plan, count]) => {
                    const pct = totals.organizations ? Math.round((count / totals.organizations) * 100) : 0;
                    return (
                      <div key={plan} className="od-breakdown-row">
                        <span className="od-breakdown-name">{plan}</span>
                        <div className="od-meter-wrap">
                          <div className="od-meter"><div className="od-meter-fill" style={{ width: `${pct}%` }} /></div>
                          <span className="od-meter-pct">{pct}%</span>
                        </div>
                        <strong className="od-breakdown-count">{count}</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="queue-board">
                <div className="queue-board-header">
                  <h3>Subscription Status</h3>
                  <span className="queue-count">Live billing</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {subscriptionStatus.length === 0 && <p className="no-data" style={{ padding: '16px 0' }}>No subscriptions yet.</p>}
                  {subscriptionStatus.map(([status, count]) => {
                    const meta = STATUS_META[status] || { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: status };
                    const pct  = totals.organizations ? Math.round((count / totals.organizations) * 100) : 0;
                    return (
                      <div key={status} className="od-breakdown-row">
                        <span className="od-status-chip" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                        <div className="od-meter-wrap">
                          <div className="od-meter">
                            <div className="od-meter-fill" style={{ width: `${pct}%`, background: meta.color }} />
                          </div>
                          <span className="od-meter-pct">{pct}%</span>
                        </div>
                        <strong style={{ color: meta.color, textAlign: 'right', minWidth: 24 }}>{count}</strong>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                  {[
                    { label: 'Active',    value: totals.activeOrganizations || 0,    color: '#10b981' },
                    { label: 'Suspended', value: totals.suspendedOrganizations || 0, color: '#ef4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ padding: '12px 14px', background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>{label}</span>
                      <strong style={{ display: 'block', marginTop: 4, fontSize: '1.2rem', color }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ ORGANIZATIONS ══ */}
        {tab === 'orgs' && (
          <div className="overview-panel">
            <h3>🏢 All Organizations</h3>
            <div className="manager-task-list" style={{ marginTop: 16 }}>
              {recentOrgs.length === 0 && <p className="no-data">No customer organizations have registered yet.</p>}
              {recentOrgs.map(org => {
                const sm = STATUS_META[org.subscription?.status] || STATUS_META[org.status] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: org.status };
                const initials = (org.name || '?').slice(0, 2).toUpperCase();
                return (
                  <div key={org.id || org._id} className="manager-task-row od-org-row-item">
                    <div className="od-org-avatar-sm">{initials}</div>
                    <span className="mt-title">
                      {org.name}
                      <small style={{ display: 'block', fontSize: '0.73rem', color: '#475569', fontWeight: 400, marginTop: 2 }}>
                        {org.slug}{org.ownerEmail ? ` · ${org.ownerEmail}` : ''}
                      </small>
                    </span>
                    <span className="od-status-chip" style={{ color: sm.color, background: sm.bg, fontSize: '0.72rem', padding: '3px 9px', borderRadius: 999 }}>
                      {sm.label}
                    </span>
                    <span className="subscription-chip">{org.subscription?.plan || '—'}</span>
                    <span className="mt-project">{fmtDate(org.createdAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ PLANS ══ */}
        {tab === 'plans' && (
          <PlansTab
            plans={plans}
            planDrafts={planDrafts}
            updDraft={updDraft}
            savePlan={savePlan}
            savingPlan={savingPlan}
            pricingMsg={pricingMsg}
            pricingErr={pricingErr}
          />
        )}

        {/* ══ ANALYTICS ══ */}
        {tab === 'analytics' && (
          <div className="overview-panel">
            <h3>📈 Platform Analytics</h3>
            <div className="stats-row" style={{ flexWrap: 'wrap', marginTop: 16 }}>
              {[
                { label: 'Total Visits',      value: totals.totalVisits || 0,              sub: `${totals.uniqueVisitors || 0} unique visitors`,         color: '#6366f1' },
                { label: 'Visits Today',      value: totals.visitsToday || 0,              sub: 'since local midnight',                                  color: '#38bdf8' },
                { label: 'Visits This Month', value: totals.visitsThisMonth || 0,          sub: `${totals.uniqueVisitorsThisMonth || 0} unique this month`, color: '#10b981' },
                { label: 'Unique Visitors',   value: totals.uniqueVisitors || 0,           sub: 'all time',                                              color: '#f59e0b' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="stat-card" style={{ borderTop: `3px solid ${color}` }}>
                  <span className="stat-num" style={{ color }}>{value}</span>
                  <span className="stat-label">{label}</span>
                  <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2 }}>{sub}</span>
                </div>
              ))}
            </div>

            <div className="progress-block" style={{ marginTop: 20 }}>
              <div className="progress-labels">
                <span>Subscribed vs Trial</span>
                <span>{totals.subscribedOrganizations || 0} / {totals.organizations || 0}</span>
              </div>
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{
                  width: `${totals.organizations ? Math.round(((totals.subscribedOrganizations || 0) / totals.organizations) * 100) : 0}%`
                }} />
              </div>
              <div className="speed-ratio">
                Conversion rate:&nbsp;
                <strong>
                  {totals.organizations
                    ? `${Math.round(((totals.subscribedOrganizations || 0) / totals.organizations) * 100)}%`
                    : '—'}
                </strong>
                <span className="speed-sub">of orgs on a paid plan</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
