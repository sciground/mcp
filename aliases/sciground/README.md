# sciground — SciGround MCP (Public Beta)

This compatibility launcher delegates to the canonical
`@sciground/mcp` version `0.1.0`.
Use `npx --yes @sciground/mcp` for the canonical command.
See the [official connection guide](https://www.licklider.ai/docs/sciground-connect/).

The Public Beta provides `study_create`, `study_current`, and
`study_diagnostics` with Google sign-in. Claude Web has passed production
workflow acceptance. The canonical connection-only stdio adapter has passed
secretless OAuth/PKCE, hosted MCP initialization, and dynamic tool discovery
from a newly installed tarball.

This package provides the same connection launcher by delegation. Tool discovery,
OAuth, and transport use the canonical package and the hosted service. It adds
no server, authentication scheme, product features, or scientific computation.
