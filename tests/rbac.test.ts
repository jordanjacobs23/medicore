import assert from "node:assert/strict";
import test from "node:test";
import {
  hasPermission,
} from "../components/clinical-core/src/rbac";

test("practitioners have wildcard clinical permissions", () => {
  assert.equal(hasPermission("PRACTITIONER", "encounter:create"), true);
  assert.equal(hasPermission("PRACTITIONER", "prescription:read"), true);
});

test("practice managers cannot manage clinical records without explicit permission", () => {
  assert.equal(hasPermission("PRACTICE_MANAGER", "encounter:create"), false);
  assert.equal(hasPermission("PRACTICE_MANAGER", "encounter:read"), true);
});

test("billing staff cannot access clinical encounters", () => {
  assert.equal(hasPermission("BILLING_CLERK", "encounter:read"), false);
});
