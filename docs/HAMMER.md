# Jac Hammer

Best JacHammer is not claimed.

## What was tried

`jaclang` 0.16.7 is the runtime this project uses. `jac --help` lists `start`, `test`, `run`, and the package commands. It does not list `scale`.

Jac Hammer (jachammer.ai) hosts apps generated from a prompt. It is not a git remote that deploys this repository's React client and `walker:pub` API. Replacing the working screen with a Hammer-generated client before noon would throw away the verified demo.

No hosted URL exists. Leave the Devpost "hosted app" field blank until a real URL is serving this investigation.

## If a deploy becomes possible

Document the URL in `SUBMISSION.md` and in the Devpost links. Until then, judges inspect the public repository and run:

```bash
.venv/bin/jac start jac/opportunity.jac --no_client --port 8000
cd frontend && npm run dev
```
