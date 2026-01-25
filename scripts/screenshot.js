#!/usr/bin/env node
/**
 * Screenshot Tool for Civly Website
 *
 * Usage:
 *   node scripts/screenshot.js /purchase.html
 *   node scripts/screenshot.js /intake.html --mobile
 *   node scripts/screenshot.js /civly_redesign.html --full-page
 *   node scripts/screenshot.js /purchase.html --output=/tmp/purchase.png
 */

const { chromium } = require("playwright");

// Configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const DEFAULT_OUTPUT = "/tmp/screenshot.png";

// Viewport presets
const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let path = "/";
  let viewport = { ...VIEWPORTS.desktop };
  let output = DEFAULT_OUTPUT;
  let wait = 1000;
  let fullPage = false;

  for (const arg of args) {
    if (arg.startsWith("/")) {
      path = arg;
    } else if (arg === "--mobile") {
      viewport = { ...VIEWPORTS.mobile };
    } else if (arg === "--tablet") {
      viewport = { ...VIEWPORTS.tablet };
    } else if (arg.startsWith("--width=")) {
      viewport.width = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--height=")) {
      viewport.height = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--output=")) {
      output = arg.split("=")[1];
    } else if (arg.startsWith("--wait=")) {
      wait = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--full-page") {
      fullPage = true;
    }
  }

  return { path, viewport, output, wait, fullPage };
}

async function main() {
  const { path, viewport, output, wait, fullPage } = parseArgs();

  console.log(`📸 Screenshot: ${path}`);
  console.log(`   Viewport: ${viewport.width}x${viewport.height}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  try {
    // Navigate to the target page
    const url = `${BASE_URL}${path}`;
    console.log(`   Loading ${url}...`);
    await page.goto(url, { waitUntil: "networkidle" });

    // Additional wait for animations
    if (wait > 0) {
      await page.waitForTimeout(wait);
    }

    // Take screenshot
    await page.screenshot({ path: output, fullPage });
    console.log(`   ✓ Saved to ${output}`);
  } catch (error) {
    console.error("   ✗ Error:", error.message);
    await page.screenshot({ path: output });
    console.log(`   Screenshot saved despite error: ${output}`);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
