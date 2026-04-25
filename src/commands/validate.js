'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadManifest,
  getTemplatePath,
  readLockfile,
} = require('../utils');

const VALID_OWNERSHIP = new Set(['kit-managed', 'user-owned']);

function posixPath(filePath) {
  return filePath.split(path.sep).join('/');
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0] !== '---') {
    return { hasFrontmatter: false, data: {} };
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (end === -1) {
    return { hasFrontmatter: false, data: {} };
  }

  const data = {};
  for (let i = 1; i < end; i++) {
    const match = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) { continue; }

    const key = match[1];
    const value = match[2].trim();
    if (value === '>' || value === '|') {
      const block = [];
      while (i + 1 < end && (/^\s+/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
        i++;
        block.push(lines[i].trim());
      }
      data[key] = block.join(' ').trim();
    } else {
      data[key] = stripQuotes(value);
    }
  }

  return { hasFrontmatter: true, data };
}

function collectFiles(rootDir) {
  if (!fs.existsSync(rootDir)) { return []; }
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
      } else if (entry.isFile()) {
        files.push(posixPath(path.relative(rootDir, absPath)));
      }
    }
  }

  return files.sort();
}

function validateManifest(manifest, templateRoot) {
  const errors = [];
  if (!manifest || !Array.isArray(manifest.files)) {
    return ['kit-manifest.json must contain a files array'];
  }

  const manifestPaths = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry.path !== 'string' || entry.path.length === 0) {
      errors.push('manifest entries must include a non-empty path');
      continue;
    }
    if (manifestPaths.has(entry.path)) {
      errors.push(`duplicate manifest path: ${entry.path}`);
    }
    manifestPaths.add(entry.path);

    if (!VALID_OWNERSHIP.has(entry.ownership)) {
      errors.push(`${entry.path} has invalid ownership: ${entry.ownership}`);
    }

    if (!fs.existsSync(path.join(templateRoot, entry.path))) {
      errors.push(`${entry.path} is listed in the manifest but missing from templates`);
    }
  }

  for (const templatePath of collectFiles(templateRoot)) {
    if (!manifestPaths.has(templatePath)) {
      errors.push(`${templatePath} exists in templates but is missing from the manifest`);
    }
  }

  return errors;
}

function validateSkill(relativePath, templateRoot) {
  const errors = [];
  const content = fs.readFileSync(path.join(templateRoot, relativePath), 'utf8');
  const { hasFrontmatter, data } = parseFrontmatter(content);
  const skillName = relativePath.split('/').at(-2);

  if (!hasFrontmatter) {
    errors.push(`${relativePath} must start with YAML frontmatter`);
    return errors;
  }
  if (!data.name) {
    errors.push(`${relativePath} must include a name field`);
  } else if (data.name !== skillName) {
    errors.push(`${relativePath} name must match folder name (${skillName})`);
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.name)) {
    errors.push(`${relativePath} name must be lowercase words separated by hyphens`);
  }
  if (!data.description || data.description.length < 10) {
    errors.push(`${relativePath} must include a meaningful description field`);
  }

  return errors;
}

function validateAgent(relativePath, templateRoot) {
  const errors = [];
  const content = fs.readFileSync(path.join(templateRoot, relativePath), 'utf8');
  const { hasFrontmatter, data } = parseFrontmatter(content);

  if (!hasFrontmatter) {
    errors.push(`${relativePath} must start with YAML frontmatter`);
    return errors;
  }
  if (!data.name) {
    errors.push(`${relativePath} must include a name field`);
  }
  if (!data.description || data.description.length < 10) {
    errors.push(`${relativePath} must include a meaningful description field`);
  }

  return errors;
}

function validateMetadata(manifest, templateRoot) {
  const errors = [];
  for (const entry of manifest.files || []) {
    if (!entry || typeof entry.path !== 'string') {
      continue;
    }
    if (!fs.existsSync(path.join(templateRoot, entry.path))) {
      continue;
    }
    if (entry.path.endsWith('/SKILL.md') && entry.path.includes('.github/skills/')) {
      errors.push(...validateSkill(entry.path, templateRoot));
    }
    if (entry.path.endsWith('.agent.md') && entry.path.includes('.github/agents/')) {
      errors.push(...validateAgent(entry.path, templateRoot));
    }
  }
  return errors;
}

function validateLockfile(targetDir, manifest) {
  const errors = [];
  const lock = readLockfile(targetDir);
  if (!lock) { return errors; }

  if (typeof lock.version !== 'string' || lock.version.length === 0) {
    errors.push('.copilot-kit.lock must include a version string');
  }
  if (!lock.files || typeof lock.files !== 'object' || Array.isArray(lock.files)) {
    errors.push('.copilot-kit.lock must include a files object');
    return errors;
  }

  const manifestPaths = new Set((manifest.files || []).map((entry) => entry.path));
  for (const [filePath, meta] of Object.entries(lock.files)) {
    if (!manifestPaths.has(filePath)) {
      errors.push(`.copilot-kit.lock tracks unknown file: ${filePath}`);
    }
    if (!meta || !VALID_OWNERSHIP.has(meta.ownership)) {
      errors.push(`${filePath} has invalid lockfile ownership`);
    }
    if (!meta || typeof meta.hash !== 'string' || meta.hash.length === 0) {
      errors.push(`${filePath} has invalid lockfile hash`);
    }
  }

  return errors;
}

/**
 * Validate bundled kit metadata and any installed lockfile in the current dir.
 * @param {string[]} _flags
 */
async function validate(_flags) {
  const manifest = loadManifest();
  const templateRoot = getTemplatePath('');
  const errors = [
    ...validateManifest(manifest, templateRoot),
    ...validateMetadata(manifest, templateRoot),
    ...validateLockfile(process.cwd(), manifest),
  ];

  if (errors.length > 0) {
    console.log('');
    console.log('  copilot-workflow-kit validate');
    console.log('  =============================');
    console.log('');
    errors.forEach((error) => console.log(`  ✗ ${error}`));
    console.log('');
    throw new Error(`${errors.length} validation error(s) found`);
  }

  console.log('\n  ✓ copilot-workflow-kit metadata is valid\n');
}

module.exports = validate;
module.exports._internal = {
  parseFrontmatter,
  validateManifest,
  validateSkill,
  validateAgent,
  validateLockfile,
};
