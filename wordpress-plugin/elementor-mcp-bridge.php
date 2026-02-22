<?php
/**
 * Plugin Name: Elementor MCP Bridge
 * Plugin URI:  https://github.com/wpwdesign/wpw-elementor-mcp
 * Description: Exposes Elementor page data via REST API endpoints for external MCP server integration.
 * Version:     1.0.0
 * Author:      wpwdesign
 * Author URI:  https://wpwdesign.com
 * License:     GPL-2.0-or-later
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

final class Elementor_MCP_Bridge {

    private const VERSION = '2.0.0';

    private const NAMESPACE = 'elementor-mcp/v1';

    private const JSON_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

    private const LAYOUT_KEYS = [
        'flex_direction', 'flex_direction_mobile', 'flex_direction_tablet',
        'flex_wrap', 'flex_wrap_mobile',
        'flex_gap', 'gap',
        'content_width', 'width', 'width_mobile', 'width_tablet',
        'min_height', 'min_height_mobile', 'min_height_tablet',
        'max_height',
        'overflow', 'overflow_mobile',
        'padding', 'padding_mobile', 'padding_tablet',
        'margin', 'margin_mobile', 'margin_tablet',
        'position', 'z_index',
        'align_items', 'justify_content',
    ];

    private static ?self $instance = null;

    public static function instance(): self {
        if ( self::$instance === null ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action( 'rest_api_init', [ $this, 'register_routes' ] );
    }

    // ─── Permission callback ─────────────────────────────────

    public function check_permission(): bool {
        return current_user_can( 'edit_posts' );
    }

    // ─── Route registration ──────────────────────────────────

    public function register_routes(): void {
        $ns = self::NAMESPACE;

        // 1. GET /status
        register_rest_route( $ns, '/status', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_status' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // 2. GET /pages
        register_rest_route( $ns, '/pages', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_list_pages' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // 3. GET /pages/{id}/tree
        register_rest_route( $ns, '/pages/(?P<id>\d+)/tree', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_page_tree' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id' => [
                    'required'          => true,
                    'validate_callback' => fn( $v ) => is_numeric( $v ),
                    'sanitize_callback' => 'absint',
                ],
            ],
        ] );

        // 4. GET /pages/{id}/elements/{eid}
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_get_element' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'     => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid'    => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
                'filter' => [
                    'default'           => 'all',
                    'validate_callback' => fn( $v ) => in_array( $v, [ 'all', 'layout', 'responsive' ], true ),
                    'sanitize_callback' => 'sanitize_text_field',
                ],
            ],
        ] );

        // 5. GET /pages/{id}/find
        register_rest_route( $ns, '/pages/(?P<id>\d+)/find', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_find_elements' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'          => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'widgetType'  => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'cssClass'    => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'elementId'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'contentText' => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 6. GET /templates
        register_rest_route( $ns, '/templates', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_list_templates' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // 7. GET /pages/{id}/elements/{eid}/context
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/context', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_element_context' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 8. GET /pages/{id}/elements/{eid}/responsive
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/responsive', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_responsive_diff' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 9. GET /pages/{id}/elements/{eid}/layout-debug
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/layout-debug', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_layout_debug' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 10. GET /pages/{id}/css
        register_rest_route( $ns, '/pages/(?P<id>\d+)/css', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_page_css' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id' => [ 'required' => true, 'sanitize_callback' => 'absint' ],
            ],
        ] );

        // 11. GET /kit
        register_rest_route( $ns, '/kit', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_global_kit' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // 12. GET /pages/{id}/compiled-css
        register_rest_route( $ns, '/pages/(?P<id>\d+)/compiled-css', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_compiled_css' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'        => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'elementId' => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 13. GET /pages/{id}/elements/{eid}/selector
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/selector', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_element_selector' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 14. POST /pages/{id}/elements/{eid}
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_update_element' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 15. POST /pages/{id}/html-widget/{eid}
        register_rest_route( $ns, '/pages/(?P<id>\d+)/html-widget/(?P<eid>[a-f0-9]+)', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_update_html_widget' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 16. POST /css
        register_rest_route( $ns, '/css', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_update_css' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // 17. POST /clear-cache
        register_rest_route( $ns, '/clear-cache', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_clear_cache' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // ─── Phase 1: CRUD Completion ─────────────────────────

        // 18. POST /pages/{id}/elements - Add element
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_add_element' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id' => [ 'required' => true, 'sanitize_callback' => 'absint' ],
            ],
        ] );

        // 19. POST /pages/{id}/elements/{eid}/delete - Delete element
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/delete', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_delete_element' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 20. POST /pages/{id}/elements/{eid}/move - Move element
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/move', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_move_element' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 21. POST /kit - Update global kit
        register_rest_route( $ns, '/kit', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_update_global_kit' ],
            'permission_callback' => [ $this, 'check_permission' ],
        ] );

        // ─── Phase 2: Search & Efficiency ─────────────────────

        // 22. GET /search - Search all pages
        register_rest_route( $ns, '/search', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_search_all_pages' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'widgetType'  => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'cssClass'    => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'elementId'   => [ 'sanitize_callback' => 'sanitize_text_field' ],
                'contentText' => [ 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 23. POST /pages/{id}/elements/{eid}/clone - Clone element
        register_rest_route( $ns, '/pages/(?P<id>\d+)/elements/(?P<eid>[a-f0-9]+)/clone', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'handle_clone_element' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id'  => [ 'required' => true, 'sanitize_callback' => 'absint' ],
                'eid' => [ 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ],
            ],
        ] );

        // 24. GET /pages/{id}/export - Export page data
        register_rest_route( $ns, '/pages/(?P<id>\d+)/export', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'handle_export_page' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'id' => [ 'required' => true, 'sanitize_callback' => 'absint' ],
            ],
        ] );
    }

    // ─── Shared helpers ──────────────────────────────────────

    /**
     * Decode _elementor_data post meta into an array.
     *
     * @return array|WP_Error
     */
    private function get_elementor_data( int $post_id ) {
        $raw = get_post_meta( $post_id, '_elementor_data', true );
        if ( empty( $raw ) ) {
            return new \WP_Error(
                'no_elementor_data',
                "No Elementor data for post {$post_id}",
                [ 'status' => 404 ]
            );
        }

        $arr = json_decode( $raw, true );
        if ( ! is_array( $arr ) || empty( $arr ) ) {
            return new \WP_Error(
                'invalid_elementor_json',
                'Invalid Elementor JSON',
                [ 'status' => 500 ]
            );
        }

        return $arr;
    }

    /**
     * Recursively find an element by ID, returning element + path.
     *
     * @return array{element: array, path: string[]}|null
     */
    private function find_element( array $elements, string $target_id, array $path = [] ): ?array {
        foreach ( $elements as $el ) {
            $current_path = array_merge( $path, [ $el['id'] ] );

            if ( $el['id'] === $target_id ) {
                return [ 'element' => $el, 'path' => $current_path ];
            }

            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $found = $this->find_element( $el['elements'], $target_id, $current_path );
                if ( $found !== null ) {
                    return $found;
                }
            }
        }
        return null;
    }

    /**
     * Recursively find an element by ID (no path tracking).
     */
    private function find_element_simple( array $elements, string $target_id ): ?array {
        foreach ( $elements as $el ) {
            if ( $el['id'] === $target_id ) {
                return $el;
            }
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $found = $this->find_element_simple( $el['elements'], $target_id );
                if ( $found !== null ) {
                    return $found;
                }
            }
        }
        return null;
    }

    /**
     * Build a tree representation of Elementor elements with layout info on containers.
     */
    private function build_tree( array $elements ): array {
        $nodes = [];

        foreach ( $elements as $el ) {
            $wt    = $el['widgetType'] ?? null;
            $label = $this->get_label( $el );

            $children = [];
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $children = $this->build_tree( $el['elements'] );
            }

            $node = [
                'id'         => $el['id'],
                'elType'     => $el['elType'],
                'label'      => $label,
                'childCount' => count( $children ),
                'children'   => $children,
            ];

            if ( $wt !== null ) {
                $node['widgetType'] = $wt;
            }

            $settings = $el['settings'] ?? [];

            if ( isset( $settings['css_classes'] ) && $settings['css_classes'] !== '' ) {
                $node['cssClasses'] = $settings['css_classes'];
            }
            if ( isset( $settings['_element_id'] ) && $settings['_element_id'] !== '' ) {
                $node['elementId'] = $settings['_element_id'];
            }

            // Layout info for containers
            if ( $el['elType'] === 'container' || $el['elType'] === 'section' ) {
                $layout = [];
                $s      = $settings;

                if ( isset( $s['flex_direction'] ) )        $layout['flexDirection'] = $s['flex_direction'];
                if ( isset( $s['content_width'] ) )         $layout['width'] = $s['content_width'];
                if ( isset( $s['width'] ) )                 $layout['width'] = $s['width'];
                if ( isset( $s['overflow'] ) )              $layout['overflow'] = $s['overflow'];
                if ( isset( $s['gap'] ) )                   $layout['gap'] = $s['gap'];
                if ( isset( $s['flex_gap'] ) )              $layout['gap'] = $s['flex_gap'];
                if ( isset( $s['min_height'] ) )            $layout['minHeight'] = $s['min_height'];
                if ( isset( $s['flex_direction_mobile'] ) ) $layout['flexDirectionMobile'] = $s['flex_direction_mobile'];
                if ( isset( $s['width_mobile'] ) )          $layout['widthMobile'] = $s['width_mobile'];
                if ( isset( $s['overflow_mobile'] ) )       $layout['overflowMobile'] = $s['overflow_mobile'];

                if ( ! empty( $layout ) ) {
                    $node['layout'] = $layout;
                }
            }

            $nodes[] = $node;
        }

        return $nodes;
    }

    /**
     * Extract a human-readable label from an element based on its widget type.
     */
    private function get_label( array $element ): string {
        $wt       = $element['widgetType'] ?? null;
        $settings = $element['settings'] ?? [];

        if ( $wt === 'heading' && isset( $settings['title'] ) ) {
            return mb_substr( strip_tags( $settings['title'] ), 0, 60 );
        }
        if ( $wt === 'html' && isset( $settings['html'] ) ) {
            return mb_substr( strip_tags( $settings['html'] ), 0, 60 );
        }
        if ( $wt === 'image' && isset( $settings['image']['url'] ) ) {
            return basename( $settings['image']['url'] );
        }
        if ( $wt === 'text-editor' && isset( $settings['editor'] ) ) {
            return mb_substr( strip_tags( $settings['editor'] ), 0, 60 );
        }
        if ( $wt === 'video' ) {
            return $settings['youtube_url'] ?? 'hosted video';
        }
        if ( $wt === 'form' ) {
            return $settings['form_name'] ?? 'form';
        }

        return '';
    }

    /**
     * Extract layout-related keys from a settings array.
     */
    private function extract_layout( array $settings ): array {
        $out = [];
        foreach ( self::LAYOUT_KEYS as $key ) {
            if ( isset( $settings[ $key ] ) ) {
                $out[ $key ] = $settings[ $key ];
            }
        }
        return $out;
    }

    /**
     * Clear Elementor CSS cache for a specific post.
     */
    private function clear_post_css_cache( int $post_id ): void {
        delete_post_meta( $post_id, '_elementor_css' );

        $upload   = wp_upload_dir();
        $css_path = $upload['basedir'] . '/elementor/css/post-' . $post_id . '.css';
        if ( file_exists( $css_path ) ) {
            unlink( $css_path );
        }

        $min_path = $upload['basedir'] . '/elementor/css/post-' . $post_id . '.min.css';
        if ( file_exists( $min_path ) ) {
            unlink( $min_path );
        }
    }

    /**
     * Clear global Elementor CSS cache.
     */
    private function clear_elementor_cache(): void {
        if ( class_exists( '\Elementor\Plugin' ) ) {
            ob_start();
            \Elementor\Plugin::instance()->files_manager->clear_cache();
            ob_end_clean();
        }
    }

    /**
     * Recursively update an element's settings in a data array (by reference).
     *
     * @return bool Whether the element was found and updated.
     */
    private function update_element_in_data( array &$elements, string $target_id, array $new_settings ): bool {
        foreach ( $elements as &$el ) {
            if ( $el['id'] === $target_id ) {
                if ( ! isset( $el['settings'] ) ) {
                    $el['settings'] = [];
                }
                foreach ( $new_settings as $key => $value ) {
                    $el['settings'][ $key ] = $value;
                }
                return true;
            }
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                if ( $this->update_element_in_data( $el['elements'], $target_id, $new_settings ) ) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Read compiled CSS for a post from external file or database.
     *
     * @return array{css: string, path: string, source: string}
     */
    private function read_compiled_css( int $post_id ): array {
        $upload = wp_upload_dir();

        // Method 1: External file
        $file_path = $upload['basedir'] . '/elementor/css/post-' . $post_id . '.css';
        if ( file_exists( $file_path ) ) {
            return [
                'css'    => file_get_contents( $file_path ),
                'path'   => $file_path,
                'source' => 'external_file',
            ];
        }

        // Method 2: Minified variant
        $min_path = $upload['basedir'] . '/elementor/css/post-' . $post_id . '.min.css';
        if ( file_exists( $min_path ) ) {
            return [
                'css'    => file_get_contents( $min_path ),
                'path'   => $min_path,
                'source' => 'external_file_min',
            ];
        }

        // Method 3: Database (internal CSS mode)
        $meta = get_post_meta( $post_id, '_elementor_css', true );
        if ( is_array( $meta ) && isset( $meta['css'] ) ) {
            return [
                'css'    => $meta['css'],
                'path'   => '_elementor_css post meta (internal mode)',
                'source' => 'database',
            ];
        }

        return [
            'css'    => '',
            'path'   => '',
            'source' => '',
        ];
    }

    // ─── Endpoint handlers ───────────────────────────────────

    /**
     * 1. GET /status - Health check
     */
    public function handle_status( \WP_REST_Request $request ): \WP_REST_Response {
        $elementor_active  = class_exists( '\Elementor\Plugin' );
        $elementor_version = '';

        if ( $elementor_active && defined( 'ELEMENTOR_VERSION' ) ) {
            $elementor_version = ELEMENTOR_VERSION;
        }

        return new \WP_REST_Response( [
            'version'          => self::VERSION,
            'elementor_active' => $elementor_active,
            'elementor_version'=> $elementor_version,
            'php_version'      => PHP_VERSION,
        ], 200 );
    }

    /**
     * 2. GET /pages - List Elementor pages
     */
    public function handle_list_pages( \WP_REST_Request $request ): \WP_REST_Response {
        $pages = get_posts( [
            'post_type'   => [ 'page', 'post' ],
            'numberposts' => -1,
            'post_status' => 'any',
        ] );

        $result = [];

        foreach ( $pages as $p ) {
            $data = get_post_meta( $p->ID, '_elementor_data', true );
            if ( empty( $data ) ) {
                continue;
            }

            $arr   = json_decode( $data, true );
            $count = 0;
            $stack = is_array( $arr ) ? $arr : [];

            while ( count( $stack ) > 0 ) {
                $el = array_pop( $stack );
                $count++;
                if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                    foreach ( $el['elements'] as $child ) {
                        $stack[] = $child;
                    }
                }
            }

            $result[] = [
                'postId'       => $p->ID,
                'title'        => $p->post_title,
                'status'       => $p->post_status,
                'url'          => get_permalink( $p->ID ),
                'template'     => get_post_meta( $p->ID, '_elementor_template_type', true ) ?: '',
                'editMode'     => get_post_meta( $p->ID, '_elementor_edit_mode', true ) ?: '',
                'elementCount' => $count,
            ];
        }

        return new \WP_REST_Response( $result, 200 );
    }

    /**
     * 3. GET /pages/{id}/tree - Page element tree
     */
    public function handle_page_tree( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id = (int) $request->get_param( 'id' );
        $arr     = $this->get_elementor_data( $post_id );

        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $tree = $this->build_tree( $arr );

        return new \WP_REST_Response( [
            'postId' => $post_id,
            'tree'   => $tree,
        ], 200 );
    }

    /**
     * 4. GET /pages/{id}/elements/{eid} - Get element
     */
    public function handle_get_element( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'eid' );
        $filter     = $request->get_param( 'filter' ) ?: 'all';

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $found = $this->find_element( $arr, $element_id );
        if ( $found === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        $result = [
            'element' => [
                'id'       => $found['element']['id'],
                'elType'   => $found['element']['elType'],
                'settings' => $found['element']['settings'] ?? [],
            ],
            'path' => $found['path'],
        ];

        if ( isset( $found['element']['widgetType'] ) ) {
            $result['element']['widgetType'] = $found['element']['widgetType'];
        }

        // Apply filter
        if ( $filter === 'layout' ) {
            $filtered = [];
            foreach ( $result['element']['settings'] as $key => $value ) {
                if ( in_array( $key, self::LAYOUT_KEYS, true ) ) {
                    $filtered[ $key ] = $value;
                }
            }
            $result['element']['settings'] = $filtered;
            $result['filter'] = 'layout';
        } elseif ( $filter === 'responsive' ) {
            $filtered = [];
            foreach ( $result['element']['settings'] as $key => $value ) {
                if ( strpos( $key, '_mobile' ) !== false || strpos( $key, '_tablet' ) !== false ) {
                    $filtered[ $key ] = $value;
                }
            }
            $result['element']['settings'] = $filtered;
            $result['filter'] = 'responsive';
        }

        return new \WP_REST_Response( $result, 200 );
    }

    /**
     * 5. GET /pages/{id}/find - Find elements
     */
    public function handle_find_elements( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id      = (int) $request->get_param( 'id' );
        $widget_type  = $request->get_param( 'widgetType' );
        $css_class    = $request->get_param( 'cssClass' );
        $element_id   = $request->get_param( 'elementId' );
        $content_text = $request->get_param( 'contentText' );

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $results = $this->search_elements( $arr, $widget_type, $css_class, $element_id, $content_text );

        return new \WP_REST_Response( [
            'postId'  => $post_id,
            'results' => $results,
            'count'   => count( $results ),
        ], 200 );
    }

    /**
     * Recursive element search with AND-combined filters.
     */
    private function search_elements(
        array $elements,
        ?string $widget_type,
        ?string $css_class,
        ?string $element_id,
        ?string $content_text,
        array $path = []
    ): array {
        $results = [];

        foreach ( $elements as $el ) {
            $current_path = array_merge( $path, [ $el['id'] ] );
            $settings     = $el['settings'] ?? [];
            $match        = true;

            // Widget type filter
            if ( $widget_type !== null && $widget_type !== '' ) {
                if ( ! isset( $el['widgetType'] ) || $el['widgetType'] !== $widget_type ) {
                    $match = false;
                }
            }

            // CSS class filter
            if ( $match && $css_class !== null && $css_class !== '' ) {
                if ( ! isset( $settings['css_classes'] ) || strpos( $settings['css_classes'], $css_class ) === false ) {
                    $match = false;
                }
            }

            // Element ID filter
            if ( $match && $element_id !== null && $element_id !== '' ) {
                if ( ! isset( $settings['_element_id'] ) || $settings['_element_id'] !== $element_id ) {
                    $match = false;
                }
            }

            // Content text filter (case insensitive)
            if ( $match && $content_text !== null && $content_text !== '' ) {
                $content_match = false;
                if ( isset( $settings['title'] ) && stripos( $settings['title'], $content_text ) !== false ) {
                    $content_match = true;
                }
                if ( isset( $settings['html'] ) && stripos( $settings['html'], $content_text ) !== false ) {
                    $content_match = true;
                }
                if ( isset( $settings['editor'] ) && stripos( $settings['editor'], $content_text ) !== false ) {
                    $content_match = true;
                }
                if ( isset( $settings['custom_css'] ) && stripos( $settings['custom_css'], $content_text ) !== false ) {
                    $content_match = true;
                }
                if ( ! $content_match ) {
                    $match = false;
                }
            }

            if ( $match ) {
                $snippet = '';
                if ( isset( $settings['title'] ) ) {
                    $snippet = mb_substr( strip_tags( $settings['title'] ), 0, 100 );
                } elseif ( isset( $settings['html'] ) ) {
                    $snippet = mb_substr( strip_tags( $settings['html'] ), 0, 100 );
                } elseif ( isset( $settings['editor'] ) ) {
                    $snippet = mb_substr( strip_tags( $settings['editor'] ), 0, 100 );
                }

                $results[] = [
                    'elementId'       => $el['id'],
                    'elType'          => $el['elType'],
                    'widgetType'      => $el['widgetType'] ?? null,
                    'path'            => $current_path,
                    'snippet'         => $snippet,
                    'cssClasses'      => $settings['css_classes'] ?? null,
                    'customElementId' => $settings['_element_id'] ?? null,
                ];
            }

            // Recurse into children
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $child_results = $this->search_elements(
                    $el['elements'],
                    $widget_type,
                    $css_class,
                    $element_id,
                    $content_text,
                    $current_path
                );
                $results = array_merge( $results, $child_results );
            }
        }

        return $results;
    }

    /**
     * 6. GET /templates - List templates
     */
    public function handle_list_templates( \WP_REST_Request $request ): \WP_REST_Response {
        $templates = get_posts( [
            'post_type'   => 'elementor_library',
            'numberposts' => -1,
            'post_status' => 'any',
        ] );

        $result = [];

        foreach ( $templates as $t ) {
            $type     = get_post_meta( $t->ID, '_elementor_template_type', true );
            $result[] = [
                'postId'       => $t->ID,
                'title'        => $t->post_title,
                'templateType' => $type ?: '',
                'status'       => $t->post_status,
            ];
        }

        return new \WP_REST_Response( $result, 200 );
    }

    /**
     * 7. GET /pages/{id}/elements/{eid}/context - Element context
     */
    public function handle_element_context( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'eid' );

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $result = $this->find_with_context( $arr, $element_id );
        if ( $result === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        return new \WP_REST_Response( $result, 200 );
    }

    /**
     * Recursive context finder: returns element, path, ancestors, and siblings.
     */
    private function find_with_context(
        array $elements,
        string $target_id,
        array $path = [],
        array $ancestors = []
    ): ?array {
        foreach ( $elements as $el ) {
            $current_path = array_merge( $path, [ $el['id'] ] );

            if ( $el['id'] === $target_id ) {
                // Collect siblings
                $siblings = [];
                foreach ( $elements as $sib ) {
                    if ( $sib['id'] === $target_id ) {
                        continue;
                    }
                    $sib_info = [
                        'id'         => $sib['id'],
                        'elType'     => $sib['elType'],
                        'widgetType' => $sib['widgetType'] ?? null,
                        'label'      => $this->get_label( $sib ),
                    ];
                    if ( $sib['elType'] === 'container' || $sib['elType'] === 'section' ) {
                        $sib_info['layoutSummary'] = $this->extract_layout( $sib['settings'] ?? [] );
                    }
                    $siblings[] = $sib_info;
                }

                $element_data = [
                    'id'       => $el['id'],
                    'elType'   => $el['elType'],
                    'settings' => $el['settings'] ?? [],
                ];
                if ( isset( $el['widgetType'] ) ) {
                    $element_data['widgetType'] = $el['widgetType'];
                }

                return [
                    'element'   => $element_data,
                    'path'      => $current_path,
                    'ancestors' => $ancestors,
                    'siblings'  => $siblings,
                ];
            }

            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $new_ancestors = $ancestors;
                if ( $el['elType'] === 'container' || $el['elType'] === 'section' ) {
                    $new_ancestors[] = [
                        'id'             => $el['id'],
                        'elType'         => $el['elType'],
                        'layoutSettings' => $this->extract_layout( $el['settings'] ?? [] ),
                    ];
                }
                $found = $this->find_with_context( $el['elements'], $target_id, $current_path, $new_ancestors );
                if ( $found !== null ) {
                    return $found;
                }
            }
        }

        return null;
    }

    /**
     * 8. GET /pages/{id}/elements/{eid}/responsive - Responsive diff
     */
    public function handle_responsive_diff( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'eid' );

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $el = $this->find_element_simple( $arr, $element_id );
        if ( $el === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        $desktop          = [];
        $tablet           = [];
        $mobile           = [];
        $mobile_overrides = [];
        $tablet_overrides = [];

        foreach ( ( $el['settings'] ?? [] ) as $key => $value ) {
            if ( preg_match( '/_mobile$/', $key ) ) {
                $base               = preg_replace( '/_mobile$/', '', $key );
                $mobile[ $base ]    = $value;
                $mobile_overrides[] = $base;
            } elseif ( preg_match( '/_tablet$/', $key ) ) {
                $base               = preg_replace( '/_tablet$/', '', $key );
                $tablet[ $base ]    = $value;
                $tablet_overrides[] = $base;
            } else {
                $desktop[ $key ] = $value;
            }
        }

        return new \WP_REST_Response( [
            'elementId'       => $element_id,
            'elType'          => $el['elType'],
            'widgetType'      => $el['widgetType'] ?? null,
            'desktop'         => $desktop,
            'tablet'          => ! empty( $tablet ) ? $tablet : new \stdClass(),
            'mobile'          => ! empty( $mobile ) ? $mobile : new \stdClass(),
            'mobileOverrides' => $mobile_overrides,
            'tabletOverrides' => $tablet_overrides,
        ], 200 );
    }

    /**
     * 9. GET /pages/{id}/elements/{eid}/layout-debug - Layout debug
     */
    public function handle_layout_debug( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id      = (int) $request->get_param( 'id' );
        $container_id = $request->get_param( 'eid' );

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $container = $this->find_element_simple( $arr, $container_id );
        if ( $container === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$container_id}" ], 404 );
        }

        if ( $container['elType'] !== 'container' && $container['elType'] !== 'section' ) {
            return new \WP_REST_Response( [
                'error' => "Element {$container_id} is a {$container['elType']}, not a container",
            ], 400 );
        }

        // Container's own layout
        $layout_props = [
            'flex_direction', 'flex_direction_mobile', 'flex_wrap', 'flex_wrap_mobile',
            'gap', 'flex_gap', 'align_items', 'justify_content', 'overflow', 'overflow_mobile',
            'min_height', 'min_height_mobile', 'content_width',
        ];
        $container_layout = [];
        $container_settings = $container['settings'] ?? [];
        foreach ( $layout_props as $p ) {
            if ( isset( $container_settings[ $p ] ) ) {
                $container_layout[ $p ] = $container_settings[ $p ];
            }
        }

        // Children layout table
        $child_props = [
            'flex_direction', 'flex_direction_mobile', 'width', 'width_mobile',
            'min_height', 'min_height_mobile', 'overflow', 'overflow_mobile',
            'margin', 'margin_mobile', 'padding', 'padding_mobile',
            '_margin', '_margin_mobile',
        ];

        $children = [];
        if ( isset( $container['elements'] ) && is_array( $container['elements'] ) ) {
            foreach ( $container['elements'] as $child ) {
                $wt    = $child['widgetType'] ?? null;
                $label = $this->get_label( $child );

                $info = [
                    'id'         => $child['id'],
                    'elType'     => $child['elType'],
                    'widgetType' => $wt,
                    'label'      => $label,
                ];

                $child_settings = $child['settings'] ?? [];
                foreach ( $child_props as $p ) {
                    if ( isset( $child_settings[ $p ] ) ) {
                        $info[ $p ] = $child_settings[ $p ];
                    }
                }

                $children[] = $info;
            }
        }

        return new \WP_REST_Response( [
            'containerId'     => $container_id,
            'containerLayout' => $container_layout,
            'childCount'      => count( $children ),
            'children'        => $children,
        ], 200 );
    }

    /**
     * 10. GET /pages/{id}/css - Page CSS sources
     */
    public function handle_page_css( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id = (int) $request->get_param( 'id' );

        $wp_css        = wp_get_custom_css();
        $page_settings = get_post_meta( $post_id, '_elementor_page_settings', true );
        $page_css      = '';
        if ( is_array( $page_settings ) && isset( $page_settings['custom_css'] ) ) {
            $page_css = $page_settings['custom_css'];
        }
        $global_css = get_option( 'elementor_custom_css', '' );

        return new \WP_REST_Response( [
            'wordpressAdditionalCss' => $wp_css ?: '',
            'elementorPageCss'       => $page_css,
            'elementorGlobalCss'     => $global_css ?: '',
            'totalLength'            => strlen( $wp_css ?: '' ) + strlen( $page_css ) + strlen( $global_css ?: '' ),
        ], 200 );
    }

    /**
     * 11. GET /kit - Global kit settings
     */
    public function handle_global_kit( \WP_REST_Request $request ): \WP_REST_Response {
        $kit_id = get_option( 'elementor_active_kit' );
        if ( empty( $kit_id ) ) {
            return new \WP_REST_Response( [ 'error' => 'No active Elementor kit found' ], 404 );
        }

        $settings = get_post_meta( (int) $kit_id, '_elementor_page_settings', true );
        if ( empty( $settings ) || ! is_array( $settings ) ) {
            return new \WP_REST_Response( [ 'error' => 'No kit settings found for kit ID ' . $kit_id ], 404 );
        }

        // Extract system colors
        $colors = [];
        if ( isset( $settings['system_colors'] ) && is_array( $settings['system_colors'] ) ) {
            foreach ( $settings['system_colors'] as $c ) {
                $colors[] = [
                    'id'    => $c['_id'] ?? '',
                    'title' => $c['title'] ?? '',
                    'color' => $c['color'] ?? '',
                ];
            }
        }
        if ( isset( $settings['custom_colors'] ) && is_array( $settings['custom_colors'] ) ) {
            foreach ( $settings['custom_colors'] as $c ) {
                $colors[] = [
                    'id'    => $c['_id'] ?? '',
                    'title' => $c['title'] ?? '',
                    'color' => $c['color'] ?? '',
                ];
            }
        }

        // Extract system fonts
        $fonts = [];
        if ( isset( $settings['system_typography'] ) && is_array( $settings['system_typography'] ) ) {
            foreach ( $settings['system_typography'] as $f ) {
                $fonts[] = [
                    'id'         => $f['_id'] ?? '',
                    'title'      => $f['title'] ?? '',
                    'fontFamily' => $f['typography_font_family'] ?? '',
                ];
            }
        }
        if ( isset( $settings['custom_typography'] ) && is_array( $settings['custom_typography'] ) ) {
            foreach ( $settings['custom_typography'] as $f ) {
                $fonts[] = [
                    'id'         => $f['_id'] ?? '',
                    'title'      => $f['title'] ?? '',
                    'fontFamily' => $f['typography_font_family'] ?? '',
                ];
            }
        }

        // Layout defaults
        $container_width = $settings['container_width'] ?? null;
        $space_between   = $settings['space_between_widgets'] ?? null;
        $bg_color        = $settings['body_background_color'] ?? '';

        $body_typo  = [];
        $typo_keys  = [
            'body_typography_typography',
            'body_typography_font_family',
            'body_typography_font_size',
            'body_typography_font_weight',
            'body_typography_line_height',
        ];
        foreach ( $typo_keys as $tk ) {
            if ( isset( $settings[ $tk ] ) ) {
                $body_typo[ $tk ] = $settings[ $tk ];
            }
        }

        return new \WP_REST_Response( [
            'kitPostId'            => (int) $kit_id,
            'colors'               => $colors,
            'fonts'                => $fonts,
            'containerWidth'       => $container_width,
            'spacesBetweenWidgets' => $space_between,
            'pageBackgroundColor'  => $bg_color,
            'bodyTypography'       => ! empty( $body_typo ) ? $body_typo : new \stdClass(),
            'allSettings'          => $settings,
        ], 200 );
    }

    /**
     * 12. GET /pages/{id}/compiled-css - Compiled CSS
     */
    public function handle_compiled_css( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'elementId' );

        $compiled   = $this->read_compiled_css( $post_id );
        $css        = $compiled['css'];
        $css_length = strlen( $css );

        $filtered_element_id = null;
        $filtered_rules      = null;

        if ( $element_id !== null && $element_id !== '' ) {
            $filtered_element_id = $element_id;
            $pattern = '/[^{}]*\.elementor-element-' . preg_quote( $element_id, '/' ) . '[^{]*\{[^}]*\}/s';
            preg_match_all( $pattern, $css, $matches );
            $filtered_rules = implode( "\n", $matches[0] );
        }

        return new \WP_REST_Response( [
            'postId'            => $post_id,
            'cssPath'           => $compiled['path'],
            'cssSource'         => $compiled['source'],
            'cssLength'         => $css_length,
            'css'               => $css_length > 50000
                ? mb_substr( $css, 0, 50000 ) . '...(truncated)'
                : $css,
            'filteredElementId' => $filtered_element_id,
            'filteredRules'     => $filtered_rules,
        ], 200 );
    }

    /**
     * 13. GET /pages/{id}/elements/{eid}/selector - Element selector
     */
    public function handle_element_selector( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'eid' );

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $el = $this->find_element_simple( $arr, $element_id );
        if ( $el === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        // Build selectors
        $outer = '.elementor-element-' . $element_id;
        $inner = null;
        if ( isset( $el['widgetType'] ) ) {
            $inner = '.elementor-element-' . $element_id . ' > .elementor-widget-container';
        }

        // Search Additional CSS for matching rules
        $wp_css               = wp_get_custom_css();
        $matching_additional  = [];

        if ( ! empty( $wp_css ) ) {
            $patterns = [
                $element_id,
                'elementor-element-' . $element_id,
            ];

            // Also check for custom element ID
            $settings = $el['settings'] ?? [];
            if ( ! empty( $settings['_element_id'] ) ) {
                $patterns[] = '#' . $settings['_element_id'];
            }

            // Split CSS into rules
            preg_match_all( '/[^{}]+\{[^}]*\}/s', $wp_css, $rules );
            foreach ( $rules[0] as $rule ) {
                foreach ( $patterns as $p ) {
                    if ( strpos( $rule, $p ) !== false ) {
                        $matching_additional[] = trim( $rule );
                        break;
                    }
                }
            }
        }

        // Search compiled CSS for matching rules
        $matching_compiled = [];
        $compiled          = $this->read_compiled_css( $post_id );

        if ( ! empty( $compiled['css'] ) ) {
            $pattern = '/[^{}]*\.elementor-element-' . preg_quote( $element_id, '/' ) . '[^{]*\{[^}]*\}/s';
            preg_match_all( $pattern, $compiled['css'], $compiled_rules );
            foreach ( $compiled_rules[0] as $rule ) {
                $matching_compiled[] = trim( $rule );
            }
        }

        return new \WP_REST_Response( [
            'elementId'             => $element_id,
            'elType'                => $el['elType'],
            'widgetType'            => $el['widgetType'] ?? null,
            'outerSelector'         => $outer,
            'innerSelector'         => $inner,
            'matchingAdditionalCss' => $matching_additional,
            'matchingCompiledCss'   => array_slice( $matching_compiled, 0, 30 ),
        ], 200 );
    }

    /**
     * 14. POST /pages/{id}/elements/{eid} - Update element
     */
    public function handle_update_element( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id      = (int) $request->get_param( 'id' );
        $element_id   = $request->get_param( 'eid' );
        $body         = $request->get_json_params();
        $new_settings = $body['settings'] ?? null;

        if ( empty( $new_settings ) || ! is_array( $new_settings ) ) {
            return new \WP_REST_Response( [ 'error' => 'Invalid or missing settings in request body' ], 400 );
        }

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $found = $this->update_element_in_data( $arr, $element_id, $new_settings );
        if ( ! $found ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        $json = wp_json_encode( $arr, self::JSON_FLAGS );
        update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );

        // Clear CSS cache
        $this->clear_post_css_cache( $post_id );

        return new \WP_REST_Response( [
            'success'     => true,
            'postId'      => $post_id,
            'elementId'   => $element_id,
            'updatedKeys' => array_keys( $new_settings ),
        ], 200 );
    }

    /**
     * 15. POST /pages/{id}/html-widget/{eid} - Update HTML widget
     */
    public function handle_update_html_widget( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id      = (int) $request->get_param( 'id' );
        $element_id   = $request->get_param( 'eid' );
        $body         = $request->get_json_params();
        $html_content = $body['htmlContent'] ?? null;
        $custom_css   = $body['customCss'] ?? null;

        if ( $html_content === null ) {
            return new \WP_REST_Response( [ 'error' => 'Missing htmlContent in request body' ], 400 );
        }

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        // Find element and verify it is an HTML widget
        $el = $this->find_element_simple( $arr, $element_id );
        if ( $el === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }
        if ( ! isset( $el['widgetType'] ) || $el['widgetType'] !== 'html' ) {
            $type = $el['widgetType'] ?? $el['elType'];
            return new \WP_REST_Response( [ 'error' => "Element {$element_id} is '{$type}', not an HTML widget" ], 400 );
        }

        // Build settings to merge
        $settings_to_merge = [ 'html' => $html_content ];
        if ( $custom_css !== null ) {
            $settings_to_merge['custom_css'] = $custom_css;
        }

        $found = $this->update_element_in_data( $arr, $element_id, $settings_to_merge );
        if ( ! $found ) {
            return new \WP_REST_Response( [ 'error' => "HTML widget not found: {$element_id}" ], 404 );
        }

        $json = wp_json_encode( $arr, self::JSON_FLAGS );
        update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );

        // Clear CSS cache
        $this->clear_post_css_cache( $post_id );

        return new \WP_REST_Response( [
            'success'    => true,
            'postId'     => $post_id,
            'elementId'  => $element_id,
            'htmlLength' => strlen( $html_content ),
            'cssUpdated' => $custom_css !== null,
        ], 200 );
    }

    /**
     * 16. POST /css - Update page CSS
     */
    public function handle_update_css( \WP_REST_Request $request ): \WP_REST_Response {
        $body = $request->get_json_params();
        $css  = $body['css'] ?? null;
        $mode = $body['mode'] ?? null;

        if ( $css === null || ! in_array( $mode, [ 'append', 'replace' ], true ) ) {
            return new \WP_REST_Response( [
                'error' => 'Missing css or invalid mode (must be "append" or "replace")',
            ], 400 );
        }

        $previous        = wp_get_custom_css();
        $previous_length = strlen( $previous ?: '' );

        if ( $mode === 'append' ) {
            $final = trim( $previous ) . "\n\n" . $css;
        } else {
            $final = $css;
        }

        $updated = wp_update_custom_css_post( trim( $final ) );

        if ( is_wp_error( $updated ) ) {
            return new \WP_REST_Response( [
                'error' => 'Failed to update CSS: ' . $updated->get_error_message(),
            ], 500 );
        }

        // Clear Elementor CSS cache
        $this->clear_elementor_cache();

        return new \WP_REST_Response( [
            'success'        => true,
            'mode'           => $mode,
            'cssLength'      => strlen( trim( $final ) ),
            'previousLength' => $previous_length,
        ], 200 );
    }

    /**
     * 17. POST /clear-cache - Clear cache
     */
    public function handle_clear_cache( \WP_REST_Request $request ): \WP_REST_Response {
        $this->clear_elementor_cache();

        return new \WP_REST_Response( [
            'success' => true,
            'message' => 'Elementor CSS cache cleared',
        ], 200 );
    }

    // ─── Phase 1: CRUD Completion Handlers ──────────────────

    /**
     * Generate a unique 7-character hex ID for new elements.
     */
    private function generate_element_id(): string {
        return substr( md5( uniqid( (string) mt_rand(), true ) ), 0, 7 );
    }

    /**
     * Recursively insert an element into a target container.
     *
     * @return int|false Final position or false if container not found.
     */
    private function insert_into_container( array &$elements, string $container_id, array $new_element, ?int $position ) {
        foreach ( $elements as &$el ) {
            if ( $el['id'] === $container_id ) {
                if ( ! isset( $el['elements'] ) || ! is_array( $el['elements'] ) ) {
                    $el['elements'] = [];
                }
                $count = count( $el['elements'] );
                if ( $position === null || $position >= $count ) {
                    $el['elements'][] = $new_element;
                    return $count;
                }
                $pos = max( 0, $position );
                array_splice( $el['elements'], $pos, 0, [ $new_element ] );
                return $pos;
            }
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $result = $this->insert_into_container( $el['elements'], $container_id, $new_element, $position );
                if ( $result !== false ) {
                    return $result;
                }
            }
        }
        return false;
    }

    /**
     * Recursively extract (remove) an element from the tree and return it.
     *
     * @return array|null The extracted element or null.
     */
    private function extract_element( array &$elements, string $target_id ): ?array {
        foreach ( $elements as $idx => &$el ) {
            if ( $el['id'] === $target_id ) {
                $extracted = $el;
                array_splice( $elements, $idx, 1 );
                return $extracted;
            }
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $found = $this->extract_element( $el['elements'], $target_id );
                if ( $found !== null ) {
                    return $found;
                }
            }
        }
        return null;
    }

    /**
     * Recursively delete an element from the tree and return the parent ID.
     *
     * @return string|null Parent ID or null if not found.
     */
    private function delete_from_tree( array &$elements, string $target_id, ?string $parent_id = null ): ?string {
        foreach ( $elements as $idx => &$el ) {
            if ( $el['id'] === $target_id ) {
                array_splice( $elements, $idx, 1 );
                return $parent_id;
            }
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $result = $this->delete_from_tree( $el['elements'], $target_id, $el['id'] );
                if ( $result !== null ) {
                    return $result;
                }
            }
        }
        return null;
    }

    /**
     * Deep-clone an element with new unique IDs for itself and all children.
     */
    private function deep_clone_element( array $element ): array {
        $clone       = $element;
        $clone['id'] = $this->generate_element_id();

        if ( isset( $clone['elements'] ) && is_array( $clone['elements'] ) ) {
            $new_children = [];
            foreach ( $clone['elements'] as $child ) {
                $new_children[] = $this->deep_clone_element( $child );
            }
            $clone['elements'] = $new_children;
        }

        return $clone;
    }

    /**
     * Insert a clone after the original element in the same parent.
     *
     * @return int|false Final position or false if original not found.
     */
    private function insert_after_original( array &$elements, string $original_id, array $clone ) {
        foreach ( $elements as $idx => &$el ) {
            if ( $el['id'] === $original_id ) {
                array_splice( $elements, $idx + 1, 0, [ $clone ] );
                return $idx + 1;
            }
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $result = $this->insert_after_original( $el['elements'], $original_id, $clone );
                if ( $result !== false ) {
                    return $result;
                }
            }
        }
        return false;
    }

    /**
     * Save Elementor data and clear CSS cache for a post.
     */
    private function save_and_clear( int $post_id, array $data ): void {
        $json = wp_json_encode( $data, self::JSON_FLAGS );
        update_post_meta( $post_id, '_elementor_data', wp_slash( $json ) );
        $this->clear_post_css_cache( $post_id );
    }

    /**
     * Match element against search filters.
     */
    private function element_matches_filters( array $el, array $filters ): bool {
        $settings = $el['settings'] ?? [];

        if ( ! empty( $filters['widgetType'] ) ) {
            if ( ! isset( $el['widgetType'] ) || $el['widgetType'] !== $filters['widgetType'] ) {
                return false;
            }
        }

        if ( ! empty( $filters['cssClass'] ) ) {
            if ( ! isset( $settings['css_classes'] ) || strpos( $settings['css_classes'], $filters['cssClass'] ) === false ) {
                return false;
            }
        }

        if ( ! empty( $filters['elementId'] ) ) {
            if ( ! isset( $settings['_element_id'] ) || $settings['_element_id'] !== $filters['elementId'] ) {
                return false;
            }
        }

        if ( ! empty( $filters['contentText'] ) ) {
            $term  = $filters['contentText'];
            $match = false;
            foreach ( [ 'title', 'html', 'editor', 'custom_css' ] as $key ) {
                if ( isset( $settings[ $key ] ) && stripos( $settings[ $key ], $term ) !== false ) {
                    $match = true;
                    break;
                }
            }
            if ( ! $match ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Recursively search elements matching filters.
     */
    private function search_elements_recursive( array $elements, array $filters, array $path = [] ): array {
        $results = [];

        foreach ( $elements as $el ) {
            $current_path = array_merge( $path, [ $el['id'] ] );
            $settings     = $el['settings'] ?? [];

            if ( $this->element_matches_filters( $el, $filters ) ) {
                $snippet = '';
                if ( isset( $settings['title'] ) ) {
                    $snippet = mb_substr( strip_tags( $settings['title'] ), 0, 100 );
                } elseif ( isset( $settings['html'] ) ) {
                    $snippet = mb_substr( strip_tags( $settings['html'] ), 0, 100 );
                } elseif ( isset( $settings['editor'] ) ) {
                    $snippet = mb_substr( strip_tags( $settings['editor'] ), 0, 100 );
                }

                $results[] = [
                    'elementId'       => $el['id'],
                    'elType'          => $el['elType'],
                    'widgetType'      => $el['widgetType'] ?? null,
                    'path'            => $current_path,
                    'snippet'         => $snippet,
                    'cssClasses'      => $settings['css_classes'] ?? null,
                    'customElementId' => $settings['_element_id'] ?? null,
                ];
            }

            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                $results = array_merge(
                    $results,
                    $this->search_elements_recursive( $el['elements'], $filters, $current_path )
                );
            }
        }

        return $results;
    }

    /**
     * 18. POST /pages/{id}/elements - Add element
     */
    public function handle_add_element( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id = (int) $request->get_param( 'id' );
        $body    = $request->get_json_params();

        $container_id = $body['containerId'] ?? null;
        $el_type      = $body['elType'] ?? null;
        $widget_type  = $body['widgetType'] ?? null;
        $settings     = $body['settings'] ?? [];
        $position     = isset( $body['position'] ) ? (int) $body['position'] : null;

        if ( empty( $container_id ) || empty( $el_type ) ) {
            return new \WP_REST_Response( [ 'error' => 'Missing containerId or elType in request body' ], 400 );
        }

        if ( ! in_array( $el_type, [ 'container', 'widget' ], true ) ) {
            return new \WP_REST_Response( [ 'error' => 'elType must be "container" or "widget"' ], 400 );
        }

        if ( $el_type === 'widget' && empty( $widget_type ) ) {
            return new \WP_REST_Response( [ 'error' => 'widgetType is required when elType is "widget"' ], 400 );
        }

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        // Build new element
        $new_element = [
            'id'       => $this->generate_element_id(),
            'elType'   => $el_type,
            'settings' => is_array( $settings ) ? $settings : [],
            'elements' => [],
        ];

        if ( $widget_type !== null ) {
            $new_element['widgetType'] = sanitize_text_field( $widget_type );
        }
        if ( $el_type === 'container' ) {
            $new_element['isInner'] = true;
        }

        $final_pos = $this->insert_into_container( $arr, $container_id, $new_element, $position );
        if ( $final_pos === false ) {
            return new \WP_REST_Response( [ 'error' => "Container not found: {$container_id}" ], 404 );
        }

        $this->save_and_clear( $post_id, $arr );

        return new \WP_REST_Response( [
            'success'      => true,
            'postId'       => $post_id,
            'containerId'  => $container_id,
            'newElementId' => $new_element['id'],
            'elType'       => $el_type,
            'widgetType'   => $widget_type,
            'position'     => (int) $final_pos,
        ], 200 );
    }

    /**
     * 19. POST /pages/{id}/elements/{eid}/delete - Delete element
     */
    public function handle_delete_element( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'eid' );

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $parent_id = $this->delete_from_tree( $arr, $element_id );
        if ( $parent_id === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        $this->save_and_clear( $post_id, $arr );

        return new \WP_REST_Response( [
            'success'          => true,
            'postId'           => $post_id,
            'deletedElementId' => $element_id,
            'parentId'         => $parent_id,
        ], 200 );
    }

    /**
     * 20. POST /pages/{id}/elements/{eid}/move - Move element
     */
    public function handle_move_element( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id    = (int) $request->get_param( 'id' );
        $element_id = $request->get_param( 'eid' );
        $body       = $request->get_json_params();

        $target_container_id = $body['targetContainerId'] ?? null;
        $position            = isset( $body['position'] ) ? (int) $body['position'] : null;

        if ( empty( $target_container_id ) ) {
            return new \WP_REST_Response( [ 'error' => 'Missing targetContainerId in request body' ], 400 );
        }

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        // Step 1: Extract the element
        $extracted = $this->extract_element( $arr, $element_id );
        if ( $extracted === null ) {
            return new \WP_REST_Response( [ 'error' => "Element not found: {$element_id}" ], 404 );
        }

        // Step 2: Insert into target container
        $final_pos = $this->insert_into_container( $arr, $target_container_id, $extracted, $position );
        if ( $final_pos === false ) {
            return new \WP_REST_Response( [ 'error' => "Target container not found: {$target_container_id}" ], 404 );
        }

        $this->save_and_clear( $post_id, $arr );

        return new \WP_REST_Response( [
            'success'            => true,
            'postId'             => $post_id,
            'elementId'          => $element_id,
            'targetContainerId'  => $target_container_id,
            'position'           => (int) $final_pos,
        ], 200 );
    }

    /**
     * 21. POST /kit - Update global kit settings
     */
    public function handle_update_global_kit( \WP_REST_Request $request ): \WP_REST_Response {
        $body         = $request->get_json_params();
        $new_settings = $body['settings'] ?? null;

        if ( empty( $new_settings ) || ! is_array( $new_settings ) ) {
            return new \WP_REST_Response( [ 'error' => 'Invalid or missing settings in request body' ], 400 );
        }

        $kit_id = get_option( 'elementor_active_kit' );
        if ( empty( $kit_id ) ) {
            return new \WP_REST_Response( [ 'error' => 'No active Elementor kit found' ], 404 );
        }

        $existing = get_post_meta( (int) $kit_id, '_elementor_page_settings', true );
        if ( ! is_array( $existing ) ) {
            $existing = [];
        }

        // Merge new settings into existing
        foreach ( $new_settings as $key => $value ) {
            $existing[ $key ] = $value;
        }

        update_post_meta( (int) $kit_id, '_elementor_page_settings', $existing );

        // Clear Elementor cache
        $this->clear_elementor_cache();

        return new \WP_REST_Response( [
            'success'     => true,
            'kitPostId'   => (int) $kit_id,
            'updatedKeys' => array_keys( $new_settings ),
        ], 200 );
    }

    /**
     * 22. GET /search - Search all pages
     */
    public function handle_search_all_pages( \WP_REST_Request $request ): \WP_REST_Response {
        $filters = [
            'widgetType'  => $request->get_param( 'widgetType' ),
            'cssClass'    => $request->get_param( 'cssClass' ),
            'elementId'   => $request->get_param( 'elementId' ),
            'contentText' => $request->get_param( 'contentText' ),
        ];

        // Remove empty filters
        $filters = array_filter( $filters );

        $pages = get_posts( [
            'post_type'   => [ 'page', 'post' ],
            'numberposts' => -1,
            'post_status' => 'any',
        ] );

        $total        = 0;
        $page_results = [];

        foreach ( $pages as $p ) {
            $raw = get_post_meta( $p->ID, '_elementor_data', true );
            if ( empty( $raw ) ) {
                continue;
            }
            $arr = json_decode( $raw, true );
            if ( empty( $arr ) || ! is_array( $arr ) ) {
                continue;
            }

            $results = $this->search_elements_recursive( $arr, $filters );
            if ( count( $results ) > 0 ) {
                $page_results[] = [
                    'postId'  => $p->ID,
                    'title'   => $p->post_title,
                    'results' => $results,
                    'count'   => count( $results ),
                ];
                $total += count( $results );
            }
        }

        return new \WP_REST_Response( [
            'totalResults' => $total,
            'pages'        => $page_results,
        ], 200 );
    }

    /**
     * 23. POST /pages/{id}/elements/{eid}/clone - Clone element
     */
    public function handle_clone_element( \WP_REST_Request $request ): \WP_REST_Response {
        $source_post_id = (int) $request->get_param( 'id' );
        $element_id     = $request->get_param( 'eid' );
        $body           = $request->get_json_params();

        $target_container_id = $body['targetContainerId'] ?? null;
        $target_post_id      = isset( $body['targetPostId'] ) ? (int) $body['targetPostId'] : null;

        // Load source page
        $source_arr = $this->get_elementor_data( $source_post_id );
        if ( is_wp_error( $source_arr ) ) {
            return new \WP_REST_Response( [ 'error' => $source_arr->get_error_message() ], $source_arr->get_error_data()['status'] ?? 404 );
        }

        // Find source element
        $source_el = $this->find_element_simple( $source_arr, $element_id );
        if ( $source_el === null ) {
            return new \WP_REST_Response( [ 'error' => "Source element not found: {$element_id}" ], 404 );
        }

        // Deep clone with new IDs
        $cloned = $this->deep_clone_element( $source_el );

        // Determine target
        $actual_target_post_id = $target_post_id ?? $source_post_id;

        // Load target data
        if ( $actual_target_post_id === $source_post_id ) {
            $target_arr = &$source_arr;
        } else {
            $target_arr = $this->get_elementor_data( $actual_target_post_id );
            if ( is_wp_error( $target_arr ) ) {
                return new \WP_REST_Response( [ 'error' => $target_arr->get_error_message() ], $target_arr->get_error_data()['status'] ?? 404 );
            }
        }

        $final_pos       = false;
        $final_container = '';

        if ( $target_container_id !== null ) {
            // Insert into specific container
            $final_pos       = $this->insert_into_container( $target_arr, $target_container_id, $cloned, null );
            $final_container = $target_container_id;
        } else {
            // Insert after original in same parent
            $final_pos       = $this->insert_after_original( $target_arr, $element_id, $cloned );
            $final_container = 'same_parent';
        }

        if ( $final_pos === false ) {
            return new \WP_REST_Response( [ 'error' => 'Could not insert cloned element' ], 404 );
        }

        $this->save_and_clear( $actual_target_post_id, $target_arr );

        return new \WP_REST_Response( [
            'success'            => true,
            'sourcePostId'       => $source_post_id,
            'sourceElementId'    => $element_id,
            'newElementId'       => $cloned['id'],
            'targetPostId'       => $actual_target_post_id,
            'targetContainerId'  => $final_container,
            'position'           => (int) $final_pos,
        ], 200 );
    }

    /**
     * 24. GET /pages/{id}/export - Export page data
     */
    public function handle_export_page( \WP_REST_Request $request ): \WP_REST_Response {
        $post_id = (int) $request->get_param( 'id' );

        $post = get_post( $post_id );
        if ( ! $post ) {
            return new \WP_REST_Response( [ 'error' => "Post not found: {$post_id}" ], 404 );
        }

        $arr = $this->get_elementor_data( $post_id );
        if ( is_wp_error( $arr ) ) {
            return new \WP_REST_Response( [ 'error' => $arr->get_error_message() ], $arr->get_error_data()['status'] ?? 404 );
        }

        $page_settings = get_post_meta( $post_id, '_elementor_page_settings', true );
        if ( ! is_array( $page_settings ) ) {
            $page_settings = new \stdClass();
        }

        // Count elements
        $count = 0;
        $stack = $arr;
        while ( count( $stack ) > 0 ) {
            $el = array_pop( $stack );
            $count++;
            if ( isset( $el['elements'] ) && is_array( $el['elements'] ) ) {
                foreach ( $el['elements'] as $child ) {
                    $stack[] = $child;
                }
            }
        }

        return new \WP_REST_Response( [
            'postId'        => $post_id,
            'title'         => $post->post_title,
            'elementorData' => $arr,
            'pageSettings'  => $page_settings,
            'elementCount'  => $count,
        ], 200 );
    }
}

// Initialize the plugin.
Elementor_MCP_Bridge::instance();
