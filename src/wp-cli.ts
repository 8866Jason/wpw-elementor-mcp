import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class WpCli {
  private projectDir: string;

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Execute complex PHP via stdin piping (ddev wp eval-file -).
   * This avoids ALL shell escaping issues.
   */
  async evalFile(phpCode: string, timeoutMs = 60000): Promise<string> {
    const fullCode = `<?php error_reporting(0);\n${phpCode}`;
    return new Promise((resolve, reject) => {
      const child = exec(
        "ddev wp eval-file -",
        { cwd: this.projectDir, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(
              new Error(
                `WP-CLI error: ${error.message}${stderr ? `\nstderr: ${stderr}` : ""}`
              )
            );
            return;
          }
          // Extract JSON from stdout (WP-CLI/plugins may prepend non-JSON text)
          const trimmed = stdout.trim();
          const jsonStart = trimmed.indexOf("{");
          const jsonStartArr = trimmed.indexOf("[");
          const start =
            jsonStart === -1
              ? jsonStartArr
              : jsonStartArr === -1
                ? jsonStart
                : Math.min(jsonStart, jsonStartArr);
          resolve(start > 0 ? trimmed.substring(start) : trimmed);
        }
      );
      child.stdin?.write(fullCode);
      child.stdin?.end();
    });
  }

  /**
   * Execute a WP-CLI command directly (not eval).
   */
  async command(cmd: string, timeoutMs = 30000): Promise<string> {
    const { stdout } = await execAsync(`ddev wp ${cmd}`, {
      cwd: this.projectDir,
      timeout: timeoutMs,
    });
    return stdout.trim();
  }
}
