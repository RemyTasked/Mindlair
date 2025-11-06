#!/usr/bin/env node

/**
 * Generate VAPID keys for Web Push Notifications
 * 
 * Run this script to generate new VAPID keys for your PWA push notifications.
 * Add the generated keys to your .env file and Railway environment variables.
 */

const webpush = require('web-push');

console.log('🔐 Generating VAPID keys for Web Push Notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('📋 Add these to your .env file and Railway environment variables:\n');
console.log('─────────────────────────────────────────────────────────────');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:support@meetcuteai.com`);
console.log('─────────────────────────────────────────────────────────────\n');

console.log('📝 Instructions:');
console.log('1. Copy the three lines above');
console.log('2. Add them to your local .env file');
console.log('3. Add them to Railway environment variables:');
console.log('   - Go to Railway dashboard → your project → Variables');
console.log('   - Add each variable (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)');
console.log('4. Redeploy your app\n');

console.log('⚠️  IMPORTANT:');
console.log('- Keep the private key secret!');
console.log('- Do NOT commit these keys to git');
console.log('- The .env file is already in .gitignore\n');

console.log('🎬 Once configured, users will be able to:');
console.log('- Receive meeting reminders even when app is closed');
console.log('- Get Presley Flow notifications');
console.log('- Receive wellness reminders');
console.log('- Get notified about new insights\n');

