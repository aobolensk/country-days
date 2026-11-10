const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

const appSource = readFileSync(resolve(__dirname, "../app.js"), "utf8");

function importHarness(stays, confirmed) {
  const document = { addEventListener() {} };
  const window = {
    confirm(message) {
      this.confirmations.push(message);
      return confirmed;
    },
    confirmations: []
  };
  const context = vm.createContext({ document, window });
  const closureEnd = appSource.lastIndexOf("})();");
  assert.notEqual(closureEnd, -1);
  const instrumentedSource = [
    appSource.slice(0, closureEnd),
    "window.__csvImportTest = { importCsv, state, setSyncEngine(value) { syncEngine = value; }, setLoadStays(value) { loadStays = value; }, setShowToast(value) { showToast = value; } };",
    appSource.slice(closureEnd)
  ].join("\n");
  vm.runInContext(instrumentedSource, context);

  const imported = [];
  const persisted = [...stays];
  const api = window.__csvImportTest;
  api.state.stays = stays;
  api.setSyncEngine({
    async importStays(records) {
      imported.push(...records);
      persisted.push(...records);
    }
  });
  api.setLoadStays(async () => {});
  api.setShowToast(() => {});

  return {
    persisted,
    imported,
    confirmations: window.confirmations,
    async importCsv(csv) {
      await api.importCsv({
        target: {
          value: "selected.csv",
          files: [{ async text() { return csv; } }]
        }
      });
    }
  };
}

const savedStay = {
  id: 1,
  country: "Germany",
  startDate: "2026-01-01",
  endDate: "2026-01-10",
  notes: "Saved stay"
};

const savedOverlapCsv = [
  "country,start_date,end_date,notes",
  "Japan,2026-01-05,2026-01-12,Overlaps saved stay",
  "Canada,2026-02-01,2026-02-03,Separate stay"
].join("\n");

test("canceling an overlap with a saved stay leaves the data unchanged", async () => {
  const harness = importHarness([savedStay], false);

  await harness.importCsv(savedOverlapCsv);

  assert.equal(harness.confirmations.length, 1);
  assert.match(harness.confirmations[0], /Germany/);
  assert.equal(harness.imported.length, 0);
  assert.deepEqual(harness.persisted, [savedStay]);
});

test("confirming an overlap with a saved stay imports the full batch", async () => {
  const harness = importHarness([savedStay], true);

  await harness.importCsv(savedOverlapCsv);

  assert.equal(harness.confirmations.length, 1);
  assert.equal(harness.imported.length, 2);
  assert.deepEqual(harness.imported.map((record) => record.country), ["Japan", "Canada"]);
  assert.equal(harness.persisted.length, 3);
});

const importedOverlapCsv = [
  "country,start_date,end_date,notes",
  "France,2026-03-01,2026-03-10,First imported stay",
  "Italy,2026-03-05,2026-03-08,Overlapping imported stay",
  "Spain,2026-04-01,2026-04-03,Separate stay"
].join("\n");

test("canceling overlaps between imported rows leaves the data unchanged", async () => {
  const harness = importHarness([], false);

  await harness.importCsv(importedOverlapCsv);

  assert.equal(harness.confirmations.length, 1);
  assert.match(harness.confirmations[0], /France/);
  assert.equal(harness.imported.length, 0);
  assert.deepEqual(harness.persisted, []);
});

test("confirming overlaps between imported rows imports the full batch", async () => {
  const harness = importHarness([], true);

  await harness.importCsv(importedOverlapCsv);

  assert.equal(harness.confirmations.length, 1);
  assert.equal(harness.imported.length, 3);
  assert.deepEqual(harness.imported.map((record) => record.country), ["France", "Italy", "Spain"]);
  assert.equal(harness.persisted.length, 3);
});
