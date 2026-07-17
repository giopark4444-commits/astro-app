"use client";
import { useEffect } from "react";
import { captureReferralCode } from "@/lib/referrals/actions";

/**
 * Sin marcado propio — solo efecto. Lee `?ref=CODIGO` de `window.location`
 * (login o signup) y lo guarda en cookie httpOnly vía server action (elegido
 * sobre el middleware: más simple, sin tocar el matcher/isPublicPath
 * compartido con el resto del auth-check). Lee `window.location` directo en
 * vez de `useSearchParams()` a propósito: esta última exige un Suspense
 * boundary en cada página que la use (login/signup no tenían ninguno) solo
 * para un efecto de una sola vez al montar — innecesario acá.
 */
export function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    void captureReferralCode(ref);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una sola vez al montar, a propósito.
  }, []);

  return null;
}
