import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(scriptDir);
const workspaceDir = path.dirname(projectDir);
const plansDir = path.join(workspaceDir, "test-plans");
const postmanDir = path.join(projectDir, "postman");

const collectionDir = path.join(postmanDir, "collections");
const environmentDir = path.join(postmanDir, "environments");
const dataDir = path.join(postmanDir, "data");
const reportDir = path.join(projectDir, "reports", "newman");

for (const dir of [collectionDir, environmentDir, dataDir, reportDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

function stableUuid(value) {
  const hex = crypto.createHash("md5").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parsePlan(fileName) {
  const text = fs.readFileSync(path.join(plansDir, fileName), "utf8");
  const cases = new Map();

  for (const line of text.split(/\r?\n/)) {
    if (!/^\| FR(?:04|09|17)-TC-\d{3} \|/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [id, technique, input, expected] = cells;
    cases.set(id, { id, technique, input, expected });
  }

  return cases;
}

const planCases = {
  FR04: parsePlan("FR04.md"),
  FR09: parsePlan("FR09.md"),
  FR17: parsePlan("FR17.md"),
};

function planCase(fr, number) {
  const id = `${fr}-TC-${String(number).padStart(3, "0")}`;
  const value = planCases[fr].get(id);
  if (!value) throw new Error(`Missing plan case ${id}`);
  return value;
}

function baseRow(fr, number, overrides = {}) {
  return {
    ...planCase(fr, number),
    automationStatus: "ready",
    authMode: "user",
    expectedStatusClass: null,
    notes: "",
    ...overrides,
  };
}

const profileBody = {
  name: "Nguyen Van A",
  phone: "0912345678",
  shipping_address: "123 Le Loi, Q1, TP.HCM",
};

const couponBody = {
  code: "SAVE10",
  total_amount: 500000,
  user_id: "__USER_ID__",
};

const adminCouponBody = {
  code: "__CASE_CODE__",
  type: "percent",
  discount_value: 15,
  min_order_amount: 200000,
  expired_at: "2099-12-31",
  max_uses_per_user: 1,
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const mutate = (body, key, value) => ({ ...clone(body), [key]: value });
const omit = (body, key) => {
  const next = clone(body);
  delete next[key];
  return next;
};

function fr04GetRows() {
  const authById = {
    1: ["user", 2],
    2: ["admin", 2],
    3: ["missing", 4],
    4: ["empty", 4],
    5: ["malformed", 4],
    6: ["forged-user", 4],
    7: ["basic-user", 4],
    8: ["user", 2],
    9: ["user", 2],
    10: ["user", 2],
  };

  return Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    const [authMode, expectedStatusClass] = authById[number];
    return baseRow("FR04", number, {
      authMode,
      expectedStatusClass,
      expectedIdentity: number === 2 ? "admin" : expectedStatusClass === 2 ? "user" : null,
      assertNoPassword: number === 9,
      assertNoResetToken: number === 10,
    });
  });
}

function fr04PutRows() {
  const rows = [];
  const add = (number, body, expectedStatusClass, overrides = {}) => {
    rows.push(
      baseRow("FR04", number, {
        body,
        expectedStatusClass,
        verifyProfile: true,
        expectChanged: expectedStatusClass === 2,
        ...overrides,
      }),
    );
  };

  add(11, clone(profileBody), 2);
  add(12, mutate(profileBody, "name", "Nguyễn Văn Ánh"), 2);
  add(13, mutate(profileBody, "name", "O'Connor-An"), 2);
  add(14, mutate(profileBody, "name", null), 4);
  add(15, mutate(profileBody, "name", 12345), 4);
  add(16, mutate(profileBody, "name", { first: "A" }), 4);
  add(17, mutate(profileBody, "name", ["A"]), 4);

  const phoneCases = {
    18: ["0123456789", 2],
    19: ["01234567890", 2],
    20: ["012345678", 4],
    21: ["012345678901", 4],
    22: ["1123456789", 4],
    23: ["09ABC45678", 4],
    24: ["0912-345-678", 4],
    25: ["0912 345 678", 4],
    26: ["+84912345678", 4],
    27: ["０１２３４５６７８９", 4],
    28: ["", 4],
    29: [null, 4],
    30: [912345678, 4],
    31: [true, 4],
    32: [{}, 4],
    33: [[], 4],
  };
  for (const [numberText, [value, expectedClass]] of Object.entries(phoneCases)) {
    add(Number(numberText), mutate(profileBody, "phone", value), expectedClass);
  }

  add(34, mutate(profileBody, "shipping_address", "123 Le Loi, Quan 1, TP.HCM"), 2);
  add(35, mutate(profileBody, "shipping_address", "Tang 2\n123 Le Loi"), 2);
  add(36, mutate(profileBody, "shipping_address", null), 4);
  add(37, mutate(profileBody, "shipping_address", 123), 4);
  add(38, mutate(profileBody, "shipping_address", false), 4);
  add(39, mutate(profileBody, "shipping_address", {}), 4);
  add(40, mutate(profileBody, "shipping_address", []), 4);

  add(41, { ...clone(profileBody), role: "admin" }, null, {
    allowedStatusClasses: [2, 4],
    expectRoleUnchanged: true,
  });
  add(42, { ...clone(profileBody), email: "attacker@example.com" }, null, {
    allowedStatusClasses: [2, 4],
    expectEmailUnchanged: true,
  });
  add(43, { ...clone(profileBody), id: "__ADMIN_ID__" }, null, {
    allowedStatusClasses: [2, 4],
    expectAdminUnchanged: true,
  });
  add(44, { ...clone(profileBody), user_id: "__ADMIN_ID__" }, null, {
    allowedStatusClasses: [2, 4],
    expectAdminUnchanged: true,
  });
  add(45, { ...clone(profileBody), password: "NewPassword123!" }, null, {
    allowedStatusClasses: [2, 4],
    verifySeedPassword: true,
  });
  add(46, mutate(profileBody, "name", "x', role='admin' --"), null, {
    allowedStatusClasses: [2, 4],
    expectRoleUnchanged: true,
  });
  add(47, mutate(profileBody, "name", "<script>alert(1)</script>"), null, {
    allowedStatusClasses: [2, 4],
    assertJsonResponse: true,
  });
  add(48, clone(profileBody), 4, { authMode: "missing" });
  add(49, {}, 4);
  rows.push(
    baseRow("FR04", 50, {
      rawBody: '{"name":"Broken JSON"',
      expectedStatusClass: 4,
      verifyProfile: true,
      expectChanged: false,
    }),
  );

  return rows;
}

function fr09Rows() {
  const rows = [];
  const add = (number, body, expectedStatusClass, overrides = {}) => {
    rows.push(
      baseRow("FR09", number, {
        body,
        expectedStatusClass,
        ...overrides,
      }),
    );
  };

  add(1, clone(couponBody), 2, { expectedDiscount: 50000, expectedFinal: 450000 });
  add(2, { code: "BIGBUY", total_amount: 600000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 50000,
    expectedFinal: 550000,
  });
  add(3, { code: "VIP100", total_amount: 500000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 100000,
    expectedFinal: 400000,
  });

  const authCases = {
    4: "missing",
    5: "empty",
    6: "malformed",
    7: "forged-user",
    8: "basic-user",
  };
  for (const [numberText, authMode] of Object.entries(authCases)) {
    add(Number(numberText), clone(couponBody), 4, { authMode });
  }
  add(9, { code: "SAVE10", total_amount: 500000, user_id: "__ADMIN_ID__" }, 2, {
    authMode: "admin",
    expectedDiscount: 50000,
    expectedFinal: 450000,
  });

  add(10, omit(couponBody, "code"), 4);
  add(11, mutate(couponBody, "code", null), 4);
  add(12, mutate(couponBody, "code", ""), 4);
  add(13, mutate(couponBody, "code", "   "), 4);
  add(14, mutate(couponBody, "code", "NO_SUCH_CODE"), 4);
  add(15, mutate(couponBody, "code", "INACTIVE10"), 4, {
    automationStatus: "fixture-required",
    notes: "Seed INACTIVE10 with is_active=0 before running this iteration.",
  });
  add(16, { code: "EXPIRED", total_amount: 200000, user_id: "__USER_ID__" }, 4);
  add(17, mutate(couponBody, "code", 123), 4);
  add(18, mutate(couponBody, "code", {}), 4);
  add(19, mutate(couponBody, "code", []), 4);
  add(20, mutate(couponBody, "code", "' OR 1=1 --"), null, {
    allowedStatusClasses: [4],
    assertNoDiscount: true,
  });
  add(21, mutate(couponBody, "code", "<script>alert(1)</script>"), null, {
    allowedStatusClasses: [4],
    assertJsonResponse: true,
    assertNoDiscount: true,
  });

  const amountCases = {
    22: ["SAVE10", 299999, 4],
    23: ["SAVE10", 300000, 2, 30000, 270000],
    24: ["SAVE10", 300001, 2, 30000.1, 270000.9],
    25: ["BIGBUY", 499999, 4],
    26: ["BIGBUY", 500000, 2, 50000, 450000],
    27: ["BIGBUY", 500001, 2, 50000, 450001],
    28: ["VIP100", 299999, 4],
    29: ["VIP100", 300000, 2, 100000, 200000],
    30: ["VIP100", 300001, 2, 100000, 200001],
  };
  for (const [numberText, [code, amount, expectedClass, discount, finalAmount]] of Object.entries(amountCases)) {
    add(Number(numberText), { code, total_amount: amount, user_id: "__USER_ID__" }, expectedClass, {
      expectedDiscount: discount,
      expectedFinal: finalAmount,
    });
  }

  add(31, mutate(couponBody, "total_amount", 0), 4);
  add(32, mutate(couponBody, "total_amount", -1), 4);
  add(33, mutate(couponBody, "total_amount", null), 4);
  add(34, omit(couponBody, "total_amount"), 4);
  add(35, mutate(couponBody, "total_amount", "500000"), 4);
  add(36, mutate(couponBody, "total_amount", true), 4);
  add(37, mutate(couponBody, "total_amount", {}), 4);
  add(38, mutate(couponBody, "total_amount", []), 4);
  add(39, clone(couponBody), 2, { expectedDiscount: 50000, expectedFinal: 450000 });
  add(40, omit(couponBody, "user_id"), 4);
  add(41, mutate(couponBody, "user_id", null), 4);
  add(42, mutate(couponBody, "user_id", "__ADMIN_ID__"), 4);
  add(43, mutate(couponBody, "user_id", 999999), 4);
  add(44, mutate(couponBody, "user_id", 0), 4);
  add(45, mutate(couponBody, "user_id", -1), 4);
  add(46, mutate(couponBody, "user_id", "2"), 4);
  add(47, mutate(couponBody, "user_id", {}), 4);
  add(48, mutate(couponBody, "user_id", []), 4);
  add(49, mutate(couponBody, "user_id", "1 OR 1=1"), 4);

  add(50, { code: "VIP100", total_amount: 500000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 100000,
    expectedFinal: 400000,
    usageFixtureCount: 0,
    automationStatus: "fixture-required",
  });
  add(51, { code: "VIP100", total_amount: 500000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 100000,
    expectedFinal: 400000,
    usageFixtureCount: 1,
    automationStatus: "fixture-required",
  });
  add(52, { code: "VIP100", total_amount: 500000, user_id: "__USER_ID__" }, 4, {
    usageFixtureCount: 2,
    automationStatus: "fixture-required",
  });
  add(53, { code: "VIP100", total_amount: 500000, user_id: "__ADMIN_ID__" }, 2, {
    authMode: "admin",
    expectedDiscount: 100000,
    expectedFinal: 400000,
    automationStatus: "fixture-required",
    notes: "Prepare user A at max usage and admin at zero usage.",
  });
  add(54, { code: "VIP100", total_amount: 500000, user_id: "__USER_ID__" }, null, {
    automationStatus: "manual-review",
    notes: "Stateful two-step case: run at usage 1, record checkout usage, then run again at usage 2.",
  });
  add(55, { code: "SAVE10", total_amount: 1000000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 100000,
    expectedFinal: 900000,
  });
  add(56, { code: "BIGBUY", total_amount: 1000000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 50000,
    expectedFinal: 950000,
  });
  add(57, { code: "SAVE10", total_amount: 700000, user_id: "__USER_ID__" }, 2, {
    expectedDiscount: 70000,
    expectedFinal: 630000,
    assertNoSensitiveFields: true,
  });
  add(58, { code: "NO_SUCH_CODE", total_amount: 700000, user_id: "__USER_ID__" }, 4, {
    assertNoDiscount: true,
    assertNoSensitiveFields: true,
  });

  return rows;
}

function uniqueCaseCode(number) {
  return `HW06_FR17_${String(number).padStart(3, "0")}`;
}

function createBodyForCase(number) {
  return { ...clone(adminCouponBody), code: uniqueCaseCode(number) };
}

function fr17GetRows() {
  const auth = {
    1: ["admin", 2],
    2: ["missing", 4],
    3: ["user", 4],
    4: ["malformed", 4],
    5: ["forged-admin", 4],
    6: ["basic-admin", 4],
    7: ["admin", 2],
    8: ["admin", 2],
    9: ["admin", 2],
    10: ["admin", 2],
  };
  return Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    const [authMode, expectedStatusClass] = auth[number];
    return baseRow("FR17", number, {
      authMode,
      expectedStatusClass,
      assertCouponArray: expectedStatusClass === 2,
      assertRequiredCouponFields: [7, 8].includes(number),
      assertNoSensitiveFields: number === 9,
      expectEmptyArray: number === 10,
      automationStatus: number === 10 ? "fixture-required" : "ready",
      notes: number === 10 ? "Run against an empty coupon fixture." : "",
    });
  });
}

function fr17CreateRows() {
  const rows = [];
  const add = (number, body, expectedStatusClass, overrides = {}) => {
    rows.push(
      baseRow("FR17", number, {
        body,
        authMode: "admin",
        expectedStatusClass,
        expectedCreated: expectedStatusClass === 2,
        ...overrides,
      }),
    );
  };

  add(11, createBodyForCase(11), 2);
  add(12, { ...createBodyForCase(12), type: "fixed", discount_value: 50000 }, 2);
  add(13, createBodyForCase(13), 4, { authMode: "missing" });
  add(14, createBodyForCase(14), 4, { authMode: "user" });
  add(15, createBodyForCase(15), 4, { authMode: "malformed" });
  add(16, createBodyForCase(16), 4, { authMode: "forged-admin" });
  add(17, omit(createBodyForCase(17), "code"), 4);
  add(18, mutate(createBodyForCase(18), "code", null), 4);
  add(19, mutate(createBodyForCase(19), "code", ""), 4);
  add(20, mutate(createBodyForCase(20), "code", "SAVE10"), 4);
  add(21, mutate(createBodyForCase(21), "code", 123), 4);
  add(22, mutate(createBodyForCase(22), "code", true), 4);
  add(23, mutate(createBodyForCase(23), "code", {}), 4);
  add(24, mutate(createBodyForCase(24), "code", []), 4);
  add(25, mutate(createBodyForCase(25), "code", "X'); DROP TABLE coupons; --"), null, {
    allowedStatusClasses: [2, 4],
    verifyDatabaseIntact: true,
  });
  add(26, mutate(createBodyForCase(26), "code", "<script>alert(1)</script>"), null, {
    allowedStatusClasses: [2, 4],
    assertJsonResponse: true,
  });
  add(27, omit(createBodyForCase(27), "type"), 4);
  add(28, mutate(createBodyForCase(28), "type", null), 4);
  add(29, mutate(createBodyForCase(29), "type", ""), 4);
  add(30, mutate(createBodyForCase(30), "type", "percent"), 2);
  add(31, mutate(createBodyForCase(31), "type", "fixed"), 2);
  add(32, mutate(createBodyForCase(32), "type", "percentage"), 4);
  add(33, mutate(createBodyForCase(33), "type", 1), 4);
  add(34, mutate(createBodyForCase(34), "type", {}), 4);
  add(35, mutate(createBodyForCase(35), "type", []), 4);
  add(36, omit(createBodyForCase(36), "discount_value"), 4);
  add(37, mutate(createBodyForCase(37), "discount_value", null), 4);
  add(38, mutate(createBodyForCase(38), "discount_value", 1), 2);
  add(39, mutate(createBodyForCase(39), "discount_value", 0), 4);
  add(40, mutate(createBodyForCase(40), "discount_value", -1), 4);
  add(41, mutate(createBodyForCase(41), "discount_value", 10.5), 2);
  add(42, mutate(createBodyForCase(42), "discount_value", "10"), 4);
  add(43, mutate(createBodyForCase(43), "discount_value", true), 4);
  add(44, mutate(createBodyForCase(44), "discount_value", {}), 4);
  add(45, mutate(createBodyForCase(45), "discount_value", []), 4);
  add(46, omit(createBodyForCase(46), "min_order_amount"), 4);
  add(47, mutate(createBodyForCase(47), "min_order_amount", null), 4);
  add(48, mutate(createBodyForCase(48), "min_order_amount", 0), 2);
  add(49, mutate(createBodyForCase(49), "min_order_amount", 1), 2);
  add(50, mutate(createBodyForCase(50), "min_order_amount", -1), 4);
  add(51, mutate(createBodyForCase(51), "min_order_amount", 0.5), 2);
  add(52, mutate(createBodyForCase(52), "min_order_amount", "200000"), 4);
  add(53, mutate(createBodyForCase(53), "min_order_amount", false), 4);
  add(54, mutate(createBodyForCase(54), "min_order_amount", {}), 4);
  add(55, mutate(createBodyForCase(55), "min_order_amount", []), 4);
  add(56, omit(createBodyForCase(56), "expired_at"), 4);
  add(57, mutate(createBodyForCase(57), "expired_at", null), 4);
  add(58, mutate(createBodyForCase(58), "expired_at", ""), 4);
  add(59, mutate(createBodyForCase(59), "expired_at", "2099-12-31"), 2);
  add(60, mutate(createBodyForCase(60), "expired_at", "2032-02-29"), 2);
  add(61, mutate(createBodyForCase(61), "expired_at", "2020-01-01"), 2);
  add(62, mutate(createBodyForCase(62), "expired_at", "2031-02-29"), 4);
  add(63, mutate(createBodyForCase(63), "expired_at", "not-a-date"), 4);
  add(64, mutate(createBodyForCase(64), "expired_at", 20991231), 4);
  add(65, mutate(createBodyForCase(65), "expired_at", {}), 4);
  add(66, omit(createBodyForCase(66), "max_uses_per_user"), 4);
  add(67, mutate(createBodyForCase(67), "max_uses_per_user", null), 4);
  add(68, mutate(createBodyForCase(68), "max_uses_per_user", 1), 2);
  add(69, mutate(createBodyForCase(69), "max_uses_per_user", 2), 2);
  add(70, mutate(createBodyForCase(70), "max_uses_per_user", 0), 4);
  add(71, mutate(createBodyForCase(71), "max_uses_per_user", -1), 4);
  add(72, mutate(createBodyForCase(72), "max_uses_per_user", "1"), 4);
  add(73, mutate(createBodyForCase(73), "max_uses_per_user", {}), 4);
  add(74, { ...createBodyForCase(74), id: 1 }, null, {
    allowedStatusClasses: [2, 4],
    verifySeedCouponIntact: true,
  });
  add(75, createBodyForCase(75), null, {
    automationStatus: "manual-review",
    notes: "Concurrency case requires two parallel requests; excluded from single-run automation.",
  });
  rows.push(
    baseRow("FR17", 88, {
      rawBody: '{"code":"BROKEN"',
      authMode: "admin",
      expectedStatusClass: 4,
      expectedCreated: false,
    }),
  );
  rows.push(
    baseRow("FR17", 89, {
      body: createBodyForCase(89),
      contentType: "text/plain",
      authMode: "admin",
      expectedStatusClass: 4,
      expectedCreated: false,
    }),
  );

  return rows;
}

function fr17DeleteRows() {
  const rows = [];
  const add = (number, overrides = {}) => {
    rows.push(
      baseRow("FR17", number, {
        authMode: "admin",
        expectedStatusClass: null,
        deleteIdMode: "created",
        expectedFixturePresentAfterDelete: false,
        ...overrides,
      }),
    );
  };

  add(76, { expectedStatusClass: 2 });
  add(77, { authMode: "missing", expectedStatusClass: 4, expectedFixturePresentAfterDelete: true });
  add(78, { authMode: "user", expectedStatusClass: 4, expectedFixturePresentAfterDelete: true });
  add(79, { authMode: "malformed", expectedStatusClass: 4, expectedFixturePresentAfterDelete: true });
  add(80, { deleteIdMode: "nonexistent", expectedFixturePresentAfterDelete: true });
  add(81, { deleteIdMode: "zero", expectedFixturePresentAfterDelete: true });
  add(82, { deleteIdMode: "negative", expectedFixturePresentAfterDelete: true });
  add(83, { deleteIdMode: "string", expectedFixturePresentAfterDelete: true });
  add(84, { deleteIdMode: "sqli", expectedFixturePresentAfterDelete: true });
  add(85, {
    expectedStatusClass: 2,
    automationStatus: "manual-review",
    notes: "Second DELETE must be reviewed/run explicitly after the first successful DELETE.",
  });
  add(86, { expectedStatusClass: 2 });
  add(87, { expectedStatusClass: 2, verifyOtherCouponIntact: true });
  return rows;
}

const dataSets = {
  "fr04-get.json": fr04GetRows(),
  "fr04-put.json": fr04PutRows(),
  "fr09-apply.json": fr09Rows(),
  "fr17-get.json": fr17GetRows(),
  "fr17-create.json": fr17CreateRows(),
  "fr17-delete.json": fr17DeleteRows(),
};

for (const [fileName, rows] of Object.entries(dataSets)) {
  writeJson(path.join(dataDir, fileName), rows);
}

const collectionPrerequest = `
const studentId = pm.environment.get("studentId");
pm.request.headers.upsert({ key: "X-Student-Id", value: studentId || "REVIEW_REQUIRED" });
console.log("X-Student-Id:", studentId || "REVIEW_REQUIRED", pm.request.method, pm.request.url.toString());
`.trim();

const loginTests = (tokenVariable, idVariable) => `
pm.test("Setup login returns 2xx", () => pm.expect(pm.response.code).to.be.within(200, 299));
const body = pm.response.json();
pm.expect(body).to.have.property("token");
pm.environment.set("${tokenVariable}", body.token);
if (body.user && body.user.id !== undefined) pm.environment.set("${idVariable}", body.user.id);
`.trim();

const authAndBodyPrerequest = `
if (pm.iterationData.get("automationStatus") === "manual-review") {
  console.warn("Manual-review case skipped:", pm.iterationData.get("id"));
  pm.execution.skipRequest();
}

const mode = pm.iterationData.get("authMode") || "user";
const userToken = pm.environment.get("userToken") || "";
const adminToken = pm.environment.get("adminToken") || "";

function forge(token, role) {
  try {
    const parts = token.split(".");
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized));
    payload.role = role || payload.role;
    payload.id = Number(payload.id || 0) + 1000;
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/=/g, "").replace(/\\+/g, "-").replace(/\\//g, "_");
    return [parts[0], encoded, parts[2]].join(".");
  } catch (_) {
    return "forged.invalid.token";
  }
}

pm.request.headers.remove("Authorization");
if (mode === "user") pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + userToken });
if (mode === "admin") pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + adminToken });
if (mode === "empty") pm.request.headers.upsert({ key: "Authorization", value: "Bearer " });
if (mode === "malformed") pm.request.headers.upsert({ key: "Authorization", value: "Bearer abc.def" });
if (mode === "forged-user") pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + forge(userToken, "user") });
if (mode === "forged-admin") pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + forge(userToken, "admin") });
if (mode === "basic-user") pm.request.headers.upsert({ key: "Authorization", value: "Basic " + userToken });
if (mode === "basic-admin") pm.request.headers.upsert({ key: "Authorization", value: "Basic " + adminToken });

function resolveValue(value) {
  if (Array.isArray(value)) return value.map(resolveValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item)]));
  }
  if (value === "__USER_ID__") return Number(pm.environment.get("userId"));
  if (value === "__ADMIN_ID__") return Number(pm.environment.get("adminId"));
  if (value === "__CASE_CODE__") return "HW06_" + pm.iterationData.get("id").replace(/-/g, "_");
  return value;
}

const rawBody = pm.iterationData.get("rawBody");
const body = resolveValue(pm.iterationData.get("body") || {});
pm.variables.set("requestBody", rawBody !== undefined ? rawBody : JSON.stringify(body));

const contentType = pm.iterationData.get("contentType") || "application/json";
pm.request.headers.upsert({ key: "Content-Type", value: contentType });
`.trim();

const statusTests = `
const expectedClass = pm.iterationData.get("expectedStatusClass");
const allowed = pm.iterationData.get("allowedStatusClasses");
if (expectedClass !== null && expectedClass !== undefined) {
  pm.test("Expected HTTP status class", () => pm.expect(Math.floor(pm.response.code / 100)).to.eql(Number(expectedClass)));
} else if (Array.isArray(allowed) && allowed.length) {
  pm.test("Allowed HTTP status class", () => pm.expect(allowed).to.include(Math.floor(pm.response.code / 100)));
} else {
  pm.test("No server failure", () => pm.expect(pm.response.code).to.be.below(500));
}

if (pm.iterationData.get("assertJsonResponse")) {
  pm.test("Response is JSON", () => pm.expect(() => pm.response.json()).not.to.throw());
}
`.trim();

function url(raw, pathParts) {
  return { raw, host: ["{{baseUrl}}"], path: pathParts };
}

function event(listen, script) {
  return { listen, script: { type: "text/javascript", exec: script.split("\n") } };
}

function requestItem(name, method, rawUrl, pathParts, options = {}) {
  const request = {
    method,
    header: options.headers || [],
    url: url(rawUrl, pathParts),
  };
  if (options.body !== false && method !== "GET") {
    request.body = { mode: "raw", raw: options.body || "{{requestBody}}", options: { raw: { language: "json" } } };
  }
  const events = [];
  if (options.prerequest) events.push(event("prerequest", options.prerequest));
  if (options.tests) events.push(event("test", options.tests));
  return { name, request, event: events };
}

function loginItems() {
  return [
    requestItem("Setup - Login User", "POST", "{{baseUrl}}/api/login", ["api", "login"], {
      body: JSON.stringify({ email: "{{userEmail}}", password: "{{userPassword}}" }),
      tests: loginTests("userToken", "userId"),
    }),
    requestItem("Setup - Login Admin", "POST", "{{baseUrl}}/api/login", ["api", "login"], {
      body: JSON.stringify({ email: "{{adminEmail}}", password: "{{adminPassword}}" }),
      tests: loginTests("adminToken", "adminId"),
    }),
  ];
}

function collection(name, folders) {
  return {
    info: {
      _postman_id: stableUuid(name),
      name,
      description: "Generated draft for human review. Not executed by Codex.",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    event: [event("prerequest", collectionPrerequest)],
    item: folders,
  };
}

const fr04GetTests = `${statusTests}
if (Math.floor(pm.response.code / 100) === 2) {
  const body = pm.response.json();
  const identity = pm.iterationData.get("expectedIdentity");
  if (identity === "user") pm.test("User identity", () => pm.expect(body.email).to.eql(pm.environment.get("userEmail")));
  if (identity === "admin") pm.test("Admin identity", () => pm.expect(body.email).to.eql(pm.environment.get("adminEmail")));
  if (pm.iterationData.get("assertNoPassword")) pm.test("No password", () => pm.expect(body).not.to.have.property("password"));
  if (pm.iterationData.get("assertNoResetToken")) pm.test("No reset token", () => pm.expect(body).not.to.have.property("reset_token"));
}`;

const snapshotUserTests = `
pm.test("Baseline user profile available", () => pm.expect(pm.response.code).to.be.within(200, 299));
pm.environment.set("baselineUser", JSON.stringify(pm.response.json()));
`.trim();

const snapshotAdminTests = `
pm.test("Baseline admin profile available", () => pm.expect(pm.response.code).to.be.within(200, 299));
pm.environment.set("baselineAdmin", JSON.stringify(pm.response.json()));
`.trim();

const fr04PutTests = `${statusTests}
pm.environment.set("targetStatusClass", Math.floor(pm.response.code / 100));`;

const verifyUserTests = `
pm.test("Verify user profile request succeeds", () => pm.expect(pm.response.code).to.be.within(200, 299));
const current = pm.response.json();
const baseline = JSON.parse(pm.environment.get("baselineUser") || "{}");
const targetClass = Number(pm.environment.get("targetStatusClass"));
const expectedClass = pm.iterationData.get("expectedStatusClass");
const body = pm.iterationData.get("body") || {};

if (expectedClass === 2 || (expectedClass === null && targetClass === 2)) {
  for (const key of ["name", "phone", "shipping_address"]) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      pm.test("Updated field: " + key, () => pm.expect(current[key]).to.eql(body[key]));
    }
  }
} else {
  for (const key of ["name", "phone", "shipping_address"]) {
    pm.test("Unchanged field: " + key, () => pm.expect(current[key]).to.eql(baseline[key]));
  }
}

pm.test("Role unchanged", () => pm.expect(current.role).to.eql(baseline.role));
pm.test("Email unchanged", () => pm.expect(current.email).to.eql(baseline.email));
pm.test("No password exposed", () => pm.expect(current).not.to.have.property("password"));
`.trim();

const verifyAdminTests = `
pm.test("Verify admin profile request succeeds", () => pm.expect(pm.response.code).to.be.within(200, 299));
const current = pm.response.json();
const baseline = JSON.parse(pm.environment.get("baselineAdmin") || "{}");
for (const key of ["id", "name", "email", "role", "phone", "shipping_address"]) {
  pm.test("Admin unchanged: " + key, () => pm.expect(current[key]).to.eql(baseline[key]));
}
`.trim();

const fr09Tests = `${statusTests}
let body = {};
try { body = pm.response.json(); } catch (_) {}
const expectedDiscount = pm.iterationData.get("expectedDiscount");
const expectedFinal = pm.iterationData.get("expectedFinal");
if (expectedDiscount !== null && expectedDiscount !== undefined) {
  pm.test("discount_amount", () => pm.expect(body.discount_amount).to.eql(expectedDiscount));
}
if (expectedFinal !== null && expectedFinal !== undefined) {
  pm.test("final_amount", () => pm.expect(body.final_amount).to.eql(expectedFinal));
}
if (pm.iterationData.get("assertNoDiscount")) {
  pm.test("No success discount fields", () => {
    pm.expect(body).not.to.have.property("discount_amount");
    pm.expect(body).not.to.have.property("final_amount");
  });
}
if (pm.iterationData.get("assertNoSensitiveFields")) {
  for (const key of ["password", "token", "reset_token"]) {
    pm.test("No sensitive field: " + key, () => pm.expect(body).not.to.have.property(key));
  }
}`;

const fr17GetTests = `${statusTests}
if (Math.floor(pm.response.code / 100) === 2) {
  const body = pm.response.json();
  if (pm.iterationData.get("assertCouponArray")) pm.test("Coupon list is array", () => pm.expect(body).to.be.an("array"));
  if (pm.iterationData.get("expectEmptyArray")) pm.test("Coupon list is empty", () => pm.expect(body).to.eql([]));
  if (pm.iterationData.get("assertRequiredCouponFields")) {
    for (const coupon of body) {
      for (const key of ["code", "type", "discount_value", "min_order_amount", "expired_at", "max_uses_per_user"]) {
        pm.expect(coupon).to.have.property(key);
      }
    }
  }
  if (pm.iterationData.get("assertNoSensitiveFields")) {
    for (const coupon of body) {
      for (const key of ["password", "token", "reset_token"]) pm.expect(coupon).not.to.have.property(key);
    }
  }
}`;

const fr17CreateTests = `${statusTests}
pm.environment.unset("createdCouponId");
pm.environment.set("targetStatusClass", Math.floor(pm.response.code / 100));
if (Math.floor(pm.response.code / 100) === 2) {
  try {
    const body = pm.response.json();
    if (body.id !== undefined) pm.environment.set("createdCouponId", body.id);
  } catch (_) {}
}`;

const verifyCouponListTests = `
pm.test("Verify coupon list succeeds", () => pm.expect(pm.response.code).to.be.within(200, 299));
const list = pm.response.json();
const requestBody = pm.iterationData.get("body") || {};
const code = requestBody.code;
const found = list.filter((coupon) => coupon.code === code);
const targetClass = Number(pm.environment.get("targetStatusClass"));

if (pm.iterationData.get("verifyDatabaseIntact") || pm.iterationData.get("verifySeedCouponIntact")) {
  pm.test("Seed coupon remains intact", () => pm.expect(list.some((coupon) => coupon.code === "SAVE10")).to.eql(true));
}

if (targetClass === 2 && typeof code === "string" && code.length) {
  pm.test("Created coupon is listed once", () => pm.expect(found.length).to.eql(1));
  if (found.length === 1) {
    pm.environment.set("createdCouponId", found[0].id);
    for (const key of ["code", "type", "discount_value", "min_order_amount", "expired_at", "max_uses_per_user"]) {
      if (Object.prototype.hasOwnProperty.call(requestBody, key)) {
        pm.test("Created field: " + key, () => pm.expect(found[0][key]).to.eql(requestBody[key]));
      }
    }
  }
} else if (typeof code === "string" && code.length && code !== "SAVE10") {
  pm.test("Rejected coupon is absent", () => pm.expect(found.length).to.eql(0));
}
`.trim();

const prepareDeleteFixtureTests = `
pm.test("Delete fixture created", () => pm.expect(pm.response.code).to.be.within(200, 299));
const body = pm.response.json();
pm.environment.set("deleteFixtureId", body.id);
pm.environment.set("deleteFixtureCode", pm.variables.get("deleteFixtureCode"));
`.trim();

const deleteTargetPrerequest = `${authAndBodyPrerequest}
const deleteIdMode = pm.iterationData.get("deleteIdMode") || "created";
let target = pm.environment.get("deleteFixtureId");
if (deleteIdMode === "nonexistent") target = "999999";
if (deleteIdMode === "zero") target = "0";
if (deleteIdMode === "negative") target = "-1";
if (deleteIdMode === "string") target = "abc";
if (deleteIdMode === "sqli") target = encodeURIComponent("1 OR 1=1");
pm.variables.set("deleteTargetId", target);
`.trim();

const verifyDeleteTests = `
pm.test("Verify coupon list succeeds", () => pm.expect(pm.response.code).to.be.within(200, 299));
const list = pm.response.json();
const fixtureCode = pm.environment.get("deleteFixtureCode");
const exists = list.some((coupon) => coupon.code === fixtureCode);
const expectedPresent = Boolean(pm.iterationData.get("expectedFixturePresentAfterDelete"));
pm.test("Delete state is correct", () => pm.expect(exists).to.eql(expectedPresent));
if (pm.iterationData.get("verifyOtherCouponIntact")) {
  pm.test("Other coupon remains intact", () => pm.expect(list.some((coupon) => coupon.code === "SAVE10")).to.eql(true));
}
`.trim();

const fr04Collection = collection("HW06 - FR04 Profile", [
  {
    name: "GET Profile - run with fr04-get.json",
    item: [
      ...loginItems(),
      requestItem("Execute FR04 GET case", "GET", "{{baseUrl}}/api/users/me", ["api", "users", "me"], {
        body: false,
        prerequest: authAndBodyPrerequest,
        tests: fr04GetTests,
      }),
    ],
  },
  {
    name: "PUT Profile - run with fr04-put.json",
    item: [
      ...loginItems(),
      requestItem("Snapshot User", "GET", "{{baseUrl}}/api/users/me", ["api", "users", "me"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "user";'),
        tests: snapshotUserTests,
      }),
      requestItem("Snapshot Admin", "GET", "{{baseUrl}}/api/users/me", ["api", "users", "me"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";'),
        tests: snapshotAdminTests,
      }),
      requestItem("Execute FR04 PUT case", "PUT", "{{baseUrl}}/api/users/me", ["api", "users", "me"], {
        prerequest: authAndBodyPrerequest,
        tests: fr04PutTests,
      }),
      requestItem("Verify User Profile", "GET", "{{baseUrl}}/api/users/me", ["api", "users", "me"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "user";'),
        tests: verifyUserTests,
      }),
      requestItem("Verify Admin Profile", "GET", "{{baseUrl}}/api/users/me", ["api", "users", "me"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";'),
        tests: verifyAdminTests,
      }),
      requestItem("Verify Seed Password", "POST", "{{baseUrl}}/api/login", ["api", "login"], {
        body: JSON.stringify({ email: "{{userEmail}}", password: "{{userPassword}}" }),
        tests: 'pm.test("Seed password remains valid", () => pm.expect(pm.response.code).to.be.within(200, 299));',
      }),
    ],
  },
]);

const fr09Collection = collection("HW06 - FR09 Apply Coupon", [
  {
    name: "Apply Coupon - run with fr09-apply.json",
    item: [
      ...loginItems(),
      requestItem("Execute FR09 case", "POST", "{{baseUrl}}/api/apply-coupon", ["api", "apply-coupon"], {
        prerequest: authAndBodyPrerequest,
        tests: fr09Tests,
      }),
    ],
  },
]);

const cleanupDeleteItem = requestItem("Cleanup Created Coupon", "DELETE", "{{baseUrl}}/api/admin/coupons/{{createdCouponId}}", ["api", "admin", "coupons", "{{createdCouponId}}"], {
  body: false,
  prerequest: `${authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";')}
if (!pm.environment.get("createdCouponId")) pm.environment.set("createdCouponId", "0");`,
  tests: 'pm.test("Cleanup completed without server crash", () => pm.expect(pm.response.code).to.be.below(500));',
});

const fr17Collection = collection("HW06 - FR17 Coupon Administration", [
  {
    name: "GET Coupons - run with fr17-get.json",
    item: [
      ...loginItems(),
      requestItem("Execute FR17 GET case", "GET", "{{baseUrl}}/api/coupons", ["api", "coupons"], {
        body: false,
        prerequest: authAndBodyPrerequest,
        tests: fr17GetTests,
      }),
    ],
  },
  {
    name: "CREATE Coupon - run with fr17-create.json",
    item: [
      ...loginItems(),
      requestItem("Execute FR17 CREATE case", "POST", "{{baseUrl}}/api/admin/coupons", ["api", "admin", "coupons"], {
        prerequest: authAndBodyPrerequest,
        tests: fr17CreateTests,
      }),
      requestItem("Verify Coupon List", "GET", "{{baseUrl}}/api/coupons", ["api", "coupons"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";'),
        tests: verifyCouponListTests,
      }),
      cleanupDeleteItem,
    ],
  },
  {
    name: "DELETE Coupon - run with fr17-delete.json",
    item: [
      ...loginItems(),
      requestItem("Prepare Delete Fixture", "POST", "{{baseUrl}}/api/admin/coupons", ["api", "admin", "coupons"], {
        body: '{{deleteFixtureBody}}',
        prerequest: `${authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";')}
const code = "DEL_" + pm.iterationData.get("id").replace(/-/g, "_");
pm.variables.set("deleteFixtureCode", code);
pm.variables.set("deleteFixtureBody", JSON.stringify({ code, type: "fixed", discount_value: 1000, min_order_amount: 0, expired_at: "2099-12-31", max_uses_per_user: 1 }));`,
        tests: prepareDeleteFixtureTests,
      }),
      requestItem("Execute FR17 DELETE case", "DELETE", "{{baseUrl}}/api/admin/coupons/{{deleteTargetId}}", ["api", "admin", "coupons", "{{deleteTargetId}}"], {
        body: false,
        prerequest: deleteTargetPrerequest,
        tests: statusTests,
      }),
      requestItem("Verify Delete State", "GET", "{{baseUrl}}/api/coupons", ["api", "coupons"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";'),
        tests: verifyDeleteTests,
      }),
      requestItem("Cleanup Delete Fixture", "DELETE", "{{baseUrl}}/api/admin/coupons/{{deleteFixtureId}}", ["api", "admin", "coupons", "{{deleteFixtureId}}"], {
        body: false,
        prerequest: authAndBodyPrerequest.replace('const mode = pm.iterationData.get("authMode") || "user";', 'const mode = "admin";'),
        tests: 'pm.test("Cleanup completed without server crash", () => pm.expect(pm.response.code).to.be.below(500));',
      }),
    ],
  },
]);

writeJson(path.join(collectionDir, "HW06-FR04.postman_collection.json"), fr04Collection);
writeJson(path.join(collectionDir, "HW06-FR09.postman_collection.json"), fr09Collection);
writeJson(path.join(collectionDir, "HW06-FR17.postman_collection.json"), fr17Collection);

writeJson(path.join(environmentDir, "local.postman_environment.json"), {
  id: stableUuid("HW06 local environment"),
  name: "HW06 Local - 23127522",
  values: [
    { key: "baseUrl", value: "http://localhost:3000", enabled: true },
    { key: "studentId", value: "23127522", enabled: true },
    { key: "userEmail", value: "test@eshop.com", enabled: true },
    { key: "userPassword", value: "Test1234!", enabled: true },
    { key: "adminEmail", value: "admin@eshop.com", enabled: true },
    { key: "adminPassword", value: "Admin123!", enabled: true },
    { key: "userToken", value: "", enabled: true },
    { key: "adminToken", value: "", enabled: true },
    { key: "userId", value: "", enabled: true },
    { key: "adminId", value: "", enabled: true },
  ],
  _postman_variable_scope: "environment",
  _postman_exported_at: new Date(0).toISOString(),
  _postman_exported_using: "Codex generator - not executed",
});

const packageJson = {
  name: "hw06-api-tests",
  version: "1.0.0",
  private: true,
  description: "Postman/Newman draft suites for FR04, FR09 and FR17",
  scripts: {
    generate: "node scripts/generate-postman.mjs",
    "generate:test-cases": "node scripts/generate-test-cases.mjs",
    "review:json": "node scripts/validate-json.mjs",
    "newman:fr04:get": "newman run postman/collections/HW06-FR04.postman_collection.json -e postman/environments/local.postman_environment.json -d postman/data/fr04-get.json --folder \"GET Profile - run with fr04-get.json\" --reporters cli,htmlextra --reporter-htmlextra-export reports/newman/FR04-GET.html",
    "newman:fr04:put": "newman run postman/collections/HW06-FR04.postman_collection.json -e postman/environments/local.postman_environment.json -d postman/data/fr04-put.json --folder \"PUT Profile - run with fr04-put.json\" --reporters cli,htmlextra --reporter-htmlextra-export reports/newman/FR04-PUT.html",
    "newman:fr09": "newman run postman/collections/HW06-FR09.postman_collection.json -e postman/environments/local.postman_environment.json -d postman/data/fr09-apply.json --reporters cli,htmlextra --reporter-htmlextra-export reports/newman/FR09-APPLY.html",
    "newman:fr17:get": "newman run postman/collections/HW06-FR17.postman_collection.json -e postman/environments/local.postman_environment.json -d postman/data/fr17-get.json --folder \"GET Coupons - run with fr17-get.json\" --reporters cli,htmlextra --reporter-htmlextra-export reports/newman/FR17-GET.html",
    "newman:fr17:create": "newman run postman/collections/HW06-FR17.postman_collection.json -e postman/environments/local.postman_environment.json -d postman/data/fr17-create.json --folder \"CREATE Coupon - run with fr17-create.json\" --reporters cli,htmlextra --reporter-htmlextra-export reports/newman/FR17-CREATE.html",
    "newman:fr17:delete": "newman run postman/collections/HW06-FR17.postman_collection.json -e postman/environments/local.postman_environment.json -d postman/data/fr17-delete.json --folder \"DELETE Coupon - run with fr17-delete.json\" --reporters cli,htmlextra --reporter-htmlextra-export reports/newman/FR17-DELETE.html",
    "newman:all": "npm run newman:fr04:get && npm run newman:fr04:put && npm run newman:fr09 && npm run newman:fr17:get && npm run newman:fr17:create && npm run newman:fr17:delete"
  },
  devDependencies: {
    newman: "^6.2.1",
    "newman-reporter-htmlextra": "^1.23.1"
  }
};

writeJson(path.join(projectDir, "package.json"), packageJson);

console.log("Generated Postman/Newman review artifacts without executing any API requests.");
