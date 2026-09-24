/* eslint-disable @typescript-eslint/no-require-imports */
const { PGlite } = require("@electric-sql/pglite");
const ts = require("typescript");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
let db;
let authUser = { id: "staff-id", email: "staff@example.com", email_confirmed_at: "2026-01-01", app_metadata: { hhp_staff: true } };

// Execute the actual TS modules, stubbing only Next's request context and HTTP transport.
function modules() {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} }; cache.set(file, loadedModule);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    const req = name => {
      if (name === "server-only") return {};
      if (name === "next/server") return { connection: async () => {} };
      if (name === "./auth-server") return { authClient: async () => ({ auth: { getUser: async () => ({ data: { user: authUser }, error: null }) } }) };
      if (name.startsWith("@/data/")) return require(path.join(root, "src/data", name.slice(7)));
      if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name + ".ts"));
      return require(name);
    };
    vm.runInThisContext("(function(require,module,exports){" + source + "\n})", { filename: file })(req, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  return file => load(path.join(root, "src/lib", file + ".ts"));
}
async function main() {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(fs.readFileSync(path.join(root, "supabase/migrations/202609240001_hhp_storage.sql"), "utf8"));
  await assert.rejects(db.query("select public.hhp_read_store()"), /Initialize HHP/);
  const sourceStore = {
    items: [{ id: "TEST-001", name: "Test balls", originalName: null, description: null,
      make: null, model: null, itemNo: null, color: null, qty: 50, qtyNote: null,
      unit: "Each", location: "TEST-ROOM", alsoLocation: null, delivered: null,
      condition: "Good", notes: null, tags: [], category: "Other", controlled: false,
      isReference: false }],
    courses: [], locations: [{code: "TEST-ROOM", name: "Test room", description: null, auditable: true}], disposals: [], audits: [], kitEdits: [], tolerancePct: 5,
    checkouts: [], stagings: [], requests: [], extraLocations: []
  };
  await db.query("select public.hhp_initialize_store($1::jsonb)", [JSON.stringify(sourceStore)]);
  await assert.rejects(db.query("select public.hhp_initialize_store($1::jsonb)", [JSON.stringify(sourceStore)]), /already initialized/);

  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";

  global.fetch = async (url, opts) => {
    assert.equal(opts.headers.apikey, "sb_secret_test");
    assert.equal(opts.headers.Authorization, undefined);
    assert.equal(opts.cache, "no-store");
    const args = JSON.parse(opts.body);
    const query = url.endsWith("/hhp_read_store")
      ? ["select public.hhp_read_store() as value", []]
      : ["select public.hhp_commit_store($1,$2::jsonb,$3) as value", [args.expected_revision, JSON.stringify(args.changes), args.tolerance]];
    const result = await db.query(...query);
    return { ok: true, json: async () => result.rows[0].value };
  };
  const load = modules();
  const app = load("db");
  const transport = load("supabase-store");
  assert.equal((await app.getItems()).length, sourceStore.items.length);
  const room = (await app.getLocations()).find(l => l.auditable).code;
  await app.addLocation({ code: "QA-STAGE", name: "Test staging", description: null, auditable: true, staging: true });
  const template = sourceStore.items.find(i => i.qty > 10);
  const item = await app.addItem({ ...template, name: "Integration test item", location: room, qty: 20, isReference: false, condition: "Good" });
  const checkout = (qty, requestId = null) => ({
    person: "Test staff", courseCode: null, purpose: null, dueAt: null, handledBy: "Tester",
    requestId, notes: null, lines: [{ itemId: item.id, itemName: item.name, qty, returnedQty: null }]
  });
  const request = await app.createRequest({ person: "Tester", email: null, courseCode: null, neededAt: new Date().toISOString(), deliverTo: null, lines: [{ itemId: item.id, name: item.name, qty: 4 }], notes: null });
  const out = await app.createCheckout(checkout(4, request.id));
  assert.equal((await app.getRequest(request.id)).status, "fulfilled");
  const staged = await app.createStaging({ title: "Term kit", courseCode: null, term: "Fall", schedule: null, location: "QA-STAGE", person: "Tester", endsOn: null, notes: null, lines: checkout(5).lines });
  await assert.rejects(app.createCheckout(checkout(12)), /Not enough/);
  await app.saveAudit({ location: room, performedBy: "Tester", notes: null, lines: [{ itemId: item.id, name: item.name, counted: 11, condition: null, note: null }] });
  assert.equal((await app.getItem(item.id)).qty, 20, "away equipment is not missing from home count");
  await app.returnCheckout(out.id, { [item.id]: 3 });
  assert.equal((await app.getItem(item.id)).qty, 19);
  await app.returnCheckout(out.id, { [item.id]: 0 });
  assert.equal((await app.getItem(item.id)).qty, 19, "return is idempotent");
  await app.saveAudit({ location: "QA-STAGE", performedBy: "Tester", notes: null, lines: [{ itemId: item.id, stagingId: staged.id, name: item.name, counted: 4, condition: null, note: null }] });
  assert.equal((await app.getItem(item.id)).qty, 18);
  await app.returnStaging(staged.id, "Tester", { [item.id]: 4 });
  assert.equal((await app.getItem(item.id)).qty, 18, "staged loss is not subtracted twice");
  await app.linkBarcode(item.id, "test-barcode");
  assert.equal((await app.findByCode("test-barcode")).id, item.id);
  await app.setKitEdit("PE 151", item.id, "add");
  assert.equal((await app.getKitEdits("PE 151")).length, 1);
  await app.setKitEdit("PE 151", item.id, null);
  assert.equal((await app.getKitEdits("PE 151")).length, 0);
  await assert.rejects(app.saveAudit({ location: room, performedBy: "Tester", notes: null, lines: [{ itemId: item.id, name: item.name, counted: -1, condition: null, note: null }] }), /whole number/);
  await assert.rejects(app.createCheckout(checkout(1.5)), /whole number/);

  // Two server instances compete for the same equipment.
  await app.updateItem(item.id, { qty: 5 });
  const otherServer = modules()("db");
  const results = await Promise.allSettled([app.createCheckout(checkout(4)), otherServer.createCheckout(checkout(4))]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.filter(r => r.status === "rejected").length, 1);
  const stale = await transport.readSupabase();
  await app.setTolerancePct(7);
  assert.equal(await transport.commitSupabase(stale, stale.store), false, "stale writes cannot overwrite changes");
  const before = await transport.readSupabase();
  await assert.rejects(db.query("select public.hhp_commit_store($1,$2::jsonb,5)", [before.revision, JSON.stringify([
    { bucket: "items", id: item.id, value: { ...await app.getItem(item.id), qty: 9 } },
    { bucket: "not-a-table", id: "x", value: {} }
  ])]), /Unknown inventory collection/);
  assert.deepEqual(await transport.readSupabase(), before, "failed transaction must roll back every record");

  authUser = null;
  await assert.rejects(app.getItems(), /Sign-in/);
  await assert.rejects(app.setTolerancePct(5), /Sign-in/);
  authUser = { id: "faculty-one", email: "faculty1@example.com", email_confirmed_at: "2026-01-01", app_metadata: {}, user_metadata: { hhp_staff: true } };
  assert.ok((await app.getItems()).length > 0, "confirmed faculty can browse");
  await assert.rejects(app.setTolerancePct(5), /Staff approval/);
  await assert.rejects(app.updateItem(item.id, { qty: 99 }), /Staff approval/);
  await assert.rejects(app.getCheckouts(), /Staff approval/);
  await assert.rejects(app.getStagings(), /Staff approval/);
  for (const count of (await app.getAvailability()).values()) { assert.deepEqual(count.checkouts, []); assert.deepEqual(count.stagings, []); }
  assert.deepEqual(await app.getAudits(), []);
  const own = await app.createRequest({ person: "Faculty", email: "spoof@example.com", userId: "spoof", courseCode: null, neededAt: new Date().toISOString(), deliverTo: null, lines: [{ itemId: item.id, name: item.name, qty: 1 }], notes: null });
  assert.equal(own.userId, "faculty-one");
  assert.equal(own.email, "faculty1@example.com");
  assert.equal((await app.getRequests()).length, 1);
  assert.equal((await app.getRequest(own.id)).id, own.id);
  authUser = { ...authUser, id: "faculty-two", email: "faculty2@example.com" };
  assert.deepEqual(await app.getRequests(), []);
  assert.equal(await app.getRequest(own.id), undefined);
  await assert.rejects(app.setRequestStatus(own.id, "ready", null), /Staff approval/);
  authUser = { id: "test", email: "test@example.com", app_metadata: { hhp_staff: true } };
  await assert.rejects(app.getItems(), /Sign-in/);
  authUser = { id: "sam", email: "sams.frede@gmail.com", email_confirmed_at: "2026-01-01", app_metadata: {} };
  await app.setTolerancePct(5);
  assert.ok((await app.getRequests()).length >= 2, "Sam can manage all requests");
  authUser = { id: "staff-id", email: "staff@example.com", email_confirmed_at: "2026-01-01", app_metadata: { hhp_staff: true } };
  const actualFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(app.getItems(), /No local fallback/);
  global.fetch = actualFetch;
  delete process.env.SUPABASE_SECRET_KEY;
  assert.throws(() => transport.usesSupabase(), /Set both/);
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";

  for (const role of ["anon", "authenticated"]) {
    await db.exec("set role " + role);
    await assert.rejects(db.query("select public.hhp_read_store()"), /permission denied/);
    await assert.rejects(db.query("select * from public.hhp_items"), /permission denied/);
    await db.exec("reset role");
  }
  await db.exec("set role service_role");
  await db.query("select public.hhp_read_store()");
  await assert.rejects(db.query("select * from public.hhp_items"), /permission denied/);
  await assert.rejects(db.query("select public.hhp_initialize_store('{}')"), /permission denied/);
  await db.exec("reset role");
  console.log("PASS: migration, import guard, inventory, requests, sign-outs, staging, counts, barcodes, kit edits, concurrent writes, rollback, authorization, database permissions, and configuration failures.");
}
main().then(() => db.close()).catch(async error => { console.error(error); if (db) await db.close(); process.exitCode = 1; });
