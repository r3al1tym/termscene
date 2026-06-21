import type { Scene } from "../src/types.js"

// The terminals showcased on the splash page. Each scene is authored to match what a
// REAL session in that tool actually looks like — verified against each tool's source
// (constants, theme files, ASCII-art modules) so the chrome, launch banner, prompt
// glyph, and agent-output conventions are faithful, not approximated. Order = gallery
// wall order. The four coding-assistant scenes (claude-code/gemini-cli/codex-cli/kiro-cli)
// open on their real launch screens; see docs/template-fidelity-audit.html for the
// source-cited audit that drove the rebuild.

export interface ShowcaseScene {
  id: string
  name: string
  blurb: string
  scene: Scene
}

export const SHOWCASE: ShowcaseScene[] = [
  {
    "id": "claude-code",
    "name": "Claude Code",
    "blurb": "● tool calls · ⎿ results · ✻ thinking spinner",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "claude"
        },
        "window": {
          "chrome": "mac",
          "title": "claude code"
        },
        "prompt": "❯",
        "fontSize": 22,
        "align": "top",
        "loopOffset": "82%"
      },
      "steps": [
        {
          "cmd": "add a Retry-After header to the 429 responses in the rate limiter",
          "prompt": "❯",
          "typeSpeed": 42
        },
        {
          "wait": 0.3
        },
        {
          "out": "✻ Simmering… (esc to interrupt · 6s · ↓ 1.2k tokens)",
          "style": "dim"
        },
        {
          "out": "  Locating the rate-limit middleware, then setting the header on the 429 branch.",
          "style": "dim",
          "stream": 1.2
        },
        {
          "out": [
            "<span style=\"color:#28c93f\">●</span> Grep(pattern: \"429\", glob: \"src/**/*.ts\")",
            "  <span style=\"color:#5d5a52\">⎿  3 matches in src/middleware/rateLimit.ts</span>"
          ],
          "html": true
        },
        {
          "out": [
            "<span style=\"color:#28c93f\">●</span> Read(src/middleware/rateLimit.ts)",
            "  <span style=\"color:#5d5a52\">⎿  Read 84 lines</span>"
          ],
          "html": true
        },
        {
          "wait": 0.7
        },
        {
          "out": [
            "<span style=\"color:#28c93f\">●</span> Update(src/middleware/rateLimit.ts)",
            "  <span style=\"color:#5d5a52\">⎿  Updated with 4 additions and 1 removal</span>",
            "  <span style=\"color:#5d5a52\">     set Retry-After from limiter.msBeforeNext on the 429 branch</span>"
          ],
          "html": true
        },
        {
          "out": [
            "<span style=\"color:#28c93f\">●</span> Bash(npm test -- rateLimit)",
            "  <span style=\"color:#5d5a52\">⎿  PASS  src/middleware/rateLimit.test.ts</span>",
            "  <span style=\"color:#5d5a52\">     Tests: 9 passed, 9 total</span>"
          ],
          "html": true
        },
        {
          "div": true
        },
        {
          "out": "● Done. 429 responses now send Retry-After in seconds, computed from the limiter's reset window, with a test asserting the header value.",
          "style": "ok",
          "stream": 1.8
        }
      ]
    }
  },
  {
    "id": "gemini-cli",
    "name": "Gemini CLI",
    "blurb": "✦ replies · diff-styled WriteFile · ! shell passthrough",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "gemini",
          "bg": "#000000",
          "fg": "#ffffff"
        },
        "window": {
          "chrome": "mac",
          "title": "gemini"
        },
        "prompt": "> ",
        "fontSize": 18,
        "align": "top"
      },
      "steps": [
        {
          "cmd": "explain why my rate limiter lets bursts through, then fix it",
          "prompt": "> "
        },
        {
          "wait": 0.3
        },
        {
          "out": "<span style=\"color:#D7AFFF\">✦</span> The bug is a classic fixed-window reset. You count requests per",
          "html": true,
          "stream": 0.5
        },
        {
          "out": [
            "  calendar minute, so a client can fire N requests at 0:59 and another",
            "  N at 1:00 — 2N within two seconds, all \"within limits.\"",
            "",
            "  A token-bucket fixes this: refill at a steady rate, cap the burst."
          ],
          "stream": 1.2,
          "lineDelay": 0
        },
        {
          "cmd": "apply it and add a table test",
          "prompt": "> "
        },
        {
          "wait": 0.3
        },
        {
          "out": [
            "<span style=\"color:#D7FFD7\">✓</span>  <b>WriteFile</b> middleware/ratelimit.go",
            "<span style=\"color:#5ee6a8\">  │</span> <span style=\"color:#FF87AF\">- if reqs[ip].minute != now.Minute() { reqs[ip].n = 0 }</span>",
            "<span style=\"color:#5ee6a8\">  │</span> <span style=\"color:#FF87AF\">- reqs[ip].n++; if reqs[ip].n > limit { return Deny }</span>",
            "<span style=\"color:#5ee6a8\">  │</span> <span style=\"color:#D7FFD7\">+ b := buckets[ip]; b.refill(now, rate, burst)</span>",
            "<span style=\"color:#5ee6a8\">  │</span> <span style=\"color:#D7FFD7\">+ if !b.take(1) { return Deny }</span>"
          ],
          "html": true,
          "lineDelay": 0.12
        },
        {
          "out": "<span style=\"color:#D7FFD7\">✓</span>  <b>WriteFile</b> middleware/ratelimit_test.go",
          "html": true
        },
        {
          "cmd": "!go test ./middleware/ -run RateLimit",
          "prompt": "> "
        },
        {
          "out": "ok  \tapi/middleware\t0.118s",
          "style": "ok"
        },
        {
          "out": [
            "<span style=\"color:#D7AFFF\">✦</span> The burst is now configurable via RATELIMIT_BURST.",
            "  Set it to 1 for strict per-request pacing."
          ],
          "html": true,
          "stream": 1.2
        }
      ]
    }
  },
  {
    "id": "codex-cli",
    "name": "Codex CLI",
    "blurb": "› cyan prompt · • Edited / • Ran · +/- diff counts",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "codex",
          "accent": "#56c2d6"
        },
        "window": {
          "chrome": "mac",
          "title": "codex"
        },
        "prompt": "›",
        "fontSize": 20,
        "align": "top"
      },
      "steps": [
        {
          "cmd": "fix the retry backoff in fetcher.py — it caps too early, should be exponential up to 30s",
          "prompt": "›"
        },
        {
          "wait": 0.3
        },
        {
          "out": "<span style=\"color:#56c2d6\">⠹</span> <b>Working</b> <span style=\"color:#5c5c5c\">(3s • esc to interrupt)</span>",
          "html": true
        },
        {
          "out": "<span style=\"color:#5c5c5c\">• Reading fetcher.py — found the backoff loop</span>",
          "html": true,
          "stream": 0.8
        },
        {
          "out": [
            "<span style=\"color:#5c5c5c\">•</span> <b>Edited</b> src/fetcher.py <span style=\"color:#5c5c5c\">(</span><span style=\"color:#10a37f\">+6</span> <span style=\"color:#ef5350\">-3</span><span style=\"color:#5c5c5c\">)</span>",
            "  <span style=\"color:#10a37f\">+    delay = min(base * 2 ** attempt, 30.0)</span>",
            "  <span style=\"color:#10a37f\">+    delay += random.uniform(0, delay * 0.1)</span>",
            "  <span style=\"color:#ef5350\">-    delay = min(base + attempt, 5.0)</span>"
          ],
          "html": true,
          "lineDelay": 0.12
        },
        {
          "div": true
        },
        {
          "cmd": "pytest tests/test_fetcher.py -q",
          "prompt": "›"
        },
        {
          "out": [
            "<span style=\"color:#10a37f\">•</span> <b>Ran</b> pytest tests/test_fetcher.py -q",
            "  <span style=\"color:#5c5c5c\">└</span> ..............",
            "    14 passed in 0.91s"
          ],
          "html": true,
          "lineDelay": 0.1
        },
        {
          "wait": 0.5
        },
        {
          "out": "<span style=\"color:#5c5c5c\">•</span> Backoff now doubles per attempt, caps at 30s, and adds 10% jitter. Tests green.",
          "html": true,
          "stream": 1.4
        }
      ]
    }
  },
  {
    "id": "warp",
    "name": "Warp",
    "blurb": "dark · rounded block output · modern GUI terminal",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "warp"
        },
        "window": {
          "chrome": "mac",
          "title": "warp — ~/app"
        },
        "prompt": "❯",
        "fontSize": 24
      },
      "steps": [
        {
          "cmd": "pnpm install"
        },
        {
          "out": [
            "Lockfile is up to date, resolution step is skipped",
            "Packages: +312",
            "Progress: resolved 312, reused 312, downloaded 0, added 312, done"
          ],
          "style": "dim"
        },
        {
          "progress": "installing dependencies",
          "duration": 2.2
        },
        {
          "out": "Done in 1.9s",
          "style": "ok"
        },
        {
          "div": true
        },
        {
          "cmd": "pnpm build"
        },
        {
          "out": [
            "▸ tsc --build            done in 1.4s",
            "▸ vite bundle client     done in 2.1s",
            "▸ vite bundle server     done in 0.9s",
            "✓ build complete → dist/  (482 kB · gzip 138 kB)"
          ],
          "style": "accent"
        },
        {
          "cmd": "pnpm test"
        },
        {
          "out": [
            "✓ src/auth.test.ts        (14)",
            "✓ src/router.test.ts      (9)",
            "✓ src/cache.test.ts       (11)",
            "",
            "Test Files  3 passed (3)",
            "     Tests  34 passed (34)",
            "  Duration  3.06s"
          ],
          "style": "ok"
        },
        {
          "cmd": "git commit -am \"feat: edge cache + auth guard\""
        },
        {
          "out": [
            "[main 9f3c2a1] feat: edge cache + auth guard",
            " 6 files changed, 218 insertions(+), 41 deletions(-)"
          ],
          "style": "dim"
        },
        {
          "out": "● working tree clean → ready to push",
          "style": "accent",
          "stream": 1.4
        }
      ]
    }
  },
  {
    "id": "iterm2-p10k",
    "name": "iTerm2 · Powerlevel10k",
    "blurb": "lean segments · transparent bg · git status by color",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "iterm2"
        },
        "window": {
          "chrome": "mac",
          "title": "iTerm2"
        },
        "prompt": "❯",
        "fontSize": 24
      },
      "steps": [
        {
          "cmd": "git status",
          "prompt": " ~/projects/brand-engine   main   node v20 "
        },
        {
          "out": [
            "On branch main",
            "Your branch is up to date with 'origin/main'.",
            "",
            "nothing to commit, working tree clean"
          ],
          "style": "dim"
        },
        {
          "cmd": "git checkout -b feat/streaming-tokens",
          "prompt": " ~/projects/brand-engine   main   node v20 "
        },
        {
          "out": "Switched to a new branch 'feat/streaming-tokens'"
        },
        {
          "cmd": "nvim src/pipeline/stream.ts",
          "prompt": " ~/projects/brand-engine   feat/streaming-tokens   node v20 "
        },
        {
          "cmd": "git status -s",
          "prompt": " ~/projects/brand-engine   feat/streaming-tokens +1   node v20 "
        },
        {
          "out": " M src/pipeline/stream.ts",
          "style": "warn"
        },
        {
          "cmd": "git commit -am 'feat: stream Opus tokens via SSE'",
          "prompt": " ~/projects/brand-engine   feat/streaming-tokens +1   node v20 "
        },
        {
          "out": [
            "[feat/streaming-tokens 9c1af7e] feat: stream Opus tokens via SSE",
            " 1 file changed, 34 insertions(+), 6 deletions(-)"
          ],
          "style": "ok"
        },
        {
          "cmd": "git push -u origin feat/streaming-tokens",
          "prompt": " ~/projects/brand-engine   feat/streaming-tokens   node v20 "
        },
        {
          "progress": "Writing objects to origin",
          "duration": 1.6
        },
        {
          "out": [
            "remote: ",
            "remote: Create a pull request for 'feat/streaming-tokens' on GitHub by visiting:",
            "remote:   https://github.com/santos/brand-engine/pull/new/feat/streaming-tokens",
            "To github.com:santos/brand-engine.git",
            " * [new branch]      feat/streaming-tokens -> feat/streaming-tokens",
            "branch 'feat/streaming-tokens' set up to track 'origin/feat/streaming-tokens'."
          ],
          "style": "dim"
        },
        {
          "cmd": "gh pr create --fill --web",
          "prompt": " ~/projects/brand-engine   feat/streaming-tokens   node v20 "
        },
        {
          "out": "Opening github.com/santos/brand-engine/pull/247 in your browser  ✓",
          "style": "accent",
          "stream": 1.4
        }
      ]
    }
  },
  {
    "id": "macos-zsh",
    "name": "macOS Terminal",
    "blurb": "white bg · black SF Mono · the everyman shell",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "macos"
        },
        "window": {
          "chrome": "mac",
          "title": "~ — -zsh — 80×24"
        },
        "prompt": "dev@Devs-MacBook-Pro ~ %",
        "fontSize": 24
      },
      "steps": [
        {
          "cmd": "brew update"
        },
        {
          "out": [
            "==> Updating Homebrew...",
            "Already up-to-date."
          ],
          "style": "dim"
        },
        {
          "cmd": "brew install jq"
        },
        {
          "out": [
            "==> Fetching jq",
            "==> Downloading https://ghcr.io/v2/homebrew/core/jq/manifests/1.7.1"
          ],
          "style": "dim"
        },
        {
          "progress": "==> Downloading jq--1.7.1.arm64_sequoia.bottle.tar.gz",
          "duration": 2.4
        },
        {
          "out": [
            "==> Pouring jq--1.7.1.arm64_sequoia.bottle.tar.gz",
            "==> Summary",
            "  /opt/homebrew/Cellar/jq/1.7.1: 31 files, 1.2MB"
          ],
          "style": "dim"
        },
        {
          "div": true
        },
        {
          "cmd": "curl -s https://api.github.com/repos/jqlang/jq | jq .stargazers_count"
        },
        {
          "out": "31487"
        },
        {
          "cmd": "git -C ~/projects/dotfiles status -sb"
        },
        {
          "out": [
            "## main...origin/main",
            " M zsh/.zshrc",
            "?? brew/Brewfile.lock.json"
          ]
        },
        {
          "cmd": "echo \"$(jq --version) ready\""
        },
        {
          "out": "jq-1.7.1 ready",
          "style": "ok",
          "stream": 1.2
        }
      ]
    }
  },
  {
    "id": "ubuntu-bash",
    "name": "Ubuntu Terminal",
    "blurb": "aubergine #300a24 · green user@host · peak Linux",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "ubuntu"
        },
        "window": {
          "chrome": "plain",
          "title": "dev@ubuntu: ~"
        },
        "prompt": "dev@ubuntu:~$",
        "fontSize": 24
      },
      "steps": [
        {
          "cmd": "sudo apt update"
        },
        {
          "out": [
            "Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease",
            "Hit:2 http://security.ubuntu.com/ubuntu noble-security InRelease",
            "Get:3 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]",
            "Fetched 126 kB in 1s (171 kB/s)",
            "Reading package lists... Done",
            "Building dependency tree... Done",
            "Checking package upgradability... Done"
          ],
          "style": "dim"
        },
        {
          "out": "18 packages can be upgraded. Run 'apt list --upgradable' to see them.",
          "style": "warn"
        },
        {
          "cmd": "sudo apt upgrade -y"
        },
        {
          "progress": "Unpacking and configuring 18 packages",
          "duration": 3.5
        },
        {
          "out": [
            "Setting up linux-image-6.11.0-29-generic (6.11.0-29.29) ...",
            "Processing triggers for man-db (2.12.0-4) ...",
            "Processing triggers for initramfs-tools (0.142ubuntu25.5) ..."
          ],
          "style": "dim"
        },
        {
          "div": true
        },
        {
          "cmd": "sudo systemctl restart nginx && systemctl status nginx --no-pager"
        },
        {
          "out": [
            "● nginx.service - A high performance web server and a reverse proxy server",
            "     Loaded: loaded (/usr/lib/systemd/system/nginx.service; enabled; preset: enabled)",
            "     Active: active (running) since Fri 2026-06-12 09:14:02 UTC; 11ms ago",
            "   Main PID: 4471 (nginx)",
            "      Tasks: 5 (limit: 9489)",
            "     Memory: 5.2M (peak: 6.1M)"
          ],
          "style": "ok"
        },
        {
          "cmd": "df -h /"
        },
        {
          "out": [
            "Filesystem      Size  Used Avail Use% Mounted on",
            "/dev/nvme0n1p2   78G   31G   43G  42% /"
          ]
        },
        {
          "out": "all systems nominal -- kernel staged, reboot at next maintenance window.",
          "style": "ok",
          "stream": 1.5
        }
      ]
    }
  },
  {
    "id": "starship",
    "name": "Starship",
    "blurb": "segmented prompt · morphs per language/repo",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "starship"
        },
        "window": {
          "chrome": "mac",
          "title": "starship"
        },
        "prompt": "❯",
        "fontSize": 24
      },
      "steps": [
        {
          "cmd": "cargo build --release",
          "prompt": " ~/rust-svc   main  rust v1.84 "
        },
        {
          "out": [
            "   Compiling rust-svc v0.4.1 (/home/dev/rust-svc)",
            "    Finished `release` profile [optimized] in 8.31s"
          ],
          "style": "dim"
        },
        {
          "cmd": "cd ../node-api",
          "prompt": " ~/rust-svc   main  rust v1.84 "
        },
        {
          "cmd": "pnpm test",
          "prompt": " ~/node-api   main  ⬢ node v22.14 "
        },
        {
          "out": [
            " ✓ src/routes.test.ts (14)",
            "   Test Files  1 passed (1)",
            "        Tests  14 passed (14)",
            "     Duration  612ms"
          ],
          "style": "ok"
        },
        {
          "cmd": "cd ../py-worker && git status -sb",
          "prompt": " ~/node-api   main  ⬢ node v22.14 "
        },
        {
          "out": [
            "## main...origin/main",
            " M tasks/ingest.py"
          ],
          "style": "warn"
        },
        {
          "cmd": "uv run ruff check .",
          "prompt": " ~/py-worker   main !1  py v3.13 "
        },
        {
          "out": "All checks passed!",
          "style": "ok"
        },
        {
          "cmd": "git commit -am \"fix: stream ingest in chunks\"",
          "prompt": " ~/py-worker   main !1  py v3.13   42s "
        },
        {
          "out": [
            "[main 9f2c1ab] fix: stream ingest in chunks",
            " 1 file changed, 7 insertions(+), 3 deletions(-)"
          ],
          "style": "accent",
          "stream": 1.4
        }
      ]
    }
  },
  {
    "id": "kiro-cli",
    "name": "Kiro CLI",
    "blurb": "● tools · ↳ purpose lines · ✓ green confirmations",
    "scene": {
      "meta": {
        "aspect": "wide",
        "theme": {
          "preset": "kiro"
        },
        "window": {
          "chrome": "mac",
          "title": "kiro-cli"
        },
        "prompt": "> ",
        "fontSize": 20,
        "align": "top"
      },
      "steps": [
        {
          "cmd": "add rate limiting to the /api/login endpoint",
          "prompt": "> "
        },
        {
          "wait": 0.3
        },
        {
          "out": "<span style=\"color:#c6a0ff\">●</span> <b>Reading</b> src/routes/auth.ts",
          "html": true
        },
        {
          "out": "  <span style=\"color:#615c6b\">↳ Purpose: locate the login handler</span>",
          "html": true
        },
        {
          "out": [
            "<span style=\"color:#c6a0ff\">●</span> <b>Searching</b> codebase: \"express middleware\"",
            "  <span style=\"color:#615c6b\">⋮  src/middleware/ — 4 files</span>",
            "  <span style=\"color:#80ffb5\">✓</span> <span style=\"color:#615c6b\">found the middleware chain</span>"
          ],
          "html": true,
          "lineDelay": 0.1
        },
        {
          "out": [
            "<span style=\"color:#c6a0ff\">●</span> <b>Updating</b> src/middleware/rateLimit.ts",
            "  <span style=\"color:#80ffb5\">+  12  12: import rateLimit from \"express-rate-limit\";</span>",
            "  <span style=\"color:#80ffb5\">+  13  13: export const loginLimiter = rateLimit({ windowMs: 9e5, max: 5 });</span>",
            "  <span style=\"color:#80ffb5\">✓</span>"
          ],
          "html": true,
          "lineDelay": 0.1
        },
        {
          "out": [
            "<span style=\"color:#c6a0ff\">●</span> <b>Updating</b> src/routes/auth.ts",
            "  <span style=\"color:#80ffb5\">+  8   8: router.post(\"/login\", loginLimiter, loginHandler);</span>",
            "  <span style=\"color:#80ffb5\">✓</span>"
          ],
          "html": true,
          "lineDelay": 0.1
        },
        {
          "out": [
            "<span style=\"color:#c6a0ff\">●</span> <b>Running</b> npm test -- auth",
            "  <span style=\"color:#615c6b\">⋮  running 14 tests…</span>",
            "  <span style=\"color:#80ffb5\">✓ 14 passing</span>"
          ],
          "html": true,
          "lineDelay": 0.12
        },
        {
          "div": true
        },
        {
          "out": "Added a 5-attempts-per-15-min limiter on /api/login and wired it into the route. 2 files changed, tests green.",
          "stream": 1.8
        }
      ]
    }
  }
]
