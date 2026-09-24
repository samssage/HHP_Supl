/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
let user = null, authError = null, rotate = false, signedOut = false;
const staff = { id: 'test', email_confirmed_at: '2026-01-01', app_metadata: { hhp_staff: true } };
const auth = {
  getUser: async () => ({ data: { user }, error: authError }),
  signInWithPassword: async () => ({ data: { user }, error: authError }),
  signOut: async () => { signedOut = true; return { error: null }; },
  updateUser: async () => ({ error: authError }),
};
function load(file) {
  const filename = path.resolve(__dirname, '../src', file + '.ts');
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  }).outputText;
  const mod = { exports: {} };
  const req = name => {
    if (name === 'server-only') return {};
    if (name === 'next/server') return { NextRequest, NextResponse };
    if (name === 'next/navigation') return { redirect: url => { throw new Error('REDIRECT:' + url); } };
    if (name === '@/lib/auth-server') return { authClient: async () => ({ auth }) };
    if (name === '@supabase/ssr') return { createServerClient: (_url, _key, options) => ({ auth: {
      getUser: async () => {
        if (rotate) options.cookies.setAll([{ name: 'test-session', value: 'refreshed', options: { httpOnly: true, path: '/' } }]);
        return auth.getUser();
      }
    } }) };
    if (name.startsWith('@/')) return load(name.slice(2));
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '../src'), path.resolve(path.dirname(filename), name)));
    return require(name);
  };
  vm.runInThisContext('(function(require,module,exports){' + output + '\n})')(req, mod, mod.exports);
  return mod.exports;
}
async function main() {
  process.env.NODE_ENV = 'production';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  const access = load('lib/access');
  assert.equal(access.isStaff({ ...staff, app_metadata: {}, user_metadata: { hhp_staff: true } }), false);
  assert.equal(access.isStaff({ ...staff, email_confirmed_at: null }), false);
  assert.equal(access.isStaff(staff), true);
  const { proxy } = load('proxy');
  const request = route => new NextRequest('https://inventory.example' + route);
  let response = await proxy(request('/items'));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://inventory.example/login');
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal((await proxy(request('/login'))).status, 200);
  assert.equal((await proxy(request('/auth/callback'))).status, 200);
  user = { ...staff, app_metadata: {} };
  response = await proxy(request('/items'));
  assert.match(response.headers.get('location'), /notice=approval/);
  rotate = true;
  user = staff;
  response = await proxy(request('/items'));
  assert.equal(response.status, 200);
  assert.equal(response.cookies.get('test-session').value, 'refreshed');
  user = null;
  response = await proxy(request('/items'));
  assert.equal(response.status, 307);
  assert.equal(response.cookies.get('test-session').value, 'refreshed', 'redirect must preserve refresh cookies');
  authError = new Error('Invalid token');
  user = staff;
  assert.equal((await proxy(request('/items'))).status, 307, 'invalid session cannot authorize');
  authError = null;
  const actions = load('app/login/actions');
  const form = new FormData(); form.set('email', 'staff@example.com'); form.set('password', 'long-test-password');
  user = null;
  assert.match(await actions.signIn('', form), /approval/);
  assert.equal(signedOut, true);
  user = staff;
  await assert.rejects(actions.signIn('', form), /REDIRECT:\/$/);
  await assert.rejects(actions.signOut(), /REDIRECT:\/login/);
  user = null;
  form.set('confirm', 'long-test-password');
  assert.match(await actions.setPassword('', form), /expired/);
  user = staff;
  await assert.rejects(actions.setPassword('', form), /REDIRECT:\/$/);
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_secret_do_not_expose';
  assert.equal(access.authConfig(), null);
  process.env.SUPABASE_PUBLISHABLE_KEY = 'a.' + Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url') + '.c';
  assert.equal(access.authConfig(), null, 'service role must never reach callback props');
  assert.equal((await proxy(request('/login'))).status, 200, 'login renders even when unconfigured');
  assert.equal((await proxy(request('/items'))).status, 307);
  console.log('PASS: staff approval, forged metadata, anonymous/invalid sessions, login/logout, password setup, refreshed cookies, fail-closed routes and secret key rejection.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
