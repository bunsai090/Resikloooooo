// src/lib/api.ts

/**
 * Centralized client utilities for talking to the secure Express backend.
 * All URLs are prefixed with SERVER_URL (defaults to http://localhost:5000).
 * The functions return parsed JSON payloads directly.
 */

const SERVER_URL =
  (import.meta as any).env?.VITE_BACKEND_URL ||
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "http://localhost:5000";

/** Upload an image file (or a base64 string) and receive a Scan ID */
export async function uploadImage(
  fileOrBase64: File | string,
  sessionId: string
): Promise<{ success: boolean; scanId: string; imageUrl: string }> {
  const formData = new FormData();

  // If a File object, send directly; otherwise embed base64 string under a special key.
  if (fileOrBase64 instanceof File) {
    formData.append("image", fileOrBase64);
  } else {
    formData.append("imageBase64", fileOrBase64);
  }
  formData.append("sessionId", sessionId);

  const resp = await fetch(`${SERVER_URL}/api/upload`, {
    method: "POST",
    body: formData,
    credentials: "include"
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Upload failed");
  }
  return resp.json();
}

/** Request Gemini analysis for a previously uploaded scan ID */
export async function analyzeScan(
  scanId: string,
  imageBase64?: string
): Promise<any> {
  const payload: any = { scanId };
  if (imageBase64) payload.imageBase64 = imageBase64;

  const resp = await fetch(`${SERVER_URL}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Scan analysis failed");
  }
  return resp.json();
}

/** Request initial Gemini scanning and get dynamic questions */
export async function initiateScan(
  scanId: string,
  imageBase64?: string
): Promise<{ success: boolean; scanId: string; objectType: string; confidence: number; isEwaste: boolean; needsUserInput?: boolean; questions: any[] }> {
  const payload: any = { scanId };
  if (imageBase64) payload.imageBase64 = imageBase64;

  const resp = await fetch(`${SERVER_URL}/api/scan/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Scan initiation failed");
  }
  return resp.json();
}

/** Submit survey answers to receive the final Gemini analysis */
export async function finalizeScan(
  scanId: string,
  answers: Record<string, string>,
  imageBase64?: string
): Promise<any> {
  const payload: any = { scanId, answers };
  if (imageBase64) payload.imageBase64 = imageBase64;

  const resp = await fetch(`${SERVER_URL}/api/scan/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include"
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.error || "Scan finalization failed");
  }
  return resp.json();
}

/** Retrieve nearby recycling facilities */
export async function fetchFacilities(params: {
  lat: number;
  lng: number;
  type?: string;
  radius?: number;
}): Promise<any> {
  const qs = new URLSearchParams({
    lat: String(params.lat),
    lng: String(params.lng),
    ...(params.type ? { type: params.type } : {}),
    ...(params.radius ? { radius: String(params.radius) } : {})
  }).toString();
  const resp = await fetch(`${SERVER_URL}/api/facilities?${qs}`, {
    method: "GET",
    credentials: "include"
  });
  if (!resp.ok) throw new Error("Facilities fetch failed");
  return resp.json();
}

/** Search for DIY / tutorial videos on YouTube */
export async function fetchTutorials(
  query: string,
  type: "diy" | "repair" | "upcycle" | "recycle" = "diy",
  limit: number = 5
): Promise<any> {
  const qs = new URLSearchParams({
    q: query,
    type,
    limit: String(limit)
  }).toString();
  const resp = await fetch(`${SERVER_URL}/api/tutorials?${qs}`, {
    method: "GET",
    credentials: "include"
  });
  if (!resp.ok) throw new Error("Tutorial fetch failed");
  return resp.json();
}

// Export SERVER_URL for occasional debugging
export { SERVER_URL };
