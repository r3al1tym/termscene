# Security Policy

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue.

Use GitHub's [private vulnerability reporting](https://github.com/r3al1tymonster/termscene/security/advisories/new)
(Security → Report a vulnerability) on this repository. I'll acknowledge the report,
investigate, and coordinate a fix and disclosure timeline with you.

## Scope

termscene renders scenes you author locally — it does not run a real shell or
execute scene *commands*. Worth knowing about its trust model:

- **`.ts`/`.js` scene files are imported as code.** Only run scenes you trust, the
  same caution you'd apply to any config-as-code. Prefer `.json` for untrusted input.
- **`termscene preview` starts a local HTTP server bound to `127.0.0.1`.** It is a
  local review surface and is not intended to be exposed to a network.
- **Standalone scrubber files and rendered output** are built from your scene
  content. Treat a scrubber HTML you share the way you'd treat any HTML you publish.

Reports that improve hardening in these areas are welcome.
