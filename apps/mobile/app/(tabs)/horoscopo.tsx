// Ruta legacy: "Horóscopo" vivía acá antes de que T2 la anidara bajo el grupo
// "astros" (tab con switch Carta/Horóscopo). Se deja este stub de redirect
// (en vez de borrar el archivo) por si algún deep link viejo (Spotlight,
// build anterior) sigue apuntando a /(tabs)/horoscopo — ver propuesta-a-astros.md §4.
import { Redirect } from "expo-router";

export default function HoroscopoRedirect() {
  return <Redirect href="/(tabs)/astros/horoscopo" />;
}
