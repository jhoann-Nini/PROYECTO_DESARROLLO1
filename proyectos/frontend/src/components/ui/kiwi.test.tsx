// @vitest-environment happy-dom
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Button from "./Button";
import Input from "./Input";
import Tag from "./Tag";
import EstadoDato from "./EstadoDato";

afterEach(cleanup);

describe("Componentes Kiwi: contrato nativo y accesible", () => {
  it("Button conserva referencia, nombre accesible y envío de formulario", () => {
    const ref = createRef<HTMLButtonElement>();
    const enviar = vi.fn((evento) => evento.preventDefault());
    render(
      <form onSubmit={enviar}>
        <Button ref={ref} type="submit" name="accion" value="guardar" aria-label="Guardar cambios">
          Guardar
        </Button>
      </form>,
    );
    const boton = screen.getByRole("button", { name: "Guardar cambios" });
    expect(ref.current).toBe(boton);
    expect(boton.getAttribute("name")).toBe("accion");
    expect(boton.getAttribute("value")).toBe("guardar");
    expect(boton.textContent).toBe("Guardar");
    fireEvent.click(boton);
    expect(enviar).toHaveBeenCalledTimes(1);
  });

  it("Button deshabilitado no ejecuta el manejador", () => {
    const pulsar = vi.fn();
    render(<Button type="button" variant="danger" disabled onClick={pulsar}>Eliminar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(pulsar).not.toHaveBeenCalled();
  });

  it("Input conserva etiqueta, ayuda, referencia y cambios controlados", () => {
    const ref = createRef<HTMLInputElement>();
    const cambiar = vi.fn();
    render(
      <>
        <label htmlFor="modelo">Modelo</label>
        <Input ref={ref} id="modelo" name="modelo" value="Inicial" required
          aria-describedby="ayuda" onChange={cambiar} />
        <p id="ayuda">Escribe el modelo</p>
      </>,
    );
    const campo = screen.getByRole("textbox", { name: "Modelo" });
    expect(ref.current).toBe(campo);
    expect(campo.getAttribute("aria-describedby")).toBe("ayuda");
    expect(campo.hasAttribute("required")).toBe(true);
    fireEvent.change(campo, { target: { value: "Nuevo" } });
    expect(cambiar).toHaveBeenCalledTimes(1);
  });

  it("Tag conserva el contenido y la semántica indicada por su consumidor", () => {
    render(<Tag variant="deal" role="status" aria-live="polite">Oferta disponible</Tag>);
    expect(screen.getByRole("status").textContent).toBe("Oferta disponible");
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });

  it.each([
    ["verificado", "Verificado", "✓", "bg-surface-2"],
    ["pendiente", "Pendiente", "◷", "border-solid"],
    ["sin-dato", "Sin dato", "—", "border-dotted"],
  ] as const)("EstadoDato %s se distingue sin depender del color", (estado, etiqueta, icono, clase) => {
    render(<EstadoDato estado={estado} />);
    const tag = screen.getByText(etiqueta);
    expect(tag.className).toContain(clase);
    expect(screen.getByText(icono).getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
