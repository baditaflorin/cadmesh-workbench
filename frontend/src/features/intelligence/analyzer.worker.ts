import * as Comlink from 'comlink';
import { analyzeInputFiles } from './analyzer';
import type { AnalysisInputFile, AnalyzeOptions } from './types';

const api = {
  analyze(files: AnalysisInputFile[], options: AnalyzeOptions) {
    return analyzeInputFiles(files, options);
  },
};

export type AnalyzerWorkerAPI = typeof api;

Comlink.expose(api);
