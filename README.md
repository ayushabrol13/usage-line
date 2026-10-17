# usage-line

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-%E2%89%A5%202.1.290-orange)](https://claude.com/claude-code)

A Claude Code plugin that pins a live usage line under the prompt: how full the current session's context window is, how much of your plan's 5-hour and weekly limits you have used (with time until each resets), and what you have spent today.

```
🟢 ctx ▰▰▰▱▱▱▱▱▱▱ 31% 62k/200k  │  🟢 5h ▰▰▱▱▱▱▱▱▱▱ 22% ↻2h10m  │  🔴 week ▰▰▰▰▰▰▰▰▰▱ 91% ↻4d3h  │  today $3.20
```

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Reading the line](#reading-the-line)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Privacy](#privacy)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

| Feature | Description |
|---|---|
| **Context window** | Fill of the current session's context window, as a percentage and in tokens. |
| **5-hour window** | Usage of your plan's rolling 5-hour limit, with a countdown to reset. |
| **Weekly window** | Usage of your plan's 7-day limit, with a countdown to reset. |
| **Today's spend** | Total cost of all Claude Code sessions today, combined across terminals. |
| **At-a-glance status** | 🟢 under 60% · 🟡 60–84% · 🔴 85% and over. |
| **Zero overhead** | Reads the figures Claude Code already tracks; makes no extra API requests. |

## Requirements

- [Claude Code](https://claude.com/claude-code) **2.1.290 or later** (function-hook plugins).
- Terminal or the Claude Code desktop app.
- The 5-hour and weekly windows appear on Claude subscription plans (Pro, Max, Team, Enterprise). On API-key billing they show `—`.

> **Note:** the Claude Code function-hook plugin API is in early access and may change between releases.

## Installation

### From GitHub (recommended)

At the Claude Code prompt:

```
/plugin install usage-line --marketplace ayushabrol13/usage-line
```

Answer `y` to add the marketplace and choose the **user** scope to show the line in every project.

Or from a shell:

```bash
claude plugin marketplace add ayushabrol13/usage-line
claude plugin install usage-line@usage-line
```

### From a local clone

```bash
git clone https://github.com/ayushabrol13/usage-line.git ~/claude-plugins/usage-line
claude plugin marketplace add ~/claude-plugins/usage-line
claude plugin install usage-line@usage-line
```

### Updating and uninstalling

```bash
claude plugin update usage-line@usage-line
claude plugin uninstall usage-line@usage-line
```

## Reading the line

| Segment | Meaning |
|---|---|
| `ctx ▰▰▰▱▱ 31% 62k/200k` | 31% of the context window is used: 62k of 200k tokens. |
| `5h ▰▰▱▱▱ 22% ↻2h10m` | 22% of the 5-hour limit is used; it resets in 2 h 10 min. |
| `week ▰▱▱▱▱ 9% ↻4d3h` | 9% of the weekly limit is used; it resets in 4 days 3 hours. |
| `today $3.20` | Combined cost of every Claude Code session today (local time). |
| `—` | No reading yet (before the first response) or not applicable to your plan. |

Claude plans have no daily limit; *today* is a spend total, not a quota.

## Configuration

Set options during installation, with `/plugin configure usage-line@usage-line`, or in `/config`.

| Option | Type | Default | Description |
|---|---|---|---|
| `barWidth` | number | `10` | Characters per bar. `0` hides the bars; maximum `20`. |
| `showToday` | boolean | `true` | Show today's combined spend. |

## How it works

- Claude Code raises a `session.measure` event whenever the context fill, a rate-limit window or the session cost changes; the plugin redraws the line from those figures.
- A one-minute timer keeps the reset countdowns current. It reads the same figures through `$.session.usage()`, which costs nothing.
- For *today*, each session records its cost in the plugin's local store, keyed by session and date. A session that runs past midnight starts the new day from what it had spent by then. Records older than eight days are pruned.

## Privacy

Everything stays on your machine. The plugin stores only per-session cost totals and dates in Claude Code's local plugin store; it sends nothing anywhere and reads no conversation content.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| The line does not appear | Check `claude plugin list` shows usage-line as enabled, then run `/reload-plugins`. Requires Claude Code 2.1.290+. |
| `5h —` and `week —` | Normal until the first response of a session, and always on API-key billing. |
| `ctx —/200k` | No response has reported a context fill yet; send a prompt. |
| *today* looks low | Only sessions run with the plugin installed are counted. |

## Development

```bash
git clone https://github.com/ayushabrol13/usage-line.git
cd usage-line

claude plugin validate .          # check manifest and hooks module
claude plugin test .              # run the test suite
claude --plugin-dir .             # run Claude Code with the working copy loaded
```

## Project structure

```
usage-line/
├── .claude-plugin/
│   ├── plugin.json           # manifest and user options
│   └── marketplace.json      # makes this repository installable as a marketplace
├── hooks/
│   ├── hooks.json            # points Claude Code at the hooks module
│   ├── register.ts           # plugin implementation
│   └── register.test.ts      # tests
├── CHANGELOG.md
├── LICENSE
└── README.md
```

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a feature branch.
2. Make your change, adding tests where practical.
3. Ensure `claude plugin validate .` and `claude plugin test .` pass.
4. Update `CHANGELOG.md` and open a pull request describing the change.

## License

Released under the [MIT License](LICENSE). © 2026 Ayush Abrol.
