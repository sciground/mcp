# SciGround MCP (Public Beta) 0.1.0

SciGround MCP provides a hosted MCP connection for Claude Web with Google sign-in.
This Public Beta supports `study_create`, `study_current`, and `study_diagnostics`.
Study creation is not idempotent: do not retry when its result is unknown.
Data upload, analysis, Record creation, and other write operations are outside this beta.
Diagnostics do not establish a scientific guarantee.

[Connection guide](https://www.licklider.ai/docs/sciground-connect/).

Claude Web remote HTTP acceptance has completed. The connection-only local
stdio adapter has passed Google OAuth/PKCE, hosted initialization and tool
discovery.
The adapter discovers tools and schemas from the hosted server and supplies
no SciGround tool implementations, business logic or scientific checks.
The package command is `npx --yes @sciground/mcp`; Claude Code registers
that same command with `claude mcp add sciground -- npx --yes @sciground/mcp`.
The package is a connection-only adapter to the hosted service. Only the three
operations above are supported in this Public Beta. Other tools appearing in
discovery do not expand the enabled product features or the client acceptance
described above.
