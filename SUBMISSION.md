# Devpost paste

Copy the fields below. Do not add Best of IBM, Best JacHammer, Agentic AI, or Dev Tools.

## Project name

Revenue Leak Engine

## One-line description

Revenue Leak Engine follows a customer opportunity across a local business journey, identifies where progress may have stopped, challenges the suspected cause against evidence, and tells the owner what to test first.

## Tracks to select

- Local Impact
- Best Jaclang, if that prize is a separate selection

## Tracks to leave unselected

- Best of IBM. Granite was not called. No IBM credentials were configured.
- Best JacHammer. The app is not hosted on Jac Hammer. `jaclang` 0.16.7 has no `jac scale` command, and Jac Hammer is a prompt-to-app host rather than a deploy target for this React and walker API.
- Agentic AI. The screen calls the walkers in a fixed order. They do not plan the investigation.
- Dev Tools & Full-Stack. This is an investigation for an owner, not a developer tool.

## Built with

Jac, Jaseci, Python, React, TypeScript

## About the project

### Problem

A person trying to set a simple local visit can lose the thread when the next step is uncertain. They wanted to decompress. They did not want a research project.

The owner then sees a request that never became a visit and has no single explanation of where that opportunity stopped. A website, a booking page, and the front desk are three tools. They are not one investigation.

### Solution

Revenue Leak Engine is an investigation of one customer opportunity. It does not replace the booking tool, the CRM, or the phone.

The opportunity moves through a journey. Evidence stays attached to the stage it belongs to, with a provenance label. Candidate findings are challenged. A weak finding can be rejected. One surviving finding becomes a single test, Fix First. Monitoring starts at "collecting evidence" and does not invent an improvement.

### Local impact

The case is Oasis Hot Tub Gardens in Ann Arbor, Michigan. The person wants one private hour for two. The operator is responsible for that visit and cannot easily see where the opportunity stalled.

Washtenaw County had 8,322 employer establishments in 2023. The source is the U.S. Census County Business Patterns, republished by Health for All Washtenaw. That count is every establishment with paid employees. It is not a count of appointment businesses, and it is not Oasis.

https://www.healthforallwashtenaw.org/indicators/index/view?indicatorId=6371&localeId=1363

Baymard, updated September 22, 2025, reports that 17% of US online shoppers have abandoned an order because checkout was too long or complicated. That is ecommerce checkout. It is not Oasis, and it is not appointment booking.

https://baymard.com/lists/cart-abandonment-rate

No customer interview is claimed. Revenue impact in the demo is unquantified.

### How it works

Mission → Opportunity → Journey → Evidence → Skeptic → Fix First → Monitor

The demo opens on the mission, "I just want to decompress." Investigate journey runs the Jac walkers. Public evidence and one simulated handoff attach to the stages. The Skeptic rejects the evening-price finding for insufficient evidence, keeps a room-time finding as a hypothesis, and marks one confirmation finding action-ready. Fix First is a single sentence to test at the moment of request: the visit is not confirmed yet. Start monitoring records a baseline that has not been measured.

### How Jac is used

The investigation is a Jac graph. A Business owns one Opportunity. That opportunity has a customer mission, journey stages, evidence, findings, a skeptic verdict, one action, and a monitor check.

Walkers mutate that graph: `undercover_walk`, `market_walk`, `ops_walk`, `skeptic_operator_walk`, and `start_monitoring`. `reset_demo` clears it back to eight unknown stages. `jac start` serves each public walker at `POST /walker/<name>`. State persists in the graph database. The React screen renders the walker response. It does not keep a second investigation while Jac is running. Measured implementation share: 41.5% Jac.

### How IBM is used

IBM is not used in the submitted demo.

`jac/skeptic_ibm.py` can call watsonx chat for `ibm/granite-3-3-8b-instruct` when `IBM_API_KEY` and `IBM_PROJECT_ID` are both set. They were not set. The verdicts in the demo come from deterministic rules and are labeled `deterministic_rules`. A failed live call would be labeled `deterministic_fallback`. Neither label is presented as a live Granite result.

### Responsible AI

A wrong Skeptic verdict would send a small business toward the wrong test. The product is built so a finding can die.

Each evidence record carries provenance. Counterevidence stays attached when it cuts against a finding. Unknowns stay on the finding. A coverage warning states that phone, walk-in, referral, and accessibility-assisted journeys are outside this evidence. The owner decides whether to run Fix First. The demo does not treat the action as an instruction already given to Oasis.

### Data disclosure

Internal Oasis business information in this demo is synthetic. It was not provided by Oasis. The simulated confirmation state is labeled "Demonstration only. Not provided by Oasis." on the evidence itself.

Public observations were read from oasishottubs.com on 2026-09-27: the homepage, the first-time guest page, the Ann Arbor rates, and the reservations page. Those pages are cited in the app.

### Future

A local pilot would replace the simulated handoff with first-party booking and confirmation counts, with permission. Monitoring could then ask whether completion moved after the test. If that pilot is real, a later path is distribution through local economic-development groups, SBDCs, chambers, and Main Street organizations. None of that distribution is built here.

## Links to fill when they exist

- GitHub: public repository URL
- Demo video: URL
- Hosted app: leave blank unless Jac Hammer actually serves this app

## What only a person can click

1. Create the Devpost project and paste this page before 9:30 AM. A partial submission is the gate.
2. Create the public GitHub repository and push `main`.
3. Star https://github.com/jaseci-labs/jac
4. Record the 60-second demo from `docs/DEMO_SCRIPT.md` and upload it.
5. Run Baz on the repository if Local Impact requires it, and save the review output.
6. Submit the final Devpost entry before 12:00 PM.
