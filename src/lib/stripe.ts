import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

// Pricing model: annual billing, per-seat tiers
export const PRICING_TIERS = {
  starter: {
    name: 'Starter',
    seatsIncluded: 5,
    pricePerSeatYear: 9600, // $96/seat/yr
    stripePriceId: 'price_1Tn7z5LSmhCxtQkv5PDzt7N9',
    features: ['Copilot (rules-ranker)', '50 API calls/month', 'Basic reports'],
  },
  team: {
    name: 'Team',
    seatsIncluded: 10,
    pricePerSeatYear: 8400, // $84/seat/yr
    stripePriceId: 'price_1Tn7z6LSmhCxtQkvTwS6CVlh',
    features: ['Copilot (LLM + rules-ranker)', 'Unlimited API calls', 'Advanced reports', 'Negotiation agent', 'Implementation planner'],
  },
  enterprise: {
    name: 'Enterprise',
    seatsIncluded: null, // Custom
    pricePerSeatYear: null,
    stripePriceId: null,
    features: ['Everything in Team', 'Custom integrations', 'Dedicated support', 'SLA'],
  },
};

export async function createCheckoutSession(orgId: string, tier: 'starter' | 'team', seats: number, email: string) {
  const tierInfo = PRICING_TIERS[tier];
  if (!tierInfo.stripePriceId) throw new Error('Invalid tier');

  const yearlyAmount = seats * tierInfo.pricePerSeatYear; // in cents
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: email,
    line_items: [
      {
        price: tierInfo.stripePriceId,
        quantity: seats,
      },
    ],
    subscription_data: {
      metadata: { orgId, tier, seats: String(seats) },
      billing_cycle_anchor: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year from now
    },
    success_url: `https://procur.tech/settings?payment=success&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `https://procur.tech/settings?payment=cancelled`,
    metadata: { orgId },
  });

  return session;
}

export async function handleWebhookEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.metadata?.orgId;
      if (!orgId) return;
      console.log(`[Stripe] Checkout completed for org ${orgId}`);
      // TODO: update org.plan in DB with subscription_id
      break;
    }
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = (subscription.metadata as any)?.orgId;
      if (!orgId) return;
      console.log(`[Stripe] Subscription updated for org ${orgId}`, subscription.id);
      // TODO: update org.plan with new seats/tier
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      // Metadata is on the subscription, not the invoice; for now just log
      console.log(`[Stripe] Invoice paid`, invoice.id);
      // TODO: create Invoice row in DB with PDF URL
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[Stripe] Invoice failed`, invoice.id);
      // TODO: send alert email, mark as failed
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const orgId = (subscription.metadata as any)?.orgId;
      if (!orgId) return;
      console.log(`[Stripe] Subscription cancelled for org ${orgId}`);
      // TODO: downgrade to free tier or lock the org
      break;
    }
  }
}
