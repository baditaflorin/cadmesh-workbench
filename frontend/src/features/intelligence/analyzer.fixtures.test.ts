import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeInputFiles } from './analyzer';
import type { AnalysisInputFile, AnalysisResult, DiagnosticIssue, DiagnosticManifest } from './types';

type ExpectedFixture = {
  fixture: string;
  expected: {
    kind: DiagnosticManifest['kind'];
    format: DiagnosticManifest['format'];
    route: DiagnosticManifest['route'];
    state: DiagnosticManifest['state'];
    minConfidence: number;
    properties?: Record<string, string | number | boolean>;
    mustIncludeAnomalies?: string[];
    mustIncludeSuggestions?: string[];
  };
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const fixturesDir = join(repoRoot, 'test/fixtures/realdata');

const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe('source intelligence real-data fixtures', () => {
  it.each(fixtures)('matches the audit expectation for %s', (fixtureName) => {
    const fixturePath = join(fixturesDir, fixtureName);
    const expected = JSON.parse(readFileSync(join(fixturePath, 'expected.json'), 'utf8')) as ExpectedFixture;
    const inputs = readFixtureInputs(fixturePath);

    const result = analyzeInputFiles(inputs, { appVersion: '0.2.0-test', commit: 'fixture-test' });

    expect(result.manifest.kind).toBe(expected.expected.kind);
    expect(result.manifest.format).toBe(expected.expected.format);
    expect(result.manifest.route).toBe(expected.expected.route);
    expect(result.manifest.state).toBe(expected.expected.state);
    expect(result.manifest.confidence.classification).toBeGreaterThanOrEqual(expected.expected.minConfidence);
    expect(result.manifest.confidence.route).toBeGreaterThan(0.7);
    expect(result.manifest.provenance.deterministic).toBe(true);

    assertProperties(result, expected.expected.properties ?? {});
    assertIssueNeedles(result.manifest.anomalies, expected.expected.mustIncludeAnomalies ?? []);
    assertIssueNeedles(result.manifest.suggestions, expected.expected.mustIncludeSuggestions ?? []);
  });

  it.each(fixtures)('produces deterministic output for %s', (fixtureName) => {
    const fixturePath = join(fixturesDir, fixtureName);
    const inputs = readFixtureInputs(fixturePath);

    const first = analyzeInputFiles(inputs, { appVersion: '0.2.0-test', commit: 'fixture-test' });
    const second = analyzeInputFiles(inputs, { appVersion: '0.2.0-test', commit: 'fixture-test' });

    expect(second.stableJSON).toBe(first.stableJSON);
    expect(second.manifest.sourceId).toBe(first.manifest.sourceId);
  });

  it.each([
    {
      name: 'empty input',
      files: [],
      state: 'loaded-empty',
      needle: 'no source files',
    },
    {
      name: 'huge STL header sample',
      files: [hugeSTL()],
      state: 'loaded-too-many',
      needle: 'larger than the browser preflight budget',
    },
    {
      name: 'malformed glTF',
      files: [textInput('broken.gltf', '{"asset":{"version":"2.0",}')],
      state: 'error-fatal',
      needle: 'could not be parsed',
    },
    {
      name: 'CP1252 STEP header',
      files: [
        latin1Input(
          'cp1252.step',
          "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('smart \x93quote\x94'));\nENDSEC;\nEND-ISO-10303-21;\n",
        ),
      ],
      state: 'loaded-some',
      needle: 'OpenCascade',
    },
    {
      name: 'mixed CAD and mesh selection',
      files: [
        textInput('part.step', 'ISO-10303-21;\nEND-ISO-10303-21;\n'),
        textInput('mesh.obj', 'v 0 0 0\n'),
      ],
      state: 'error-recoverable',
      needle: 'mixed',
    },
  ])('handles synthetic edge case: $name', (edge) => {
    const result = analyzeInputFiles(edge.files, { appVersion: '0.2.0-test', commit: 'fixture-test' });

    expect(result.manifest.state).toBe(edge.state);
    expect(
      `${result.manifest.summary} ${issueText([...result.manifest.anomalies, ...result.manifest.suggestions])}`.toLowerCase(),
    ).toContain(edge.needle.toLowerCase());
  });
});

function readFixtureInputs(fixturePath: string): AnalysisInputFile[] {
  return readdirSync(fixturePath)
    .filter((name) => name !== 'expected.json')
    .sort()
    .map((name) => {
      const bytes = readFileSync(join(fixturePath, name));
      return {
        name,
        type: contentType(name),
        bytes: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      };
    });
}

function contentType(name: string): string {
  if (/\.(jpe?g)$/i.test(name)) return 'image/jpeg';
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.json$/i.test(name)) return 'application/json';
  return 'application/octet-stream';
}

function textInput(name: string, value: string): AnalysisInputFile {
  return { name, type: 'application/octet-stream', bytes: new TextEncoder().encode(value) };
}

function latin1Input(name: string, value: string): AnalysisInputFile {
  return {
    name,
    type: 'application/octet-stream',
    bytes: Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 0xff)),
  };
}

function hugeSTL(): AnalysisInputFile {
  const bytes = new Uint8Array(15 * 1024 * 1024 + 1);
  bytes.set(new TextEncoder().encode('solid huge\n'));
  return { name: 'huge.stl', type: 'model/stl', bytes };
}

function assertProperties(result: AnalysisResult, properties: Record<string, string | number | boolean>) {
  const { manifest } = result;
  for (const [key, expected] of Object.entries(properties)) {
    if (key === 'unit') expect(manifest.inferred.unit).toBe(expected);
    if (key === 'schema') expect(manifest.inferred.schema).toBe(expected);
    if (key === 'normalizedLineEndings') expect(manifest.inferred.normalizedLineEndings).toBe(expected);
    if (key === 'componentCountAtLeast') {
      expect(Number(manifest.inferred.components ?? manifest.metrics.components ?? 0)).toBeGreaterThanOrEqual(
        Number(expected),
      );
    }
    if (key === 'trianglesAtLeast')
      expect(Number(manifest.metrics.triangles ?? 0)).toBeGreaterThanOrEqual(Number(expected));
    if (key === 'boundsRequired') expect(String(manifest.inferred.bounds ?? '')).not.toBe('unknown');
    if (key === 'verticesAtLeast')
      expect(Number(manifest.metrics.vertices ?? 0)).toBeGreaterThanOrEqual(Number(expected));
    if (key === 'facesAtLeast')
      expect(Number(manifest.metrics.faces ?? 0)).toBeGreaterThanOrEqual(Number(expected));
    if (key === 'textureDependencies')
      expect(Number(manifest.metrics.textureDependencies ?? 0)).toBeGreaterThan(0);
    if (key === 'convertible') expect(manifest.inferred.convertible).toBe(expected);
    if (key === 'imageCountAtLeast') {
      expect(Number(manifest.inferred.imageCount ?? manifest.metrics.images ?? 0)).toBeGreaterThanOrEqual(
        Number(expected),
      );
    }
    if (key === 'nativeRequired') {
      expect(manifest.inferred.nativeRequired).toBe(expected);
      expect(manifest.provenance.generationMode).toBe('native-required');
    }
    if (key === 'warnLarge') {
      expect(issueText(manifest.anomalies)).toContain('large');
    }
    if (key === 'orientationIssue') expect(manifest.inferred.orientationIssue).toBe(expected);
    if (key === 'tooFewImages') expect(manifest.inferred.tooFewImages).toBe(expected);
  }
}

function assertIssueNeedles(issues: DiagnosticIssue[], needles: string[]) {
  const haystack = issueText(issues);
  for (const needle of needles) {
    expect(haystack).toContain(normalizeIssueText(needle));
  }
}

function issueText(issues: DiagnosticIssue[]): string {
  return normalizeIssueText(
    issues.flatMap((item) => [item.code, item.message, item.why, item.next]).join(' '),
  );
}

function normalizeIssueText(value: string): string {
  return value.replace(/[-_]/g, ' ').toLowerCase();
}
