/**
 * PHP code templates for Elementor operations.
 * All templates output JSON and are executed via evalFile (stdin pipe).
 */

// ─── Shared Constants ────────────────────────────────────

/** Layout-related setting keys used across multiple templates */
const LAYOUT_KEYS = [
  "flex_direction", "flex_direction_mobile", "flex_direction_tablet",
  "flex_wrap", "flex_wrap_mobile",
  "flex_gap", "gap",
  "content_width", "width", "width_mobile", "width_tablet",
  "min_height", "min_height_mobile", "min_height_tablet",
  "max_height",
  "overflow", "overflow_mobile",
  "padding", "padding_mobile", "padding_tablet",
  "margin", "margin_mobile", "margin_tablet",
  "position", "z_index",
  "align_items", "justify_content",
];

/** PHP array literal of layout keys */
const LAYOUT_KEYS_PHP = `array(${LAYOUT_KEYS.map((k) => `'${k}'`).join(", ")})`;

// ─── Read Templates ──────────────────────────────────────

/** List all pages with Elementor data */
export function phpListPages(): string {
  return `
$pages = get_posts(array(
  'post_type' => array('page', 'post'),
  'numberposts' => -1,
  'post_status' => 'any'
));
$result = array();
foreach ($pages as $p) {
  $data = get_post_meta($p->ID, '_elementor_data', true);
  if (empty($data)) continue;
  $template = get_post_meta($p->ID, '_elementor_template_type', true);
  $edit_mode = get_post_meta($p->ID, '_elementor_edit_mode', true);
  $arr = json_decode($data, true);
  $count = 0;
  if (is_array($arr)) {
    $stack = $arr;
    while (count($stack) > 0) {
      $el = array_pop($stack);
      $count++;
      if (isset($el['elements']) && is_array($el['elements'])) {
        foreach ($el['elements'] as $child) { $stack[] = $child; }
      }
    }
  }
  $result[] = array(
    'postId' => $p->ID,
    'title' => $p->post_title,
    'status' => $p->post_status,
    'url' => get_permalink($p->ID),
    'template' => $template ? $template : '',
    'editMode' => $edit_mode ? $edit_mode : '',
    'elementCount' => $count
  );
}
echo json_encode($result, JSON_UNESCAPED_UNICODE);
`;
}

/** Get element tree for a page — now includes layout info on container nodes */
export function phpGetPageTree(postId: number): string {
  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data for post ${postId}')); exit; }
$arr = json_decode($data, true);
if (empty($arr) || !is_array($arr)) { echo json_encode(array('error' => 'Invalid Elementor JSON')); exit; }

function build_tree($elements) {
  $nodes = array();
  foreach ($elements as $el) {
    $wt = isset($el['widgetType']) ? $el['widgetType'] : null;
    $label = '';
    if ($wt === 'heading' && isset($el['settings']['title'])) {
      $label = mb_substr(strip_tags($el['settings']['title']), 0, 60);
    } elseif ($wt === 'html' && isset($el['settings']['html'])) {
      $label = mb_substr(strip_tags($el['settings']['html']), 0, 60);
    } elseif ($wt === 'image' && isset($el['settings']['image']['url'])) {
      $label = basename($el['settings']['image']['url']);
    } elseif ($wt === 'text-editor' && isset($el['settings']['editor'])) {
      $label = mb_substr(strip_tags($el['settings']['editor']), 0, 60);
    } elseif ($wt === 'video') {
      $label = isset($el['settings']['youtube_url']) ? $el['settings']['youtube_url'] : 'hosted video';
    } elseif ($wt === 'form') {
      $label = isset($el['settings']['form_name']) ? $el['settings']['form_name'] : 'form';
    }

    $children = array();
    if (isset($el['elements']) && is_array($el['elements'])) {
      $children = build_tree($el['elements']);
    }

    $node = array(
      'id' => $el['id'],
      'elType' => $el['elType'],
      'label' => $label,
      'childCount' => count($children),
      'children' => $children
    );
    if ($wt) $node['widgetType'] = $wt;
    if (isset($el['settings']['css_classes']) && $el['settings']['css_classes'] !== '') {
      $node['cssClasses'] = $el['settings']['css_classes'];
    }
    if (isset($el['settings']['_element_id']) && $el['settings']['_element_id'] !== '') {
      $node['elementId'] = $el['settings']['_element_id'];
    }

    // Layout info for containers
    if ($el['elType'] === 'container' || $el['elType'] === 'section') {
      $layout = array();
      $s = $el['settings'];
      if (isset($s['flex_direction']))   $layout['flexDirection'] = $s['flex_direction'];
      if (isset($s['content_width']))    $layout['width'] = $s['content_width'];
      if (isset($s['width']))            $layout['width'] = $s['width'];
      if (isset($s['overflow']))         $layout['overflow'] = $s['overflow'];
      if (isset($s['gap']))              $layout['gap'] = $s['gap'];
      if (isset($s['flex_gap']))         $layout['gap'] = $s['flex_gap'];
      if (isset($s['min_height']))       $layout['minHeight'] = $s['min_height'];

      // Mobile overrides (only if set)
      if (isset($s['flex_direction_mobile'])) $layout['flexDirectionMobile'] = $s['flex_direction_mobile'];
      if (isset($s['width_mobile']))          $layout['widthMobile'] = $s['width_mobile'];
      if (isset($s['overflow_mobile']))       $layout['overflowMobile'] = $s['overflow_mobile'];

      if (!empty($layout)) $node['layout'] = $layout;
    }

    $nodes[] = $node;
  }
  return $nodes;
}

$tree = build_tree($arr);
echo json_encode(array('postId' => ${postId}, 'tree' => $tree), JSON_UNESCAPED_UNICODE);
`;
}

/** Get full data for a specific element by ID, with optional filter */
export function phpGetElement(
  postId: number,
  elementId: string,
  filter: "all" | "layout" | "responsive" = "all"
): string {
  const filterLogic =
    filter === "all"
      ? ""
      : filter === "layout"
        ? `
  // Filter: layout keys only
  $layout_keys = ${LAYOUT_KEYS_PHP};
  $filtered = array();
  foreach ($result['element']['settings'] as $key => $value) {
    if (in_array($key, $layout_keys)) $filtered[$key] = $value;
  }
  $result['element']['settings'] = $filtered;
  $result['filter'] = 'layout';
`
        : `
  // Filter: responsive overrides only (_mobile / _tablet)
  $filtered = array();
  foreach ($result['element']['settings'] as $key => $value) {
    if (strpos($key, '_mobile') !== false || strpos($key, '_tablet') !== false) {
      $filtered[$key] = $value;
    }
  }
  $result['element']['settings'] = $filtered;
  $result['filter'] = 'responsive';
`;

  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);

function find_el($elements, $target, $path = array()) {
  foreach ($elements as $el) {
    $current_path = array_merge($path, array($el['id']));
    if ($el['id'] === $target) {
      return array('element' => $el, 'path' => $current_path);
    }
    if (isset($el['elements']) && is_array($el['elements'])) {
      $found = find_el($el['elements'], $target, $current_path);
      if ($found !== null) return $found;
    }
  }
  return null;
}

$result = find_el($arr, '${elementId}');
if ($result === null) {
  echo json_encode(array('error' => 'Element not found: ${elementId}'));
} else {
  ${filterLogic}
  echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
`;
}

/** Search for elements by various filters */
export function phpFindElements(
  postId: number,
  filters: {
    widgetType?: string;
    cssClass?: string;
    elementId?: string;
    contentText?: string;
  }
): string {
  const conditions: string[] = [];

  if (filters.widgetType) {
    conditions.push(
      `(isset($el['widgetType']) && $el['widgetType'] === '${filters.widgetType}')`
    );
  }
  if (filters.cssClass) {
    conditions.push(
      `(isset($el['settings']['css_classes']) && strpos($el['settings']['css_classes'], '${filters.cssClass}') !== false)`
    );
  }
  if (filters.elementId) {
    conditions.push(
      `(isset($el['settings']['_element_id']) && $el['settings']['_element_id'] === '${filters.elementId}')`
    );
  }

  const contentSearch = filters.contentText
    ? `
    $content_match = false;
    $search_term = '${filters.contentText.replace(/'/g, "\\'")}';
    if (isset($el['settings']['title']) && stripos($el['settings']['title'], $search_term) !== false) $content_match = true;
    if (isset($el['settings']['html']) && stripos($el['settings']['html'], $search_term) !== false) $content_match = true;
    if (isset($el['settings']['editor']) && stripos($el['settings']['editor'], $search_term) !== false) $content_match = true;
    if (isset($el['settings']['custom_css']) && stripos($el['settings']['custom_css'], $search_term) !== false) $content_match = true;
    `
    : "";
  const contentCondition = filters.contentText ? "$content_match" : "";

  const allConditions = [
    ...conditions,
    ...(contentCondition ? [contentCondition] : []),
  ];
  const conditionStr =
    allConditions.length > 0 ? allConditions.join(" && ") : "true";

  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);

function search_els($elements, $path = array()) {
  $results = array();
  foreach ($elements as $el) {
    $current_path = array_merge($path, array($el['id']));
    ${contentSearch}
    if (${conditionStr}) {
      $snippet = '';
      if (isset($el['settings']['title'])) $snippet = mb_substr(strip_tags($el['settings']['title']), 0, 100);
      elseif (isset($el['settings']['html'])) $snippet = mb_substr(strip_tags($el['settings']['html']), 0, 100);
      elseif (isset($el['settings']['editor'])) $snippet = mb_substr(strip_tags($el['settings']['editor']), 0, 100);

      $results[] = array(
        'elementId' => $el['id'],
        'elType' => $el['elType'],
        'widgetType' => isset($el['widgetType']) ? $el['widgetType'] : null,
        'path' => $current_path,
        'snippet' => $snippet,
        'cssClasses' => isset($el['settings']['css_classes']) ? $el['settings']['css_classes'] : null,
        'customElementId' => isset($el['settings']['_element_id']) ? $el['settings']['_element_id'] : null
      );
    }
    if (isset($el['elements']) && is_array($el['elements'])) {
      $results = array_merge($results, search_els($el['elements'], $current_path));
    }
  }
  return $results;
}

$results = search_els($arr);
echo json_encode(array('postId' => ${postId}, 'results' => $results, 'count' => count($results)), JSON_UNESCAPED_UNICODE);
`;
}

/** List Elementor library templates */
export function phpListTemplates(): string {
  return `
$templates = get_posts(array(
  'post_type' => 'elementor_library',
  'numberposts' => -1,
  'post_status' => 'any'
));
$result = array();
foreach ($templates as $t) {
  $type = get_post_meta($t->ID, '_elementor_template_type', true);
  $result[] = array(
    'postId' => $t->ID,
    'title' => $t->post_title,
    'templateType' => $type ? $type : '',
    'status' => $t->post_status
  );
}
echo json_encode($result, JSON_UNESCAPED_UNICODE);
`;
}

// ─── New Read Templates ──────────────────────────────────

/** Get element with full ancestor/sibling context */
export function phpGetElementContext(
  postId: number,
  elementId: string
): string {
  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);
if (empty($arr) || !is_array($arr)) { echo json_encode(array('error' => 'Invalid JSON')); exit; }

$layout_keys = ${LAYOUT_KEYS_PHP};

function get_label($el) {
  $wt = isset($el['widgetType']) ? $el['widgetType'] : null;
  if ($wt === 'heading' && isset($el['settings']['title']))
    return mb_substr(strip_tags($el['settings']['title']), 0, 40);
  if ($wt === 'html' && isset($el['settings']['html']))
    return mb_substr(strip_tags($el['settings']['html']), 0, 40);
  if ($wt === 'image' && isset($el['settings']['image']['url']))
    return basename($el['settings']['image']['url']);
  if ($wt === 'text-editor' && isset($el['settings']['editor']))
    return mb_substr(strip_tags($el['settings']['editor']), 0, 40);
  return '';
}

function extract_layout($settings, $keys) {
  $out = array();
  foreach ($keys as $k) {
    if (isset($settings[$k])) $out[$k] = $settings[$k];
  }
  return $out;
}

function find_with_context($elements, $target, $path, $ancestors, $layout_keys) {
  foreach ($elements as $el) {
    $cur = array_merge($path, array($el['id']));

    if ($el['id'] === $target) {
      // Collect siblings
      $siblings = array();
      foreach ($elements as $sib) {
        if ($sib['id'] === $target) continue;
        $sib_info = array(
          'id' => $sib['id'],
          'elType' => $sib['elType'],
          'widgetType' => isset($sib['widgetType']) ? $sib['widgetType'] : null,
          'label' => get_label($sib)
        );
        if ($sib['elType'] === 'container' || $sib['elType'] === 'section') {
          $sib_info['layoutSummary'] = extract_layout($sib['settings'], $layout_keys);
        }
        $siblings[] = $sib_info;
      }

      return array(
        'element' => array(
          'id' => $el['id'],
          'elType' => $el['elType'],
          'widgetType' => isset($el['widgetType']) ? $el['widgetType'] : null,
          'settings' => $el['settings']
        ),
        'path' => $cur,
        'ancestors' => $ancestors,
        'siblings' => $siblings
      );
    }

    if (isset($el['elements']) && is_array($el['elements'])) {
      $new_anc = $ancestors;
      if ($el['elType'] === 'container' || $el['elType'] === 'section') {
        $new_anc[] = array(
          'id' => $el['id'],
          'elType' => $el['elType'],
          'layoutSettings' => extract_layout($el['settings'], $layout_keys)
        );
      }
      $found = find_with_context($el['elements'], $target, $cur, $new_anc, $layout_keys);
      if ($found !== null) return $found;
    }
  }
  return null;
}

$result = find_with_context($arr, '${elementId}', array(), array(), $layout_keys);
if ($result === null) {
  echo json_encode(array('error' => 'Element not found: ${elementId}'));
} else {
  echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
`;
}

/** Get responsive settings diff for an element */
export function phpGetResponsiveDiff(
  postId: number,
  elementId: string
): string {
  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);

function find_el($elements, $target) {
  foreach ($elements as $el) {
    if ($el['id'] === $target) return $el;
    if (isset($el['elements']) && is_array($el['elements'])) {
      $found = find_el($el['elements'], $target);
      if ($found !== null) return $found;
    }
  }
  return null;
}

$el = find_el($arr, '${elementId}');
if ($el === null) {
  echo json_encode(array('error' => 'Element not found: ${elementId}'));
  exit;
}

$desktop = array();
$tablet = array();
$mobile = array();
$mobile_overrides = array();
$tablet_overrides = array();

// Skip internal keys that start with underscore (e.g. _element_id, _margin)
// but DO include responsive variants of them
foreach ($el['settings'] as $key => $value) {
  if (preg_match('/_mobile$/', $key)) {
    $base = preg_replace('/_mobile$/', '', $key);
    $mobile[$base] = $value;
    $mobile_overrides[] = $base;
  } elseif (preg_match('/_tablet$/', $key)) {
    $base = preg_replace('/_tablet$/', '', $key);
    $tablet[$base] = $value;
    $tablet_overrides[] = $base;
  } else {
    $desktop[$key] = $value;
  }
}

echo json_encode(array(
  'elementId' => '${elementId}',
  'elType' => $el['elType'],
  'widgetType' => isset($el['widgetType']) ? $el['widgetType'] : null,
  'desktop' => $desktop,
  'tablet' => !empty($tablet) ? $tablet : new stdClass(),
  'mobile' => !empty($mobile) ? $mobile : new stdClass(),
  'mobileOverrides' => $mobile_overrides,
  'tabletOverrides' => $tablet_overrides
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

/** Get layout debug table for a container's children */
export function phpGetLayoutDebug(
  postId: number,
  containerId: string
): string {
  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);

function find_el($elements, $target) {
  foreach ($elements as $el) {
    if ($el['id'] === $target) return $el;
    if (isset($el['elements']) && is_array($el['elements'])) {
      $found = find_el($el['elements'], $target);
      if ($found !== null) return $found;
    }
  }
  return null;
}

$container = find_el($arr, '${containerId}');
if ($container === null) {
  echo json_encode(array('error' => 'Element not found: ${containerId}'));
  exit;
}
if ($container['elType'] !== 'container' && $container['elType'] !== 'section') {
  echo json_encode(array('error' => 'Element ${containerId} is a ' . $container['elType'] . ', not a container'));
  exit;
}

// Container's own layout
$container_layout = array();
$layout_props = array('flex_direction', 'flex_direction_mobile', 'flex_wrap', 'flex_wrap_mobile',
  'gap', 'flex_gap', 'align_items', 'justify_content', 'overflow', 'overflow_mobile',
  'min_height', 'min_height_mobile', 'content_width');
foreach ($layout_props as $p) {
  if (isset($container['settings'][$p])) $container_layout[$p] = $container['settings'][$p];
}

// Children layout table
$child_props = array('flex_direction', 'flex_direction_mobile', 'width', 'width_mobile',
  'min_height', 'min_height_mobile', 'overflow', 'overflow_mobile',
  'margin', 'margin_mobile', 'padding', 'padding_mobile', '_margin', '_margin_mobile');
$children = array();
if (isset($container['elements']) && is_array($container['elements'])) {
  foreach ($container['elements'] as $child) {
    $label = '';
    $wt = isset($child['widgetType']) ? $child['widgetType'] : null;
    if ($wt === 'heading' && isset($child['settings']['title']))
      $label = mb_substr(strip_tags($child['settings']['title']), 0, 30);
    elseif ($wt === 'html' && isset($child['settings']['html']))
      $label = mb_substr(strip_tags($child['settings']['html']), 0, 30);
    elseif ($wt === 'image' && isset($child['settings']['image']['url']))
      $label = basename($child['settings']['image']['url']);

    $info = array(
      'id' => $child['id'],
      'elType' => $child['elType'],
      'widgetType' => $wt,
      'label' => $label
    );
    foreach ($child_props as $p) {
      if (isset($child['settings'][$p])) $info[$p] = $child['settings'][$p];
    }
    $children[] = $info;
  }
}

echo json_encode(array(
  'containerId' => '${containerId}',
  'containerLayout' => $container_layout,
  'childCount' => count($children),
  'children' => $children
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

/** Read all CSS sources for a page */
export function phpGetPageCss(postId: number): string {
  return `
// WordPress Additional CSS (Customizer)
$wp_css = wp_get_custom_css();

// Elementor page custom CSS (from page settings)
$page_settings = get_post_meta(${postId}, '_elementor_page_settings', true);
$page_css = '';
if (is_array($page_settings) && isset($page_settings['custom_css'])) {
  $page_css = $page_settings['custom_css'];
}

// Elementor global CSS (Pro feature)
$global_css = get_option('elementor_custom_css', '');

echo json_encode(array(
  'wordpressAdditionalCss' => $wp_css ? $wp_css : '',
  'elementorPageCss' => $page_css,
  'elementorGlobalCss' => $global_css ? $global_css : '',
  'totalLength' => strlen($wp_css ?: '') + strlen($page_css) + strlen($global_css ?: '')
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

// ─── Write Templates ─────────────────────────────────────

/** Update specific settings on an element (merge semantics) */
export function phpUpdateElement(
  postId: number,
  elementId: string,
  settingsJson: string
): string {
  const settingsBase64 = Buffer.from(settingsJson, "utf-8").toString("base64");

  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);
if (empty($arr) || !is_array($arr)) { echo json_encode(array('error' => 'Invalid JSON')); exit; }

$new_settings = json_decode(base64_decode('${settingsBase64}'), true);
if (empty($new_settings) || !is_array($new_settings)) { echo json_encode(array('error' => 'Invalid settings JSON')); exit; }

$found = false;
function update_el(&$elements, $target, $new_settings, &$found) {
  foreach ($elements as &$el) {
    if ($el['id'] === $target) {
      foreach ($new_settings as $key => $value) {
        $el['settings'][$key] = $value;
      }
      $found = true;
      return;
    }
    if (isset($el['elements']) && is_array($el['elements'])) {
      update_el($el['elements'], $target, $new_settings, $found);
      if ($found) return;
    }
  }
}

update_el($arr, '${elementId}', $new_settings, $found);

if (!$found) {
  echo json_encode(array('error' => 'Element not found: ${elementId}'));
  exit;
}

$json = wp_json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
update_post_meta(${postId}, '_elementor_data', wp_slash($json));

// Clear per-post CSS cache
delete_post_meta(${postId}, '_elementor_css');
$upload = wp_upload_dir();
$css_path = $upload['basedir'] . '/elementor/css/post-${postId}.css';
if (file_exists($css_path)) { unlink($css_path); }

echo json_encode(array(
  'success' => true,
  'postId' => ${postId},
  'elementId' => '${elementId}',
  'updatedKeys' => array_keys($new_settings)
), JSON_UNESCAPED_UNICODE);
`;
}

/** Update HTML widget content with base64 encoding */
export function phpUpdateHtmlWidget(
  postId: number,
  elementId: string,
  htmlContent: string,
  customCss?: string
): string {
  const htmlBase64 = Buffer.from(htmlContent, "utf-8").toString("base64");
  const cssBase64 = customCss
    ? Buffer.from(customCss, "utf-8").toString("base64")
    : "";

  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);

$html_content = base64_decode('${htmlBase64}');
$custom_css = ${cssBase64 ? `base64_decode('${cssBase64}')` : "null"};

$found = false;
function update_html_widget(&$elements, $target, $html, $css, &$found) {
  foreach ($elements as &$el) {
    if ($el['id'] === $target) {
      if (!isset($el['widgetType']) || $el['widgetType'] !== 'html') {
        return;
      }
      $el['settings']['html'] = $html;
      if ($css !== null) {
        $el['settings']['custom_css'] = $css;
      }
      $found = true;
      return;
    }
    if (isset($el['elements']) && is_array($el['elements'])) {
      update_html_widget($el['elements'], $target, $html, $css, $found);
      if ($found) return;
    }
  }
}

update_html_widget($arr, '${elementId}', $html_content, $custom_css, $found);

if (!$found) {
  echo json_encode(array('error' => 'HTML widget not found: ${elementId}'));
  exit;
}

$json = wp_json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
update_post_meta(${postId}, '_elementor_data', wp_slash($json));

delete_post_meta(${postId}, '_elementor_css');

echo json_encode(array(
  'success' => true,
  'postId' => ${postId},
  'elementId' => '${elementId}',
  'htmlLength' => strlen($html_content),
  'cssUpdated' => ($custom_css !== null)
), JSON_UNESCAPED_UNICODE);
`;
}

/** Get Elementor Global Kit settings (colors, fonts, layout defaults) */
export function phpGetGlobalKit(): string {
  return `
$kit_id = get_option('elementor_active_kit');
if (empty($kit_id)) { echo json_encode(array('error' => 'No active Elementor kit found')); exit; }

$settings = get_post_meta($kit_id, '_elementor_page_settings', true);
if (empty($settings) || !is_array($settings)) {
  echo json_encode(array('error' => 'No kit settings found for kit ID ' . $kit_id)); exit;
}

// Extract system colors
$colors = array();
if (isset($settings['system_colors']) && is_array($settings['system_colors'])) {
  foreach ($settings['system_colors'] as $c) {
    $colors[] = array(
      'id' => isset($c['_id']) ? $c['_id'] : '',
      'title' => isset($c['title']) ? $c['title'] : '',
      'color' => isset($c['color']) ? $c['color'] : ''
    );
  }
}
if (isset($settings['custom_colors']) && is_array($settings['custom_colors'])) {
  foreach ($settings['custom_colors'] as $c) {
    $colors[] = array(
      'id' => isset($c['_id']) ? $c['_id'] : '',
      'title' => isset($c['title']) ? $c['title'] : '',
      'color' => isset($c['color']) ? $c['color'] : ''
    );
  }
}

// Extract system fonts
$fonts = array();
if (isset($settings['system_typography']) && is_array($settings['system_typography'])) {
  foreach ($settings['system_typography'] as $f) {
    $fonts[] = array(
      'id' => isset($f['_id']) ? $f['_id'] : '',
      'title' => isset($f['title']) ? $f['title'] : '',
      'fontFamily' => isset($f['typography_font_family']) ? $f['typography_font_family'] : ''
    );
  }
}
if (isset($settings['custom_typography']) && is_array($settings['custom_typography'])) {
  foreach ($settings['custom_typography'] as $f) {
    $fonts[] = array(
      'id' => isset($f['_id']) ? $f['_id'] : '',
      'title' => isset($f['title']) ? $f['title'] : '',
      'fontFamily' => isset($f['typography_font_family']) ? $f['typography_font_family'] : ''
    );
  }
}

// Layout defaults
$container_width = isset($settings['container_width']) ? $settings['container_width'] : null;
$space_between = isset($settings['space_between_widgets']) ? $settings['space_between_widgets'] : null;
$bg_color = isset($settings['body_background_color']) ? $settings['body_background_color'] : '';
$body_typo = array();
$typo_keys = array('body_typography_typography', 'body_typography_font_family', 'body_typography_font_size', 'body_typography_font_weight', 'body_typography_line_height');
foreach ($typo_keys as $tk) {
  if (isset($settings[$tk])) $body_typo[$tk] = $settings[$tk];
}

echo json_encode(array(
  'kitPostId' => (int) $kit_id,
  'colors' => $colors,
  'fonts' => $fonts,
  'containerWidth' => $container_width,
  'spacesBetweenWidgets' => $space_between,
  'pageBackgroundColor' => $bg_color,
  'bodyTypography' => !empty($body_typo) ? $body_typo : new stdClass(),
  'allSettings' => $settings
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

/** Get Elementor compiled CSS for a page, optionally filtered by element ID */
export function phpGetCompiledCss(
  postId: number,
  elementId?: string
): string {
  const filterBlock = elementId
    ? `
// Filter for specific element
$element_id = '${elementId}';
$pattern = '/[^{}]*\\.elementor-element-' . preg_quote($element_id, '/') . '[^{]*\\{[^}]*\\}/s';
preg_match_all($pattern, $css, $matches);
$filtered = implode("\\n", $matches[0]);
`
    : `
$element_id = null;
$filtered = null;
`;

  return `
$css = '';
$css_path = '';
$css_source = '';

// Method 1: Try external file
$upload = wp_upload_dir();
$file_path = $upload['basedir'] . '/elementor/css/post-${postId}.css';
if (file_exists($file_path)) {
  $css = file_get_contents($file_path);
  $css_path = $file_path;
  $css_source = 'external_file';
}

// Method 2: Try .min.css variant
if (empty($css)) {
  $min_path = $upload['basedir'] . '/elementor/css/post-${postId}.min.css';
  if (file_exists($min_path)) {
    $css = file_get_contents($min_path);
    $css_path = $min_path;
    $css_source = 'external_file_min';
  }
}

// Method 3: Read from database (internal CSS mode)
if (empty($css)) {
  $meta = get_post_meta(${postId}, '_elementor_css', true);
  if (is_array($meta) && isset($meta['css'])) {
    $css = $meta['css'];
    $css_path = '_elementor_css post meta (internal mode)';
    $css_source = 'database';
  }
}

$css_length = strlen($css);

${filterBlock}

echo json_encode(array(
  'postId' => ${postId},
  'cssPath' => $css_path,
  'cssSource' => $css_source,
  'cssLength' => $css_length,
  'css' => $css_length > 50000 ? mb_substr($css, 0, 50000) . '...(truncated)' : $css,
  'filteredElementId' => $element_id,
  'filteredRules' => $filtered
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

/** Get CSS selectors for an element and find matching rules in Additional CSS and compiled CSS */
export function phpGetElementSelector(
  postId: number,
  elementId: string
): string {
  return `
$data = get_post_meta(${postId}, '_elementor_data', true);
if (empty($data)) { echo json_encode(array('error' => 'No Elementor data')); exit; }
$arr = json_decode($data, true);

function find_el_info($elements, $target) {
  foreach ($elements as $el) {
    if ($el['id'] === $target) return $el;
    if (isset($el['elements']) && is_array($el['elements'])) {
      $found = find_el_info($el['elements'], $target);
      if ($found !== null) return $found;
    }
  }
  return null;
}

$el = find_el_info($arr, '${elementId}');
if ($el === null) {
  echo json_encode(array('error' => 'Element not found: ${elementId}'));
  exit;
}

// Build selectors
$outer = '.elementor-element-${elementId}';
$inner = null;
if (isset($el['widgetType'])) {
  $inner = '.elementor-element-${elementId} > .elementor-widget-container';
}

// Search Additional CSS for matching rules
$wp_css = wp_get_custom_css();
$matching_additional = array();
if (!empty($wp_css)) {
  // Match rules containing this element's selector
  $patterns = array(
    '${elementId}',
    'elementor-element-${elementId}'
  );
  // Also check for custom element ID
  if (isset($el['settings']['_element_id']) && !empty($el['settings']['_element_id'])) {
    $patterns[] = '#' . $el['settings']['_element_id'];
  }
  // Split CSS into rules
  preg_match_all('/[^{}]+\\{[^}]*\\}/s', $wp_css, $rules);
  foreach ($rules[0] as $rule) {
    foreach ($patterns as $p) {
      if (strpos($rule, $p) !== false) {
        $matching_additional[] = trim($rule);
        break;
      }
    }
  }
}

// Search compiled CSS for matching rules
$matching_compiled = array();
$compiled = '';

// Try external file first
$upload = wp_upload_dir();
$css_path = $upload['basedir'] . '/elementor/css/post-${postId}.css';
if (file_exists($css_path)) {
  $compiled = file_get_contents($css_path);
}
// Fallback: read from database (internal CSS mode)
if (empty($compiled)) {
  $css_meta = get_post_meta(${postId}, '_elementor_css', true);
  if (is_array($css_meta) && isset($css_meta['css'])) {
    $compiled = $css_meta['css'];
  }
}

if (!empty($compiled)) {
  $pattern = '/[^{}]*\\.elementor-element-' . preg_quote('${elementId}', '/') . '[^{]*\\{[^}]*\\}/s';
  preg_match_all($pattern, $compiled, $compiled_rules);
  foreach ($compiled_rules[0] as $rule) {
    $matching_compiled[] = trim($rule);
  }
}

echo json_encode(array(
  'elementId' => '${elementId}',
  'elType' => $el['elType'],
  'widgetType' => isset($el['widgetType']) ? $el['widgetType'] : null,
  'outerSelector' => $outer,
  'innerSelector' => $inner,
  'matchingAdditionalCss' => $matching_additional,
  'matchingCompiledCss' => array_slice($matching_compiled, 0, 30)
), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
`;
}

/** Update WordPress Additional CSS (append or replace) */
export function phpUpdatePageCss(css: string, mode: "append" | "replace"): string {
  const cssBase64 = Buffer.from(css, "utf-8").toString("base64");

  return `
$new_css = base64_decode('${cssBase64}');
$previous_css = wp_get_custom_css();
$previous_length = strlen($previous_css ?: '');

if ('${mode}' === 'append') {
  $final_css = trim($previous_css) . "\\n\\n" . $new_css;
} else {
  $final_css = $new_css;
}

$updated = wp_update_custom_css_post(trim($final_css));

if (is_wp_error($updated)) {
  echo json_encode(array('error' => 'Failed to update CSS: ' . $updated->get_error_message()));
  exit;
}

// Clear Elementor CSS cache (suppress any output from clear_cache)
if (class_exists('Elementor\\\\Plugin')) {
  ob_start();
  \\Elementor\\Plugin::instance()->files_manager->clear_cache();
  ob_end_clean();
}

echo json_encode(array(
  'success' => true,
  'mode' => '${mode}',
  'cssLength' => strlen(trim($final_css)),
  'previousLength' => $previous_length
), JSON_UNESCAPED_UNICODE);
`;
}
