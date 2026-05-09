import type { DiagnosticIssue } from './types';

export function issue(
  code: string,
  severity: DiagnosticIssue['severity'],
  message: string,
  why: string,
  next: string,
): DiagnosticIssue {
  return { code, severity, message, why, next };
}

export function sortIssues(issues: DiagnosticIssue[]): DiagnosticIssue[] {
  return [...issues].sort((a, b) => `${a.severity}:${a.code}`.localeCompare(`${b.severity}:${b.code}`));
}
