import * as Comlink from 'comlink';
import { createSampleMesh, decimateMesh, repairMesh } from './meshOps';

const api = {
  createSampleMesh,
  repairMesh,
  decimateMesh,
};

export type MeshWorkerAPI = typeof api;

Comlink.expose(api);
