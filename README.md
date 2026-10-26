# Causarc — YC interactive technical prototype

**The agent passed. The system broke.**

Causarc is a proposed simulation and safety-testing platform for interconnected AI-agent workflows. This repository contains a **synthetic interactive prototype**: a purpose-built developer interface and a reproducible payment/refund state simulator. It is **not** a production agent-testing platform, and it does not connect to live LLMs, payment providers, or customer infrastructure.

## Routes

- `/` — Obsidian × Volt Lime product landing page
- `/demo/` — interactive synthetic refund-race simulation and event trace

## What is real in the prototype?

The model in `assets/simulator.mjs` executes state transitions on a synthetic payment ledger, checks the invariant `total_refunds <= captured_payment`, and returns exact, reproducible events. Change:

- captured payment and requested refund amounts
- concurrent or sequential execution order
- atomic ledger-level safeguard on/off

The result and trace are derived from the calculation, not a mocked result or a prewritten animation. Clicking or replaying the event trace lets you inspect intermediate ledger states. The demo also exports a machine-readable JSON execution trace. Enabling the safeguard and rerunning verifies its effect in that **specific model**.

**Limitations:** The agents are scripted actors, not real LLM-driven agents. The prototype explores one deterministic failure mode; it does not discover unknown risks or provide general safety guarantees.

## Run locally

Use any static web server from the repository root:

```bash
python3 -m http.server 8080
```

Visit `http://localhost:8080/` and `http://localhost:8080/demo/`.

## Test

Node.js 20+:

```bash
node --test tests/simulator.test.mjs
```

## Deployment

Deploy the repository as a static site (no build command). Keep the directory structure intact. Vercel can serve the root `index.html` and `/demo/index.html`.

## YC disclosure

The project is at a prototype stage. No users, revenue, external integrations, production deployments, or discovered real-world vulnerabilities are claimed here.

## Interface & testing

The landing page uses a technical incident preview rather than generic marketing feature cards. The `/demo/` route combines configuration, a system topology, a ledger inspector, event selection, repeatable tests and JSON trace export. No backend or paid API keys are required.

UI browser smoke checks were performed at 320, 390, 768, 1024 and 1440 CSS pixel widths using inline-loaded production markup and code, including failure → safeguard → retest and replay interactions. A separate deployed-environment check is still required.
