import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// authenticateRoute y createServiceSupabaseClient se mockean ANTES de importar
// la ruta (hoisting de vi.mock) para que route.ts reciba los dobles, no los
// reales — así el test no toca red ni Supabase real.
const authenticateRouteMock = vi.fn();
vi.mock("@/lib/supabase/route-auth", () => ({
  authenticateRoute: (...args: unknown[]) => authenticateRouteMock(...args),
}));

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ update: updateMock }));
const storageFromMock = vi.fn(() => ({ upload: uploadMock, getPublicUrl: getPublicUrlMock }));
const createServiceSupabaseClientMock = vi.fn((...args: unknown[]) => {
  void args; // firma real: (url, serviceRoleKey) — el test no depende de esos valores
  return { storage: { from: storageFromMock }, from: fromMock };
});
vi.mock("@aluna/supabase/server", () => ({
  createServiceSupabaseClient: (...args: unknown[]) => createServiceSupabaseClientMock(...args),
}));

import { POST } from "../route";

const USER_ID = "user-abc-123";
const PUBLIC_URL = `https://x.supabase.co/storage/v1/object/public/avatars/${USER_ID}/avatar`;

// req.formData() real (Request/NextRequest + FormData) cuelga bajo el entorno
// jsdom de vitest (jsdom no implementa bien el streaming del body de Fetch).
// Como authenticateRoute ya está mockeado y route.ts solo llama a
// req.formData(), un doble mínimo con ese método basta — evita el problema de
// entorno sin cambiar nada del setup global.
function fakeRequest(entries: Record<string, unknown>): NextRequest {
  const form = { get: (key: string) => entries[key] ?? null } as unknown as FormData;
  return { formData: async () => form } as unknown as NextRequest;
}

// El File de jsdom (usado por <input type=file>) no implementa arrayBuffer()
// — solo slice/size/type. Node/Next en runtime real sí lo implementa (Fetch
// API completa); en el test se parchea la instancia para poder ejercer el
// mismo camino de código (`await file.arrayBuffer()`) que la ruta real usa.
function makeFile(size: number, name: string, type: string): File {
  const bytes = new Uint8Array(size);
  const file = new File([bytes], name, { type });
  Object.assign(file, { arrayBuffer: async () => bytes.buffer });
  return file;
}

function pngFile(size = 10): File {
  return makeFile(size, "avatar.png", "image/png");
}

describe("POST /api/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: { id: USER_ID } });
    uploadMock.mockResolvedValue({ error: null });
    eqMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: PUBLIC_URL } });
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("sin usuario → 401, no toca storage", async () => {
    authenticateRouteMock.mockResolvedValue({ supabase: {}, user: null });
    const res = await POST(fakeRequest({ file: pngFile() }));
    expect(res.status).toBe(401);
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("sin SUPABASE_SERVICE_ROLE_KEY → 503 (latente), no toca storage", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await POST(fakeRequest({ file: pngFile() }));
    expect(res.status).toBe(503);
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("sin archivo en el FormData → 400", async () => {
    const res = await POST(fakeRequest({}));
    expect(res.status).toBe(400);
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("tipo inválido (pdf) → 400, no toca storage", async () => {
    const pdf = makeFile(10, "a.pdf", "application/pdf");
    const res = await POST(fakeRequest({ file: pdf }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("type");
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("archivo > 5MB → 400, no toca storage", async () => {
    const res = await POST(fakeRequest({ file: pngFile(5_000_001) }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("size");
    expect(createServiceSupabaseClientMock).not.toHaveBeenCalled();
  });

  it("éxito: el path SIEMPRE se deriva de la sesión, nunca del FormData", async () => {
    // El cliente intenta colar un path/userId ajeno — la ruta debe ignorarlo
    // por completo: ni siquiera lo lee.
    const res = await POST(
      fakeRequest({ file: pngFile(), path: "attacker-id/avatar", userId: "attacker-id" }),
    );
    expect(res.status).toBe(200);

    expect(uploadMock).toHaveBeenCalledTimes(1);
    const [path] = uploadMock.mock.calls[0] as [string, Uint8Array, unknown];
    expect(path).toBe(`${USER_ID}/avatar`);

    expect(fromMock).toHaveBeenCalledWith("profiles_user");
    expect(updateMock).toHaveBeenCalledWith({ avatar_url: `${USER_ID}/avatar` });
    expect(eqMock).toHaveBeenCalledWith("id", USER_ID);

    const body = (await res.json()) as { url: string };
    expect(body).toEqual({ url: PUBLIC_URL });
  });

  it("error de storage al subir → 500", async () => {
    uploadMock.mockResolvedValue({ error: { message: "boom" } });
    const res = await POST(fakeRequest({ file: pngFile() }));
    expect(res.status).toBe(500);
  });

  it("error de BD al guardar avatar_url → 500", async () => {
    eqMock.mockResolvedValue({ error: { message: "boom" } });
    const res = await POST(fakeRequest({ file: pngFile() }));
    expect(res.status).toBe(500);
  });
});
