# wpw-elementor-mcp

MCP server for reading and modifying Elementor page data in WordPress. Supports dual-mode operation: **DDEV** (local via WP-CLI) and **REST** (remote via bridge plugin).

## Features

- 23 tools: 12 read + 4 write + 4 CRUD + 3 search/efficiency
- Dual-mode architecture — one codebase, two backends
- Full Elementor data access: page tree, element settings, CSS, global kit
- CRUD operations: add, delete, move, clone elements
- Cross-page search and page export
- Type-safe TypeScript with Zod schema validation

## Quick Start

### DDEV Mode (Local)

Requires a DDEV WordPress project with Elementor:

```json
{
  "mcpServers": {
    "elementor": {
      "command": "node",
      "args": ["/path/to/wpw-elementor-mcp/build/index.js"],
      "env": {
        "DDEV_PROJECT_DIR": "/path/to/your-ddev-project"
      }
    }
  }
}
```

### REST Mode (Remote)

Requires the bridge plugin installed on the WordPress site:

1. Upload `wordpress-plugin/elementor-mcp-bridge.php` to `wp-content/plugins/`
2. Activate the plugin in WordPress admin
3. Create an Application Password in Users → Your Profile

```json
{
  "mcpServers": {
    "elementor": {
      "command": "node",
      "args": ["/path/to/wpw-elementor-mcp/build/index.js"],
      "env": {
        "ELEMENTOR_SITE_URL": "https://your-site.com",
        "ELEMENTOR_USERNAME": "admin",
        "ELEMENTOR_APP_PASSWORD": "xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

## Tools Reference

### Read Tools (12)

| Tool | Description |
|------|-------------|
| `elementor_list_pages` | List all pages with Elementor data |
| `elementor_get_page_tree` | Get element hierarchy tree for a page |
| `elementor_get_element` | Get element settings (filterable: all/layout/responsive) |
| `elementor_find_elements` | Search elements within a page by type/class/text |
| `elementor_list_templates` | List Elementor library templates |
| `elementor_get_element_context` | Get element with ancestor/sibling layout context |
| `elementor_get_responsive_diff` | Desktop vs tablet vs mobile settings diff |
| `elementor_get_layout_debug` | Container flex layout debug table |
| `elementor_get_page_css` | Read all CSS sources for a page |
| `elementor_get_global_kit` | Read global design tokens (colors, fonts, spacing) |
| `elementor_get_compiled_css` | Read Elementor-compiled CSS file |
| `elementor_get_element_selector` | Get CSS selectors and matching rules |

### Write Tools (4)

| Tool | Description |
|------|-------------|
| `elementor_update_element` | Update element settings (merge semantics) |
| `elementor_update_html_widget` | Update HTML widget content safely |
| `elementor_update_page_css` | Append/replace WordPress Additional CSS |
| `elementor_clear_cache` | Clear Elementor CSS cache |

### CRUD Tools (4)

| Tool | Description |
|------|-------------|
| `elementor_add_element` | Add new container or widget to a page |
| `elementor_delete_element` | Delete element and all children |
| `elementor_move_element` | Move element to different container/position |
| `elementor_update_global_kit` | Update global design tokens |

### Search & Efficiency Tools (3)

| Tool | Description |
|------|-------------|
| `elementor_search_all_pages` | Search elements across ALL pages at once |
| `elementor_clone_element` | Deep-clone element (same page or cross-page) |
| `elementor_export_page` | Export complete page Elementor data as JSON |

## Architecture

```
wpw-elementor-mcp/
├── src/
│   ├── index.ts            # MCP server entry, tool registration (23 tools)
│   ├── elementor.ts         # Service layer (parse/validate backend output)
│   ├── backend.ts           # Backend interface (ElementorBackend)
│   ├── ddev-backend.ts      # DDEV mode: WP-CLI + PHP eval
│   ├── rest-backend.ts      # REST mode: HTTP client calls
│   ├── rest-client.ts       # Axios HTTP client with auth
│   ├── php-templates.ts     # PHP code templates for DDEV mode
│   ├── types.ts             # TypeScript interfaces
│   └── wp-cli.ts            # WP-CLI command runner
├── wordpress-plugin/
│   └── elementor-mcp-bridge.php   # REST API bridge (24 endpoints)
├── build/                   # Compiled JavaScript
├── package.json
└── tsconfig.json
```

### Dual-Mode Design

The server auto-detects the backend mode based on environment variables:

- **REST mode** activates when `ELEMENTOR_SITE_URL`, `ELEMENTOR_USERNAME`, and `ELEMENTOR_APP_PASSWORD` are all set
- **DDEV mode** is the fallback, using WP-CLI to execute PHP directly

Both modes implement the same `ElementorBackend` interface, ensuring identical tool behavior regardless of the transport.

## WordPress Bridge Plugin

The `elementor-mcp-bridge.php` file is a single-file WordPress plugin that exposes 24 REST API endpoints under the `elementor-mcp/v1` namespace. It:

- Uses WordPress Application Password authentication
- Requires `edit_posts` capability
- Returns JSON responses matching DDEV mode output format
- Clears CSS cache after write operations
- Works on PHP 7.4+ with no external dependencies

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Start server directly
npm start
```

## License

MIT
