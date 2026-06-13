import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ProfilesProvider, useProfiles, type BirthProfile } from "../profiles-provider";

const PROFILES: BirthProfile[] = [
  { id: "p1", name: "Gio", birth_date: "1984-02-05", birth_time: "09:00", time_known: true, place_name: "Quito", latitude: -0.23, longitude: -78.52, time_zone: "America/Guayaquil", gender: "masculine" },
  { id: "p2", name: "Ana", birth_date: "1990-07-12", birth_time: null, time_known: false, place_name: "Bogotá", latitude: 4.6, longitude: -74.1, time_zone: "America/Bogota", gender: "feminine" },
];

function Probe() {
  const { active, setActive } = useProfiles();
  return <div><span data-testid="a">{active?.name}</span><button onClick={() => setActive("p2")}>x</button></div>;
}

describe("ProfilesProvider", () => {
  afterEach(() => { /* nada que limpiar; estado por render */ });

  it("activo por defecto = primer perfil; setActive cambia", async () => {
    render(<ProfilesProvider profiles={PROFILES}><Probe /></ProfilesProvider>);
    expect(screen.getByTestId("a").textContent).toBe("Gio");
    await act(async () => { screen.getByText("x").click(); });
    expect(screen.getByTestId("a").textContent).toBe("Ana");
  });

  it("sin perfiles, active es null", () => {
    function P() { const { active } = useProfiles(); return <span data-testid="n">{active ? active.name : "—"}</span>; }
    render(<ProfilesProvider profiles={[]}><P /></ProfilesProvider>);
    expect(screen.getByTestId("n").textContent).toBe("—");
  });
});
