export interface FindElementsFilters {
  widgetType?: string;
  cssClass?: string;
  elementId?: string;
  contentText?: string;
}

export interface ElementorBackend {
  listPages(): Promise<string>;
  getPageTree(postId: number): Promise<string>;
  getElement(postId: number, elementId: string, filter: string): Promise<string>;
  findElements(postId: number, filters: FindElementsFilters): Promise<string>;
  listTemplates(): Promise<string>;
  getElementContext(postId: number, elementId: string): Promise<string>;
  getResponsiveDiff(postId: number, elementId: string): Promise<string>;
  getLayoutDebug(postId: number, containerId: string): Promise<string>;
  getPageCss(postId: number): Promise<string>;
  getGlobalKit(): Promise<string>;
  getCompiledCss(postId: number, elementId?: string): Promise<string>;
  getElementSelector(postId: number, elementId: string): Promise<string>;
  updateElement(postId: number, elementId: string, settingsJson: string): Promise<string>;
  updateHtmlWidget(postId: number, elementId: string, htmlContent: string, customCss?: string): Promise<string>;
  updatePageCss(css: string, mode: string): Promise<string>;
  clearCache(): Promise<string>;

  // Phase 1: CRUD completion
  addElement(postId: number, containerId: string, elType: string, widgetType: string | undefined, settingsJson: string, position: number | undefined): Promise<string>;
  deleteElement(postId: number, elementId: string): Promise<string>;
  moveElement(postId: number, elementId: string, targetContainerId: string, position: number | undefined): Promise<string>;
  updateGlobalKit(settingsJson: string): Promise<string>;

  // Phase 2: Search & efficiency
  searchAllPages(filters: FindElementsFilters): Promise<string>;
  cloneElement(postId: number, elementId: string, targetContainerId: string | undefined, targetPostId: number | undefined): Promise<string>;
  exportPage(postId: number): Promise<string>;
}

export interface RestConfig {
  siteUrl: string;
  username: string;
  appPassword: string;
  timeout?: number;
}
