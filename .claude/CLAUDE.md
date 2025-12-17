# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**See the root `/CLAUDE.md` for complete project guidance.**

This file contains supplementary Claude Code-specific settings and preferences.

## Session Preferences

- Prefer targeted context loading over preloading entire directories
- Reference files by path instead of loading full content when possible
- Use Grep/Glob for searching instead of preloading

## Validation Checklist

Before marking any task complete:
- [ ] `npm run type-check` passes (0 errors)
- [ ] `npm test` passes
- [ ] Documentation updated if API changed
- [ ] `tasks.md` updated with completion status
