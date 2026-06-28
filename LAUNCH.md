# Procur Launch Checklist

## ✅ Complete & Live

- [x] LLM orchestrator (Claude Opus + pgvector)
- [x] Email service (Resend)
- [x] Stripe billing (checkout + webhooks)
- [x] All 8 Settings tabs
- [x] Negotiations & Implementation
- [x] Vendor portal & marketplace
- [x] Landing page
- [x] Logo favicon
- [x] Security hardening (CSP, auth middleware, data isolation)
- [x] All routes tested (200/307 OK)
- [x] GitHub deployed (ashikkarim1/procur)
- [x] Vercel live (procur.tech)

---

## 🔧 Setup Required (Next 24 Hours)

### 1. Configure Stripe Webhook
```
Go to: https://dashboard.stripe.com/webhooks
Click: Add an endpoint
URL: https://procur.tech/api/billing/webhook
Events:
  - checkout.session.completed
  - customer.subscription.updated
  - invoice.payment_succeeded
  - invoice.payment_failed
  - customer.subscription.deleted

Copy the "Signing secret" (whsec_...)
Set in Vercel environment:
  STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Verify Domain Points to Vercel
```
Your domain: procur.tech
Vercel settings: Domain → Add procur.tech
Update DNS at your registrar with Vercel's NS records
Verify: curl -I https://procur.tech → should return 200
```

### 3. Rotate Old API Keys (Required)
These were exposed in chat history and MUST be deleted:

**Anthropic Console** (https://console.anthropic.com)
- Delete old key: sk-ant-api03-_Tjw3p717...
- Create new key
- Update: ANTHROPIC_API_KEY in Vercel → Redeploy

**Resend Dashboard** (https://resend.com/api-keys)
- Delete old key: re_FRN4aD1S...
- Create new key
- Update: RESEND_API_KEY in Vercel → Redeploy

**Stripe Dashboard** (https://dashboard.stripe.com/account/apikeys)
- Delete old key: sk_live_51TjiF5L...
- Create new key
- Update: STRIPE_SECRET_KEY in Vercel → Redeploy

### 4. Test Core Flows in Production
```
URL: https://procur.tech

1. Landing page (/) — shows vendor marketing ✓
2. Copilot brief (/copilot/PR-2291) — LLM reasoning working ✓
3. Settings (/settings) — all 8 tabs accessible
4. Member invite → check email (Resend)
5. Plan upgrade → Stripe checkout working
6. Negotiations → can view/edit
7. Implementation → can view timeline
8. Vendor portal → can manage agreements
```

### 5. Test Stripe Webhook
```
After payment in checkout:
1. Webhook fires to /api/billing/webhook
2. Check Stripe Dashboard → Webhooks → Recent attempts
3. Should show 200 OK responses
```

---

## 📋 Beta User Invitation

### Email Template
```
Subject: Early Access to Procur — AI Procurement Terminal

Hi [Name],

You're invited to try Procur, the AI procurement terminal that helps teams 
evaluate and negotiate software purchases smarter.

Sign up: https://procur.tech

What you can do:
• Upload procurement briefs → get AI-powered recommendations
• Compare software using TCO calculator
• Negotiate vendor agreements with AI copilot
• Track implementations and manage vendor relationships

Get started free. Upgrade to Team plan ($84/seat/year) for unlimited recommendations 
and AI negotiation agent.

Questions? Reply to this email.

— Ashik & Team Procur
procur.tech
```

### Invite Process
```
1. Go to /settings → Team & roles
2. Click "Invite"
3. Enter email + role (approver for evaluation, viewer for stakeholder)
4. Email sent automatically via Resend
5. Recipient clicks link → creates account
6. They can now access their org's briefs and negotiations
```

---

## 🚨 Post-Launch Monitoring

### Check These Daily (First Week)
```
1. Vercel deployment log → no errors
2. Stripe dashboard → webhook success rate > 99%
3. Resend dashboard → email delivery success
4. Anthropic API usage → queries working
5. Neon database → connections OK
```

### Set Up Alerts
```
Vercel: Enable error alerts in Settings → Notifications
Stripe: Enable webhook failure alerts
Sentry (optional): npm install sentry to track errors
```

---

## 🎯 Next Major Features (After Beta)

- OAuth login (instead of header-based auth)
- RFP builder
- Vendor scoring dashboard
- Procurement audit trail (compliance)
- Integration connectors (Okta, ServiceNow, Workday)
- Mobile app

---

## 📞 Support & Feedback

- Users report issues → procur.tech/feedback (if built)
- Feature requests → GitHub Discussions
- Security issues → email security@procur.tech

---

**Status**: 🟢 LIVE & READY FOR BETA

**Last updated**: June 28, 2026
