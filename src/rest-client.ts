import axios, { AxiosInstance, AxiosError } from "axios";
import type { RestConfig } from "./backend.js";

export class RestClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: RestConfig) {
    this.baseUrl = `${config.siteUrl.replace(/\/+$/, "")}/wp-json/elementor-mcp/v1`;
    const token = Buffer.from(`${config.username}:${config.appPassword}`).toString("base64");

    this.client = axios.create({
      timeout: config.timeout || 60000,
      headers: {
        Authorization: `Basic ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  }

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(`${this.baseUrl}/${endpoint}`, { params });
    return response.data;
  }

  async post<T = unknown>(endpoint: string, data?: Record<string, unknown>): Promise<T> {
    const response = await this.client.post<T>(`${this.baseUrl}/${endpoint}`, data);
    return response.data;
  }

  static handleError(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.response) {
        const status = error.response.status;
        const url = error.config?.url || "unknown URL";
        switch (status) {
          case 401:
            return `Error (401): Authentication failed for ${url}. Check ELEMENTOR_USERNAME and ELEMENTOR_APP_PASSWORD.`;
          case 403:
            return `Error (403): Permission denied for ${url}. User lacks edit_posts capability.`;
          case 404:
            return `Error (404): Endpoint not found - ${url}. Is the elementor-mcp-bridge plugin activated?`;
          default:
            return `Error (${status}): Request failed for ${url}.`;
        }
      } else if (error.code === "ECONNABORTED") {
        return `Error: Request timed out. Check ELEMENTOR_SITE_URL is accessible.`;
      } else if (error.code === "ENOTFOUND") {
        return `Error: Could not resolve hostname. Check ELEMENTOR_SITE_URL.`;
      }
    }
    if (error instanceof Error) return `Error: ${error.message}`;
    return `Error: ${String(error)}`;
  }
}
