import { redirect } from "next/navigation";

// /ajustes se jubiló: Perfil (R4b) absorbió preferencias + plan. Preserva
// ?checkout=success reenviándolo a /perfil.
export default async function AjustesRedirect({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  redirect(checkout ? `/perfil?checkout=${checkout}` : "/perfil");
}
