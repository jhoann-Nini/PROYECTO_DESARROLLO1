// @vitest-environment happy-dom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import RankingItem from "./RankingItem";

describe("Componente RankingItem — Manejo de imagen y placeholder", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza etiqueta img si se pasa una URL de imagen válida", () => {
    render(
      <RankingItem
        ranking={1}
        nombre="AirPods Pro 2"
        marca="Apple"
        categoria="auriculares"
        imagen="https://example.com/airpods.png"
        metricaTipo="valoracion"
        puntuacion={4.9}
      />
    );

    const img = screen.getByRole("img", { name: /Imagen de AirPods Pro 2/i });
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/airpods.png");
    expect(screen.queryByText("Imagen pendiente")).toBeNull();
  });

  it("renderiza ProductImagePlaceholder en miniatura si imagen es null o no está presente", () => {
    render(
      <RankingItem
        ranking={2}
        nombre="Sony WF-1000XM5"
        marca="Sony"
        categoria="auriculares"
        imagen={null}
        metricaTipo="valoracion"
        puntuacion={4.8}
      />
    );

    expect(screen.queryByRole("img", { name: /Imagen de Sony WF-1000XM5/i })).toBeNull();
    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Sony");
  });

  it("conmuta a ProductImagePlaceholder si la imagen dispara un error de carga", () => {
    render(
      <RankingItem
        ranking={3}
        nombre="Bose QuietComfort"
        marca="Bose"
        categoria="auriculares"
        imagen="https://broken-url.com/image.png"
        metricaTipo="valoracion"
      />
    );

    const img = screen.getByRole("img", { name: /Imagen de Bose QuietComfort/i });
    expect(img).toBeDefined();

    fireEvent.error(img);

    expect(screen.queryByRole("img", { name: /Imagen de Bose QuietComfort/i })).toBeNull();
    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Bose");
  });
});
