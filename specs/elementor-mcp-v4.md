# Elementor MCP v4.0.0 — Technical Specification

## Overview

Upgrade wpw-elementor-mcp from v3.0.0 to v4.0.0 by completing REST bridge parity (7 missing endpoints), updating documentation, adding automated tests, CI/CD, and performing full verification of all 23 tools across both DDEV and REST modes.

## Requirements

### R1: REST Bridge Plugin Completion
Add 7 new REST API endpoints to `wordpress-plugin/elementor-mcp-bridge.php` to match the 7 tools added in v3.0:

| Tool | Method | REST Endpoint |
|------|--------|---------------|
| elementor_add_element | POST | `/pages/{id}/elements` |
| elementor_delete_element | POST | `/pages/{id}/elements/{eid}/delete` |
| elementor_move_element | POST | `/pages/{id}/elements/{eid}/move` |
| elementor_update_global_kit | POST | `/kit` |
| elementor_search_all_pages | GET | `/search` |
| elementor_clone_element | POST | `/pages/{id}/elements/{eid}/clone` |
| elementor_export_page | GET | `/pages/{id}/export` |

Each endpoint must:
- Use Application Password authentication (existing pattern)
- Return JSON responses matching DDEV mode output format
- Handle error cases gracefully (element not found, invalid container, etc.)
- Clear CSS cache after write operations

### R2: Version Bump
- `package.json` version: `3.0.0` → `4.0.0`
- `src/index.ts` server version constant: `"3.0.0"` → `"4.0.0"`
- `src/index.ts` startup message: `"v3.0"` → `"v4.0"`

### R3: README Update
Rewrite `README.md` to document:
- All 23 tools (12 read + 4 write + 4 CRUD + 3 search/efficiency)
- Dual-mode architecture (DDEV + REST)
- REST mode setup instructions (bridge plugin install, env vars)
- Updated architecture diagram (all source files)
- WordPress bridge plugin documentation

### R4: Automated Tests
Create test suite covering:
- All 23 tool input schema validations
- PHP template generation (output contains expected patterns)
- Backend method signatures match interface
- REST client URL construction
- Error handling paths

### R5: CI/CD Pipeline
GitHub Actions workflow for:
- TypeScript compilation (`npm run build`)
- Linting (if configured)
- Test execution
- Node.js matrix (18, 20, 22)

### R6: Git Commit
Stage and commit all changes with descriptive message covering v4.0.0 release.

### R7: MCP Verification
Restart MCP server and verify all 23 tools respond correctly via actual MCP tool calls.

## Constraints

- Must maintain backward compatibility with existing DDEV mode
- REST bridge PHP must work on PHP 7.4+ (WordPress minimum)
- No new npm dependencies unless absolutely necessary (prefer Vitest since it's zero-config for ESM)
- Bridge plugin must be a single-file drop-in (no composer dependencies)
- All PHP in bridge plugin must use WordPress coding standards

## Edge Cases

- `addElement` with invalid `containerId` → return error, don't corrupt data
- `deleteElement` on non-existent element → return descriptive error
- `moveElement` to same container with same position → no-op, return success
- `cloneElement` cross-page when target page has no Elementor data → return error
- `exportPage` on page without Elementor data → return empty/error
- `searchAllPages` with no filters → return all elements across all pages
- `updateGlobalKit` with empty settings → no-op, return current kit

## Out of Scope

- UI for bridge plugin management
- Bridge plugin auto-update mechanism
- WebSocket/SSE transport (stdio only)
- Integration tests against live WordPress (unit tests only)
- npm publish / registry distribution
