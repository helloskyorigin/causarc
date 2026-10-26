/**
 * Causarc's deterministic synthetic workflow model.
 * This is a technical demonstration, NOT an integration with live AI agents.
 * It executes real state transitions and checks a business invariant after each event.
 */
export function simulate({ mode = 'concurrent', atomic = false, payment = 100, request = 100 } = {}) {
  payment = Number(payment);
  request = Number(request);
  if (!Number.isFinite(payment) || !Number.isFinite(request) || payment <= 0 || request <= 0 || payment > 100000 || request > 100000) {
    throw new Error('Payment and refund amounts must be positive numbers under $100,000.');
  }
  if (Math.abs(Math.round(payment * 100) - payment * 100) > 1e-7 || Math.abs(Math.round(request * 100) - request * 100) > 1e-7) {
    throw new Error('Amounts must not contain fractions of a cent.');
  }
  if (!['concurrent', 'sequential'].includes(mode)) throw new Error('Invalid execution mode.');
  const money = n => Math.round((n + Number.EPSILON) * 100);
  const captured = money(payment);
  const attempted = money(request);
  let refunded = 0;
  let blocked = 0;
  const events = [];
  const dollars = cents => `$${(cents / 100).toFixed(2)}`;
  const trace = (actor, action, description, kind = 'neutral') => {
    events.push({
      id: events.length + 1, actor, action, description, kind,
      state: { captured: captured / 100, refunded: refunded / 100, remaining: (captured - refunded) / 100 },
      breached: refunded > captured,
    });
  };
  trace('System', 'Initialize synthetic payment', `Captured payment: ${dollars(captured)}. Two agents may issue refunds against this shared state.`);
  const read = agent => {
    const available = captured - refunded;
    trace(agent, 'Read payment ledger', `Observed refundable balance: ${dollars(available)}.`);
    return available;
  };
  const commit = (agent, snapshot) => {
    if (attempted > snapshot) {
      blocked++;
      trace(agent, 'Reject refund request', `${dollars(attempted)} exceeds the balance observed by this agent (${dollars(snapshot)}).`, 'blocked');
      return;
    }
    trace(agent, 'Authorize refund', `${dollars(attempted)} appears valid against the agent's observed balance (${dollars(snapshot)}).`, 'allowed');
    // Without an atomic constraint, authorization and commit are separate operations.
    // With a constraint, every commit rechecks the authoritative ledger state.
    if (atomic && refunded + attempted > captured) {
      blocked++;
      trace('Ledger', 'Reject at atomic boundary', `Atomic limit prevented ${agent}'s ${dollars(attempted)} refund; current remaining balance is ${dollars(captured - refunded)}.`, 'blocked');
      return;
    }
    refunded += attempted;
    trace('Ledger', `Commit ${agent} refund`, `Committed ${dollars(attempted)} from ${agent}. Ledger total is now ${dollars(refunded)}.`, refunded > captured ? 'breach' : 'committed');
  };
  if (mode === 'concurrent') {
    trace('Scheduler', 'Inject concurrent execution', 'Both agents read the same state before either agent commits. This models a read/modify/write race.', 'fault');
    const a = read('Agent A');
    const b = read('Agent B');
    commit('Agent A', a);
    commit('Agent B', b);
  } else {
    trace('Scheduler', 'Run serialized execution', 'The second agent reads the ledger only after the first has completed.', 'neutral');
    commit('Agent A', read('Agent A'));
    commit('Agent B', read('Agent B'));
  }
  const breached = refunded > captured;
  trace('Invariant checker', breached ? 'BUSINESS INVARIANT FAILED' : 'Business invariant preserved',
    breached ? `Total refunds ${dollars(refunded)} exceed captured payment ${dollars(captured)} by ${dollars(refunded - captured)}.` : `Total refunds ${dollars(refunded)} do not exceed captured payment ${dollars(captured)}.`,
    breached ? 'breach' : 'safe');
  return {
    input: { mode, atomic, payment, request }, events, breached,
    captured: captured / 100, refunded: refunded / 100, excess: Math.max(0, (refunded - captured) / 100), blocked,
    passed: !breached,
    rootCause: breached
      ? 'Both agents authorized against the same pre-commit balance. The ledger accepted both requests without an atomic refund limit.'
      : atomic && mode === 'concurrent'
        ? 'The atomic ledger constraint rejected the second request when the available balance was exhausted.'
        : 'The refund total stayed within the captured amount for this execution order.',
  };
}
