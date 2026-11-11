// @vitest-environment happy-dom
import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ProductCard from "./ProductCard";
import { Producto } from "@/types/producto";

describe("Componente ProductCard — Manejo de imágenes y placeholder", () => {
  afterEach(() => {
    cleanup();
  });

  const baseProducto: Producto = {
    idProducto: 1,
    nombre: "Samsung Galaxy S24 Ultra",
    descripcion: "Smartphone tope de gama",
    idCategoria: 1,
    idMarca: 1,
    nombreCategoria: "Móviles",
    nombreMarca: "Samsung",
    imagen: "https://example.com/s24.png",
    precioReferencia: 5499000,
    estado: true,
  };

  it("renderiza la etiqueta img normalmente si el producto tiene una imagen válida", () => {
    render(<ProductCard producto={baseProducto} />);

    const img = screen.getByRole("img", { name: /Fotografía oficial de Samsung Galaxy S24 Ultra/i });
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/s24.png");
    // No debe mostrar el placeholder
    expect(screen.queryByText("Imagen pendiente")).toBeNull();
  });

  it("renderiza ProductImagePlaceholder cuando imagen es null", () => {
    const prodSinImagen = { ...baseProducto, imagen: null };
    render(<ProductCard producto={prodSinImagen} />);

    // No debe haber tag img de la foto oficial
    expect(screen.queryByRole("img", { name: /Fotografía oficial/i })).toBeNull();

    // Debe mostrar el placeholder con rol img y texto
    const placeholder = screen.getByRole("img");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("aria-label")).toContain("Imagen pendiente de Samsung");
    expect(screen.getByText("Imagen pendiente")).toBeDefined();
    expect(screen.getAllByText("Samsung").length).toBeGreaterThanOrEqual(2);
  });

  it("renderiza ProductImagePlaceholder cuando imagen es cadena vacía o espacios", () => {
    const prodConImagenVacia = { ...baseProducto, imagen: "   " };
    render(<ProductCard producto={prodConImagenVacia} />);

    expect(screen.queryByRole("img", { name: /Fotografía oficial/i })).toBeNull();
    expect(screen.getByText("Imagen pendiente")).toBeDefined();
  });

  it("conmuta al ProductImagePlaceholder cuando falla la carga remota de la imagen (evento onError)", () => {
    render(<ProductCard producto={baseProducto} />);

    const img = screen.getByRole("img", { name: /Fotografía oficial de Samsung Galaxy S24 Ultra/i });
    expect(img).toBeDefined();

    // Disparamos el error de carga de red/404
    fireEvent.error(img);

    // Tras el error, la imagen desaparece y se muestra el placeholder sin caer en bucles
    expect(screen.queryByRole("img", { name: /Fotografía oficial/i })).toBeNull();
    expect(screen.getByText("Imagen pendiente")).toBeDefined();
    expect(screen.getAllByText("Samsung").length).toBeGreaterThanOrEqual(2);
  });
});
