import createClient from 'openapi-fetch';
import { z } from 'zod';
import { appConfig } from './config';
import type { components, paths } from './openapi';

export type Workflow = components['schemas']['Workflow'];
export type Job = z.infer<typeof jobSchema>;
export type Tool = z.infer<typeof toolSchema>;

export const workflowSchema = z.enum([
  'photogrammetry_to_gltf',
  'mesh_repair',
  'cad_boolean',
] satisfies Workflow[]);

export const artifactSchema = z.object({
  name: z.string(),
  content_type: z.string(),
  size: z.number(),
  created_at: z.string(),
  url: z.string().optional(),
});

export const jobSchema = z.object({
  id: z.string(),
  workflow: workflowSchema,
  name: z.string(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  parameters: z.record(z.string(), z.string()).optional(),
  inputs: z
    .array(
      z.object({
        name: z.string(),
        content_type: z.string(),
        size: z.number(),
      }),
    )
    .optional(),
  artifacts: z.array(artifactSchema).optional(),
  logs: z.array(z.string()).optional(),
  error: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
});

const toolSchema = z.object({
  name: z.string(),
  binary: z.string(),
  purpose: z.string(),
  available: z.boolean(),
  path: z.string().optional(),
});

const jobsResponseSchema = z.object({ jobs: z.array(jobSchema) });
const toolsResponseSchema = z.object({ tools: z.array(toolSchema) });
const clients = new Map<string, ReturnType<typeof createClient<paths>>>();

function apiClient(baseUrl: string) {
  const normalized = baseUrl.replace(/\/$/, '');
  const existing = clients.get(normalized);
  if (existing) return existing;
  const created = createClient<paths>({ baseUrl: normalized });
  clients.set(normalized, created);
  return created;
}

function requireData<T>(response: { data?: T; error?: unknown; response: Response }, label: string): T {
  if (response.error || !response.data) {
    throw new Error(`${label} failed: ${response.response.status}`);
  }
  return response.data;
}

export async function listTools(baseUrl = appConfig.apiBaseUrl): Promise<Tool[]> {
  const result = await apiClient(baseUrl).GET('/api/v1/tools');
  return toolsResponseSchema.parse(requireData(result, 'Tool check')).tools;
}

export async function listJobs(baseUrl = appConfig.apiBaseUrl): Promise<Job[]> {
  const result = await apiClient(baseUrl).GET('/api/v1/jobs');
  return jobsResponseSchema.parse(requireData(result, 'Job list')).jobs;
}

export async function createJob(
  payload: { workflow: Workflow; name: string; parameters?: Record<string, string> },
  baseUrl = appConfig.apiBaseUrl,
): Promise<Job> {
  const result = await apiClient(baseUrl).POST('/api/v1/jobs', { body: payload });
  return jobSchema.parse(requireData(result, 'Job create'));
}

export async function createPhotoJob(
  files: File[],
  parameters: Record<string, string>,
  baseUrl = appConfig.apiBaseUrl,
): Promise<Job> {
  const form = new FormData();
  form.set('workflow', 'photogrammetry_to_gltf');
  form.set('name', parameters.name || 'photo scan');
  form.set('parameters', JSON.stringify(parameters));
  files.forEach((file) => form.append('files', file));

  const result = await apiClient(baseUrl).POST('/api/v1/jobs', {
    body: form as unknown as paths['/api/v1/jobs']['post']['requestBody']['content']['multipart/form-data'],
    bodySerializer: (body) => body as unknown as FormData,
  });
  return jobSchema.parse(requireData(result, 'Photo job'));
}
