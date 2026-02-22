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
  AddElementResult,
  DeleteElementResult,
  MoveElementResult,
  UpdateGlobalKitResult,
  CrossPageSearchResult,
  CloneElementResult,
  ExportPageResult,
} from "./types.js";
import type { ElementorBackend } from "./backend.js";

export class ElementorService {
  private backend: ElementorBackend;

  constructor(backend: ElementorBackend) {
    this.backend = backend;
  }

  // ─── Read Methods ─────────────────────────────────────────

  async listPages(): Promise<ElementorPageInfo[]> {
    const raw = await this.backend.listPages();
    return JSON.parse(raw);
  }

  async getPageTree(
    postId: number
  ): Promise<{ postId: number; tree: unknown[] }> {
    const raw = await this.backend.getPageTree(postId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getElement(
    postId: number,
    elementId: string,
    filter: "all" | "layout" | "responsive" = "all"
  ): Promise<{ element: unknown; path: string[]; filter?: string }> {
    const raw = await this.backend.getElement(postId, elementId, filter);
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
    const raw = await this.backend.findElements(postId, filters);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async listTemplates(): Promise<ElementorTemplateInfo[]> {
    const raw = await this.backend.listTemplates();
    return JSON.parse(raw);
  }

  async getElementContext(
    postId: number,
    elementId: string
  ): Promise<ElementContext> {
    const raw = await this.backend.getElementContext(postId, elementId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getResponsiveDiff(
    postId: number,
    elementId: string
  ): Promise<ResponsiveDiff> {
    const raw = await this.backend.getResponsiveDiff(postId, elementId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getLayoutDebug(
    postId: number,
    containerId: string
  ): Promise<LayoutDebugInfo> {
    const raw = await this.backend.getLayoutDebug(postId, containerId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getPageCss(postId: number): Promise<PageCssInfo> {
    const raw = await this.backend.getPageCss(postId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getGlobalKit(): Promise<GlobalKitInfo> {
    const raw = await this.backend.getGlobalKit();
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getCompiledCss(
    postId: number,
    elementId?: string
  ): Promise<CompiledCssInfo> {
    const raw = await this.backend.getCompiledCss(postId, elementId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async getElementSelector(
    postId: number,
    elementId: string
  ): Promise<ElementSelectorInfo> {
    const raw = await this.backend.getElementSelector(postId, elementId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  // ─── Write Methods ────────────────────────────────────────

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
    const raw = await this.backend.updateElement(postId, elementId, settingsJson);
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
    const raw = await this.backend.updateHtmlWidget(postId, elementId, htmlContent, customCss);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async updatePageCss(
    css: string,
    mode: "append" | "replace" = "append"
  ): Promise<{
    success: boolean;
    mode: string;
    cssLength: number;
    previousLength: number;
  }> {
    const raw = await this.backend.updatePageCss(css, mode);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async clearCache(): Promise<string> {
    const raw = await this.backend.clearCache();
    const result = JSON.parse(raw);
    return result.message || "Elementor CSS cache cleared successfully.";
  }

  // ─── Phase 1: CRUD Completion ────────────────────────────

  async addElement(
    postId: number,
    containerId: string,
    elType: string,
    widgetType?: string,
    settings?: Record<string, unknown>,
    position?: number
  ): Promise<AddElementResult> {
    const settingsJson = JSON.stringify(settings ?? {});
    const raw = await this.backend.addElement(
      postId, containerId, elType, widgetType, settingsJson, position
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async deleteElement(
    postId: number,
    elementId: string
  ): Promise<DeleteElementResult> {
    const raw = await this.backend.deleteElement(postId, elementId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async moveElement(
    postId: number,
    elementId: string,
    targetContainerId: string,
    position?: number
  ): Promise<MoveElementResult> {
    const raw = await this.backend.moveElement(
      postId, elementId, targetContainerId, position
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async updateGlobalKit(
    settings: Record<string, unknown>
  ): Promise<UpdateGlobalKitResult> {
    const settingsJson = JSON.stringify(settings);
    const raw = await this.backend.updateGlobalKit(settingsJson);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  // ─── Phase 2: Search & Efficiency ────────────────────────

  async searchAllPages(
    filters: {
      widgetType?: string;
      cssClass?: string;
      elementId?: string;
      contentText?: string;
    }
  ): Promise<CrossPageSearchResult> {
    const raw = await this.backend.searchAllPages(filters);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async cloneElement(
    postId: number,
    elementId: string,
    targetContainerId?: string,
    targetPostId?: number
  ): Promise<CloneElementResult> {
    const raw = await this.backend.cloneElement(
      postId, elementId, targetContainerId, targetPostId
    );
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }

  async exportPage(postId: number): Promise<ExportPageResult> {
    const raw = await this.backend.exportPage(postId);
    const result = JSON.parse(raw);
    if (result.error) throw new Error(result.error);
    return result;
  }
}
