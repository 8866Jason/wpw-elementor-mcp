/** Core Elementor element structure */
export interface ElementorElement {
  id: string;
  elType: "container" | "widget" | "section" | "column";
  widgetType?: string;
  settings: Record<string, unknown>;
  elements: ElementorElement[];
  isInner?: boolean;
}

/** Layout summary embedded in tree nodes */
export interface LayoutSummary {
  flexDirection?: string;
  width?: unknown;
  overflow?: string;
  gap?: unknown;
  minHeight?: unknown;
  flexDirectionMobile?: string;
  widthMobile?: unknown;
  overflowMobile?: string;
}

/** Compact tree node for display */
export interface ElementTreeNode {
  id: string;
  elType: string;
  widgetType?: string;
  label: string;
  cssClasses?: string;
  elementId?: string;
  childCount: number;
  children: ElementTreeNode[];
  layout?: LayoutSummary;
}

/** Page listing info */
export interface ElementorPageInfo {
  postId: number;
  title: string;
  status: string;
  url: string;
  template: string;
  editMode: string;
  elementCount: number;
}

/** Template listing info */
export interface ElementorTemplateInfo {
  postId: number;
  title: string;
  templateType: string;
  status: string;
}

/** Search match result */
export interface ElementSearchResult {
  elementId: string;
  elType: string;
  widgetType?: string;
  path: string[];
  snippet: string;
  cssClasses?: string;
  customElementId?: string;
}

/** Element with full ancestor/sibling context */
export interface ElementContext {
  element: {
    id: string;
    elType: string;
    widgetType?: string;
    settings: Record<string, unknown>;
  };
  path: string[];
  ancestors: Array<{
    id: string;
    elType: string;
    layoutSettings: Record<string, unknown>;
  }>;
  siblings: Array<{
    id: string;
    elType: string;
    widgetType?: string;
    label: string;
    layoutSummary?: Record<string, unknown>;
  }>;
}

/** Responsive settings diff across breakpoints */
export interface ResponsiveDiff {
  elementId: string;
  elType: string;
  widgetType?: string;
  desktop: Record<string, unknown>;
  tablet: Record<string, unknown>;
  mobile: Record<string, unknown>;
  mobileOverrides: string[];
  tabletOverrides: string[];
}

/** Container children layout debug table */
export interface LayoutDebugInfo {
  containerId: string;
  containerLayout: Record<string, unknown>;
  childCount: number;
  children: Array<Record<string, unknown>>;
}

/** All CSS sources for a page */
export interface PageCssInfo {
  wordpressAdditionalCss: string;
  elementorPageCss: string;
  elementorGlobalCss: string;
  totalLength: number;
}

/** Elementor Global Kit settings */
export interface GlobalKitInfo {
  kitPostId: number;
  colors: Array<{
    id: string;
    title: string;
    color: string;
  }>;
  fonts: Array<{
    id: string;
    title: string;
    fontFamily: string;
  }>;
  containerWidth: unknown;
  spacesBetweenWidgets: unknown;
  pageBackgroundColor: string;
  bodyTypography: Record<string, unknown>;
  allSettings: Record<string, unknown>;
}

/** Elementor compiled CSS info */
export interface CompiledCssInfo {
  postId: number;
  cssPath: string;
  cssLength: number;
  css: string;
  filteredElementId?: string;
  filteredRules?: string;
}

/** Element CSS selector info with matching rules */
export interface ElementSelectorInfo {
  elementId: string;
  elType: string;
  widgetType?: string;
  outerSelector: string;
  innerSelector?: string;
  matchingAdditionalCss: string[];
  matchingCompiledCss: string[];
}

// ─── Phase 1: CRUD Completion ─────────────────────────────

/** Result of adding a new element */
export interface AddElementResult {
  success: boolean;
  postId: number;
  containerId: string;
  newElementId: string;
  elType: string;
  widgetType?: string;
  position: number;
}

/** Result of deleting an element */
export interface DeleteElementResult {
  success: boolean;
  postId: number;
  deletedElementId: string;
  parentId: string | null;
}

/** Result of moving an element */
export interface MoveElementResult {
  success: boolean;
  postId: number;
  elementId: string;
  targetContainerId: string;
  position: number;
}

/** Result of updating global kit */
export interface UpdateGlobalKitResult {
  success: boolean;
  kitPostId: number;
  updatedKeys: string[];
}

// ─── Phase 2: Search & Efficiency ─────────────────────────

/** Cross-page search results */
export interface CrossPageSearchResult {
  totalResults: number;
  pages: Array<{
    postId: number;
    title: string;
    results: ElementSearchResult[];
    count: number;
  }>;
}

/** Result of cloning an element */
export interface CloneElementResult {
  success: boolean;
  sourcePostId: number;
  sourceElementId: string;
  newElementId: string;
  targetPostId: number;
  targetContainerId: string;
  position: number;
}

/** Exported page data */
export interface ExportPageResult {
  postId: number;
  title: string;
  elementorData: unknown[];
  pageSettings: Record<string, unknown>;
  elementCount: number;
}
