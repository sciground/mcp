# SciGround MCP (Public Beta)

Package: `@sciground/mcp` · Version: `0.1.0` · MCP name: `ai.licklider/sciground`

Production acceptance covers Claude Web with Google sign-in. The connection-only
npx adapter has also passed Google OAuth/PKCE, hosted MCP initialization and
dynamic tool discovery from a newly installed tarball.

Claude Web connects directly to the hosted remote HTTP MCP service through its
custom connector settings. Local stdio clients use the adapter below.

## Supported operations

- `study_create`: register an independent-two-group design for data that have not
  yet been observed. Creation is not idempotent; do not retry an unknown outcome.
- `study_current`: read the authenticated user's study and its current state.
  Historical revision selection is outside this beta.
- `study_diagnostics`: read study diagnostics, unresolved conditions, and next-step
  guidance. A diagnostic response does not establish a scientific guarantee.

Data upload, statistical analysis, Record creation, and other write operations
are outside this beta. Other tools may appear in discovery; their appearance
does not mean that execution is enabled.

## Connection and package availability

The [official connection guide](https://www.licklider.ai/docs/sciground-connect/)
covers the hosted Claude Web connection with Google sign-in. The local stdio
adapter uses the same Google-only service; its instructions are below.

Hosted MCP endpoint:
`https://sciground-api-mcp-845495614928.us-west2.run.app/mcp`

The package launch command is:

```sh
npx --yes @sciground/mcp
```

The corresponding Claude Code registration command is:

```sh
claude mcp add sciground -- npx --yes @sciground/mcp
```

The Node.js 24 launcher delegates stdio, Streamable HTTP, and OAuth/PKCE to
`mcp-remote` 0.16.6 and reuses the hosted service. It implements no scientific
computation and does not create a second SciGround server. No client secrets
or manually supplied access tokens are accepted by the launcher.

## Connection-only behavior

Tool discovery, tool schemas, notifications, calls, results and refusals come
from the hosted MCP server. The adapter does not implement or copy SciGround's
tools, business rules, scientific checks or tool schemas. It does not add a
fallback implementation when the server refuses an operation.

Adding a tool or changing its schema on the server does not require copying that
feature into this package. Changes to the transport, OAuth contract or supported
MCP protocol can still require an adapter or dependency update.

## Authentication readiness

The package includes SciGround's registered Native/public OAuth client ID.
It is a public identifier, not a secret. Authentication uses Authorization Code
with PKCE S256 and no client secret. The launcher does not borrow Claude's
client identity or accept a replacement client ID from environment variables.
Startup stops before authentication if its approved binding is absent.

The callback is `http://127.0.0.1:3334/oauth/callback`, with scope
`sciground:access` for the hosted MCP resource. The existing library manages
the browser sign-in and local credential cache in `~/.mcp-auth` (or its
`MCP_REMOTE_CONFIG_DIR` setting). Keep that directory private. Running npx
locally does not configure Claude Web's remote connector.

The stdio adapter's live acceptance covers authentication, initialization and
tool discovery. Claude Code's command above uses that stdio path and matches its
documented CLI syntax; no Claude Code UI or model was operated automatically.
Claude Desktop, ChatGPT and other clients have no new acceptance claim from
this release.
