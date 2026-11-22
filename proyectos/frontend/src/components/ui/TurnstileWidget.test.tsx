// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import TurnstileWidget from "./TurnstileWidget";

type OpcionesRender = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

describe("TurnstileWidget", () => {
  afterEach(() => {
    cleanup();
    delete window.turnstile;
  });

  it("renderiza el widget con la site key y entrega, expira y limpia el token", async () => {
    let opciones: OpcionesRender | undefined;
    const renderTurnstile = vi.fn((_el: HTMLElement, o: OpcionesRender) => {
      opciones = o;
      return "widget-1";
    });
    const remove = vi.fn();
    window.turnstile = { render: renderTurnstile, remove };
    const onToken = vi.fn();

    const { unmount } = render(<TurnstileWidget siteKey="site-123" onToken={onToken} />);

    await vi.waitFor(() => expect(renderTurnstile).toHaveBeenCalledTimes(1));
    expect(opciones?.sitekey).toBe("site-123");

    opciones?.callback("tok");
    expect(onToken).toHaveBeenLastCalledWith("tok");
    opciones?.["expired-callback"]();
    expect(onToken).toHaveBeenLastCalledWith(null);
    opciones?.["error-callback"]();
    expect(onToken).toHaveBeenLastCalledWith(null);

    unmount();
    expect(remove).toHaveBeenCalledWith("widget-1");
  });
});
