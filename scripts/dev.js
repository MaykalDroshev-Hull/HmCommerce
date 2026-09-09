const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');

function getStripeCliInfo() {
  try {
    // Check if stripe is installed
    execSync('stripe --version', { stdio: 'ignore' });

    let pubKey = null;
    let secKey = null;
    let webhookSecret = null;

    try {
      const configOut = execSync('stripe config --list', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pubMatch = configOut.match(/test_mode_pub_key\s*=\s*'([^']+)'/);
      const secMatch = configOut.match(/test_mode_api_key\s*=\s*'([^']+)'/);
      if (pubMatch) pubKey = pubMatch[1];
      if (secMatch) secKey = secMatch[1];
    } catch {}

    try {
      const secretOut = execSync('stripe listen --print-secret', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const trimmed = secretOut.trim();
      if (trimmed.startsWith('whsec_')) {
        webhookSecret = trimmed;
      }
    } catch {}

    return { available: true, pubKey, secKey, webhookSecret };
  } catch {
    return { available: false };
  }
}

function syncEnvLocal(keys) {
  if (!fs.existsSync(envPath)) return;
  let content = fs.readFileSync(envPath, 'utf8');
  let changed = false;

  const pairs = {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: keys.pubKey,
    STRIPE_SECRET_KEY: keys.secKey,
    STRIPE_WEBHOOK_SECRET: keys.webhookSecret,
  };

  for (const [key, val] of Object.entries(pairs)) {
    if (!val) continue;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      const currentVal = content.match(regex)[0].split('=')[1];
      // Only replace if it's currently a live key or different test key
      if (currentVal !== val && (currentVal.startsWith('pk_live') || currentVal.startsWith('sk_live') || currentVal.startsWith('whsec_rh6') || currentVal.startsWith('whsec_8d') || currentVal.startsWith('whsec_'))) {
        content = content.replace(regex, `${key}=${val}`);
        changed = true;
      }
    } else {
      content += `\n${key}=${val}`;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('\x1b[32m[stripe-dev]\x1b[0m Automatically synced local test keys & webhook secret to .env.local');
  }
}

async function main() {
  const stripeInfo = getStripeCliInfo();
  let stripeProcess = null;

  if (stripeInfo.available && stripeInfo.pubKey && stripeInfo.secKey) {
    syncEnvLocal(stripeInfo);

    console.log('\x1b[35m[stripe-dev]\x1b[0m Starting Stripe webhook listener for localhost:3000/api/webhooks/stripe...');
    stripeProcess = spawn('stripe', ['listen', '--forward-to', 'localhost:3000/api/webhooks/stripe'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    stripeProcess.stdout.on('data', (data) => {
      const text = data.toString().trim();
      if (text && !text.includes('Your webhook signing secret is')) {
        console.log(`\x1b[35m[stripe]\x1b[0m ${text}`);
      }
    });

    stripeProcess.stderr.on('data', (data) => {
      const text = data.toString().trim();
      if (text) {
        console.error(`\x1b[31m[stripe error]\x1b[0m ${text}`);
      }
    });
  } else {
    console.log('\x1b[33m[stripe-dev]\x1b[0m Stripe CLI not logged in or not found. Skipping auto-webhook forwarding.');
  }

  // Start Next.js dev server
  const nextProcess = spawn('next', ['dev'], {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  const cleanup = () => {
    if (stripeProcess && !stripeProcess.killed) {
      try {
        stripeProcess.kill();
      } catch {}
    }
    process.exit();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  nextProcess.on('exit', cleanup);
}

if (require.main === module) {
  main();
}

module.exports = { getStripeCliInfo, syncEnvLocal };
