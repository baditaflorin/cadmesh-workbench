import { appConfig } from '../../lib/config';
import type { MeshData } from '../workbench/types';
import { fnv1a, sourceId } from './hash';
import { issue, sortIssues } from './issues';
import { stableStringify } from './stable';
import { decodeNormalized } from './text';
import type {
  AnalysisInputFile,
  AnalysisResult,
  AnalyzeOptions,
  Bounds,
  Confidence,
  DiagnosticIssue,
  DiagnosticManifest,
  InputFormat,
  InputKind,
  Route,
  SourceFileSummary,
  SourceState,
} from './types';

const BROWSER_BUDGET_BYTES = 15 * 1024 * 1024;
const PHOTOSET_BUDGET_BYTES = 80 * 1024 * 1024;
const MIN_PHOTOGRAMMETRY_IMAGES = 8;

type PartialManifest = {
  kind: InputKind;
  format: InputFormat;
  route: Route;
  state: SourceState;
  confidence: Confidence;
  summary: string;
  metrics: DiagnosticManifest['metrics'];
  inferred: Record<string, string | number | boolean>;
  anomalies: DiagnosticIssue[];
  suggestions: DiagnosticIssue[];
  evidence: string[];
  generationMode: DiagnosticManifest['provenance']['generationMode'];
  previewMesh?: MeshData;
};

export function analyzeInputFiles(
  files: AnalysisInputFile[],
  options: AnalyzeOptions = { appVersion: appConfig.version, commit: appConfig.commit },
): AnalysisResult {
  const started = performance.now();
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  if (sortedFiles.length === 0) {
    return finalize(
      sortedFiles,
      {
        kind: 'unknown',
        format: 'unknown',
        route: 'review',
        state: 'loaded-empty',
        confidence: confidence(0, 0, 0, 0, 0),
        summary: 'No usable source files selected',
        metrics: baseMetrics(sortedFiles, started),
        inferred: {},
        anomalies: [
          issue(
            'empty-selection',
            'warning',
            'No source files were selected.',
            'The browser did not receive any CAD, mesh, or photo files.',
            'Select a STEP, STL, OBJ, PLY, OFF, glTF/GLB, or a photo set.',
          ),
        ],
        suggestions: [],
        evidence: ['file_count=0'],
        generationMode: 'unsupported',
      },
      started,
      options,
    );
  }

  const totalBytes = sortedFiles.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (sortedFiles.every((file) => isImageName(file.name, file.type) || isPhotoManifest(file.name))) {
    return finalize(sortedFiles, analyzePhotoSet(sortedFiles, started), started, options);
  }

  const file = sortedFiles[0];
  const ext = extension(file.name);
  if (sortedFiles.length > 1) {
    return finalize(
      sortedFiles,
      {
        kind: 'unknown',
        format: 'unknown',
        route: 'review',
        state: 'error-recoverable',
        confidence: confidence(0.42, 0.4, 0, 0, 0),
        summary: `${sortedFiles.length} mixed files need a single source type`,
        metrics: { ...baseMetrics(sortedFiles, started), totalBytes },
        inferred: { mixedFiles: true },
        anomalies: [
          issue(
            'mixed-source-set',
            'warning',
            'Mixed CAD/mesh files were selected together.',
            'The workbench needs one source asset or one photo set so provenance and route stay coherent.',
            'Select one CAD/mesh file, or select only photos for photogrammetry.',
          ),
        ],
        suggestions: [],
        evidence: sortedFiles.map((item) => `file=${item.name}`),
        generationMode: 'unsupported',
      },
      started,
      options,
    );
  }

  if (file.bytes.byteLength > BROWSER_BUDGET_BYTES && ext !== 'glb') {
    const headerResult = analyzeSingleFile(file, started, true);
    headerResult.state = 'loaded-too-many';
    headerResult.anomalies.push(
      issue(
        'large-source',
        'warning',
        'This source is larger than the browser preflight budget.',
        `The current browser budget is ${Math.round(BROWSER_BUDGET_BYTES / 1024 / 1024)} MB.`,
        'Use backend processing or downsample/split the source before full repair.',
      ),
    );
    return finalize(sortedFiles, headerResult, started, options);
  }

  return finalize(sortedFiles, analyzeSingleFile(file, started, false), started, options);
}

function analyzeSingleFile(file: AnalysisInputFile, started: number, headerOnly: boolean): PartialManifest {
  const ext = extension(file.name);
  const bytes = file.bytes;
  const head = bytes.slice(0, Math.min(bytes.length, 128 * 1024));
  const decoded = decodeNormalized(head);
  const trimmed = decoded.text.trimStart();

  if (trimmed.startsWith('ISO-10303-21') || ext === 'step' || ext === 'stp')
    return analyzeSTEP(file, decoded, started);
  if (isBinarySTL(bytes, trimmed, ext)) return analyzeBinarySTL(file, started);
  if (/^solid\b/i.test(trimmed) || ext === 'stl') return analyzeASCIISTL(file, decoded, started);
  if (/^ply\s/i.test(trimmed) || ext === 'ply') return analyzePLY(file, decoded, started);
  if (/^(#.*\n)?\s*(o |v |mtllib |g )/m.test(decoded.text) || ext === 'obj')
    return analyzeOBJ(file, decoded, started);
  if (trimmed.startsWith('OFF') || ext === 'off') return analyzeOFF(file, decoded, started);
  if (trimmed.startsWith('{') || ext === 'gltf') return analyzeGLTF(file, decoded, started);
  if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    return analyzeGLB(file, started);
  }

  return {
    kind: 'unknown',
    format: 'unknown',
    route: 'review',
    state: 'error-fatal',
    confidence: confidence(0.08, 0.05, 0, 0, 0),
    summary: `Could not classify ${file.name}`,
    metrics: baseMetrics([file], started),
    inferred: { extension: ext || 'none', headerOnly },
    anomalies: [
      issue(
        'unknown-format',
        'error',
        'The source format is not recognized.',
        'The file does not match STEP, STL, PLY, OBJ, OFF, glTF/GLB, or an image set.',
        'Convert it to STEP, STL, OBJ, PLY, OFF, or glTF and try again.',
      ),
    ],
    suggestions: [],
    evidence: [`extension=${ext || 'none'}`, `first_bytes=${Array.from(bytes.slice(0, 4)).join(',')}`],
    generationMode: 'unsupported',
  };
}

function analyzeSTEP(
  file: AnalysisInputFile,
  decoded: ReturnType<typeof decodeNormalized>,
  started: number,
): PartialManifest {
  const text = decoded.text;
  const productNames = [...text.matchAll(/PRODUCT\s*\(\s*'([^']*)'/gi)].map((match) => match[1]);
  const schemaText = /FILE_SCHEMA\s*\(\s*\('([^']+)'/i.exec(text)?.[1] ?? 'unknown';
  const schema = schemaText.includes('214') ? 'AP214' : schemaText.includes('242') ? 'AP242' : schemaText;
  const unit = /SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\./i.test(text)
    ? 'millimetre'
    : /SI_UNIT\s*\([^)]*\.METRE\./i.test(text)
      ? 'metre'
      : 'unknown';
  const partial = !/END-ISO-10303-21\s*;/i.test(text);
  const anomalies = partial
    ? [
        issue(
          'truncated-step',
          'warning',
          'The STEP file appears incomplete.',
          'The end marker was not found in the normalized header/body sample.',
          'Re-export or re-download the STEP file before boolean or tessellation work.',
        ),
      ]
    : [];
  const suggestions = [
    issue(
      'needs-occt',
      'info',
      'OpenCascade is required for exact B-rep booleans.',
      'The browser can classify the STEP file, but exact CAD operations run through the backend.',
      'Check backend tools before queuing the CAD job.',
    ),
  ];

  return {
    kind: 'cad',
    format: 'step',
    route: 'cad',
    state: partial ? 'error-recoverable' : 'loaded-some',
    confidence: confidence(partial ? 0.62 : 0.92, 0.9, 0.1, 0.1, 0),
    summary: `${schema} STEP ${productNames.length > 1 ? 'assembly' : 'part'} detected`,
    metrics: { ...baseMetrics([file], started), components: Math.max(productNames.length, 1) },
    inferred: {
      schema,
      unit,
      components: Math.max(productNames.length, 1),
      normalizedLineEndings: decoded.normalizedLineEndings,
      encoding: decoded.encoding,
    },
    anomalies,
    suggestions,
    evidence: [`schema=${schema}`, `unit=${unit}`, `products=${productNames.length}`],
    generationMode: 'native-required',
  };
}

function analyzeASCIISTL(
  file: AnalysisInputFile,
  decoded: ReturnType<typeof decodeNormalized>,
  started: number,
): PartialManifest {
  const vertices = [...decoded.text.matchAll(/vertex\s+([^\n]+)/gi)]
    .map((match) => match[1].trim().split(/\s+/).map(Number))
    .filter((coords) => coords.length >= 3 && coords.slice(0, 3).every(Number.isFinite))
    .map((coords) => coords.slice(0, 3) as [number, number, number]);
  const facetCount = (decoded.text.match(/facet\s+normal/gi) ?? []).length;
  const truncated = facetCount * 3 !== vertices.length || !/endsolid/i.test(decoded.text);
  const mesh = verticesToMesh(vertices);
  const topology = mesh
    ? topologyIssues(mesh)
    : { boundaryEdges: 0, nonManifoldEdges: 0, degenerateFaces: 0 };
  const anomalies: DiagnosticIssue[] = [];
  if (truncated) {
    anomalies.push(
      issue(
        'truncated-stl',
        'warning',
        'The STL appears truncated.',
        'Facet and vertex counts do not line up, or the endsolid marker is missing.',
        'Re-export the mesh, or continue only with the complete facets that were parsed.',
      ),
    );
  }
  const suggestions = truncated
    ? [
        issue(
          're-export-truncated-stl',
          'info',
          'Re-export the STL before using it for exact repair.',
          'The parser can keep complete facets, but the missing tail makes topology confidence lower.',
          'Re-export from the source CAD or slicer and compare the new triangle count.',
        ),
      ]
    : [];
  pushTopologyAnomalies(anomalies, topology);
  return meshManifest(
    file,
    'stl-ascii',
    started,
    mesh,
    anomalies,
    [`facets=${facetCount}`, `vertices=${vertices.length}`],
    truncated,
    { suggestions },
  );
}

function analyzeBinarySTL(file: AnalysisInputFile, started: number): PartialManifest {
  const bytes = file.bytes;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declared = bytes.byteLength >= 84 ? view.getUint32(80, true) : 0;
  const expected = 84 + declared * 50;
  const truncated = expected > bytes.byteLength;
  const maxTriangles = Math.min(declared, Math.floor(Math.max(0, bytes.byteLength - 84) / 50), 20_000);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let tri = 0; tri < maxTriangles; tri += 1) {
    const base = 84 + tri * 50 + 12;
    for (let vertex = 0; vertex < 3; vertex += 1) {
      const offset = base + vertex * 12;
      positions.push(
        view.getFloat32(offset, true),
        view.getFloat32(offset + 4, true),
        view.getFloat32(offset + 8, true),
      );
      indices.push(indices.length);
    }
  }
  const mesh = positions.length
    ? {
        positions,
        indices,
        sourceTriangles: maxTriangles,
        repairedTriangles: maxTriangles,
        decimatedTriangles: maxTriangles,
      }
    : undefined;
  const anomalies = truncated
    ? [
        issue(
          'truncated-binary-stl',
          'warning',
          'The binary STL is shorter than its declared triangle count.',
          `Header declares ${declared} triangles but only ${maxTriangles} complete triangles were available.`,
          'Re-export or re-download the mesh before repair.',
        ),
      ]
    : [];
  const suggestions = truncated
    ? [
        issue(
          're-export-truncated-binary-stl',
          'info',
          'Re-export the binary STL before using it for exact repair.',
          'The header triangle count is larger than the available body.',
          'Re-export from the source CAD or slicer and compare the new triangle count.',
        ),
      ]
    : [];
  return meshManifest(
    file,
    'stl-binary',
    started,
    mesh,
    anomalies,
    [`declared_triangles=${declared}`],
    truncated,
    {
      suggestions,
    },
  );
}

function analyzePLY(
  file: AnalysisInputFile,
  decoded: ReturnType<typeof decodeNormalized>,
  started: number,
): PartialManifest {
  const text = decoded.text;
  const vertexCount = Number(/element\s+vertex\s+(\d+)/i.exec(text)?.[1] ?? 0);
  const faceCount = Number(/element\s+face\s+(\d+)/i.exec(text)?.[1] ?? 0);
  const ascii = /format\s+ascii/i.test(text);
  const headerEnd = text.indexOf('end_header');
  const mesh =
    ascii && headerEnd >= 0
      ? parsePLYMesh(text.slice(headerEnd + 'end_header'.length), vertexCount, faceCount)
      : undefined;
  const topology = mesh
    ? topologyIssues(mesh)
    : { boundaryEdges: 0, nonManifoldEdges: 0, degenerateFaces: 0 };
  const anomalies: DiagnosticIssue[] = [];
  pushTopologyAnomalies(anomalies, topology);
  if (/hole|open boundary|scan/i.test(text)) {
    anomalies.push(
      issue(
        'scan-holes',
        'warning',
        'The scan appears to contain open boundaries or holes.',
        'PLY scan data often has missing regions from occlusion or range limits.',
        'Inspect boundary loops before filling holes.',
      ),
    );
  }
  return meshManifest(
    file,
    'ply',
    started,
    mesh,
    anomalies,
    [`vertices=${vertexCount}`, `faces=${faceCount}`, `ascii=${ascii}`],
    false,
    { vertices: vertexCount, faces: faceCount },
  );
}

function analyzeOBJ(
  file: AnalysisInputFile,
  decoded: ReturnType<typeof decodeNormalized>,
  started: number,
): PartialManifest {
  const text = decoded.text;
  const vertices = countLines(text, /^v\s+/);
  const texcoords = countLines(text, /^vt\s+/);
  const normals = countLines(text, /^vn\s+/);
  const faces = countLines(text, /^f\s+/);
  const mtllibs = [...text.matchAll(/^mtllib\s+(.+)$/gim)].map((match) => match[1].trim());
  const anomalies: DiagnosticIssue[] = [];
  if (mtllibs.length > 0) {
    anomalies.push(
      issue(
        'material-dependency',
        'warning',
        'The OBJ references external material or texture files.',
        'OBJ geometry and visual appearance are split across sibling MTL and image files.',
        'Select the OBJ with its MTL/textures or expect an untextured preview.',
      ),
    );
  }
  return {
    kind: 'mesh',
    format: 'obj',
    route: 'mesh',
    state: 'loaded-some',
    confidence: confidence(0.88, 0.86, 0.55, 0.65, 0),
    summary: `OBJ mesh with ${faces} faces and ${mtllibs.length} material dependencies`,
    metrics: { ...baseMetrics([file], started), vertices, faces, textureDependencies: mtllibs.length },
    inferred: {
      vertices,
      texcoords,
      normals,
      faces,
      textureDependencies: mtllibs.length,
      encoding: decoded.encoding,
    },
    anomalies,
    suggestions: [],
    evidence: [`v=${vertices}`, `vt=${texcoords}`, `vn=${normals}`, `f=${faces}`, `mtllib=${mtllibs.length}`],
    generationMode: 'diagnostic',
  };
}

function analyzeOFF(
  file: AnalysisInputFile,
  decoded: ReturnType<typeof decodeNormalized>,
  started: number,
): PartialManifest {
  const lines = decoded.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const counts = lines[1]?.split(/\s+/).map(Number) ?? [];
  const vertices = counts[0] ?? 0;
  const faces = counts[1] ?? 0;
  const mesh = parseOFFMesh(lines, vertices, faces);
  const suggestions = [
    issue(
      'convert-off',
      'info',
      'OFF is recognized as a CAD mesh exchange format.',
      'Most downstream CAD/printing tools expect OBJ, STL, PLY, or glTF instead.',
      'Convert to OBJ/STL for repair/export, or continue with the inferred mesh preview.',
    ),
  ];
  return meshManifest(file, 'off', started, mesh, [], [`vertices=${vertices}`, `faces=${faces}`], false, {
    vertices,
    faces,
    convertible: true,
    suggestions,
  });
}

function analyzeGLTF(
  file: AnalysisInputFile,
  decoded: ReturnType<typeof decodeNormalized>,
  started: number,
): PartialManifest {
  try {
    const doc = JSON.parse(decoded.text) as {
      meshes?: unknown[];
      accessors?: unknown[];
      images?: Array<{ uri?: string }>;
      buffers?: Array<{ uri?: string }>;
    };
    const external = [...(doc.images ?? []), ...(doc.buffers ?? [])].filter(
      (item) => item.uri && !item.uri.startsWith('data:'),
    );
    return {
      kind: 'mesh',
      format: 'gltf',
      route: 'mesh',
      state: 'loaded-some',
      confidence: confidence(0.86, 0.84, 0.4, 0.55, 0),
      summary: `glTF asset with ${(doc.meshes ?? []).length} meshes`,
      metrics: {
        ...baseMetrics([file], started),
        components: (doc.meshes ?? []).length,
        textureDependencies: external.length,
      },
      inferred: { meshes: (doc.meshes ?? []).length, externalDependencies: external.length },
      anomalies:
        external.length > 0
          ? [
              issue(
                'external-gltf-dependencies',
                'warning',
                'The glTF references external buffers or images.',
                'The JSON file does not contain all geometry/material bytes inline.',
                'Select the whole glTF folder or export GLB for a self-contained file.',
              ),
            ]
          : [],
      suggestions: [],
      evidence: [`meshes=${(doc.meshes ?? []).length}`, `external=${external.length}`],
      generationMode: 'diagnostic',
    };
  } catch {
    return fatalMalformed(file, 'gltf', started, 'The glTF JSON could not be parsed.');
  }
}

function analyzeGLB(file: AnalysisInputFile, started: number): PartialManifest {
  const view = new DataView(file.bytes.buffer, file.bytes.byteOffset, file.bytes.byteLength);
  const version = file.bytes.byteLength >= 8 ? view.getUint32(4, true) : 0;
  const declaredLength = file.bytes.byteLength >= 12 ? view.getUint32(8, true) : 0;
  const truncated = declaredLength > file.bytes.byteLength;
  const anomalies = truncated
    ? [
        issue(
          'truncated-glb',
          'warning',
          'The GLB is shorter than its declared length.',
          'The binary header claims more bytes than the browser received.',
          'Re-download the GLB before export or repair.',
        ),
      ]
    : [];
  return {
    kind: 'mesh',
    format: 'glb',
    route: 'mesh',
    state: truncated ? 'error-recoverable' : 'loaded-some',
    confidence: confidence(truncated ? 0.56 : 0.9, 0.86, 0.35, 0.5, 0),
    summary: `GLB v${version} asset detected`,
    metrics: baseMetrics([file], started),
    inferred: { version, declaredLength },
    anomalies,
    suggestions: [],
    evidence: [`glb_version=${version}`, `declared_length=${declaredLength}`],
    generationMode: 'diagnostic',
  };
}

function analyzePhotoSet(files: AnalysisInputFile[], started: number): PartialManifest {
  const manifestFile = files.find((file) => isPhotoManifest(file.name));
  if (manifestFile) return analyzePhotoManifest(manifestFile, started);

  const hashes = files.map((file) => fnv1a(file.bytes));
  const uniqueHashes = new Set(hashes);
  const imageInfos = files.map((file) => ({
    file,
    dimensions: sniffImageDimensions(file.bytes),
    hash: fnv1a(file.bytes),
  }));
  const knownDimensions = imageInfos.filter(
    (item) => item.dimensions.width > 0 && item.dimensions.height > 0,
  );
  const totalBytes = files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  const anomalies: DiagnosticIssue[] = [];
  if (files.length < MIN_PHOTOGRAMMETRY_IMAGES) anomalies.push(tooFewPhotosIssue(files.length));
  if (uniqueHashes.size < hashes.length) anomalies.push(duplicatePhotosIssue());
  if (totalBytes > PHOTOSET_BUDGET_BYTES) anomalies.push(largePhotoSetIssue(totalBytes));

  const enough = files.length >= MIN_PHOTOGRAMMETRY_IMAGES;
  const suggestions = [nativeToolsSuggestion()];
  if (!enough) suggestions.push(moreOverlapPhotosSuggestion());
  return {
    kind: 'photo-set',
    format: 'image-set',
    route: 'photos',
    state: !enough
      ? 'error-recoverable'
      : totalBytes > PHOTOSET_BUDGET_BYTES
        ? 'loaded-too-many'
        : 'loaded-many',
    confidence: confidence(0.86, 0.88, 0, 0, enough ? 0.76 : 0.42),
    summary: `${files.length} photos selected for reconstruction preflight`,
    metrics: { ...baseMetrics(files, started), images: files.length },
    inferred: {
      imageCount: files.length,
      knownDimensions: knownDimensions.length,
      totalMegabytes: Math.round(totalBytes / 1024 / 1024),
      nativeRequired: true,
    },
    anomalies,
    suggestions,
    evidence: [`images=${files.length}`, `known_dimensions=${knownDimensions.length}`],
    generationMode: 'native-required',
  };
}

function analyzePhotoManifest(file: AnalysisInputFile, started: number): PartialManifest {
  try {
    const data = JSON.parse(decodeNormalized(file.bytes).text) as {
      source?: string;
      images?: Array<{
        name: string;
        bytes?: number;
        width?: number;
        height?: number;
        exif_orientation?: number;
        cloud_placeholder?: boolean;
      }>;
    };
    const images = data.images ?? [];
    const totalBytes = images.reduce((sum, image) => sum + (image.bytes ?? 0), 0);
    const placeholders = images.filter((image) => image.cloud_placeholder || image.bytes === 0).length;
    const orientationIssues = images.filter(
      (image) => image.exif_orientation && image.exif_orientation !== 1,
    ).length;
    const anomalies: DiagnosticIssue[] = [];
    if (images.length < MIN_PHOTOGRAMMETRY_IMAGES) anomalies.push(tooFewPhotosIssue(images.length));
    if (totalBytes > PHOTOSET_BUDGET_BYTES) anomalies.push(largePhotoSetIssue(totalBytes));
    if (orientationIssues > 0) {
      anomalies.push(
        issue(
          'orientation-normalization',
          'warning',
          'Some photos need EXIF orientation normalization.',
          'Rotated camera images can reduce matching quality if orientation is ignored.',
          'Normalize orientation before reconstruction or let the backend preprocessor do it.',
        ),
      );
    }
    if (placeholders > 0) {
      anomalies.push(
        issue(
          'cloud-placeholder',
          'warning',
          'Some phone photos are cloud placeholders.',
          'Zero-byte placeholder files do not contain image data for matching.',
          'Download originals from the phone/cloud library and retry.',
        ),
      );
    }

    const enough = images.length >= MIN_PHOTOGRAMMETRY_IMAGES && placeholders === 0;
    const suggestions = [nativeToolsSuggestion(), overlapSuggestion()];
    if (images.length < MIN_PHOTOGRAMMETRY_IMAGES) suggestions.push(moreOverlapPhotosSuggestion());
    return {
      kind: 'photo-set',
      format: 'photogrammetry-manifest',
      route: 'photos',
      state: !enough
        ? 'error-recoverable'
        : totalBytes > PHOTOSET_BUDGET_BYTES
          ? 'loaded-too-many'
          : 'loaded-many',
      confidence: confidence(0.88, 0.9, 0, 0, enough ? 0.82 : 0.5),
      summary: `${data.source ?? 'Photo set'}: ${images.length} image preflight`,
      metrics: { ...baseMetrics([file], started), images: images.length, totalBytes },
      inferred: {
        imageCount: images.length,
        totalMegabytes: Math.round(totalBytes / 1024 / 1024),
        nativeRequired: true,
        orientationIssue: orientationIssues > 0,
        tooFewImages: images.length < MIN_PHOTOGRAMMETRY_IMAGES,
      },
      anomalies,
      suggestions,
      evidence: [`images=${images.length}`, `bytes=${totalBytes}`, `orientation_issues=${orientationIssues}`],
      generationMode: 'native-required',
    };
  } catch {
    return fatalMalformed(
      file,
      'photogrammetry-manifest',
      started,
      'The photogrammetry manifest JSON could not be parsed.',
    );
  }
}

function meshManifest(
  file: AnalysisInputFile,
  format: InputFormat,
  started: number,
  mesh: MeshData | undefined,
  anomalies: DiagnosticIssue[],
  evidence: string[],
  partial: boolean,
  extra: Record<string, unknown> = {},
): PartialManifest {
  const issueCount = anomalies.filter((item) => item.severity !== 'info').length;
  const triangles = mesh?.sourceTriangles ?? (typeof extra.faces === 'number' ? Number(extra.faces) : 0);
  const bounds = mesh ? computeBounds(mesh.positions) : undefined;
  const suggestions = [
    issue(
      'repair-plan',
      'info',
      'A conservative repair pass is recommended before export.',
      'Real meshes often contain duplicate vertices, open boundaries, or degenerate triangles.',
      'Review the detected anomalies, then run repair and decimation from the Mesh tab.',
    ),
    ...(Array.isArray(extra.suggestions) ? (extra.suggestions as DiagnosticIssue[]) : []),
  ];
  return {
    kind: 'mesh',
    format,
    route: 'mesh',
    state: partial ? 'error-recoverable' : 'loaded-some',
    confidence: confidence(partial ? 0.56 : 0.9 - Math.min(issueCount * 0.02, 0.16), 0.86, 0.74, 0.72, 0),
    summary: `${format.toUpperCase()} mesh with ${triangles} triangles`,
    metrics: {
      ...baseMetrics([file], started),
      vertices: mesh ? mesh.positions.length / 3 : Number(extra.vertices ?? 0),
      faces: Number(extra.faces ?? triangles),
      triangles,
    },
    inferred: {
      bounds: bounds ? formatBounds(bounds) : 'unknown',
      convertible: Boolean(extra.convertible ?? true),
      ...stripNonPrimitive(extra),
    },
    anomalies,
    suggestions,
    evidence,
    generationMode: 'diagnostic',
    previewMesh: mesh,
  };
}

function finalize(
  files: AnalysisInputFile[],
  partial: PartialManifest,
  started: number,
  options: AnalyzeOptions,
): AnalysisResult {
  const summaries: SourceFileSummary[] = files.map((file) => ({
    name: file.name,
    size: file.bytes.byteLength,
    type: file.type,
    hash: fnv1a(file.bytes),
  }));
  const totalBytes = summaries.reduce((sum, file) => sum + file.size, 0);
  const id = sourceId(
    summaries.map((file) => file.name).join('+'),
    totalBytes,
    summaries.map((file) => file.hash),
  );
  const manifest: DiagnosticManifest = {
    schemaVersion: 'phase2-diagnostic/v1',
    sourceId: id,
    state: partial.state,
    kind: partial.kind,
    format: partial.format,
    route: partial.route,
    confidence: clampConfidence(partial.confidence),
    summary: partial.summary,
    files: summaries,
    metrics: { ...partial.metrics, parseTimeMs: Math.round(performance.now() - started) },
    inferred: sortPrimitiveRecord(partial.inferred),
    anomalies: sortIssues(partial.anomalies),
    suggestions: sortIssues(partial.suggestions),
    provenance: {
      app: 'cadmesh-workbench',
      appVersion: options.appVersion,
      commit: options.commit,
      deterministic: true,
      generationMode: partial.generationMode,
      sourceChecksums: summaries.map((file) => file.hash).sort(),
      parameters: {},
    },
    evidence: [...partial.evidence].sort(),
    previewMesh: partial.previewMesh,
  };
  return {
    manifest,
    stableJSON: stableStringify({ ...manifest, metrics: { ...manifest.metrics, parseTimeMs: 0 } }),
  };
}

function baseMetrics(files: AnalysisInputFile[], started: number): DiagnosticManifest['metrics'] {
  return {
    totalBytes: files.reduce((sum, file) => sum + file.bytes.byteLength, 0),
    fileCount: files.length,
    parseTimeMs: Math.round(performance.now() - started),
  };
}

function confidence(
  classification: number,
  route: number,
  repairPlan: number,
  decimationPlan: number,
  photoViability: number,
): Confidence {
  return { classification, route, repairPlan, decimationPlan, photoViability };
}

function clampConfidence(value: Confidence): Confidence {
  return {
    classification: clamp01(value.classification),
    route: clamp01(value.route),
    repairPlan: clamp01(value.repairPlan),
    decimationPlan: clamp01(value.decimationPlan),
    photoViability: clamp01(value.photoViability),
  };
}

function clamp01(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
}

function extension(name: string): string {
  return name.toLowerCase().split('.').pop() ?? '';
}

function isPhotoManifest(name: string): boolean {
  return /\.photogrammetry\.json$/i.test(name);
}

function isImageName(name: string, type: string): boolean {
  return type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp|tif|tiff)$/i.test(name);
}

function isBinarySTL(bytes: Uint8Array, textHead: string, ext: string): boolean {
  if (ext !== 'stl' || bytes.byteLength < 84) return false;
  const declared = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
  return 84 + declared * 50 === bytes.byteLength || !/^solid\b/i.test(textHead);
}

function verticesToMesh(vertices: Array<[number, number, number]>): MeshData | undefined {
  const complete = vertices.length - (vertices.length % 3);
  if (complete < 3) return undefined;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < complete; i += 1) {
    positions.push(vertices[i][0], vertices[i][1], vertices[i][2]);
    indices.push(i);
  }
  return {
    positions,
    indices,
    sourceTriangles: complete / 3,
    repairedTriangles: complete / 3,
    decimatedTriangles: complete / 3,
  };
}

function parsePLYMesh(body: string, vertexCount: number, faceCount: number): MeshData | undefined {
  const lines = body
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < vertexCount) return undefined;
  const positions: number[] = [];
  for (let i = 0; i < vertexCount; i += 1) {
    const coords = lines[i].split(/\s+/).slice(0, 3).map(Number);
    if (coords.length !== 3 || !coords.every(Number.isFinite)) return undefined;
    positions.push(coords[0], coords[1], coords[2]);
  }
  const indices: number[] = [];
  for (let i = 0; i < faceCount && vertexCount + i < lines.length; i += 1) {
    const parts = lines[vertexCount + i].split(/\s+/).map(Number);
    const count = parts[0] ?? 0;
    const face = parts.slice(1, count + 1);
    for (let j = 1; j < face.length - 1; j += 1) indices.push(face[0], face[j], face[j + 1]);
  }
  return {
    positions,
    indices,
    sourceTriangles: indices.length / 3,
    repairedTriangles: 0,
    decimatedTriangles: 0,
  };
}

function parseOFFMesh(lines: string[], vertexCount: number, faceCount: number): MeshData | undefined {
  if (lines.length < 2 + vertexCount) return undefined;
  const positions: number[] = [];
  for (let i = 0; i < vertexCount; i += 1) {
    const coords = lines[2 + i].split(/\s+/).slice(0, 3).map(Number);
    if (coords.length !== 3 || !coords.every(Number.isFinite)) return undefined;
    positions.push(coords[0], coords[1], coords[2]);
  }
  const indices: number[] = [];
  for (let i = 0; i < faceCount && 2 + vertexCount + i < lines.length; i += 1) {
    const parts = lines[2 + vertexCount + i].split(/\s+/).map(Number);
    const count = parts[0] ?? 0;
    const face = parts.slice(1, count + 1);
    for (let j = 1; j < face.length - 1; j += 1) indices.push(face[0], face[j], face[j + 1]);
  }
  return {
    positions,
    indices,
    sourceTriangles: indices.length / 3,
    repairedTriangles: 0,
    decimatedTriangles: 0,
  };
}

function topologyIssues(mesh: MeshData): {
  boundaryEdges: number;
  nonManifoldEdges: number;
  degenerateFaces: number;
} {
  const edgeCounts = new Map<string, number>();
  let degenerateFaces = 0;
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const face = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    if (face[0] === face[1] || face[1] === face[2] || face[0] === face[2]) degenerateFaces += 1;
    for (const [a, b] of [
      [face[0], face[1]],
      [face[1], face[2]],
      [face[2], face[0]],
    ]) {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
  }
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  for (const count of edgeCounts.values()) {
    if (count === 1) boundaryEdges += 1;
    if (count > 2) nonManifoldEdges += 1;
  }
  return { boundaryEdges, nonManifoldEdges, degenerateFaces };
}

function pushTopologyAnomalies(
  anomalies: DiagnosticIssue[],
  topology: { boundaryEdges: number; nonManifoldEdges: number; degenerateFaces: number },
) {
  if (topology.boundaryEdges > 0) {
    anomalies.push(
      issue(
        'boundary-edges',
        'warning',
        `${topology.boundaryEdges} boundary edges detected.`,
        'Edges used by only one face indicate holes or open surfaces.',
        'Inspect before printing or use a hole-filling repair pass.',
      ),
    );
  }
  if (topology.nonManifoldEdges > 0) {
    anomalies.push(
      issue(
        'non-manifold-edges',
        'warning',
        `${topology.nonManifoldEdges} non-manifold edges detected.`,
        'Edges shared by more than two faces can confuse slicers and booleans.',
        'Run mesh repair before decimation/export.',
      ),
    );
  }
  if (topology.degenerateFaces > 0) {
    anomalies.push(
      issue(
        'degenerate-faces',
        'warning',
        `${topology.degenerateFaces} degenerate faces detected.`,
        'A triangle references repeated vertices and has no usable area.',
        'Remove degenerate faces before export.',
      ),
    );
  }
}

function computeBounds(positions: number[]): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[i + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  return { min, max };
}

function formatBounds(bounds: Bounds): string {
  return `${bounds.min.map(round3).join(',')}..${bounds.max.map(round3).join(',')}`;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function countLines(text: string, pattern: RegExp): number {
  return text.split('\n').filter((line) => pattern.test(line)).length;
}

function sniffImageDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: (bytes[offset + 5] << 8) + bytes[offset + 6],
          width: (bytes[offset + 7] << 8) + bytes[offset + 8],
        };
      }
      offset += 2 + length;
    }
  }
  return { width: 0, height: 0 };
}

function tooFewPhotosIssue(count: number): DiagnosticIssue {
  return issue(
    'too-few-photos',
    'warning',
    `Too few usable photos were found (${count}).`,
    `Photogrammetry needs at least ${MIN_PHOTOGRAMMETRY_IMAGES} overlapping images for a useful first reconstruction.`,
    'Add more overlapping photos around the object or treat this as preview-only.',
  );
}

function moreOverlapPhotosSuggestion(): DiagnosticIssue {
  return issue(
    'add-overlapping-photos',
    'info',
    'Add more overlapping photos before reconstruction.',
    'The current set is below the minimum needed for stable feature matching.',
    'Capture more overlapping photos around the subject, then rerun the preflight.',
  );
}

function duplicatePhotosIssue(): DiagnosticIssue {
  return issue(
    'duplicate-photos',
    'warning',
    'Duplicate photos were detected.',
    'Repeated images add upload time without adding new viewpoints.',
    'Remove duplicates before reconstruction.',
  );
}

function largePhotoSetIssue(totalBytes: number): DiagnosticIssue {
  return issue(
    'large-photo-set',
    'warning',
    `The photo set is ${Math.round(totalBytes / 1024 / 1024)} MB before reconstruction.`,
    'Large high-resolution image sets can exceed browser upload and backend processing budgets.',
    'Downsample, split into batches, or run on a larger backend.',
  );
}

function nativeToolsSuggestion(): DiagnosticIssue {
  return issue(
    'native-tools-required',
    'info',
    'Native reconstruction tools are required for real photogrammetry output.',
    'COLMAP and OpenMVS are not browser libraries in this app.',
    'Check backend tool availability before starting the job.',
  );
}

function overlapSuggestion(): DiagnosticIssue {
  return issue(
    'capture-overlap',
    'info',
    'Photos should overlap heavily around the subject.',
    'Sparse or inconsistent viewpoints reduce feature matching and mesh quality.',
    'Use a continuous orbit with 60-80% overlap when recapturing.',
  );
}

function fatalMalformed(
  file: AnalysisInputFile,
  format: InputFormat,
  started: number,
  message: string,
): PartialManifest {
  return {
    kind: 'unknown',
    format,
    route: 'review',
    state: 'error-fatal',
    confidence: confidence(0.2, 0.1, 0, 0, 0),
    summary: message,
    metrics: baseMetrics([file], started),
    inferred: {},
    anomalies: [
      issue(
        `malformed-${format}`,
        'error',
        message,
        'The format marker was present, but the payload could not be parsed safely.',
        'Re-export or validate the source in the original tool.',
      ),
    ],
    suggestions: [],
    evidence: [`format=${format}`],
    generationMode: 'unsupported',
  };
}

function stripNonPrimitive(record: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      out[key] = value;
  }
  return out;
}

function sortPrimitiveRecord(
  record: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  return Object.keys(record)
    .sort()
    .reduce<Record<string, string | number | boolean>>((out, key) => {
      out[key] = record[key];
      return out;
    }, {});
}
