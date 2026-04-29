'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LOCKFILE_NAME } = require('../../src/utils');

let tmpDir;
let mockTemplateDir;
const originalCwd = process.cwd;

const mockManifest = {
  files: [
    { path: '.github/skills/example-skill/SKILL.md', ownership: 'kit-managed' },
    { path: '.github/agents/example-agent.agent.md', ownership: 'kit-managed' },
    { path: 'AGENTS.md', ownership: 'user-owned' },
  ],
};

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-validate-'));
  mockTemplateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cwk-tpl-'));

  writeTemplate('.github/skills/example-skill/SKILL.md', `---
name: example-skill
description: Example skill used by tests.
---

# Example Skill
`);
  writeTemplate('.github/agents/example-agent.agent.md', `---
name: Example Agent
description: Example agent used by tests.
---

# Example Agent
`);
  writeTemplate('AGENTS.md', '# AGENTS.md\n');

  process.cwd = () => tmpDir;
  jest.spyOn(console, 'log').mockImplementation(() => {});

  jest.mock('../../src/utils', () => {
    const actual = jest.requireActual('../../src/utils');
    const mockPath = require('path');
    return {
      ...actual,
      loadManifest: () => mockManifest,
      getTemplatePath: (rel) => mockPath.join(mockTemplateDir, rel),
    };
  });
});

afterEach(() => {
  process.cwd = originalCwd;
  console.log.mockRestore();
  jest.restoreAllMocks();
  jest.resetModules();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(mockTemplateDir, { recursive: true, force: true });
});

function writeTemplate(relativePath, content) {
  const absPath = path.join(mockTemplateDir, relativePath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
}

function requireValidate() {
  return require('../../src/commands/validate');
}

function getOutput() {
  return console.log.mock.calls.map(c => c[0]).join('\n');
}

describe('validate command', () => {
  it('passes for valid manifest, templates, skill metadata, and agent metadata', async () => {
    const validate = requireValidate();

    await expect(validate([])).resolves.toBeUndefined();
    expect(getOutput()).toContain('metadata is valid');
  });

  it('fails when a manifest file is missing from templates', async () => {
    fs.rmSync(path.join(mockTemplateDir, 'AGENTS.md'));
    const validate = requireValidate();

    await expect(validate([])).rejects.toThrow('validation error');
    expect(getOutput()).toContain('missing from templates');
  });

  it('reports missing skill templates without crashing metadata validation', async () => {
    fs.rmSync(path.join(mockTemplateDir, '.github', 'skills', 'example-skill', 'SKILL.md'));
    const validate = requireValidate();

    await expect(validate([])).rejects.toThrow('validation error');
    expect(getOutput()).toContain('missing from templates');
  });

  it('reports invalid manifest entries without crashing metadata validation', async () => {
    mockManifest.files.push({ ownership: 'kit-managed' });
    const validate = requireValidate();

    await expect(validate([])).rejects.toThrow('validation error');
    expect(getOutput()).toContain('non-empty path');
  });

  it('fails when a template is missing from the manifest', async () => {
    writeTemplate('extra.md', 'extra\n');
    const validate = requireValidate();

    await expect(validate([])).rejects.toThrow('validation error');
    expect(getOutput()).toContain('missing from the manifest');
  });

  it('fails when a skill is missing required metadata', async () => {
    writeTemplate('.github/skills/example-skill/SKILL.md', `---
description: Example skill used by tests.
---

# Example Skill
`);
    const validate = requireValidate();

    await expect(validate([])).rejects.toThrow('validation error');
    expect(getOutput()).toContain('must include a name field');
  });

  it('fails when an installed lockfile has invalid shape', async () => {
    fs.writeFileSync(path.join(tmpDir, LOCKFILE_NAME), JSON.stringify({
      version: '',
      gitMode: 'surprise-me',
      files: {
        'unknown.md': { ownership: 'kit-managed', hash: '' },
      },
    }), 'utf8');
    const validate = requireValidate();

    await expect(validate([])).rejects.toThrow('validation error');
    expect(getOutput()).toContain('version string');
    expect(getOutput()).toContain('invalid gitMode');
    expect(getOutput()).toContain('unknown file');
    expect(getOutput()).toContain('invalid lockfile hash');
  });
});
