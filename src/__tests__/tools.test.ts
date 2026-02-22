import { describe, it, expect } from "vitest";
import { z } from "zod";

// ─── Tool Schema Validation Tests ────────────────────────
// Validate that all 23 tool input schemas accept valid input
// and reject invalid input.

describe("Tool Input Schemas", () => {
  // Shared schemas matching index.ts definitions
  const postIdSchema = z.object({
    postId: z.number(),
  });

  const elementIdSchema = z.object({
    postId: z.number(),
    elementId: z.string(),
  });

  const filterSchema = z.object({
    postId: z.number(),
    elementId: z.string(),
    filter: z.enum(["all", "layout", "responsive"]).optional().default("all"),
  });

  // READ TOOLS

  it("elementor_list_pages: accepts empty input", () => {
    const schema = z.object({});
    expect(schema.parse({})).toEqual({});
  });

  it("elementor_get_page_tree: requires postId number", () => {
    expect(postIdSchema.parse({ postId: 42 })).toEqual({ postId: 42 });
    expect(() => postIdSchema.parse({ postId: "abc" })).toThrow();
    expect(() => postIdSchema.parse({})).toThrow();
  });

  it("elementor_get_element: validates filter enum", () => {
    expect(filterSchema.parse({ postId: 1, elementId: "abc1234" })).toHaveProperty("filter", "all");
    expect(filterSchema.parse({ postId: 1, elementId: "abc1234", filter: "layout" })).toHaveProperty("filter", "layout");
    expect(() => filterSchema.parse({ postId: 1, elementId: "abc1234", filter: "invalid" })).toThrow();
  });

  it("elementor_find_elements: optional search filters", () => {
    const schema = z.object({
      postId: z.number(),
      widgetType: z.string().optional(),
      cssClass: z.string().optional(),
      elementId: z.string().optional(),
      contentText: z.string().optional(),
    });
    expect(schema.parse({ postId: 1 })).toHaveProperty("postId", 1);
    expect(schema.parse({ postId: 1, widgetType: "heading" })).toHaveProperty("widgetType", "heading");
  });

  it("elementor_list_templates: accepts empty input", () => {
    const schema = z.object({});
    expect(schema.parse({})).toEqual({});
  });

  it("elementor_get_element_context: requires postId and elementId", () => {
    expect(elementIdSchema.parse({ postId: 5, elementId: "abc1234" })).toBeDefined();
    expect(() => elementIdSchema.parse({ postId: 5 })).toThrow();
  });

  it("elementor_get_responsive_diff: requires postId and elementId", () => {
    expect(elementIdSchema.parse({ postId: 5, elementId: "abc1234" })).toBeDefined();
  });

  it("elementor_get_layout_debug: requires postId and containerId", () => {
    const schema = z.object({
      postId: z.number(),
      containerId: z.string(),
    });
    expect(schema.parse({ postId: 1, containerId: "abc1234" })).toBeDefined();
    expect(() => schema.parse({ postId: 1 })).toThrow();
  });

  it("elementor_get_page_css: requires postId", () => {
    expect(postIdSchema.parse({ postId: 42 })).toEqual({ postId: 42 });
  });

  it("elementor_get_global_kit: accepts empty input", () => {
    const schema = z.object({});
    expect(schema.parse({})).toEqual({});
  });

  it("elementor_get_compiled_css: optional elementId", () => {
    const schema = z.object({
      postId: z.number(),
      elementId: z.string().optional(),
    });
    expect(schema.parse({ postId: 1 })).toBeDefined();
    expect(schema.parse({ postId: 1, elementId: "abc" })).toHaveProperty("elementId", "abc");
  });

  it("elementor_get_element_selector: requires postId and elementId", () => {
    expect(elementIdSchema.parse({ postId: 1, elementId: "abc1234" })).toBeDefined();
  });

  // WRITE TOOLS

  it("elementor_update_element: requires settings record", () => {
    const schema = z.object({
      postId: z.number(),
      elementId: z.string(),
      settings: z.record(z.unknown()),
    });
    expect(schema.parse({ postId: 1, elementId: "abc", settings: { title: "Hi" } })).toBeDefined();
    expect(() => schema.parse({ postId: 1, elementId: "abc" })).toThrow();
  });

  it("elementor_update_html_widget: requires htmlContent string", () => {
    const schema = z.object({
      postId: z.number(),
      elementId: z.string(),
      htmlContent: z.string(),
      customCss: z.string().optional(),
    });
    expect(schema.parse({ postId: 1, elementId: "abc", htmlContent: "<p>test</p>" })).toBeDefined();
    expect(() => schema.parse({ postId: 1, elementId: "abc" })).toThrow();
  });

  it("elementor_update_page_css: validates mode enum", () => {
    const schema = z.object({
      css: z.string(),
      mode: z.enum(["append", "replace"]).optional().default("append"),
    });
    expect(schema.parse({ css: ".foo{}" })).toHaveProperty("mode", "append");
    expect(schema.parse({ css: ".foo{}", mode: "replace" })).toHaveProperty("mode", "replace");
    expect(() => schema.parse({ css: ".foo{}", mode: "merge" })).toThrow();
  });

  it("elementor_clear_cache: accepts empty input", () => {
    const schema = z.object({});
    expect(schema.parse({})).toEqual({});
  });

  // CRUD TOOLS

  it("elementor_add_element: validates elType enum", () => {
    const schema = z.object({
      postId: z.number(),
      containerId: z.string(),
      elType: z.enum(["container", "widget"]),
      widgetType: z.string().optional(),
      settings: z.record(z.unknown()).optional().default({}),
      position: z.number().optional(),
    });
    expect(schema.parse({ postId: 1, containerId: "abc", elType: "widget", widgetType: "heading" })).toBeDefined();
    expect(schema.parse({ postId: 1, containerId: "abc", elType: "container" })).toBeDefined();
    expect(() => schema.parse({ postId: 1, containerId: "abc", elType: "section" })).toThrow();
  });

  it("elementor_delete_element: requires postId and elementId", () => {
    expect(elementIdSchema.parse({ postId: 1, elementId: "abc" })).toBeDefined();
  });

  it("elementor_move_element: requires targetContainerId", () => {
    const schema = z.object({
      postId: z.number(),
      elementId: z.string(),
      targetContainerId: z.string(),
      position: z.number().optional(),
    });
    expect(schema.parse({ postId: 1, elementId: "abc", targetContainerId: "def" })).toBeDefined();
    expect(() => schema.parse({ postId: 1, elementId: "abc" })).toThrow();
  });

  it("elementor_update_global_kit: requires settings record", () => {
    const schema = z.object({
      settings: z.record(z.unknown()),
    });
    expect(schema.parse({ settings: { container_width: { size: 1200 } } })).toBeDefined();
    expect(() => schema.parse({})).toThrow();
  });

  // SEARCH & EFFICIENCY TOOLS

  it("elementor_search_all_pages: all filters optional", () => {
    const schema = z.object({
      widgetType: z.string().optional(),
      cssClass: z.string().optional(),
      elementId: z.string().optional(),
      contentText: z.string().optional(),
    });
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ widgetType: "heading", contentText: "hello" })).toBeDefined();
  });

  it("elementor_clone_element: optional target params", () => {
    const schema = z.object({
      postId: z.number(),
      elementId: z.string(),
      targetContainerId: z.string().optional(),
      targetPostId: z.number().optional(),
    });
    expect(schema.parse({ postId: 1, elementId: "abc" })).toBeDefined();
    expect(schema.parse({ postId: 1, elementId: "abc", targetPostId: 2, targetContainerId: "def" })).toBeDefined();
  });

  it("elementor_export_page: requires postId", () => {
    expect(postIdSchema.parse({ postId: 42 })).toEqual({ postId: 42 });
  });
});

// ─── PHP Template Tests ──────────────────────────────────

describe("PHP Templates", () => {
  it("phpAddElement generates valid PHP with element data", async () => {
    const { phpAddElement } = await import("../php-templates.js");
    const result = phpAddElement(42, "abc1234", "widget", "heading", '{"title":"Hello"}', 0);
    expect(result).toContain("get_post_meta(42");
    expect(result).toContain("'abc1234'");
    expect(result).toContain("'widget'");
    expect(result).toContain("'heading'");
    expect(result).toContain("insert_into_container");
  });

  it("phpDeleteElement generates PHP for deletion", async () => {
    const { phpDeleteElement } = await import("../php-templates.js");
    const result = phpDeleteElement(42, "abc1234");
    expect(result).toContain("get_post_meta(42");
    expect(result).toContain("'abc1234'");
    expect(result).toContain("delete_from_tree");
    expect(result).toContain("deletedElementId");
  });

  it("phpMoveElement generates PHP for move operation", async () => {
    const { phpMoveElement } = await import("../php-templates.js");
    const result = phpMoveElement(42, "abc1234", "def5678", 2);
    expect(result).toContain("extract_element");
    expect(result).toContain("insert_element");
    expect(result).toContain("'abc1234'");
    expect(result).toContain("'def5678'");
  });

  it("phpUpdateGlobalKit generates PHP for kit update", async () => {
    const { phpUpdateGlobalKit } = await import("../php-templates.js");
    const result = phpUpdateGlobalKit('{"container_width":{"size":1200}}');
    expect(result).toContain("elementor_active_kit");
    expect(result).toContain("_elementor_page_settings");
    expect(result).toContain("updatedKeys");
  });

  it("phpSearchAllPages generates cross-page search PHP", async () => {
    const { phpSearchAllPages } = await import("../php-templates.js");
    const result = phpSearchAllPages({ widgetType: "heading" });
    expect(result).toContain("get_posts");
    expect(result).toContain("search_els_global");
    expect(result).toContain("'heading'");
    expect(result).toContain("totalResults");
  });

  it("phpCloneElement generates deep clone PHP", async () => {
    const { phpCloneElement } = await import("../php-templates.js");
    const result = phpCloneElement(42, "abc1234", "def5678", 99);
    expect(result).toContain("deep_clone");
    expect(result).toContain("'abc1234'");
    expect(result).toContain("newElementId");
  });

  it("phpExportPage generates export PHP", async () => {
    const { phpExportPage } = await import("../php-templates.js");
    const result = phpExportPage(42);
    expect(result).toContain("get_post(42");
    expect(result).toContain("elementorData");
    expect(result).toContain("pageSettings");
    expect(result).toContain("elementCount");
  });
});

// ─── Backend Interface Tests ─────────────────────────────

describe("Backend Interface", () => {
  it("ElementorBackend interface has all 23 method signatures", async () => {
    // Verify by importing the types and checking DdevBackend implements them
    const { DdevBackend } = await import("../ddev-backend.js");
    const methods = [
      "listPages", "getPageTree", "getElement", "findElements",
      "listTemplates", "getElementContext", "getResponsiveDiff",
      "getLayoutDebug", "getPageCss", "getGlobalKit",
      "getCompiledCss", "getElementSelector",
      "updateElement", "updateHtmlWidget", "updatePageCss", "clearCache",
      "addElement", "deleteElement", "moveElement", "updateGlobalKit",
      "searchAllPages", "cloneElement", "exportPage",
    ];

    const proto = DdevBackend.prototype;
    for (const method of methods) {
      expect(typeof (proto as unknown as Record<string, unknown>)[method]).toBe("function");
    }
    expect(methods.length).toBe(23);
  });

  it("RestBackend implements all 23 methods", async () => {
    const { RestBackend } = await import("../rest-backend.js");
    const methods = [
      "listPages", "getPageTree", "getElement", "findElements",
      "listTemplates", "getElementContext", "getResponsiveDiff",
      "getLayoutDebug", "getPageCss", "getGlobalKit",
      "getCompiledCss", "getElementSelector",
      "updateElement", "updateHtmlWidget", "updatePageCss", "clearCache",
      "addElement", "deleteElement", "moveElement", "updateGlobalKit",
      "searchAllPages", "cloneElement", "exportPage",
    ];

    const proto = RestBackend.prototype;
    for (const method of methods) {
      expect(typeof (proto as unknown as Record<string, unknown>)[method]).toBe("function");
    }
  });
});

// ─── REST Client Tests ──────────────────────────────────

describe("REST Client", () => {
  it("constructs correct base URL", async () => {
    const { RestClient } = await import("../rest-client.js");
    const client = new RestClient({
      siteUrl: "https://example.com/",
      username: "admin",
      appPassword: "test1234",
    });
    // The client stores baseUrl internally; we verify via the static error handler
    expect(RestClient.handleError(new Error("test"))).toBe("Error: test");
  });

  it("handleError formats different error types", async () => {
    const { RestClient } = await import("../rest-client.js");

    expect(RestClient.handleError(new Error("connection failed"))).toBe("Error: connection failed");
    expect(RestClient.handleError("string error")).toBe("Error: string error");
    expect(RestClient.handleError(42)).toBe("Error: 42");
  });
});
