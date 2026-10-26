import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../assets/simulator.mjs';

test('concurrent reads without safeguard cause real ledger violation', () => {
  const r = simulate({ mode: 'concurrent', atomic: false, payment: 100, request: 100 });
  assert.equal(r.refunded, 200);
  assert.equal(r.excess, 100);
  assert.equal(r.breached, true);
  assert.ok(r.events.some(e => e.kind === 'breach'));
});
test('atomic refund limit blocks second commit', () => {
  const r = simulate({ mode: 'concurrent', atomic: true, payment: 100, request: 100 });
  assert.equal(r.refunded, 100);
  assert.equal(r.blocked, 1);
  assert.equal(r.breached, false);
});
test('serialized execution avoids over-refunding', () => {
  const r = simulate({ mode: 'sequential', atomic: false, payment: 100, request: 100 });
  assert.equal(r.refunded, 100);
  assert.equal(r.breached, false);
});
test('smaller requests only fail when their sum exceeds balance', () => {
  assert.equal(simulate({ request: 40 }).breached, false);
  assert.equal(simulate({ request: 60 }).breached, true);
});
test('input validation rejects nonsense', () => {
  assert.throws(() => simulate({ payment: -100 }), /positive/);
  assert.throws(() => simulate({ mode: 'infinite' }), /Invalid/);
});
test('the trace preserves expected event ordering', () => {
  const r = simulate({});
  const readB = r.events.findIndex(e => e.actor === 'Agent B' && e.action === 'Read payment ledger');
  const commitA = r.events.findIndex(e => e.action === 'Commit Agent A refund');
  assert.ok(readB < commitA);
});

test('currency inputs reject fractional cents', () => {
  assert.throws(() => simulate({ payment: 1.001 }), /fractions of a cent/);
  assert.throws(() => simulate({ request: 0.005 }), /fractions of a cent/);
});
test('non-whole dollar cents remain valid', () => {
  const r = simulate({ payment: 1.01, request: 0.50, atomic: true });
  assert.equal(r.refunded, 1);
  assert.equal(r.passed, true);
});
