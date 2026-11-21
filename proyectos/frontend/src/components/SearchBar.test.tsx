// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import SearchBar from "./SearchBar";

afterEach(() => cleanup());

describe("SearchBar", () => {
  it("muestra un solo botón para borrar y oculta la «X» nativa del navegador", () => {
    const onChange = vi.fn();
    render(<SearchBar value="iphone" onChange={onChange} ariaLabel="Buscar" />);

    // La «X» nativa de type=search se oculta con esta clase (globals.css).
    expect(screen.getByRole("searchbox", { name: "Buscar" }).classList.contains("sin-x-nativa")).toBe(true);
    const botones = screen.getAllByRole("button", { name: "Borrar texto de búsqueda" });
    expect(botones).toHaveLength(1);

    fireEvent.click(botones[0]);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("no muestra el botón de borrar sin texto", () => {
    render(<SearchBar value="" ariaLabel="Buscar" />);
    expect(screen.queryByRole("button", { name: "Borrar texto de búsqueda" })).toBeNull();
  });
});
