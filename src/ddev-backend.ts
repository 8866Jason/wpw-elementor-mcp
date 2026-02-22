import { WpCli } from "./wp-cli.js";
import * as php from "./php-templates.js";
import type { ElementorBackend, FindElementsFilters } from "./backend.js";

export class DdevBackend implements ElementorBackend {
  private wp: WpCli;

  constructor(projectDir: string) {
    this.wp = new WpCli(projectDir);
  }

  async listPages(): Promise<string> {
    return await this.wp.evalFile(php.phpListPages());
  }

  async getPageTree(postId: number): Promise<string> {
    return await this.wp.evalFile(php.phpGetPageTree(postId));
  }

  async getElement(postId: number, elementId: string, filter: string): Promise<string> {
    return await this.wp.evalFile(php.phpGetElement(postId, elementId, filter as "all" | "layout" | "responsive"));
  }

  async findElements(postId: number, filters: FindElementsFilters): Promise<string> {
    return await this.wp.evalFile(php.phpFindElements(postId, filters));
  }

  async listTemplates(): Promise<string> {
    return await this.wp.evalFile(php.phpListTemplates());
  }

  async getElementContext(postId: number, elementId: string): Promise<string> {
    return await this.wp.evalFile(php.phpGetElementContext(postId, elementId));
  }

  async getResponsiveDiff(postId: number, elementId: string): Promise<string> {
    return await this.wp.evalFile(php.phpGetResponsiveDiff(postId, elementId));
  }

  async getLayoutDebug(postId: number, containerId: string): Promise<string> {
    return await this.wp.evalFile(php.phpGetLayoutDebug(postId, containerId));
  }

  async getPageCss(postId: number): Promise<string> {
    return await this.wp.evalFile(php.phpGetPageCss(postId));
  }

  async getGlobalKit(): Promise<string> {
    return await this.wp.evalFile(php.phpGetGlobalKit());
  }

  async getCompiledCss(postId: number, elementId?: string): Promise<string> {
    return await this.wp.evalFile(php.phpGetCompiledCss(postId, elementId));
  }

  async getElementSelector(postId: number, elementId: string): Promise<string> {
    return await this.wp.evalFile(php.phpGetElementSelector(postId, elementId));
  }

  async updateElement(postId: number, elementId: string, settingsJson: string): Promise<string> {
    return await this.wp.evalFile(php.phpUpdateElement(postId, elementId, settingsJson));
  }

  async updateHtmlWidget(postId: number, elementId: string, htmlContent: string, customCss?: string): Promise<string> {
    return await this.wp.evalFile(php.phpUpdateHtmlWidget(postId, elementId, htmlContent, customCss));
  }

  async updatePageCss(css: string, mode: string): Promise<string> {
    return await this.wp.evalFile(php.phpUpdatePageCss(css, mode as "append" | "replace"));
  }

  async clearCache(): Promise<string> {
    const output = await this.wp.command("elementor flush_css");
    return JSON.stringify({ success: true, message: output || "Elementor CSS cache cleared" });
  }

  // Phase 1: CRUD completion
  async addElement(postId: number, containerId: string, elType: string, widgetType: string | undefined, settingsJson: string, position: number | undefined): Promise<string> {
    return await this.wp.evalFile(php.phpAddElement(postId, containerId, elType, widgetType, settingsJson, position));
  }

  async deleteElement(postId: number, elementId: string): Promise<string> {
    return await this.wp.evalFile(php.phpDeleteElement(postId, elementId));
  }

  async moveElement(postId: number, elementId: string, targetContainerId: string, position: number | undefined): Promise<string> {
    return await this.wp.evalFile(php.phpMoveElement(postId, elementId, targetContainerId, position));
  }

  async updateGlobalKit(settingsJson: string): Promise<string> {
    return await this.wp.evalFile(php.phpUpdateGlobalKit(settingsJson));
  }

  // Phase 2: Search & efficiency
  async searchAllPages(filters: FindElementsFilters): Promise<string> {
    return await this.wp.evalFile(php.phpSearchAllPages(filters));
  }

  async cloneElement(postId: number, elementId: string, targetContainerId: string | undefined, targetPostId: number | undefined): Promise<string> {
    return await this.wp.evalFile(php.phpCloneElement(postId, elementId, targetContainerId, targetPostId));
  }

  async exportPage(postId: number): Promise<string> {
    return await this.wp.evalFile(php.phpExportPage(postId));
  }
}
