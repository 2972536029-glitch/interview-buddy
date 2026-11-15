// localStorage 持久化(仅客户端调用;SSR 环境直接返回空)
import { DiagnoseResult, Session } from "./types";

const SESSIONS_KEY = "mdz.sessions.v1";
const RESUME_KEY = "mdz.resume.last.v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function listSessions(): Session[] {
  if (typeof window === "undefined") return [];
  const arr = safeParse<Session[]>(window.localStorage.getItem(SESSIONS_KEY)) ?? [];
  return arr.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getSession(id: string): Session | null {
  if (typeof window === "undefined") return null;
  return listSessionsRaw().find((s) => s.id === id) ?? null;
}

function listSessionsRaw(): Session[] {
  return safeParse<Session[]>(window.localStorage.getItem(SESSIONS_KEY)) ?? [];
}

export function saveSession(session: Session): void {
  if (typeof window === "undefined") return;
  const arr = listSessionsRaw();
  const idx = arr.findIndex((s) => s.id === session.id);
  const updated: Session = { ...session, updatedAt: Date.now() };
  if (idx >= 0) arr[idx] = updated;
  else arr.push(updated);
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
}

export function deleteSession(id: string): void {
  if (typeof window === "undefined") return;
  const arr = listSessionsRaw().filter((s) => s.id !== id);
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(arr));
}

export interface SavedDiagnosis {
  id: string;
  resumeText: string;
  jdText: string;
  result: DiagnoseResult;
  ts: number;
}

export function saveLastDiagnosis(d: SavedDiagnosis): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(RESUME_KEY, JSON.stringify(d));
}

export function getLastDiagnosis(): SavedDiagnosis | null {
  if (typeof window === "undefined") return null;
  return safeParse<SavedDiagnosis>(window.localStorage.getItem(RESUME_KEY));
}
