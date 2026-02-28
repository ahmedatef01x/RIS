#!/usr/bin/env node

/**
 * Final Verification Script
 * Checks that all fixes have been properly applied
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 Checking if all fixes are in place...\n');

const checks = [];

// Check 1: HomeRedirect.tsx has timeout
console.log('1️⃣  Checking HomeRedirect.tsx...');
try {
  const homeRedirect = fs.readFileSync(
    path.join(__dirname, 'src/components/HomeRedirect.tsx'),
    'utf-8'
  );
  
  if (homeRedirect.includes('10000') && homeRedirect.includes('setTimeout')) {
    checks.push({ name: 'HomeRedirect timeout', status: '✅' });
    console.log('   ✅ Timeout mechanism found');
  } else {
    checks.push({ name: 'HomeRedirect timeout', status: '❌' });
    console.log('   ❌ Timeout mechanism NOT found');
  }
  
  if (homeRedirect.includes('isDelayed')) {
    checks.push({ name: 'HomeRedirect warning state', status: '✅' });
    console.log('   ✅ Warning state found');
  } else {
    checks.push({ name: 'HomeRedirect warning state', status: '❌' });
    console.log('   ❌ Warning state NOT found');
  }
  
  if (homeRedirect.includes('Loader2')) {
    checks.push({ name: 'HomeRedirect Loader2 icon', status: '✅' });
    console.log('   ✅ Loader2 icon import found');
  } else {
    checks.push({ name: 'HomeRedirect Loader2 icon', status: '❌' });
    console.log('   ❌ Loader2 icon NOT found');
  }
} catch (err) {
  console.log('   ❌ Error reading file:', err.message);
  checks.push({ name: 'HomeRedirect file', status: '❌' });
}

// Check 2: users.js has enhanced preferences endpoint
console.log('\n2️⃣  Checking users.js...');
try {
  const usersRoute = fs.readFileSync(
    path.join(__dirname, 'local-backend/src/routes/users.js'),
    'utf-8'
  );
  
  if (usersRoute.includes('Initialize default preferences') || 
      usersRoute.includes('default_homepage')) {
    checks.push({ name: 'Enhanced preferences endpoint', status: '✅' });
    console.log('   ✅ Enhanced preferences endpoint found');
  } else {
    checks.push({ name: 'Enhanced preferences endpoint', status: '❌' });
    console.log('   ❌ Enhanced preferences endpoint NOT found');
  }
} catch (err) {
  console.log('   ❌ Error reading file:', err.message);
  checks.push({ name: 'users.js file', status: '❌' });
}

// Check 3: Helper scripts exist
console.log('\n3️⃣  Checking helper scripts...');
const scripts = [
  'local-backend/init-permissions.js',
  'local-backend/check-user.js',
  'local-backend/check-role.js'
];

scripts.forEach(script => {
  try {
    fs.accessSync(path.join(__dirname, script));
    checks.push({ name: `Script: ${path.basename(script)}`, status: '✅' });
    console.log(`   ✅ ${path.basename(script)} found`);
  } catch {
    checks.push({ name: `Script: ${path.basename(script)}`, status: '❌' });
    console.log(`   ❌ ${path.basename(script)} NOT found`);
  }
});

// Check 4: Documentation files exist
console.log('\n4️⃣  Checking documentation...');
const docs = [
  'LOADING_FIX_SUMMARY.md',
  'TESTING_GUIDE.md',
  'FIX_CHECKLIST.md',
  'QUICK_START.md'
];

docs.forEach(doc => {
  try {
    fs.accessSync(path.join(__dirname, doc));
    checks.push({ name: `Doc: ${doc}`, status: '✅' });
    console.log(`   ✅ ${doc} found`);
  } catch {
    checks.push({ name: `Doc: ${doc}`, status: '❌' });
    console.log(`   ❌ ${doc} NOT found`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 SUMMARY');
console.log('='.repeat(50));

const passed = checks.filter(c => c.status === '✅').length;
const failed = checks.filter(c => c.status === '❌').length;

console.log(`\n✅ Passed: ${passed}/${checks.length}`);
console.log(`❌ Failed: ${failed}/${checks.length}`);

if (failed === 0) {
  console.log('\n🎉 All checks passed! System is ready to test.');
  console.log('\n📝 Next steps:');
  console.log('   1. Start backend: cd local-backend && npm start');
  console.log('   2. Start frontend: npm run dev');
  console.log('   3. Go to http://localhost:5174');
  console.log('   4. Login with admin@ris.com / 12345678');
  console.log('   5. Should redirect to dashboard in <1 second');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the fixes.');
  console.log('\n🔧 Failed items:');
  checks.filter(c => c.status === '❌').forEach(c => {
    console.log(`   - ${c.name}`);
  });
  process.exit(1);
}
