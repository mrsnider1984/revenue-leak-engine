# 60-second demo

Record at normal speed. Do not add `?fast=1`. That flag collapses the holds so a camera cannot read the rejected finding.

Reset before every take. The graph returns to one opportunity, eight unknown stages, and no findings.

## Setup

1. Jac API on port 8000: `.venv/bin/jac start jac/opportunity.jac --no_client --port 8000`
2. Frontend: `cd frontend && npm run dev`
3. Open the URL Vite prints. If 5173 is taken it will be the next port.
4. Click **Reset demo**. Wait until every stage says UNKNOWN.
5. Start recording on that mission screen.

## What the camera should see

| Time | On screen | Say |
| --- | --- | --- |
| 0–8s | Mission: "I just want to decompress." | A person wants one private hour for two. The owner cannot see where that plan stops. |
| 8s | Click **Investigate journey** | One opportunity. Jac walkers follow it. |
| 8–25s | Stages fill. Public chips and one simulated chip. | Public pages are cited. The handoff is synthetic and says it was not provided by Oasis. |
| 25–40s | Skeptic. Evening price is REJECTED. Room time stays a hypothesis. Confirmation becomes ACTION READY. | The price finding dies. There is no evidence the price stopped the visit. One finding survives. |
| 40–52s | Fix first. Revenue UNQUANTIFIED. | The test: say, at the moment of request, that the visit is not confirmed yet. |
| 52–60s | Click **Start monitoring**. Status COLLECTING EVIDENCE. | No baseline. No claimed improvement. |

If the take runs long, cut after the monitor line. Do not open the graph during the 60-second cut. The graph is for a judge who asks where the state lives.

## Click path

Reset demo → Investigate journey → wait through REJECTED → wait through Fix first → Start monitoring.

The app advances the Skeptic on its own. The only clicks after Reset are Investigate journey and Start monitoring.
