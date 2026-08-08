import assert from "node:assert/strict";
import test from "node:test";
import { logoSrc, monogram, normalizeSymbol, toneIndex } from "./logo";

test("cash and transfer rows resolve to no symbol", () => {
  for (const v of [null, undefined, "", "  ", "—", "-"]) {
    assert.equal(normalizeSymbol(v), null, `${JSON.stringify(v)} should not be a ticker`);
  }
});

test("symbols are upper-cased and trimmed", () => {
  assert.equal(normalizeSymbol(" vti "), "VTI");
  assert.equal(normalizeSymbol("brk.b"), "BRK.B");
});

test("anything that could smuggle a path or query is rejected", () => {
  for (const v of ["../secrets", "A/B", "A?x=1", "A B", "<script>", "TOOLONGSYMBOL123"]) {
    assert.equal(normalizeSymbol(v), null, `${v} should be rejected`);
  }
});

test("monograms are at most two characters", () => {
  assert.equal(monogram("VTI"), "VT");
  assert.equal(monogram("F"), "F");
  assert.equal(monogram("BRK.B"), "BR");
});

test("a symbol always gets the same tile colour", () => {
  assert.equal(toneIndex("NVDA"), toneIndex("NVDA"));
  assert.ok(toneIndex("NVDA") >= 0 && toneIndex("NVDA") < 6);
});

test("the proxy url escapes the symbol", () => {
  assert.equal(logoSrc("BRK.B", 48), "/api/logo/BRK.B?size=48");
  assert.ok(!logoSrc("A B").includes(" "));
});
