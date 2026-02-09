import { WpCli } from "./wp-cli.js";
import * as php from "./php-templates.js";
import type {
  ElementorPageInfo,
  ElementorTemplateInfo,
  ElementContext,
  ResponsiveDiff,
  LayoutDebugInfo,
  PageCssInfo,
  GlobalKitInfo,
  CompiledCssInfo,
  ElementSelectorInfo,
} from "./types.js";

export class ElementorService {
  private wp: WpCli;

  constructor(projectDir: string) {
    this.wp = new WpCli(projectDir);
  }

  // ─── Existing Read Methods ──────────────────────────────

  async listPages(): Promise<ElementorPageInfo[]> {
    const raw = await this.wp.evalFile(php.phpListPages());
    return JSON.parse(raw);
  }

  async getPageTree(
    postId: number
  ): Promise<{ postId: number; tree: unknown[] }> {
    const raw = await this.wp.evalFile(php.phpGetPageTree(postId));
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getElement(
    postId: number,
    elementId: string,
    filter: "all" | "layout" | "responsive" = "all"
  ): Promise<{ element: unknown; path: string[]; filter?: string }> {
    const raw = await this.wp.evalFile(
      php.phpGetElement(postId, elementId, filter)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async findElements(
    postId: number,
    filters: {
      widgetType?: string;
      cssClass?: string;
      elementId?: string;
      contentText?: string;
    }
  ): Promise<{ postId: number; results: unknown[]; count: number }> {
    const raw = await this.wp.evalFile(
      php.phpFindElements(postId, filters)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async listTemplates(): Promise<ElementorTemplateInfo[]> {
    const raw = await this.wp.evalFile(php.phpListTemplates());
    return JSON.parse(raw);
  }

  // ─── New Read Methods ───────────────────────────────────

  async getElementContext(
    postId: number,
    elementId: string
  ): Promise<ElementContext> {
    const raw = await this.wp.evalFile(
      php.phpGetElementContext(postId, elementId)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getResponsiveDiff(
    postId: number,
    elementId: string
  ): Promise<ResponsiveDiff> {
    const raw = await this.wp.evalFile(
      php.phpGetResponsiveDiff(postId, elementId)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getLayoutDebug(
    postId: number,
    containerId: string
  ): Promise<LayoutDebugInfo> {
    const raw = await this.wp.evalFile(
      php.phpGetLayoutDebug(postId, containerId)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getPageCss(postId: number): Promise<PageCssInfo> {
    const raw = await this.wp.evalFile(php.phpGetPageCss(postId));
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getGlobalKit(): Promise<GlobalKitInfo> {
    const raw = await this.wp.evalFile(php.phpGetGlobalKit());
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getCompiledCss(
    postId: number,
    elementId?: string
  ): Promise<CompiledCssInfo> {
    const raw = await this.wp.evalFile(
      php.phpGetCompiledCss(postId, elementId)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getElementSelector(
    postId: number,
    elementId: string
  ): Promise<ElementSelectorInfo> {
    const raw = await this.wp.evalFile(
      php.phpGetElementSelector(postId, elementId)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  // ─── Existing Write Methods ─────────────────────────────

  async updateElement(
    postId: number,
    elementId: string,
    settings: Record<string, unknown>
  ): Promise<{
    success: boolean;
    postId: number;
    elementId: string;
    updatedKeys: string[];
  }> {
    const settingsJson = JSON.stringify(settings);
    const raw = await this.wp.evalFile(
      php.phpUpdateElement(postId, elementId, settingsJson)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async updateHtmlWidget(
    postId: number,
    elementId: string,
    htmlContent: string,
    customCss?: string
  ): Promise<{
    success: boolean;
    postId: number;
    elementId: string;
    htmlLength: number;
    cssUpdated: boolean;
  }> {
    const raw = await this.wp.evalFile(
      php.phpUpdateHtmlWidget(postId, elementId, htmlContent, customCss)
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  // ─── New Write Methods ──────────────────────────────────

  async updatePageCss(
    css: string,
    mode: "append" | "replace" = "append"
  ): Promise<{
    success: boolean;
    mode: string;
    cssLength: number;
    previousLength: number;
  }> {
    const raw = await this.wp.evalFile(php.phpUpdatePageCss(css, mode));
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async clearCache(): Promise<string> {
    return await this.wp.command("elementor flush_css");
  }
}
