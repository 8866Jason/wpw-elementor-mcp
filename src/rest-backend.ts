import { RestClient } from "./rest-client.js";
import type { ElementorBackend, FindElementsFilters, RestConfig } from "./backend.js";

export class RestBackend implements ElementorBackend {
  private client: RestClient;

  constructor(config: RestConfig) {
    this.client = new RestClient(config);
  }

  async listPages(): Promise<string> {
    const data = await this.client.get("pages");
    return JSON.stringify(data);
  }

  async getPageTree(postId: number): Promise<string> {
    const data = await this.client.get(`pages/${postId}/tree`);
    return JSON.stringify(data);
  }

  async getElement(postId: number, elementId: string, filter: string): Promise<string> {
    const data = await this.client.get(`pages/${postId}/elements/${elementId}`, { filter });
    return JSON.stringify(data);
  }

  async findElements(postId: number, filters: FindElementsFilters): Promise<string> {
    const params: Record<string, unknown> = {};
    if (filters.widgetType) params.widgetType = filters.widgetType;
    if (filters.cssClass) params.cssClass = filters.cssClass;
    if (filters.elementId) params.elementId = filters.elementId;
    if (filters.contentText) params.contentText = filters.contentText;
    const data = await this.client.get(`pages/${postId}/find`, params);
    return JSON.stringify(data);
  }

  async listTemplates(): Promise<string> {
    const data = await this.client.get("templates");
    return JSON.stringify(data);
  }

  async getElementContext(postId: number, elementId: string): Promise<string> {
    const data = await this.client.get(`pages/${postId}/elements/${elementId}/context`);
    return JSON.stringify(data);
  }

  async getResponsiveDiff(postId: number, elementId: string): Promise<string> {
    const data = await this.client.get(`pages/${postId}/elements/${elementId}/responsive`);
    return JSON.stringify(data);
  }

  async getLayoutDebug(postId: number, containerId: string): Promise<string> {
    const data = await this.client.get(`pages/${postId}/elements/${containerId}/layout-debug`);
    return JSON.stringify(data);
  }

  async getPageCss(postId: number): Promise<string> {
    const data = await this.client.get(`pages/${postId}/css`);
    return JSON.stringify(data);
  }

  async getGlobalKit(): Promise<string> {
    const data = await this.client.get("kit");
    return JSON.stringify(data);
  }

  async getCompiledCss(postId: number, elementId?: string): Promise<string> {
    const params: Record<string, unknown> = {};
    if (elementId) params.elementId = elementId;
    const data = await this.client.get(`pages/${postId}/compiled-css`, params);
    return JSON.stringify(data);
  }

  async getElementSelector(postId: number, elementId: string): Promise<string> {
    const data = await this.client.get(`pages/${postId}/elements/${elementId}/selector`);
    return JSON.stringify(data);
  }

  async updateElement(postId: number, elementId: string, settingsJson: string): Promise<string> {
    const settings = JSON.parse(settingsJson);
    const data = await this.client.post(`pages/${postId}/elements/${elementId}`, { settings });
    return JSON.stringify(data);
  }

  async updateHtmlWidget(postId: number, elementId: string, htmlContent: string, customCss?: string): Promise<string> {
    const body: Record<string, unknown> = { htmlContent };
    if (customCss) body.customCss = customCss;
    const data = await this.client.post(`pages/${postId}/html-widget/${elementId}`, body);
    return JSON.stringify(data);
  }

  async updatePageCss(css: string, mode: string): Promise<string> {
    const data = await this.client.post("css", { css, mode });
    return JSON.stringify(data);
  }

  async clearCache(): Promise<string> {
    const data = await this.client.post("clear-cache");
    return JSON.stringify(data);
  }

  // Phase 1: CRUD completion
  async addElement(postId: number, containerId: string, elType: string, widgetType: string | undefined, settingsJson: string, position: number | undefined): Promise<string> {
    const settings = JSON.parse(settingsJson);
    const body: Record<string, unknown> = { containerId, elType, settings };
    if (widgetType) body.widgetType = widgetType;
    if (position !== undefined) body.position = position;
    const data = await this.client.post(`pages/${postId}/elements`, body);
    return JSON.stringify(data);
  }

  async deleteElement(postId: number, elementId: string): Promise<string> {
    const data = await this.client.post(`pages/${postId}/elements/${elementId}/delete`);
    return JSON.stringify(data);
  }

  async moveElement(postId: number, elementId: string, targetContainerId: string, position: number | undefined): Promise<string> {
    const body: Record<string, unknown> = { targetContainerId };
    if (position !== undefined) body.position = position;
    const data = await this.client.post(`pages/${postId}/elements/${elementId}/move`, body);
    return JSON.stringify(data);
  }

  async updateGlobalKit(settingsJson: string): Promise<string> {
    const settings = JSON.parse(settingsJson);
    const data = await this.client.post("kit", { settings });
    return JSON.stringify(data);
  }

  // Phase 2: Search & efficiency
  async searchAllPages(filters: FindElementsFilters): Promise<string> {
    const params: Record<string, unknown> = {};
    if (filters.widgetType) params.widgetType = filters.widgetType;
    if (filters.cssClass) params.cssClass = filters.cssClass;
    if (filters.elementId) params.elementId = filters.elementId;
    if (filters.contentText) params.contentText = filters.contentText;
    const data = await this.client.get("search", params);
    return JSON.stringify(data);
  }

  async cloneElement(postId: number, elementId: string, targetContainerId: string | undefined, targetPostId: number | undefined): Promise<string> {
    const body: Record<string, unknown> = {};
    if (targetContainerId) body.targetContainerId = targetContainerId;
    if (targetPostId !== undefined) body.targetPostId = targetPostId;
    const data = await this.client.post(`pages/${postId}/elements/${elementId}/clone`, body);
    return JSON.stringify(data);
  }

  async exportPage(postId: number): Promise<string> {
    const data = await this.client.get(`pages/${postId}/export`);
    return JSON.stringify(data);
  }
}
