# Causarc — YC interactive technical prototype

**The failure isn't in one agent. It's in what happens between them.**

Causarc is a proposed simulation and safety-testing platform for interconnected AI-agent workflows. This repository contains a **synthetic interactive prototype**: a premium landing page and a reproducible payment/refund state simulator. It is **not** a production agent-testing platform, and it does not connect to live LLMs, payment providers, or customer infrastructure.

## Routes

- `/` — Obsidian × Volt Lime product landing page
- `/demo/` — interactive synthetic refund-race simulation and event trace

## What is real in the prototype?

The model in `assets/simulator.mjs` executes state transitions on a synthetic payment ledger, checks the invariant `total_refunds <= captured_payment`, and returns exact, reproducible events. Change:

- captured payment and requested refund amounts
- concurrent or sequential execution order
- atomic ledger-level safeguard on/off

The result and trace are derived from the calculation, not a mocked result or a prewritten animation. Replaying the event trace lets you inspect intermediate ledger states. Enabling the safeguard and rerunning verifies its effect in that **specific model**.

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

## Responsive audit — October 2026

The interactive prototype has been browser-tested locally at 320, 360, 375, 390, 428, 550, 768, 820, 1024, 1280, and 1440 pixel widths. Checks covered horizontal overflow, refund simulation, safeguard retests, manual safeguard toggling, invalid inputs, sequential operation and keyboard trace navigation. This is a synthetic proof-of-concept, not a real LLM agent safety engine.
