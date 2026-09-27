# Revenue Leak Engine

Revenue Leak Engine follows one customer opportunity, finds where that opportunity stops moving, challenges the suspected reason, and leaves the business with one change to test.

The customer wants less friction. The owner wants less uncertainty.

## Problem

A person trying to book a simple local visit can lose the thread when the next step is uncertain. The owner then sees a request that never became a visit and has no single place that shows where progress stopped.

This is a known kind of problem. Booking tools, CRMs, web analytics, AI receptionists, and abandoned-booking products already work on pieces of it. This project does not claim that no one else looks for friction.

## Human Story

The person in this demo wants to decompress after a stressful week, with one private hour for two. They are not thinking about conversion. They are thinking "forget it" if the plan stops feeling real.

The business user is an owner who can see a website, a booking request, and the front desk, but not one investigation of where that opportunity stopped.

The founder has spent time with small businesses that answer a stall by adding another site, another ad, or another dashboard. Sometimes the customer already wants what the business sells. The harder question is where that opportunity stopped moving.

No customer interview is claimed here. That validation has not been done for this prototype.

## Solution

Revenue Leak Engine is an investigation layer across systems the business already has. It does not replace the booking tool, the CRM, or the phone.

It keeps one Opportunity as the object. Walkers follow that opportunity. Evidence stays attached to the stage it belongs to, with provenance. A Skeptic can reject a weak finding. One surviving finding becomes Fix First. Monitoring asks whether completion improved after the change.

## Local Impact

The case is Oasis Hot Tub Gardens in Ann Arbor, Michigan.

The person is someone in the Ann Arbor area trying to set a simple private visit. The operator is responsible for that visit and cannot easily see where the opportunity stalled.

Internal Oasis records are not in this demo. Anything that looks like a CRM, booking handoff, or operational state is synthetic and labeled **Simulated business data**. Public pages are cited with URLs and the date they were read, 2026-09-27.

Washtenaw County had 8,322 employer establishments in 2023, from the U.S. Census County Business Patterns, republished by Health for All Washtenaw. That is every establishment with paid employees. It is not a count of appointment businesses, and it is not Oasis. https://www.healthforallwashtenaw.org/indicators/index/view?indicatorId=6371&localeId=1363

Baymard, updated September 22, 2025, reports that 17% of US online shoppers have abandoned an order because checkout was too long or complicated. That is ecommerce checkout. It is not Oasis, and it is not appointment booking. https://baymard.com/lists/cart-abandonment-rate

The demo does not say Oasis loses a dollar amount. Revenue impact stays unquantified.

## How It Works

1. The screen opens on the customer mission.
2. Investigate journey runs four Jac walkers over one opportunity.
3. Evidence appears on the stage it supports.
4. Three candidate findings are challenged one at a time.
5. A weak finding is rejected. One stays a hypothesis. One can become the single Fix First test.
6. Start monitoring records a baseline that has not been measured yet, then waits. The demo does not invent a successful outcome.

## Opportunity Graph

```
Business
  └── Opportunity
        ├── Customer mission
        ├── Journey stages
        │     └── Evidence
        ├── Findings
        │     ├── Supporting evidence
        │     ├── Counterevidence
        │     └── Skeptic verdict
        ├── Action
        └── Monitor check
```

The opportunity is the center. The business is not. The model is not.

## Jac / Jaseci

Jac holds the investigation. `jac/opportunity.jac` declares the nodes and the edges between them. These walkers are the API:

| Walker | What it writes |
| --- | --- |
| `reset_demo` | Clears the graph and seeds one opportunity, eight stages, all unknown |
| `undercover_walk` | Sets stage status from the customer path and attaches journey evidence |
| `market_walk` | Attaches public observations |
| `ops_walk` | Attaches the simulated handoff and opens candidate findings |
| `skeptic_operator_walk` | Writes a verdict onto one finding and, if action-ready, an action |
| `start_monitoring` | Writes a monitor check in `COLLECTING_EVIDENCE` |
| `get_opportunity` | Returns the current graph |

`jac start` serves each `walker:pub` at `POST /walker/<name>`. The React app renders that response. It does not keep a second copy of the investigation when Jac is running.

Jac share of the implementation (Jac, Python, TypeScript, CSS, and the app shell, excluding vendor, markdown, the fixture, and pitch pages):

```bash
python3 scripts/jac_share.py
```

Last run: 41.5% Jac, 37,222 of 89,786 implementation bytes.

GitHub Linguist does not currently classify `.jac` (linguist pull request 7653 was not merged). The language bar is not the measurement. The script is. `.jac` files are not relabeled as Python.

Persistence is the graph database under `jac/.jac/`. If node fields change, stop the server and delete `jac/.jac/` before starting again.

## IBM Granite / watsonx

The Skeptic is the model’s job: given a finding, supporting evidence, counterevidence, and unknowns, return `REJECTED`, `HYPOTHESIS`, or `ACTION_READY`.

`jac/skeptic_ibm.py` calls the watsonx chat endpoint for `ibm/granite-3-3-8b-instruct` when both `IBM_API_KEY` and `IBM_PROJECT_ID` are set. The walker writes whatever valid verdict comes back.

If those variables are missing, or the call fails, the walker writes the deterministic demonstration verdict and labels the source. That label is shown in the UI. A failed call is not presented as a live model result.

This environment was run without IBM credentials, so the checked demo path uses `deterministic_rules`.

AI is used only for that Skeptic step, and only when configured. Stage status, evidence attachment, and the monitor state are Jac graph updates, not generated prose.

IBM AI Fairness 360 is not in this demo. The evidence here is not a table of groups and outcomes that a fairness metric could honestly score.

## Frontend

React and TypeScript, Vite. The first screen is the mission and the journey, not a dashboard. Investigate stays on that journey. The graph view is there for the technical proof and stays off the opening.

## Evidence Model

Every evidence record has a source type, a provenance label, a collector (which walker), a URL when one exists, and a customer-outcome impact.

| Label | Meaning in this demo |
| --- | --- |
| Public evidence / public observation | Read from oasishottubs.com on 2026-09-27 |
| Simulated business data | Synthetic handoff. Not from Oasis |
| Demonstration scenario | The customer mission. Not an interview |
| Unknown / coverage gap | Something this evidence set cannot see |

Public observations used:

- Homepage, private garden visit and the Ann Arbor address: https://oasishottubs.com/
- First-time guest page, reserved time includes changing and showering: https://oasishottubs.com/about/first-time-guests/
- Ann Arbor rates, one hour for up to two people, $44 before 5pm and $64 after 5pm: https://oasishottubs.com/rates-hours/
- Reservations page: Square Appointments; selecting a time submits a request; staff approve it; the start can move by up to 15 minutes; inside four hours, call: https://oasishottubs.com/reservations-2/

The action-ready finding is a test of whether that request-versus-confirmed distinction is unmistakable at the moment of submission. The same page already states the rule. That counterevidence stays visible. Revenue impact stays **unquantified**.

## Responsible AI

If the Skeptic is wrong, a small business could spend time on the wrong fix. The product is built so a finding can die.

The workflow keeps provenance, separates a direct observation from a guess, shows counterevidence and unknowns, records the coverage gap, and requires a person to decide before anyone treats Fix First as an instruction to the business.

Coverage warning, shown with the evidence:

Available digital evidence may not represent customers who interact through phone, walk-in, referral, accessibility-assisted, or other channels.

## Data Disclosure

Internal Oasis CRM, booking history, operational records, and revenue records shown in the demo are synthetic. They were not provided by Oasis. The simulated confirmation gap is labeled on the evidence itself.

## Security

Secrets belong in environment variables. The repo commits `.env.example` only. `.gitignore` excludes `.env`, `.env.*` except the example, keys, and credential JSON. The browser never receives an API key. The Granite call, when configured, runs in the Jac process.

## Architecture

```
Customer / owner
        │
        ▼
React interface
        │
        ▼
Jac / Jaseci opportunity graph
        │
        ├── undercover_walk
        ├── market_walk
        └── ops_walk
        │
        ▼
Evidence + candidate findings
        │
        ▼
Skeptic
  IBM Granite when configured
  otherwise a labeled deterministic rule
        │
        ▼
Rejected / Hypothesis / Action ready
        │
        ▼
Jac writes the verdict
        │
        ▼
Fix first
        │
        ▼
Monitor
```

Human path, separate from the architecture:

```
I just want to decompress
        │
        ▼
Customer mission
        │
        ▼
Customer journey
        │
        ▼
Investigate
        │
        ▼
Suspected friction
        │
        ▼
Evidence
        │
        ▼
Skeptic
        │
        ▼
Fix first
        │
        ▼
Monitor
```

## Demo Flow

About a minute, on one opportunity. Record at normal speed, without `?fast=1`. The click path and the words to say are in `docs/DEMO_SCRIPT.md`.

Reset demo first. Investigate journey runs the walkers, holds the rejected price finding on screen, and stops on Fix First. Start monitoring shows collecting evidence. Reset returns every stage to unknown.

Open the URL Vite prints. Port 5173 is the default. If it is already taken, Vite uses the next port.

## Running Locally

Requires Python 3.12 and Node 20 or newer. Jac is installed in `.venv` from PyPI (`jaclang`).

```bash
python3.12 -m venv .venv
.venv/bin/pip install jaclang
cp .env.example .env   # optional; leave IBM blank for the deterministic Skeptic
.venv/bin/jac start jac/opportunity.jac --no_client --port 8000
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (http://localhost:5173 when that port is free).

For a camera take, use normal speed. `?fast=1` is only for a quick click-through.

Check the graph path without the UI:

```bash
.venv/bin/python scripts/demo_sequence.py
```

Production frontend build:

```bash
cd frontend && npm run build
```

The built site still needs the Jac server. Vite’s dev server proxies `/walker` to port 8000.

## Future Work

A real pilot would replace the simulated handoff with first-party booking and confirmation counts, with permission. Then the monitor could move off `COLLECTING_EVIDENCE`. Phone, walk-in, and referral evidence would have to be part of that, or the coverage warning stays.

Possible later channels, not built here: a $500 Revenue Leak Audit to learn whether an addressable opportunity exists, then optional monitoring, including through local economic-development groups, SBDCs, chambers, and Main Street organizations. The audit is a qualification step. It is not a claim that any business is already losing a set amount.

Not in this build: login, billing, multi-business support, live CRM or POS connections, a revenue calculator, or a chatbot.

## Submission

Devpost copy is in `SUBMISSION.md`. The seven-beat pitch is `pitch.html` (arrow keys) and `docs/PITCH.md`. The architecture drawing is `docs/architecture.svg`. The recording script is `docs/DEMO_SCRIPT.md`. The checklist is `docs/CHECKLIST.md`.

Select Local Impact. Best Jaclang is the Jac prize this repo can defend. Do not select Best of IBM, Best JacHammer, Agentic AI, or Dev Tools. Granite was not called, and the app is not hosted on Jac Hammer.
