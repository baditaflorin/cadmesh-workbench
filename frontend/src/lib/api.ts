import { z } from 'zod';
import { appConfig } from './config';

export const workflowSchema = z.enum(['photogrammetry_to_gltf', 'mesh_repair', 'cad_boolean']);
export type Workflow = z.infer<typeof workflowSchema>;

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

export type Job = z.infer<typeof jobSchema>;

const toolSchema = z.object({
  name: z.string(),
  binary: z.string(),
  purpose: z.string(),
  available: z.boolean(),
  path: z.string().optional(),
});

export type Tool = z.infer<typeof toolSchema>;

const jobsResponseSchema = z.object({ jobs: z.array(jobSchema) });
const toolsResponseSchema = z.object({ tools: z.array(toolSchema) });

export async function listTools(baseUrl = appConfig.apiBaseUrl): Promise<Tool[]> {
  const response = await fetch(`${baseUrl}/api/v1/tools`);
  if (!response.ok) throw new Error(`Tool check failed: ${response.status}`);
  return toolsResponseSchema.parse(await response.json()).tools;
}

export async function listJobs(baseUrl = appConfig.apiBaseUrl): Promise<Job[]> {
  const response = await fetch(`${baseUrl}/api/v1/jobs`);
  if (!response.ok) throw new Error(`Job list failed: ${response.status}`);
  return jobsResponseSchema.parse(await response.json()).jobs;
}

export async function createJob(
  payload: { workflow: Workflow; name: string; parameters?: Record<string, string> },
  baseUrl = appConfig.apiBaseUrl,
): Promise<Job> {
  const response = await fetch(`${baseUrl}/api/v1/jobs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Job create failed: ${response.status}`);
  return jobSchema.parse(await response.json());
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

  const response = await fetch(`${baseUrl}/api/v1/jobs`, {
    method: 'POST',
    body: form,
  });
  if (!response.ok) throw new Error(`Photo job failed: ${response.status}`);
  return jobSchema.parse(await response.json());
}
