# Elementor MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to read and modify Elementor page builder data in WordPress sites running on DDEV.

## Overview

This server exposes 16 tools (12 read, 4 write) that allow MCP-compatible clients such as Claude Code or Claude Desktop to interact with Elementor's page data directly through the WordPress database. It uses `ddev wp eval-file -` (stdin pipe) to execute PHP code, avoiding all shell escaping issues.

### What It Can Do

- Browse page structure and element hierarchy
- Inspect element settings, including responsive (mobile/tablet) overrides
- Analyze CSS from multiple sources: Elementor compiled CSS, WordPress Additional CSS, and page-level custom CSS
- Read global design tokens (colors, fonts, layout defaults) from the Elementor kit
- Update element settings with merge semantics (only specified keys change)
- Update HTML widget content safely via base64 encoding
- Append or replace WordPress Additional CSS
- Clear Elementor CSS cache after changes

## Requirements

- Node.js 18+
- A WordPress site managed by [DDEV](https://ddev.readthedocs.io/)
- Elementor page builder plugin installed on the WordPress site

## Installation

```bash
git clone https://github.com/8866Jason/wpw-elementor-mcp.git
cd wpw-elementor-mcp
npm install
npm run build
```

## Configuration

### Claude Code

Add the server to your project's `.mcp.json` file:

```json
{
  "mcpServers": {
    "elementor": {
      "command": "node",
      "args": ["/absolute/path/to/wpw-elementor-mcp/build/index.js"],
      "env": {
        "DDEV_PROJECT_DIR": "/absolute/path/to/your/ddev/project"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop configuration file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "elementor": {
      "command": "node",
      "args": ["/absolute/path/to/wpw-elementor-mcp/build/index.js"],
      "env": {
        "DDEV_PROJECT_DIR": "/absolute/path/to/your/ddev/project"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DDEV_PROJECT_DIR` | Yes | Absolute path to the DDEV project root directory. Falls back to `process.cwd()` if not set. |

## Tool Reference

### Read Tools (12)

#### elementor_list_pages

List all pages and posts that have Elementor data. Returns post ID, title, status, URL, and element count.

**Parameters:** None

---

#### elementor_get_page_tree

Get the element hierarchy tree for a page. Shows element types, IDs, widget types, content labels, and layout info (flex_direction, width, overflow, gap) on container nodes.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |

---

#### elementor_get_element

Get settings data for a specific element. Supports filtering to reduce output size.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | Yes | Elementor element ID (7-8 character hex string) |
| `filter` | string | No | `"all"` (default), `"layout"` (flex/width/overflow/gap/padding/margin keys only), or `"responsive"` (only `_mobile`/`_tablet` variants) |

---

#### elementor_find_elements

Search for elements by widget type, CSS class, element ID, or content text. All filters are combined with AND logic.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `widgetType` | string | No | Filter by widget type (heading, html, image, text-editor, video, form) |
| `cssClass` | string | No | Filter by CSS class name (partial match) |
| `elementId` | string | No | Filter by custom element ID (`_element_id` setting) |
| `contentText` | string | No | Search in element content text (case-insensitive) |

---

#### elementor_list_templates

List all Elementor library templates (sections, pages, containers saved to the template library).

**Parameters:** None

---

#### elementor_get_element_context

Get an element with full layout context: its own settings, all ancestor containers' layout settings, and sibling element summaries. Useful for debugging layout and spacing issues.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | Yes | Elementor element ID |

---

#### elementor_get_responsive_diff

Show desktop vs tablet vs mobile settings diff for an element. Groups settings by breakpoint and lists which keys have mobile/tablet overrides.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | Yes | Elementor element ID |

---

#### elementor_get_layout_debug

For a container element, show its flex layout settings and all children's layout properties in a compact table format. Useful for debugging flex layout, overflow, and spacing issues.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `containerId` | string | Yes | Container element ID |

---

#### elementor_get_page_css

Read all CSS sources that affect a page: WordPress Additional CSS (Customizer), Elementor page-level custom CSS, and Elementor global CSS.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |

---

#### elementor_get_global_kit

Read the Elementor active kit's global settings: system/custom colors, system/custom typography, container width default, widget spacing, page background color, and body typography.

**Parameters:** None

---

#### elementor_get_compiled_css

Read the Elementor-compiled CSS for a page. Supports both external file mode (`/uploads/elementor/css/post-{id}.css`) and internal mode (`_elementor_css` post meta). Optionally filter to only rules matching a specific element ID.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | No | Filter CSS to only rules matching this element ID |

---

#### elementor_get_element_selector

Get the CSS selectors for an element and find all matching CSS rules from both WordPress Additional CSS and Elementor compiled CSS. For widgets, includes both the outer selector (`.elementor-element-{id}`) and the inner selector (`> .elementor-widget-container`).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | Yes | Elementor element ID |

---

### Write Tools (4)

#### elementor_update_element

Update specific settings on an Elementor element. Uses merge semantics: only the specified keys are updated, other settings are preserved. Automatically clears the page CSS cache after update.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | Yes | Elementor element ID |
| `settings` | object | Yes | Key-value pairs to merge into the element's settings |

---

#### elementor_update_html_widget

Update an HTML widget's content. Handles HTML containing `<script>` tags, quotes, and special characters safely via base64 encoding.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `postId` | number | Yes | WordPress post/page ID |
| `elementId` | string | Yes | Elementor element ID of the HTML widget |
| `htmlContent` | string | Yes | New HTML content for the widget |
| `customCss` | string | No | Custom CSS to set on the widget |

---

#### elementor_update_page_css

Write to WordPress Additional CSS (Customizer). Automatically clears Elementor cache after update.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `css` | string | Yes | CSS content to write |
| `mode` | string | No | `"append"` (default) adds to existing CSS, `"replace"` overwrites all |

---

#### elementor_clear_cache

Clear all Elementor CSS cache files. Run this after making changes if the frontend does not reflect updates.

**Parameters:** None

## Architecture

```
src/
  index.ts          -- MCP server entry point, tool registration
  elementor.ts      -- Service layer, orchestrates WP-CLI calls
  php-templates.ts  -- PHP code templates for all Elementor operations
  wp-cli.ts         -- WP-CLI execution wrapper (ddev wp eval-file -)
  types.ts          -- TypeScript interfaces
```

### How It Works

1. The MCP server receives a tool call from the client over stdio.
2. The service layer (`elementor.ts`) selects the appropriate PHP template from `php-templates.ts`.
3. The PHP code is piped to `ddev wp eval-file -` via stdin, which executes it within the WordPress environment.
4. The PHP code reads or modifies Elementor data stored in `_elementor_data` post meta and returns JSON.
5. The server parses the JSON response and returns it to the client.

This stdin-pipe approach avoids all shell escaping issues that arise when embedding PHP code in shell command arguments.

### CSS Resolution

Elementor stores compiled CSS in two possible modes:

- **External file mode**: CSS files at `/wp-content/uploads/elementor/css/post-{id}.css`
- **Internal mode**: CSS stored in `_elementor_css` post meta in the database

The CSS tools (`get_compiled_css`, `get_element_selector`) check both sources automatically with external file as the primary and database as the fallback.

## Development

```bash
# Build
npm run build

# Watch mode (rebuild on file changes)
npm run watch

# Build and run
npm run dev
```

### Testing with MCP Inspector

```bash
DDEV_PROJECT_DIR=/path/to/your/ddev/project npx @modelcontextprotocol/inspector node build/index.js
```

## Known Considerations

- **Widget margins**: Elementor's `_margin` / `_margin_mobile` on widgets generates CSS on the inner `.elementor-widget-container` element, not the outer `.elementor-element-{id}`. This means widget margins do not affect flex layout spacing between siblings. Use WordPress Additional CSS with `!important` on the outer element selector instead.

- **Container margins**: For Elementor containers (not widgets), the `margin` setting applies to the outer element as expected.

- **Responsive defaults**: Containers without an explicit `flex_direction_mobile` setting keep the desktop direction on mobile. You must explicitly set `flex_direction_mobile: "column"` for mobile vertical stacking.

## License

MIT
