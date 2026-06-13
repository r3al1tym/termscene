# Contributing to termscene

Thanks for your interest. termscene is small and the bar is "does it stay simple and
deterministic" — contributions that hold that line are very welcome.

## Development

```bash
pnpm install
pnpm dev -- render examples/hello.scene.json --out /tmp/hello.gif   # run the CLI from source
pnpm test                                                           # vitest
pnpm build                                                          # tsc + copy engine assets
```

You need Chrome/Chromium and ffmpeg on your PATH to render (see the README).

## Guidelines

- **Keep it deterministic.** The render is a pure function of the timeline — no
  wall-clock, no randomness, no network at render time. Anything that breaks frame-
  for-frame reproducibility is a non-starter.
- **Lint is the gate.** New scene features should come with `lint` rules that catch
  the mistakes they enable, and tests in `*.test.ts`.
- **Match the surrounding style.** Run `pnpm build` before opening a PR — it gates on
  `tsc` and the test suite, both of which run in CI.
- **One concern per PR.** Smaller diffs review faster.

## Reporting bugs

Open an [issue](https://github.com/r3al1tym/termscene/issues) with the scene
file (or a minimal repro), the command you ran, and what you expected vs. saw. For
security issues, see [SECURITY.md](SECURITY.md) instead.
