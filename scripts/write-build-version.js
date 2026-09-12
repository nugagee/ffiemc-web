/**
 * Writes REACT_APP_BUILD_VERSION for production builds (cache busting).
 * Run automatically via npm/yarn prebuild — same pattern as Vip-Hire.
 */
const fs = require("fs");
const path = require("path");

const pkg = require("../package.json");
const buildId =
  process.env.REACT_APP_BUILD_VERSION ||
  process.env.BUILD_BUILDID ||
  process.env.BUILD_ID ||
  Date.now();
const version = `${pkg.version}-${buildId}`;

const root = path.join(__dirname, "..");

fs.writeFileSync(
  path.join(root, ".env.production.local"),
  `REACT_APP_BUILD_VERSION=${version}\n`,
  "utf8"
);

fs.writeFileSync(
  path.join(root, "public", "version.json"),
  `${JSON.stringify({ version }, null, 2)}\n`,
  "utf8"
);

// eslint-disable-next-line no-console
console.log(`Build version: ${version}`);
