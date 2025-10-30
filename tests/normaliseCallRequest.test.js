const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');

function extractFunction(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`Signature not found: ${signature}`);
  }
  let braceIndex = source.indexOf('{', start);
  if (braceIndex === -1) {
    throw new Error(`Opening brace not found for: ${signature}`);
  }
  let depth = 1;
  let index = braceIndex + 1;
  while (depth > 0 && index < source.length) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    index += 1;
  }
  return source.slice(start, index);
}

function extractConst(source, constName) {
  const signature = `const ${constName}`;
  const start = source.indexOf(signature);
  if (start === -1) {
    throw new Error(`Constant not found: ${constName}`);
  }
  const end = source.indexOf(';', start);
  if (end === -1) {
    throw new Error(`Terminator not found for constant: ${constName}`);
  }
  return source.slice(start, end + 1);
}

function loadCallRequestUtils() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const statusInfo = extractConst(html, 'CALL_REQUEST_STATUS_INFO');
  const createId = extractFunction(html, 'function createId');
  const toTrimmedString = extractFunction(html, 'function toTrimmedString');
  const coalesceTrimmed = extractFunction(html, 'function coalesceTrimmed');
  const resolveStatus = extractFunction(html, 'function resolveCallRequestStatus');
  const normalise = extractFunction(html, 'function normaliseCallRequest');

  const context = { module: { exports: {} }, exports: {} };
  vm.createContext(context);
  const code = `"use strict";\n${statusInfo}\n${createId}\n${toTrimmedString}\n${coalesceTrimmed}\n${resolveStatus}\n${normalise}\nmodule.exports = { normaliseCallRequest, resolveCallRequestStatus };`;
  vm.runInContext(code, context);
  return context.module.exports;
}

const { normaliseCallRequest, resolveCallRequestStatus } = loadCallRequestUtils();

test('normaliseCallRequest converts numeric fields to strings safely', () => {
  const entry = normaliseCallRequest({
    id: '',
    name: ' Cliente ',
    phone: 612345678,
    time: 2024,
    notes: 0,
    contactChannel: 987654321,
    status: 'seguimiento',
    followUpAt: 20240102,
    followUpNote: 12345
  });

  assert.strictEqual(entry.phone, '612345678');
  assert.strictEqual(entry.time, '2024');
  assert.strictEqual(entry.notes, '0');
  assert.strictEqual(entry.contactChannel, '987654321');
  assert.strictEqual(entry.followUpAt, '20240102');
  assert.strictEqual(entry.followUpNote, '12345');
  assert.strictEqual(entry.name, 'Cliente');
});

test('normaliseCallRequest keeps sale information when status is venta', () => {
  const entry = normaliseCallRequest({
    id: '',
    status: 'venta conseguida',
    saleTariffId: 'tariff-1',
    saleTariffCodigo: 'C-001',
    saleTariffName: 'Fibra 1G',
    saleAssignedTo: 'rep1',
    saleAssignedName: 'Rep Uno',
    saleLeadId: 'lead-1'
  });

  assert.strictEqual(entry.status, 'venta');
  assert.strictEqual(entry.saleTariffId, 'tariff-1');
  assert.strictEqual(entry.saleTariffCodigo, 'C-001');
  assert.strictEqual(entry.saleTariffName, 'Fibra 1G');
  assert.strictEqual(entry.saleAssignedTo, 'rep1');
  assert.strictEqual(entry.saleAssignedName, 'Rep Uno');
  assert.strictEqual(entry.saleLeadId, 'lead-1');
});

test('resolveCallRequestStatus normalises common aliases', () => {
  assert.strictEqual(resolveCallRequestStatus('Venta conseguida'), 'venta');
  assert.strictEqual(resolveCallRequestStatus('solo información'), 'informacion');
  assert.strictEqual(resolveCallRequestStatus('Seguimiento'), 'seguimiento');
});
