#!/usr/bin/env node

console.log(`Welcome to BetterPortal SDK!`);
console.log(`We're going to install/update the BetterPortal SDK.`);

const fs = require("fs");
const path = require("path");
const os = require("os");
const child_process = require("child_process");
const fse = require("fs-extra");
const cwd = process.cwd();

console.log("Working in: " + cwd);
const packageJsonFile = path.join(cwd, "./package.json");
if (!fs.existsSync(packageJsonFile)) {
  console.error(`No package.json file found in the current directory.`);
  process.exit(1);
}

const BPSDK_UI_DIR = path.join(
  cwd,
  "./node_modules/@bettercorp/service-base-plugin-betterportal/betterportal-ui"
);

let packageJSON = JSON.parse(fs.readFileSync(packageJsonFile).toString());

if (packageJSON.name === "@bettercorp/service-base-plugin-betterportal") return;

if (packageJSON.bsb_project !== true) {
  console.error(
    `This is not a BetterPortal SDK project. - Install @bettercorp/better-service-base first.`
  );
  process.exit(1);
}

if (
  packageJSON.dependencies["@bettercorp/service-base-plugin-betterportal"] ===
  undefined
) {
  console.warn("Installing @bettercorp/service-base-plugin-betterportal");
  const execResult = child_process.execSync(
    "npm i --save @bettercorp/service-base-plugin-betterportal@latest",
    {
      encoding: "utf8",
      cwd: cwd,
    }
  );
  console.log(execResult);
} else {
  console.warn("We're going to force update BP");
  const execResult = child_process.execSync(
    "npm remove @bettercorp/service-base-plugin-betterportal && npm i --save @bettercorp/service-base-plugin-betterportal@latest",
    {
      encoding: "utf8",
      cwd: cwd,
    }
  );
  console.log(execResult);
}

if (!fs.existsSync(BPSDK_UI_DIR)) {
  console.error(
    `BetterPortal UI SDK not found. - Install @bettercorp/service-base-plugin-betterportal first (we tried but failed...).`
  );
  process.exit(1);
}

const uiDir = path.join(cwd, "./betterportal-ui");
console.warn("Copying/Updating BP UI");
const uiPKGJson = path.join(uiDir, "package.json");
let existingPackageJson = {};
let existing = false;
if (fs.existsSync(uiPKGJson)) {
  existingPackageJson = JSON.parse(fs.readFileSync(uiPKGJson).toString());
  existing = true;
}
fse.copySync(BPSDK_UI_DIR, uiDir, { overwrite: true });
if (existing) {
  console.log("Updating package.json (keeping existing values");
  let newPackageJson = JSON.parse(fs.readFileSync(uiPKGJson).toString());
  console.debug(
    `Setting [scripts.build] from [${
      existingPackageJson.scripts["build"] || "-"
    }] to [${newPackageJson.scripts["build"]}]`
  );
  newPackageJson.scripts["build"] = existingPackageJson.scripts["build"];
  console.debug(
    `Setting [name] from [${existingPackageJson.name}] to [${newPackageJson.name}]`
  );
  newPackageJson.name = existingPackageJson.name;
  console.debug(
    `Setting [version] from [${existingPackageJson.version}] to [${newPackageJson.version}]`
  );
  newPackageJson.version = existingPackageJson.version;
  console.debug(
    `Setting [description] from [${existingPackageJson.description}] to [${newPackageJson.description}]`
  );
  newPackageJson.description = existingPackageJson.description;
  console.debug(
    `Setting [author] from [${existingPackageJson.author}] to [${newPackageJson.author}]`
  );
  newPackageJson.author = existingPackageJson.author;
  console.debug(
    `Setting [license] from [${existingPackageJson.license}] to [${newPackageJson.license}]`
  );
  newPackageJson.license = existingPackageJson.license;

  for (let deps of Object.keys(existingPackageJson.dependencies || {})) {
    if (newPackageJson.dependencies[deps] !== undefined) continue;
    console.debug(
      `Adding dependency [${deps}@${existingPackageJson.dependencies[deps]}]`
    );
    newPackageJson.dependencies[deps] = existingPackageJson.dependencies[deps];
  }
  for (let deps of Object.keys(existingPackageJson.devDependencies || {})) {
    if (newPackageJson.devDependencies[deps] !== undefined) continue;
    console.debug(
      `Adding devDependency [${deps}@${existingPackageJson.devDependencies[deps]}]`
    );
    newPackageJson.devDependencies[deps] =
      existingPackageJson.devDependencies[deps];
  }

  fs.writeFileSync(uiPKGJson, JSON.stringify(newPackageJson, " ", 2));
}

console.warn("Updating package.json");
packageJSON.scripts = packageJSON.scripts || {};
packageJSON.scripts["build-ui"] = "cd betterportal-ui && npm run build";
packageJSON.scripts["npmi-ui"] = "cd ./betterportal-ui && npm i";
packageJSON.scripts["npmci-ui"] = "cd ./betterportal-ui && npm ci";
packageJSON.scripts["build-all"] = "npm run build && npm run build-ui";
packageJSON.scripts["npmi-all"] = "npm i && npm run npmi-ui";
packageJSON.scripts["npmci-all"] = "npm ci && npm run npmci-ui";

console.warn("Updating output files");
packageJSON.files = packageJSON.files || [];
if (packageJSON.files.indexOf("bpui/**/*") < 0)
  packageJSON.files.push("bpui/**/*");

console.warn("Updating package.json");
fs.writeFileSync(packageJsonFile, JSON.stringify(packageJSON, " ", 2));

console.warn("Updating .gitignore");
const gitIgnoreFile = path.join(cwd, ".gitignore");
let gitignore = fs.existsSync(gitIgnoreFile)
  ? fs.readFileSync(gitIgnoreFile).toString().split(os.EOL)
  : [];
if (gitignore.indexOf("/lib") < 0) gitignore.push("/lib");
if (gitignore.indexOf("/bpui") < 0) gitignore.push("/bpui");
if (gitignore.indexOf("/betterportal-ui/dist") < 0)
  gitignore.push("/betterportal-ui/dist");
if (gitignore.indexOf("/betterportal-ui/lib") < 0)
  gitignore.push("/betterportal-ui/lib");
if (gitignore.indexOf("/betterportal-ui/node_modules") < 0)
  gitignore.push("/betterportal-ui/node_modules");

fs.writeFileSync(gitIgnoreFile, gitignore.join(os.EOL));

console.warn("Final NPM I run");
const execResult = child_process.execSync("npm run npmi-all", {
  encoding: "utf8",
  cwd: cwd,
});

console.log(execResult);

console.warn("Done!");
console.warn("___________________________________________");
console.warn("");
console.warn("How to use?");
console.warn("");
console.warn("The following UI specific commands are available: (npm run ___)");
console.warn(" - build-ui (This builds the UI)");
console.warn(" - npmi-ui (This installs the UI dependencies)");
console.warn(" - npmci-ui (This installs the UI dependencies for CI/CD)");
console.warn("");
console.warn(
  "The following root project commands are available: (npm run ___)"
);
console.warn(" - build-all (This builds the UI and the BSB plugin)");
console.warn(
  " - npmi-all (This installs the UI and the BSB plugin dependencies)"
);
console.warn(
  " - npmci-all (This installs the UI and the BSB plugin dependencies for CI/CD)"
);
console.warn("");
console.warn("___________________________________________");
