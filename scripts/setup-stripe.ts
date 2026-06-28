import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.trim();
  });
}

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) throw new Error('STRIPE_SECRET_KEY not set in .env.local');

const stripe = new Stripe(apiKey);

async function setupPricing() {
  console.log('🔧 Setting up Stripe pricing model...\n');

  try {
    // Create Starter product
    console.log('Creating Starter product...');
    const starterProduct = await stripe.products.create({
      name: 'Procur Starter',
      type: 'service',
      description: 'Procur Starter - 5 seats, rules-ranker copilot',
      metadata: { tier: 'starter' },
    });
    console.log(`✓ Starter product: ${starterProduct.id}`);

    // Create Starter price (annual: $96/seat/yr = $8/seat/mo)
    const starterPrice = await stripe.prices.create({
      product: starterProduct.id,
      unit_amount: 96000, // $960/yr = 10 seats at $96 each
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1,
      },
      billing_scheme: 'per_unit',
      metadata: { tier: 'starter' },
    });
    console.log(`✓ Starter price: ${starterPrice.id}\n`);

    // Create Team product
    console.log('Creating Team product...');
    const teamProduct = await stripe.products.create({
      name: 'Procur Team',
      type: 'service',
      description: 'Procur Team - 10 seats, LLM copilot, unlimited API calls',
      metadata: { tier: 'team' },
    });
    console.log(`✓ Team product: ${teamProduct.id}`);

    // Create Team price (annual: $84/seat/yr)
    const teamPrice = await stripe.prices.create({
      product: teamProduct.id,
      unit_amount: 84000, // $840/yr per seat
      currency: 'usd',
      recurring: {
        interval: 'year',
        interval_count: 1,
      },
      billing_scheme: 'per_unit',
      metadata: { tier: 'team' },
    });
    console.log(`✓ Team price: ${teamPrice.id}\n`);

    // Output config for code
    console.log('📋 Update src/lib/stripe.ts with these price IDs:\n');
    console.log(`  starter: {`);
    console.log(`    stripePriceId: '${starterPrice.id}',`);
    console.log(`  }`);
    console.log(`  team: {`);
    console.log(`    stripePriceId: '${teamPrice.id}',`);
    console.log(`  }\n`);

    console.log('✅ Stripe setup complete!');
    console.log('\nNext steps:');
    console.log('1. Update src/lib/stripe.ts with the price IDs above');
    console.log('2. Set STRIPE_WEBHOOK_SECRET in Stripe Dashboard → Webhooks');
    console.log('3. Test: npm run build && npm start\n');
  } catch (err) {
    console.error('❌ Setup failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

setupPricing();
