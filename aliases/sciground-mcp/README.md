# sciground-mcp — SciGround MCP (Public Beta)

This unpublished compatibility launcher delegates to the canonical
`@sciground/mcp` version `0.1.0`.
Use `npx --yes @sciground/mcp` for the canonical command.
See the [official connection guide](https://www.licklider.ai/docs/sciground-connect/).

The Public Beta provides `study_create`, `study_current`, and
`study_diagnostics` with Google sign-in. Claude Web has passed production
workflow acceptance. The canonical connection-only stdio adapter has passed
secretless OAuth/PKCE, hosted MCP initialization, and dynamic tool discovery
from a newly installed tarball; public npm installation is still pending.

This draft provides the same launcher by delegation; it adds no server,
authentication scheme or product features. It is not a notice-only reservation.
Publish it only after the canonical package is published and its actual
functionality is verified. Do not publish an empty placeholder to reserve this name.
