// @vitest-environment happy-dom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ProductImagePlaceholder from "./ProductImagePlaceholder";

describe("Componente ProductImagePlaceholder", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza correctamente con categoría 'moviles' y marca", () => {
    render(<ProductImagePlaceholder categoria="moviles" marca="Samsung" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Imagen pendiente de Samsung");
    expect(placeholder.getAttribute("aria-label")).toContain("Móviles & Smartphones");

    expect(screen.getByText("Samsung")).toBeDefined();
    expect(screen.getByText("Imagen pendiente")).toBeDefined();
    expect(screen.getByText("Móviles & Smartphones")).toBeDefined();
  });

  it("renderiza icono y texto para categoría 'auriculares'", () => {
    render(<ProductImagePlaceholder categoria="auriculares" marca="Sony" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Sony");
    expect(placeholder.getAttribute("aria-label")).toContain("Auriculares & Audio");

    expect(screen.getByText("Sony")).toBeDefined();
    expect(screen.getByText("Auriculares & Audio")).toBeDefined();
  });

  it("renderiza icono y texto para categoría 'laptops'", () => {
    render(<ProductImagePlaceholder categoria="laptops" marca="ASUS" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("ASUS");
    expect(placeholder.getAttribute("aria-label")).toContain("Portátiles & Laptops");

    expect(screen.getByText("ASUS")).toBeDefined();
    expect(screen.getByText("Portátiles & Laptops")).toBeDefined();
  });

  it("renderiza icono y texto para categoría 'tablets'", () => {
    render(<ProductImagePlaceholder categoria="tablets" marca="Apple" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Apple");
    expect(placeholder.getAttribute("aria-label")).toContain("Tablets & Pantallas");

    expect(screen.getByText("Apple")).toBeDefined();
    expect(screen.getByText("Tablets & Pantallas")).toBeDefined();
  });

  it("funciona correctamente sin marca (marca null o indefinida)", () => {
    render(<ProductImagePlaceholder categoria="auriculares" marca={null} />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Imagen pendiente");
    expect(screen.getByText("Imagen pendiente")).toBeDefined();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("funciona correctamente sin categoría (infiere por defecto o nombre)", () => {
    render(<ProductImagePlaceholder categoria={null} marca="Logitech" nombre="Logitech G Pro X Wireless Headphones" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    // Por nombre 'Headphones' infiere auriculares
    expect(placeholder.getAttribute("aria-label")).toContain("Auriculares & Audio");
    expect(screen.getByText("Logitech")).toBeDefined();
  });

  it("funciona sin ninguna propiedad (marca ni categoría ni nombre)", () => {
    render(<ProductImagePlaceholder />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Imagen pendiente");
    expect(screen.getByText("Imagen pendiente")).toBeDefined();
  });

  it("soporta modo compacto (tamano='sm') para rankings y listas estrechas", () => {
    render(<ProductImagePlaceholder categoria="moviles" marca="Apple" tamano="sm" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Imagen pendiente de Apple");
    expect(screen.getByText("Apple")).toBeDefined();
  });

  it("en modo compacto sin marca muestra 'Pendiente'", () => {
    render(<ProductImagePlaceholder categoria="moviles" tamano="sm" />);

    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(screen.getByText("Pendiente")).toBeDefined();
  });
});
