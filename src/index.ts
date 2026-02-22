#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { existsSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
import { ElementorService } from "./elementor.js";
import { DdevBackend } from "./ddev-backend.js";
import { RestBackend } from "./rest-backend.js";
import type { ElementorBackend } from "./backend.js";

function detectProjectDir(): string {
  // 1. Explicit env var takes priority
  if (process.env.DDEV_PROJECT_DIR) {
    return process.env.DDEV_PROJECT_DIR;
  }
  // 2. Check if cwd is a DDEV project
  const cwd = process.cwd();
  if (existsSync(resolve(cwd, ".ddev/config.yaml"))) {
    return cwd;
  }
  // 3. Fallback to cwd (ddev will report its own error if not a project)
  return cwd;
}

function createBackend(): { backend: ElementorBackend; mode: string; info: string } {
  // Priority 1: REST API mode (when all three env vars are set)
  const siteUrl = process.env.ELEMENTOR_SITE_URL;
  const username = process.env.ELEMENTOR_USERNAME;
  const appPassword = process.env.ELEMENTOR_APP_PASSWORD;

  if (siteUrl && username && appPassword) {
    const backend = new RestBackend({ siteUrl, username, appPassword });
    return { backend, mode: "rest", info: siteUrl };
  }

  // Priority 2: DDEV mode (default)
  const projectDir = detectProjectDir();
  const backend = new DdevBackend(projectDir);
  return { backend, mode: "ddev", info: projectDir };
}

const { backend, mode, info } = createBackend();
const elementor = new ElementorService(backend);

const server = new McpServer({
  name: "elementor",
  version: "4.0.0",
});

// ─── Shared Annotation Presets ───────────────────────────

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const WRITE_SAFE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

const WRITE_IDEMPOTENT = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const WRITE_DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
} as const;

// ═══════════════════════════════════════════════════════════
// READ TOOLS
// ═══════════════════════════════════════════════════════════

server.registerTool(
  "elementor_list_pages",
  {
    title: "List Elementor Pages",
    description:
      "List all pages/posts that have Elementor data. Returns post ID, title, status, URL, and element count for each page.",
    inputSchema: {},
    annotations: READ_ONLY,
  },
  async () => {
    const pages = await elementor.listPages();
    return {
      content: [{ type: "text", text: JSON.stringify(pages, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_page_tree",
  {
    title: "Get Page Element Tree",
    description:
      "Get the element hierarchy tree for a page. Shows element types, IDs, widget types, content labels, and layout info (flex_direction, width, overflow, gap) on container nodes. Essential for understanding page structure.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId }) => {
    const tree = await elementor.getPageTree(postId);
    return {
      content: [{ type: "text", text: JSON.stringify(tree, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_element",
  {
    title: "Get Element Details",
    description:
      "Get settings data for a specific Elementor element. Use filter to reduce output: 'layout' returns only flex/width/overflow/gap/padding/margin keys, 'responsive' returns only _mobile/_tablet variants, 'all' returns everything.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z
        .string()
        .describe("Elementor element ID (7-8 char hex string)"),
      filter: z
        .enum(["all", "layout", "responsive"])
        .optional()
        .default("all")
        .describe(
          "Filter settings: 'all' (default), 'layout' (flex/width/overflow/gap/padding/margin), 'responsive' (only _mobile/_tablet keys)"
        ),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, elementId, filter }) => {
    const result = await elementor.getElement(
      postId,
      elementId,
      filter ?? "all"
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_find_elements",
  {
    title: "Search Elements",
    description:
      "Search for elements within a page by widget type, CSS class, element ID, or content text. All filters are combined with AND logic.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      widgetType: z
        .string()
        .optional()
        .describe(
          "Filter by widget type (e.g. heading, html, image, text-editor, video, form)"
        ),
      cssClass: z
        .string()
        .optional()
        .describe("Filter by CSS class name (partial match)"),
      elementId: z
        .string()
        .optional()
        .describe("Filter by custom element ID (_element_id setting)"),
      contentText: z
        .string()
        .optional()
        .describe(
          "Search in element content text (case-insensitive, searches title/html/editor/custom_css)"
        ),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, widgetType, cssClass, elementId, contentText }) => {
    const results = await elementor.findElements(postId, {
      widgetType,
      cssClass,
      elementId,
      contentText,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_list_templates",
  {
    title: "List Elementor Templates",
    description:
      "List all Elementor library templates (sections, pages, containers saved to template library).",
    inputSchema: {},
    annotations: READ_ONLY,
  },
  async () => {
    const templates = await elementor.listTemplates();
    return {
      content: [{ type: "text", text: JSON.stringify(templates, null, 2) }],
    };
  }
);

// ─── New Read Tools ──────────────────────────────────────

server.registerTool(
  "elementor_get_element_context",
  {
    title: "Get Element Layout Context",
    description:
      "Get an element with full layout context: its own settings, all ancestor containers' layout settings (flex_direction, width, overflow, gap, margin, padding + mobile variants), and sibling element summaries. Essential for debugging layout and spacing issues.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z.string().describe("Elementor element ID"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, elementId }) => {
    const result = await elementor.getElementContext(postId, elementId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_responsive_diff",
  {
    title: "Get Responsive Settings Diff",
    description:
      "Show desktop vs tablet vs mobile settings diff for an element. Groups settings by breakpoint and lists which keys have mobile/tablet overrides. Use this to quickly identify responsive issues.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z.string().describe("Elementor element ID"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, elementId }) => {
    const result = await elementor.getResponsiveDiff(postId, elementId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_layout_debug",
  {
    title: "Debug Container Layout",
    description:
      "For a container element, show its flex layout settings and all children's layout properties (width, flex_direction, overflow, margin, padding + mobile variants) in a compact table format. Perfect for debugging flex layout, overflow, and spacing issues.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      containerId: z.string().describe("Container element ID"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, containerId }) => {
    const result = await elementor.getLayoutDebug(postId, containerId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_page_css",
  {
    title: "Get Page CSS Sources",
    description:
      "Read all CSS sources that affect a page: WordPress Additional CSS (Customizer), Elementor page-level custom CSS, and Elementor global CSS. Returns the full CSS text of each source.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId }) => {
    const result = await elementor.getPageCss(postId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_global_kit",
  {
    title: "Get Global Kit Settings",
    description:
      "Read the Elementor active kit's global settings: system/custom colors, system/custom typography (fonts), container width default, widget spacing, page background color, body typography, and ALL kit settings. Essential for understanding the site's design tokens.",
    inputSchema: {},
    annotations: READ_ONLY,
  },
  async () => {
    const result = await elementor.getGlobalKit();
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_compiled_css",
  {
    title: "Get Compiled CSS",
    description:
      "Read the Elementor-compiled CSS file for a page (post-{id}.css from /uploads/elementor/css/). Optionally filter to only rules matching a specific element ID. Use this to see the actual CSS Elementor generates from element settings.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z
        .string()
        .optional()
        .describe(
          "Optional: filter CSS to only rules matching this element ID"
        ),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, elementId }) => {
    const result = await elementor.getCompiledCss(postId, elementId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_get_element_selector",
  {
    title: "Get Element CSS Selectors",
    description:
      "Get the CSS selectors for an element (.elementor-element-{id} for outer, > .elementor-widget-container for widgets) and find all matching CSS rules from both WordPress Additional CSS and Elementor compiled CSS. Essential for understanding what CSS actually applies to an element.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z.string().describe("Elementor element ID"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId, elementId }) => {
    const result = await elementor.getElementSelector(postId, elementId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ═══════════════════════════════════════════════════════════
// WRITE TOOLS
// ═══════════════════════════════════════════════════════════

server.registerTool(
  "elementor_update_element",
  {
    title: "Update Element Settings",
    description:
      "Update specific settings on an Elementor element. Uses merge semantics — only the specified keys are updated, other settings are preserved. Automatically clears the page CSS cache after update.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z.string().describe("Elementor element ID to update"),
      settings: z
        .record(z.unknown())
        .describe(
          "Settings key-value pairs to merge into the element's settings"
        ),
    },
    annotations: WRITE_SAFE,
  },
  async ({ postId, elementId, settings }) => {
    const result = await elementor.updateElement(postId, elementId, settings);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_update_html_widget",
  {
    title: "Update HTML Widget",
    description:
      "Update an HTML widget's content. Safely handles HTML containing <script> tags, quotes, and special characters via base64 encoding. Optionally update custom CSS too.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z
        .string()
        .describe("Elementor element ID of the HTML widget"),
      htmlContent: z.string().describe("New HTML content for the widget"),
      customCss: z
        .string()
        .optional()
        .describe("Optional custom CSS to set on the widget"),
    },
    annotations: WRITE_IDEMPOTENT,
  },
  async ({ postId, elementId, htmlContent, customCss }) => {
    const result = await elementor.updateHtmlWidget(
      postId,
      elementId,
      htmlContent,
      customCss
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_update_page_css",
  {
    title: "Update WordPress Additional CSS",
    description:
      "Write to WordPress Additional CSS (Customizer). Use 'append' mode to add new rules after existing CSS, or 'replace' mode to overwrite all CSS. Automatically clears Elementor cache after update.",
    inputSchema: {
      css: z.string().describe("CSS content to write"),
      mode: z
        .enum(["append", "replace"])
        .optional()
        .default("append")
        .describe("'append' adds to existing CSS (default), 'replace' overwrites all"),
    },
    annotations: WRITE_SAFE,
  },
  async ({ css, mode }) => {
    const result = await elementor.updatePageCss(css, mode ?? "append");
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_clear_cache",
  {
    title: "Clear Elementor Cache",
    description:
      "Clear all Elementor CSS cache files. Run this after making changes if the frontend doesn't reflect updates.",
    inputSchema: {},
    annotations: WRITE_IDEMPOTENT,
  },
  async () => {
    const output = await elementor.clearCache();
    return {
      content: [
        {
          type: "text",
          text: output || "Elementor CSS cache cleared successfully.",
        },
      ],
    };
  }
);

// ═══════════════════════════════════════════════════════════
// PHASE 1: CRUD COMPLETION TOOLS
// ═══════════════════════════════════════════════════════════

server.registerTool(
  "elementor_add_element",
  {
    title: "Add Element",
    description:
      "Add a new element (container or widget) into a target container. Creates the element with specified settings and inserts at the given position. Returns the new element's auto-generated ID.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      containerId: z
        .string()
        .describe("Target container element ID to insert into"),
      elType: z
        .enum(["container", "widget"])
        .describe("Element type: 'container' for layout, 'widget' for content"),
      widgetType: z
        .string()
        .optional()
        .describe(
          "Widget type (required when elType='widget'). E.g. heading, text-editor, image, html, button, video"
        ),
      settings: z
        .record(z.unknown())
        .optional()
        .default({})
        .describe("Initial settings for the new element"),
      position: z
        .number()
        .optional()
        .describe(
          "Insert position (0-based index). Omit to append at end."
        ),
    },
    annotations: WRITE_SAFE,
  },
  async ({ postId, containerId, elType, widgetType, settings, position }) => {
    const result = await elementor.addElement(
      postId,
      containerId,
      elType,
      widgetType,
      settings ?? {},
      position
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_delete_element",
  {
    title: "Delete Element",
    description:
      "Delete an element and all its children from a page. This is destructive and cannot be undone. Returns the parent container ID.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z.string().describe("Element ID to delete"),
    },
    annotations: WRITE_DESTRUCTIVE,
  },
  async ({ postId, elementId }) => {
    const result = await elementor.deleteElement(postId, elementId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_move_element",
  {
    title: "Move Element",
    description:
      "Move an element to a different container or reorder within the same container. The element is removed from its current location and inserted at the specified position in the target container.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID"),
      elementId: z.string().describe("Element ID to move"),
      targetContainerId: z
        .string()
        .describe(
          "Target container ID (can be the same container for reordering)"
        ),
      position: z
        .number()
        .optional()
        .describe("Insert position in target container (0-based). Omit to append."),
    },
    annotations: WRITE_SAFE,
  },
  async ({ postId, elementId, targetContainerId, position }) => {
    const result = await elementor.moveElement(
      postId,
      elementId,
      targetContainerId,
      position
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_update_global_kit",
  {
    title: "Update Global Kit",
    description:
      "Update Elementor global design tokens (colors, typography, container width, widget spacing, etc.). Uses merge semantics — only specified keys are updated. Clears Elementor cache after update.",
    inputSchema: {
      settings: z
        .record(z.unknown())
        .describe(
          "Settings key-value pairs to merge into the global kit. Common keys: system_colors, custom_colors, system_typography, custom_typography, container_width, space_between_widgets"
        ),
    },
    annotations: WRITE_SAFE,
  },
  async ({ settings }) => {
    const result = await elementor.updateGlobalKit(settings);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ═══════════════════════════════════════════════════════════
// PHASE 2: SEARCH & EFFICIENCY TOOLS
// ═══════════════════════════════════════════════════════════

server.registerTool(
  "elementor_search_all_pages",
  {
    title: "Search All Pages",
    description:
      "Search for elements across ALL Elementor pages at once. Supports the same filters as elementor_find_elements (widget type, CSS class, element ID, content text). Returns results grouped by page.",
    inputSchema: {
      widgetType: z
        .string()
        .optional()
        .describe("Filter by widget type (e.g. heading, html, image)"),
      cssClass: z
        .string()
        .optional()
        .describe("Filter by CSS class name (partial match)"),
      elementId: z
        .string()
        .optional()
        .describe("Filter by custom element ID (_element_id setting)"),
      contentText: z
        .string()
        .optional()
        .describe(
          "Search in element content text (case-insensitive)"
        ),
    },
    annotations: READ_ONLY,
  },
  async ({ widgetType, cssClass, elementId, contentText }) => {
    const results = await elementor.searchAllPages({
      widgetType,
      cssClass,
      elementId,
      contentText,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_clone_element",
  {
    title: "Clone Element",
    description:
      "Deep-clone an element (including all children) with new unique IDs. Can clone within the same page (inserts after original) or to a different page/container. Perfect for duplicating complex layouts.",
    inputSchema: {
      postId: z.number().describe("Source page ID"),
      elementId: z.string().describe("Element ID to clone"),
      targetContainerId: z
        .string()
        .optional()
        .describe(
          "Target container ID (required for cross-page clone, optional for same-page)"
        ),
      targetPostId: z
        .number()
        .optional()
        .describe(
          "Target page ID for cross-page clone. Omit for same-page clone."
        ),
    },
    annotations: WRITE_SAFE,
  },
  async ({ postId, elementId, targetContainerId, targetPostId }) => {
    const result = await elementor.cloneElement(
      postId,
      elementId,
      targetContainerId,
      targetPostId
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.registerTool(
  "elementor_export_page",
  {
    title: "Export Page Data",
    description:
      "Export a page's complete Elementor data as JSON. Returns the raw elementor_data array, page settings, and element count. Useful for backup, migration, or analysis.",
    inputSchema: {
      postId: z.number().describe("WordPress post/page ID to export"),
    },
    annotations: READ_ONLY,
  },
  async ({ postId }) => {
    const result = await elementor.exportPage(postId);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ─── Start Server ────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Elementor MCP Server v4.0 running on stdio (23 tools) — mode: ${mode}, target: ${info}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
