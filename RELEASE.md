# SciGround MCP (Public Beta) 0.1.0 — release draft

SciGround MCP provides a hosted MCP connection for Claude Web with Google sign-in.
This Public Beta supports `study_create`, `study_current`, and `study_diagnostics`.
Study creation is not idempotent: do not retry when its result is unknown.
Data upload, analysis, Record creation, and other write operations are outside this beta.
Diagnostics do not establish a scientific guarantee.

[Connection guide](https://www.licklider.ai/docs/sciground-connect/).

Claude Web remote HTTP acceptance has completed. The connection-only local
stdio adapter has passed Google OAuth/PKCE, hosted initialization and tool
discovery. npm publication is still being prepared.
The adapter discovers tools and schemas from the hosted server and supplies
no SciGround tool implementations, business logic or scientific checks.
The intended package command is `npx --yes @sciground/mcp`; Claude Code registers
that same command with `claude mcp add sciground -- npx --yes @sciground/mcp`.
The npm artifact remains unpublished until its OAuth binding, live connection
acceptance, provenance source and release authorization are complete.
Publish this announcement only after its statements match the actual released artifacts.
