"use client";

import { useEffect, useState, useCallback, useId, useMemo } from "react";
import type {
  UsuarioSesion,
  ProductoResponse,
  ProductoRequest,
  CategoriaResponse,
  CategoriaRequest,
  MarcaResponse,
  MarcaRequest,
  CategoriaDispositivo,
} from "@/types/producto";
import { esAdministrador } from "@/types/producto";
import { detectarCategoria, INFO_CATEGORIAS } from "@/data/specsHelper";
import {
  obtenerProductos,
  obtenerCategorias,
  obtenerMarcas,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  crearMarca,
  actualizarMarca,
  eliminarMarca,
  ApiError,
} from "@/services/api";

export interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioSesion: UsuarioSesion | null;
  onProductoCambiado?: () => void;
}

type TabAdministracion = "productos" | "categorias" | "marcas";
type ModoFormulario = "ninguno" | "crear" | "editar";

interface ErroresFormularioProducto {
  nombre?: string;
  idCategoria?: string;
  idMarca?: string;
  imagen?: string;
  precioReferencia?: string;
  caracteristicas?: string;
}

interface CampoEspecificacion {
  clave: string;
  etiqueta: string;
  placeholder: string;
  icono: string;
}

export const CAMPOS_POR_CATEGORIA: Record<CategoriaDispositivo, CampoEspecificacion[]> = {
  moviles: [
    { clave: "pantalla", etiqueta: "Pantalla & Panel", placeholder: "Ej: 6.7'' AMOLED FHD+ 120Hz", icono: "📱" },
    { clave: "procesador", etiqueta: "Procesador & Chipset", placeholder: "Ej: Snapdragon 8 Gen 3 Octa-Core", icono: "⚡" },
    { clave: "ram_almacenamiento", etiqueta: "Memoria RAM & Almacenamiento", placeholder: "Ej: 12GB RAM LPDDR5X + 256GB UFS 4.0", icono: "💾" },
    { clave: "camaras", etiqueta: "Sistema de Cámaras", placeholder: "Ej: 50MP OIS + 50MP UW + 32MP Selfie", icono: "📸" },
    { clave: "bateria", etiqueta: "Batería & Carga", placeholder: "Ej: 5000 mAh · Carga rápida 45W", icono: "🔋" },
    { clave: "conectividad", etiqueta: "Conectividad & Redes", placeholder: "Ej: 5G Dual SIM · Wi-Fi 7 · NFC", icono: "🌐" },
  ],
  auriculares: [
    { clave: "transductores", etiqueta: "Transductores / Drivers", placeholder: "Ej: Drivers dinámicos de 40mm Hi-Res", icono: "🎧" },
    { clave: "cancelacion_ruido", etiqueta: "Cancelación de Ruido (ANC)", placeholder: "Ej: ANC activa adaptativa con procesador HD", icono: "🔇" },
    { clave: "microfonos", etiqueta: "Micrófonos & Llamadas", placeholder: "Ej: 4 micrófonos con formación de haces", icono: "🎙️" },
    { clave: "bateria", etiqueta: "Autonomía & Batería", placeholder: "Ej: Hasta 30 horas con ANC encendido", icono: "🔋" },
    { clave: "codecs", etiqueta: "Códecs & Bluetooth", placeholder: "Ej: Bluetooth 5.3 · LDAC / AAC / SBC", icono: "📡" },
    { clave: "software", etiqueta: "Software & Ecualización", placeholder: "Ej: App complementaria con ecualizador", icono: "⚙️" },
  ],
  laptops: [
    { clave: "pantalla", etiqueta: "Pantalla & Panel", placeholder: "Ej: 16'' OLED 2.5K 120Hz 100% DCI-P3", icono: "🖥️" },
    { clave: "procesador", etiqueta: "Procesador (CPU)", placeholder: "Ej: Intel Core Ultra 9 185H (16 núcleos)", icono: "⚡" },
    { clave: "grafica", etiqueta: "Tarjeta Gráfica (GPU)", placeholder: "Ej: NVIDIA GeForce RTX 4070 8GB GDDR6", icono: "🎮" },
    { clave: "ram", etiqueta: "Memoria RAM", placeholder: "Ej: 32GB LPDDR5X 7467MHz Dual Channel", icono: "💾" },
    { clave: "almacenamiento", etiqueta: "Almacenamiento NVMe", placeholder: "Ej: 1TB SSD PCIe 4.0 NVMe M.2", icono: "💿" },
    { clave: "bateria", etiqueta: "Batería & Refrigeración", placeholder: "Ej: Batería 90Wh con carga rápida 100W PD", icono: "🔋" },
    { clave: "puertos", etiqueta: "Puertos & Conectividad", placeholder: "Ej: Thunderbolt 4, HDMI 2.1, Wi-Fi 6E", icono: "🌐" },
  ],
  tablets: [
    { clave: "pantalla", etiqueta: "Pantalla & Experiencia Visual", placeholder: "Ej: 12.1'' LCD 3K 144Hz 900 nits", icono: "📱" },
    { clave: "procesador", etiqueta: "Procesador & Rendimiento", placeholder: "Ej: Qualcomm Snapdragon 8 Gen 3 (4nm)", icono: "⚡" },
    { clave: "ram_almacenamiento", etiqueta: "Memoria RAM & Almacenamiento", placeholder: "Ej: 12GB RAM + 256GB Almacenamiento", icono: "💾" },
    { clave: "camaras", etiqueta: "Cámaras Trasera / Frontal", placeholder: "Ej: 13MP trasera + 8MP frontal centrada", icono: "📸" },
    { clave: "bateria", etiqueta: "Batería & Autonomía", placeholder: "Ej: 9510 mAh · Carga ultra rápida 67W", icono: "🔋" },
    { clave: "productividad", etiqueta: "Productividad & Stylus", placeholder: "Ej: Compatible con Stylus de baja latencia", icono: "✏️" },
  ],
  monitores: [
    { clave: "panel", etiqueta: "Tecnología de Panel & Resolución", placeholder: "Ej: 27'' Fast IPS QHD (2560x1440)", icono: "🖥️" },
    { clave: "tasa_refresco", etiqueta: "Tasa de Refresco", placeholder: "Ej: 180 Hz con FreeSync / G-Sync", icono: "⚡" },
    { clave: "tiempo_respuesta", etiqueta: "Tiempo de Respuesta", placeholder: "Ej: 1ms GtG", icono: "⚡" },
    { clave: "color_hdr", etiqueta: "Gamut de Color & HDR", placeholder: "Ej: 99% sRGB / 95% DCI-P3 · HDR400", icono: "🎨" },
    { clave: "puertos", etiqueta: "Puertos & Conectividad", placeholder: "Ej: 2x HDMI 2.0, 1x DisplayPort 1.4", icono: "🔌" },
    { clave: "ergonomia", etiqueta: "Ergonomía & Soporte", placeholder: "Ej: Ajuste de altura, inclinación y VESA", icono: "📐" },
  ],
};

interface ErroresFormularioCategoria {
  nombre?: string;
  descripcion?: string;
}

interface ErroresFormularioMarca {
  nombre?: string;
}

export default function AdminPanelModal({
  isOpen,
  onClose,
  usuarioSesion,
  onProductoCambiado,
}: AdminPanelModalProps) {
  const [tabActiva, setTabActiva] = useState<TabAdministracion>("productos");

  // Estados de datos
  const [productos, setProductos] = useState<ProductoResponse[]>([]);
  const [categorias, setCategorias] = useState<CategoriaResponse[]>([]);
  const [marcas, setMarcas] = useState<MarcaResponse[]>([]);

  // Estados de carga y feedback globales
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // -------------------------------------------------------------
  // ESTADOS CRUD: PRODUCTOS
  // -------------------------------------------------------------
  const [modoFormulario, setModoFormulario] = useState<ModoFormulario>("ninguno");
  const [productoEditando, setProductoEditando] = useState<ProductoResponse | null>(null);
  const [productoEliminando, setProductoEliminando] = useState<ProductoResponse | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formIdCategoria, setFormIdCategoria] = useState("");
  const [formIdMarca, setFormIdMarca] = useState("");
  const [formImagen, setFormImagen] = useState("");
  const [formPrecioReferencia, setFormPrecioReferencia] = useState("");
  const [erroresForm, setErroresForm] = useState<ErroresFormularioProducto>({});

  // Estados de características técnicas dinámicas
  const [formCaracteristicas, setFormCaracteristicas] = useState<Record<string, string>>({});
  const [camposPersonalizados, setCamposPersonalizados] = useState<
    Array<{ id: string; clave: string; valor: string }>
  >([]);
  const [clavesIncompatiblesDetectadas, setClavesIncompatiblesDetectadas] = useState<string[]>([]);

  // -------------------------------------------------------------
  // ESTADOS CRUD: CATEGORÍAS
  // -------------------------------------------------------------
  const [modoFormularioCat, setModoFormularioCat] = useState<ModoFormulario>("ninguno");
  const [categoriaEditando, setCategoriaEditando] = useState<CategoriaResponse | null>(null);
  const [categoriaEliminando, setCategoriaEliminando] = useState<CategoriaResponse | null>(null);
  const [guardandoCat, setGuardandoCat] = useState(false);
  const [eliminandoCat, setEliminandoCat] = useState(false);

  const [formCatNombre, setFormCatNombre] = useState("");
  const [formCatDescripcion, setFormCatDescripcion] = useState("");
  const [erroresFormCat, setErroresFormCat] = useState<ErroresFormularioCategoria>({});

  // -------------------------------------------------------------
  // ESTADOS CRUD: MARCAS
  // -------------------------------------------------------------
  const [modoFormularioMarca, setModoFormularioMarca] = useState<ModoFormulario>("ninguno");
  const [marcaEditando, setMarcaEditando] = useState<MarcaResponse | null>(null);
  const [marcaEliminando, setMarcaEliminando] = useState<MarcaResponse | null>(null);
  const [guardandoMarca, setGuardandoMarca] = useState(false);
  const [eliminandoMarca, setEliminandoMarca] = useState(false);

  const [formMarcaNombre, setFormMarcaNombre] = useState("");
  const [formMarcaDescripcion, setFormMarcaDescripcion] = useState("");
  const [erroresFormMarca, setErroresFormMarca] = useState<ErroresFormularioMarca>({});

  // IDs accesibles
  const baseId = useId();
  const idNombreInput = `${baseId}-nombre`;
  const idDescInput = `${baseId}-descripcion`;
  const idCatInput = `${baseId}-categoria`;
  const idMarcaInput = `${baseId}-marca`;
  const idImgInput = `${baseId}-imagen`;
  const idPrecioInput = `${baseId}-precio`;

  const idCatNombreInput = `${baseId}-cat-nombre`;
  const idCatDescInput = `${baseId}-cat-desc`;

  const idMarcaNombreInput = `${baseId}-marca-nombre`;
  const idMarcaDescInput = `${baseId}-marca-desc`;

  // Carga integral de datos
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [prods, cats, marcasRes] = await Promise.all([
        obtenerProductos<ProductoResponse>(),
        obtenerCategorias(),
        obtenerMarcas(),
      ]);
      setProductos(prods || []);
      setCategorias(cats || []);
      setMarcas(marcasRes || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No fue posible comunicarse con el backend para cargar los datos.");
      }
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarCategorias = async () => {
    try {
      const cats = await obtenerCategorias();
      setCategorias(cats || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No fue posible actualizar la lista de categorías.");
      }
    }
  };

  const cargarMarcas = async () => {
    try {
      const ms = await obtenerMarcas();
      setMarcas(ms || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("No fue posible actualizar la lista de marcas.");
      }
    }
  };

  // Cargar datos cuando el modal se abre
  useEffect(() => {
    let activo = true;
    if (isOpen && esAdministrador(usuarioSesion)) {
      Promise.resolve().then(() => {
        if (activo) {
          cargarDatos();
        }
      });
    }
    return () => {
      activo = false;
    };
  }, [isOpen, usuarioSesion, cargarDatos]);

  // Categoría actual inferida para campos dinámicos
  const categoriaActualTipo = useMemo<CategoriaDispositivo>(() => {
    const cat = categorias.find((c) => c.idCategoria === Number(formIdCategoria));
    return detectarCategoria({
      idCategoria: Number(formIdCategoria),
      nombreCategoria: cat?.nombre,
      nombre: formNombre,
    });
  }, [categorias, formIdCategoria, formNombre]);

  const infoCatActual = useMemo(() => {
    return INFO_CATEGORIAS[categoriaActualTipo] || INFO_CATEGORIAS.moviles;
  }, [categoriaActualTipo]);

  const camposCategoriaActual = useMemo<CampoEspecificacion[]>(() => {
    return CAMPOS_POR_CATEGORIA[categoriaActualTipo] || CAMPOS_POR_CATEGORIA.moviles;
  }, [categoriaActualTipo]);

  // Principio de seguridad Zero-Trust:
  // El modal no se renderiza bajo ninguna circunstancia si el usuario
  // no cuenta con el rol 'Administrador' verificado por el backend.
  if (!isOpen || !esAdministrador(usuarioSesion)) {
    return null;
  }

  // Helpers para nombres de categoría y marca
  const getNombreCategoria = (idCat: number) => {
    const cat = categorias.find((c) => c.idCategoria === idCat);
    return cat ? cat.nombre : `Cat #${idCat}`;
  };

  const getNombreMarca = (idM: number) => {
    const marca = marcas.find((m) => m.idMarca === idM);
    return marca ? marca.nombre : `Marca #${idM}`;
  };

  // -------------------------------------------------------------
  // OPERACIONES PRODUCTOS & CARACTERÍSTICAS DINÁMICAS
  // -------------------------------------------------------------

  const actualizarCaracteristica = (clave: string, valor: string) => {
    setFormCaracteristicas((prev) => ({
      ...prev,
      [clave]: valor,
    }));
  };

  const agregarCampoPersonalizado = () => {
    setCamposPersonalizados((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        clave: "",
        valor: "",
      },
    ]);
  };

  const actualizarCampoPersonalizado = (
    id: string,
    campo: "clave" | "valor",
    valor: string,
  ) => {
    setCamposPersonalizados((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)),
    );
  };

  const eliminarCampoPersonalizado = (id: string) => {
    setCamposPersonalizados((prev) => prev.filter((item) => item.id !== id));
  };

  const manejarCambioCategoria = (nuevoIdCat: string) => {
    const catAnterior = categorias.find((c) => c.idCategoria === Number(formIdCategoria));
    const catNueva = categorias.find((c) => c.idCategoria === Number(nuevoIdCat));

    const tipoAnterior = detectarCategoria({
      idCategoria: Number(formIdCategoria),
      nombreCategoria: catAnterior?.nombre,
      nombre: formNombre,
    });
    const tipoNuevo = detectarCategoria({
      idCategoria: Number(nuevoIdCat),
      nombreCategoria: catNueva?.nombre,
      nombre: formNombre,
    });

    setFormIdCategoria(nuevoIdCat);

    if (tipoAnterior !== tipoNuevo) {
      const camposPermitidosNuevo = new Set(
        (CAMPOS_POR_CATEGORIA[tipoNuevo] || []).map((c) => c.clave),
      );

      const incompatibles: string[] = [];
      Object.entries(formCaracteristicas).forEach(([clave, valor]) => {
        if (
          valor &&
          typeof valor === "string" &&
          valor.trim() !== "" &&
          !camposPermitidosNuevo.has(clave)
        ) {
          incompatibles.push(clave);
        }
      });

      setClavesIncompatiblesDetectadas(incompatibles);
    } else {
      setClavesIncompatiblesDetectadas([]);
    }
  };

  const limpiarCaracteristicasIncompatibles = () => {
    setFormCaracteristicas((prev) => {
      const copia = { ...prev };
      clavesIncompatiblesDetectadas.forEach((clave) => {
        delete copia[clave];
      });
      return copia;
    });
    setClavesIncompatiblesDetectadas([]);
  };

  const conservarCaracteristicasComoPersonalizadas = () => {
    const nuevosPersonalizados = [...camposPersonalizados];
    clavesIncompatiblesDetectadas.forEach((clave) => {
      const valor = formCaracteristicas[clave];
      if (valor && typeof valor === "string" && valor.trim() !== "") {
        nuevosPersonalizados.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${clave}`,
          clave,
          valor: valor.trim(),
        });
      }
    });
    setCamposPersonalizados(nuevosPersonalizados);
    setFormCaracteristicas((prev) => {
      const copia = { ...prev };
      clavesIncompatiblesDetectadas.forEach((clave) => {
        delete copia[clave];
      });
      return copia;
    });
    setClavesIncompatiblesDetectadas([]);
  };

  const abrirCrear = () => {
    setModoFormulario("crear");
    setProductoEditando(null);
    setFormNombre("");
    setFormDescripcion("");
    setFormIdCategoria(categorias.length > 0 ? String(categorias[0].idCategoria) : "");
    setFormIdMarca(marcas.length > 0 ? String(marcas[0].idMarca) : "");
    setFormImagen("");
    setFormPrecioReferencia("");
    setFormCaracteristicas({});
    setCamposPersonalizados([]);
    setClavesIncompatiblesDetectadas([]);
    setErroresForm({});
    setError(null);
    setMensajeExito(null);
  };

  const abrirEditar = (prod: ProductoResponse) => {
    setModoFormulario("editar");
    setProductoEditando(prod);
    setFormNombre(prod.nombre);
    setFormDescripcion(prod.descripcion || "");
    setFormIdCategoria(String(prod.idCategoria));
    setFormIdMarca(String(prod.idMarca));
    setFormImagen(prod.imagen || "");
    setFormPrecioReferencia(
      prod.precioReferencia !== null && prod.precioReferencia !== undefined
        ? String(prod.precioReferencia)
        : "",
    );

    // Cargar características técnicas de manera segura
    const cat = categorias.find((c) => c.idCategoria === prod.idCategoria);
    const tipo = detectarCategoria({
      idCategoria: prod.idCategoria,
      nombreCategoria: cat?.nombre,
      nombre: prod.nombre,
    });
    const camposPermitidos = new Set((CAMPOS_POR_CATEGORIA[tipo] || []).map((c) => c.clave));

    const inicialCaracteristicas: Record<string, string> = {};
    const inicialPersonalizados: Array<{ id: string; clave: string; valor: string }> = [];

    if (prod.caracteristicas && typeof prod.caracteristicas === "object") {
      Object.entries(prod.caracteristicas).forEach(([clave, valor]) => {
        if (valor !== null && valor !== undefined) {
          const valorStr = typeof valor === "string" ? valor : JSON.stringify(valor);
          if (camposPermitidos.has(clave)) {
            inicialCaracteristicas[clave] = valorStr;
          } else {
            inicialPersonalizados.push({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${clave}`,
              clave,
              valor: valorStr,
            });
          }
        }
      });
    }

    setFormCaracteristicas(inicialCaracteristicas);
    setCamposPersonalizados(inicialPersonalizados);
    setClavesIncompatiblesDetectadas([]);

    setErroresForm({});
    setError(null);
    setMensajeExito(null);
  };

  const cancelarFormulario = () => {
    setModoFormulario("ninguno");
    setProductoEditando(null);
    setFormCaracteristicas({});
    setCamposPersonalizados([]);
    setClavesIncompatiblesDetectadas([]);
    setErroresForm({});
  };

  const validarFormularioProducto = (): boolean => {
    const errores: ErroresFormularioProducto = {};

    if (!formNombre.trim()) {
      errores.nombre = "El nombre del producto es obligatorio.";
    } else if (formNombre.trim().length > 150) {
      errores.nombre = "El nombre no puede superar 150 caracteres.";
    }

    const idCatNum = Number(formIdCategoria);
    if (!formIdCategoria || isNaN(idCatNum) || idCatNum <= 0) {
      errores.idCategoria = "Debes seleccionar una categoría válida.";
    }

    const idMarcaNum = Number(formIdMarca);
    if (!formIdMarca || isNaN(idMarcaNum) || idMarcaNum <= 0) {
      errores.idMarca = "Debes seleccionar una marca válida.";
    }

    if (formImagen.trim().length > 1000) {
      errores.imagen = "La URL de la imagen no puede superar 1000 caracteres.";
    }

    if (formPrecioReferencia.trim() !== "") {
      const precioNum = Number(formPrecioReferencia);
      if (isNaN(precioNum) || precioNum < 0) {
        errores.precioReferencia = "El precio de referencia no puede ser negativo.";
      }
    }

    // Validar características estándar
    for (const [clave, val] of Object.entries(formCaracteristicas)) {
      if (val && val.length > 2000) {
        errores.caracteristicas = `El valor de "${clave}" no puede superar 2000 caracteres.`;
        break;
      }
    }

    // Validar características personalizadas si no hay error previo
    if (!errores.caracteristicas) {
      const clavesVistas = new Set<string>(camposCategoriaActual.map((c) => c.clave.toLowerCase()));
      for (const cp of camposPersonalizados) {
        const cTrim = cp.clave.trim().toLowerCase();
        const vTrim = cp.valor.trim();

        if (!cTrim && vTrim) {
          errores.caracteristicas = "Las características personalizadas deben tener un nombre de campo.";
          break;
        }
        if (cTrim.length > 100) {
          errores.caracteristicas = "El nombre de una característica no puede superar 100 caracteres.";
          break;
        }
        if (cp.valor.length > 2000) {
          errores.caracteristicas = "El valor de una característica no puede superar 2000 caracteres.";
          break;
        }
        if (cTrim && vTrim) {
          if (clavesVistas.has(cTrim)) {
            errores.caracteristicas = `La característica "${cp.clave.trim()}" ya existe. Evita campos duplicados.`;
            break;
          }
          clavesVistas.add(cTrim);
        }
      }
    }

    setErroresForm(errores);
    return Object.keys(errores).length === 0;
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    if (!validarFormularioProducto()) {
      return;
    }

    setGuardando(true);
    setError(null);
    setMensajeExito(null);

    // Ensamblar mapa de características técnicas activas y coherentes con la categoría
    const caracteristicasAEnviar: Record<string, string> = {};
    const clavesValidas = new Set(camposCategoriaActual.map((c) => c.clave));

    Object.entries(formCaracteristicas).forEach(([clave, valor]) => {
      if (clavesValidas.has(clave) && typeof valor === "string" && valor.trim() !== "") {
        caracteristicasAEnviar[clave] = valor.trim();
      }
    });

    camposPersonalizados.forEach((cp) => {
      const c = cp.clave.trim();
      const v = cp.valor.trim();
      if (c && v) {
        caracteristicasAEnviar[c] = v;
      }
    });

    const request: ProductoRequest = {
      nombre: formNombre.trim(),
      descripcion: formDescripcion.trim() ? formDescripcion.trim() : null,
      idCategoria: Number(formIdCategoria),
      idMarca: Number(formIdMarca),
      imagen: formImagen.trim() ? formImagen.trim() : null,
      precioReferencia:
        formPrecioReferencia.trim() !== "" ? Number(formPrecioReferencia) : null,
    };

    if (Object.keys(caracteristicasAEnviar).length > 0) {
      request.caracteristicas = caracteristicasAEnviar;
    } else if (
      modoFormulario === "editar" &&
      productoEditando?.caracteristicas &&
      Object.keys(productoEditando.caracteristicas).length > 0
    ) {
      request.caracteristicas = {};
    }

    try {
      if (modoFormulario === "crear") {
        await crearProducto(request);
        setMensajeExito("Producto registrado exitosamente en el catálogo.");
      } else if (modoFormulario === "editar" && productoEditando) {
        await actualizarProducto(productoEditando.idProducto, request);
        setMensajeExito("Producto actualizado exitosamente.");
      }
      setModoFormulario("ninguno");
      setProductoEditando(null);
      await cargarDatos();
      onProductoCambiado?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Acceso denegado (403): Se requieren permisos de Administrador.");
        } else if (err.status === 400) {
          setError(`Error de validación (400): ${err.message}`);
        } else {
          setError(err.message);
        }
      } else {
        setError("Ocurrió un error inesperado al procesar la solicitud.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarEliminacionProducto = async () => {
    if (!productoEliminando || eliminando) return;

    setEliminando(true);
    setError(null);
    setMensajeExito(null);

    try {
      await eliminarProducto(productoEliminando.idProducto);
      setMensajeExito(`Producto "${productoEliminando.nombre}" eliminado correctamente.`);
      setProductoEliminando(null);
      await cargarDatos();
      onProductoCambiado?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Acceso denegado (403): Se requieren permisos de Administrador.");
        } else {
          setError(err.message);
        }
      } else {
        setError("No fue posible eliminar el producto del catálogo.");
      }
    } finally {
      setEliminando(false);
    }
  };

  // -------------------------------------------------------------
  // OPERACIONES CATEGORÍAS
  // -------------------------------------------------------------
  const abrirCrearCategoria = () => {
    setModoFormularioCat("crear");
    setCategoriaEditando(null);
    setFormCatNombre("");
    setFormCatDescripcion("");
    setErroresFormCat({});
    setError(null);
    setMensajeExito(null);
  };

  const abrirEditarCategoria = (cat: CategoriaResponse) => {
    setModoFormularioCat("editar");
    setCategoriaEditando(cat);
    setFormCatNombre(cat.nombre);
    setFormCatDescripcion(cat.descripcion || "");
    setErroresFormCat({});
    setError(null);
    setMensajeExito(null);
  };

  const cancelarFormularioCategoria = () => {
    setModoFormularioCat("ninguno");
    setCategoriaEditando(null);
    setErroresFormCat({});
  };

  const validarFormularioCategoria = (): boolean => {
    const errores: ErroresFormularioCategoria = {};

    if (!formCatNombre.trim()) {
      errores.nombre = "El nombre de la categoría es obligatorio.";
    } else if (formCatNombre.trim().length > 100) {
      errores.nombre = "El nombre no puede superar 100 caracteres.";
    }

    if (formCatDescripcion.trim().length > 500) {
      errores.descripcion = "La descripción no puede superar 500 caracteres.";
    }

    setErroresFormCat(errores);
    return Object.keys(errores).length === 0;
  };

  const guardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardandoCat) return;

    if (!validarFormularioCategoria()) {
      return;
    }

    setGuardandoCat(true);
    setError(null);
    setMensajeExito(null);

    const request: CategoriaRequest = {
      nombre: formCatNombre.trim(),
      descripcion: formCatDescripcion.trim() ? formCatDescripcion.trim() : null,
    };

    try {
      if (modoFormularioCat === "crear") {
        await crearCategoria(request);
        setMensajeExito("Categoría registrada exitosamente.");
      } else if (modoFormularioCat === "editar" && categoriaEditando) {
        await actualizarCategoria(categoriaEditando.idCategoria, request);
        setMensajeExito("Categoría actualizada exitosamente.");
      }
      setModoFormularioCat("ninguno");
      setCategoriaEditando(null);
      await cargarCategorias();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Acceso denegado (403): Se requieren permisos de Administrador.");
        } else if (err.status === 400) {
          setError(`Error de validación (400): ${err.message}`);
        } else {
          setError(err.message);
        }
      } else {
        setError("Ocurrió un error inesperado al guardar la categoría.");
      }
    } finally {
      setGuardandoCat(false);
    }
  };

  const ejecutarEliminacionCategoria = async () => {
    if (!categoriaEliminando || eliminandoCat) return;

    setEliminandoCat(true);
    setError(null);
    setMensajeExito(null);

    try {
      await eliminarCategoria(categoriaEliminando.idCategoria);
      setMensajeExito(`Categoría "${categoriaEliminando.nombre}" eliminada correctamente.`);
      setCategoriaEliminando(null);
      await cargarCategorias();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Acceso denegado (403): Se requieren permisos de Administrador.");
        } else if (err.status === 409) {
          setError(`Conflicto (409): ${err.message}`);
        } else {
          setError(err.message);
        }
      } else {
        setError("No fue posible eliminar la categoría.");
      }
    } finally {
      setEliminandoCat(false);
    }
  };

  // -------------------------------------------------------------
  // OPERACIONES MARCAS
  // -------------------------------------------------------------
  const abrirCrearMarca = () => {
    setModoFormularioMarca("crear");
    setMarcaEditando(null);
    setFormMarcaNombre("");
    setFormMarcaDescripcion("");
    setErroresFormMarca({});
    setError(null);
    setMensajeExito(null);
  };

  const abrirEditarMarca = (m: MarcaResponse) => {
    setModoFormularioMarca("editar");
    setMarcaEditando(m);
    setFormMarcaNombre(m.nombre);
    setFormMarcaDescripcion(m.descripcion || "");
    setErroresFormMarca({});
    setError(null);
    setMensajeExito(null);
  };

  const cancelarFormularioMarca = () => {
    setModoFormularioMarca("ninguno");
    setMarcaEditando(null);
    setErroresFormMarca({});
  };

  const validarFormularioMarca = (): boolean => {
    const errores: ErroresFormularioMarca = {};

    if (!formMarcaNombre.trim()) {
      errores.nombre = "El nombre de la marca es obligatorio.";
    } else if (formMarcaNombre.trim().length > 100) {
      errores.nombre = "El nombre no puede superar 100 caracteres.";
    }

    setErroresFormMarca(errores);
    return Object.keys(errores).length === 0;
  };

  const guardarMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardandoMarca) return;

    if (!validarFormularioMarca()) {
      return;
    }

    setGuardandoMarca(true);
    setError(null);
    setMensajeExito(null);

    const request: MarcaRequest = {
      nombre: formMarcaNombre.trim(),
      descripcion: formMarcaDescripcion.trim() ? formMarcaDescripcion.trim() : null,
    };

    try {
      if (modoFormularioMarca === "crear") {
        await crearMarca(request);
        setMensajeExito("Marca registrada exitosamente.");
      } else if (modoFormularioMarca === "editar" && marcaEditando) {
        await actualizarMarca(marcaEditando.idMarca, request);
        setMensajeExito("Marca actualizada exitosamente.");
      }
      setModoFormularioMarca("ninguno");
      setMarcaEditando(null);
      await cargarMarcas();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Acceso denegado (403): Se requieren permisos de Administrador.");
        } else if (err.status === 400) {
          setError(`Error de validación (400): ${err.message}`);
        } else {
          setError(err.message);
        }
      } else {
        setError("Ocurrió un error inesperado al guardar la marca.");
      }
    } finally {
      setGuardandoMarca(false);
    }
  };

  const ejecutarEliminacionMarca = async () => {
    if (!marcaEliminando || eliminandoMarca) return;

    setEliminandoMarca(true);
    setError(null);
    setMensajeExito(null);

    try {
      await eliminarMarca(marcaEliminando.idMarca);
      setMensajeExito(`Marca "${marcaEliminando.nombre}" eliminada correctamente.`);
      setMarcaEliminando(null);
      await cargarMarcas();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("Acceso denegado (403): Se requieren permisos de Administrador.");
        } else {
          setError(err.message);
        }
      } else {
        setError("No fue posible eliminar la marca.");
      }
    } finally {
      setEliminandoMarca(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-admin-panel-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-red-900/60 bg-slate-900/95 p-6 shadow-2xl text-slate-100 font-mono flex flex-col max-h-[92vh]">
        
        {/* Encabezado accesible Nothing OS */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden="true"></span>
            <div>
              <h2 id="modal-admin-panel-titulo" className="text-sm font-bold uppercase tracking-wider text-white font-doto">
                Panel de Administración <span className="text-red-500">{"//"}</span> TecReview
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                Sesión: {usuarioSesion?.nombre} ({usuarioSesion?.email}) • Rol:{" "}
                <span className="text-red-400 font-semibold">{usuarioSesion?.rol}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 transition-colors cursor-pointer"
            aria-label="Cerrar panel de administración"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Mensajes de estado globales */}
        {error && (
          <div className="mt-3 rounded-xl border border-red-800 bg-red-950/50 p-3 text-xs text-red-300 shrink-0 flex items-center justify-between" role="alert">
            <div>
              <span className="font-bold">Error:</span> {error}
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200 text-xs ml-2 cursor-pointer"
              aria-label="Cerrar mensaje de error"
            >
              ✕
            </button>
          </div>
        )}
        {mensajeExito && (
          <div className="mt-3 rounded-xl border border-emerald-800 bg-emerald-950/50 p-3 text-xs text-emerald-300 shrink-0 flex items-center justify-between" role="status">
            <div>
              <span className="font-bold">Éxito:</span> {mensajeExito}
            </div>
            <button
              type="button"
              onClick={() => setMensajeExito(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs ml-2 cursor-pointer"
              aria-label="Cerrar mensaje de éxito"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selector de pestañas */}
        <div className="flex items-center gap-2 pt-3 pb-3 border-b border-slate-800/80 shrink-0" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === "productos"}
            onClick={() => {
              setTabActiva("productos");
              setModoFormulario("ninguno");
              setModoFormularioCat("ninguno");
              setModoFormularioMarca("ninguno");
            }}
            className={`font-doto uppercase tracking-wider px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              tabActiva === "productos"
                ? "border-red-600 bg-red-950/40 text-red-300 shadow-2xs"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            📦 Productos
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === "categorias"}
            onClick={() => {
              setTabActiva("categorias");
              setModoFormulario("ninguno");
              setModoFormularioCat("ninguno");
              setModoFormularioMarca("ninguno");
            }}
            className={`font-doto uppercase tracking-wider px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              tabActiva === "categorias"
                ? "border-red-600 bg-red-950/40 text-red-300 shadow-2xs"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            🏷️ Categorías
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === "marcas"}
            onClick={() => {
              setTabActiva("marcas");
              setModoFormulario("ninguno");
              setModoFormularioCat("ninguno");
              setModoFormularioMarca("ninguno");
            }}
            className={`font-doto uppercase tracking-wider px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              tabActiva === "marcas"
                ? "border-red-600 bg-red-950/40 text-red-300 shadow-2xs"
                : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            🏢 Marcas
          </button>
        </div>

        {/* Contenido de pestañas */}
        <div className="mt-3 overflow-y-auto space-y-4 pr-1 text-xs grow">
          
          {/* ========================================================= */}
          {/* PESTAÑA 1: PRODUCTOS                                      */}
          {/* ========================================================= */}
          {tabActiva === "productos" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider font-doto">
                    Gestión de Catálogo de Productos
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Total registrados: <span className="text-slate-200 font-semibold">{productos.length}</span>
                  </p>
                </div>
                {modoFormulario === "ninguno" && (
                  <button
                    type="button"
                    onClick={abrirCrear}
                    className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span>+</span> Nuevo Producto
                  </button>
                )}
              </div>

              {/* Formulario Productos */}
              {modoFormulario !== "ninguno" && (
                <div className="rounded-xl border border-red-900/50 bg-slate-950/80 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-400 font-doto flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      {modoFormulario === "crear"
                        ? "Registrar Nuevo Producto"
                        : `Editar Producto: ${productoEditando?.nombre || ""}`}
                    </h4>
                    <button
                      type="button"
                      onClick={cancelarFormulario}
                      disabled={guardando}
                      className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  <form onSubmit={guardarProducto} className="space-y-3" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label htmlFor={idNombreInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Nombre del Producto <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={idNombreInput}
                          type="text"
                          maxLength={150}
                          value={formNombre}
                          onChange={(e) => setFormNombre(e.target.value)}
                          disabled={guardando}
                          placeholder="Ej: Nothing Phone (2)"
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                            erroresForm.nombre
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        />
                        {erroresForm.nombre && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresForm.nombre}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={idCatInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Categoría <span className="text-red-500">*</span>
                        </label>
                        <select
                          id={idCatInput}
                          value={formIdCategoria}
                          onChange={(e) => manejarCambioCategoria(e.target.value)}
                          disabled={guardando}
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
                            erroresForm.idCategoria
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        >
                          <option value="">Selecciona una categoría...</option>
                          {categorias.map((cat) => (
                            <option key={cat.idCategoria} value={cat.idCategoria}>
                              {cat.nombre}
                            </option>
                          ))}
                        </select>
                        {erroresForm.idCategoria && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresForm.idCategoria}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={idMarcaInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Marca <span className="text-red-500">*</span>
                        </label>
                        <select
                          id={idMarcaInput}
                          value={formIdMarca}
                          onChange={(e) => setFormIdMarca(e.target.value)}
                          disabled={guardando}
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 transition-colors cursor-pointer ${
                            erroresForm.idMarca
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        >
                          <option value="">Selecciona una marca...</option>
                          {marcas.map((m) => (
                            <option key={m.idMarca} value={m.idMarca}>
                              {m.nombre}
                            </option>
                          ))}
                        </select>
                        {erroresForm.idMarca && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresForm.idMarca}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={idPrecioInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Precio de Referencia ($)
                        </label>
                        <input
                          id={idPrecioInput}
                          type="number"
                          step="0.01"
                          min="0"
                          value={formPrecioReferencia}
                          onChange={(e) => setFormPrecioReferencia(e.target.value)}
                          disabled={guardando}
                          placeholder="Ej: 699.99"
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                            erroresForm.precioReferencia
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        />
                        {erroresForm.precioReferencia && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresForm.precioReferencia}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={idImgInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          URL de Imagen
                        </label>
                        <input
                          id={idImgInput}
                          type="text"
                          maxLength={1000}
                          value={formImagen}
                          onChange={(e) => setFormImagen(e.target.value)}
                          disabled={guardando}
                          placeholder="https://images.unsplash.com/..."
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                            erroresForm.imagen
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        />
                        {erroresForm.imagen && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresForm.imagen}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor={idDescInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          id={idDescInput}
                          rows={2}
                          value={formDescripcion}
                          onChange={(e) => setFormDescripcion(e.target.value)}
                          disabled={guardando}
                          placeholder="Detalles sobre especificaciones, diseño y rendimiento..."
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-colors"
                        />
                      </div>

                      {/* ========================================================= */}
                      {/* SECCIÓN DE CARACTERÍSTICAS TÉCNICAS DINÁMICAS POR CATEGORÍA */}
                      {/* ========================================================= */}
                      <div className="sm:col-span-2 pt-3 border-t border-slate-800/80 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-doto flex items-center gap-2">
                              <span>⚙️ Especificaciones Técnicas</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-950/60 text-red-300 border border-red-900/40">
                                {infoCatActual.icono} {infoCatActual.etiqueta}
                              </span>
                            </h5>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Configura las especificaciones pertinentes para la ficha técnica del producto.
                            </p>
                          </div>
                        </div>

                        {/* Alerta de cambio de categoría y claves incompatibles */}
                        {clavesIncompatiblesDetectadas.length > 0 && (
                          <div
                            data-testid="alerta-cambio-categoria"
                            className="p-3 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-200 space-y-2"
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-sm">⚠️</span>
                              <div>
                                <p className="font-semibold text-amber-300 text-xs">
                                  Cambio de categoría: Se detectaron {clavesIncompatiblesDetectadas.length} campos incompatibles
                                </p>
                                <p className="text-[11px] text-amber-200/80 mt-0.5">
                                  Campos de la categoría anterior con datos:{" "}
                                  <span className="font-mono font-bold text-amber-100">
                                    {clavesIncompatiblesDetectadas.join(", ")}
                                  </span>
                                  .
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <button
                                type="button"
                                data-testid="btn-adaptar-categoria"
                                onClick={limpiarCaracteristicasIncompatibles}
                                className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-[11px] font-semibold text-amber-100 transition-colors cursor-pointer"
                              >
                                Adaptar a {infoCatActual.etiqueta} (Descartar incompatibles)
                              </button>
                              <button
                                type="button"
                                data-testid="btn-conservar-personalizadas"
                                onClick={conservarCaracteristicasComoPersonalizadas}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-semibold text-slate-200 transition-colors cursor-pointer"
                              >
                                Conservar como personalizadas
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Error de validación de especificaciones */}
                        {erroresForm.caracteristicas && (
                          <p className="p-2 rounded bg-red-950/40 border border-red-900/60 text-[11px] text-red-400 font-medium">
                            {erroresForm.caracteristicas}
                          </p>
                        )}

                        {/* Campos estándar según la categoría actual */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {camposCategoriaActual.map((campo) => {
                            const campoInputId = `${baseId}-spec-${campo.clave}`;
                            const valorCampo = formCaracteristicas[campo.clave] || "";
                            return (
                              <div key={campo.clave}>
                                <label
                                  htmlFor={campoInputId}
                                  className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5"
                                >
                                  <span>{campo.icono}</span>
                                  <span>{campo.etiqueta}</span>
                                </label>
                                <input
                                  id={campoInputId}
                                  data-testid={`input-spec-${campo.clave}`}
                                  type="text"
                                  maxLength={2000}
                                  value={valorCampo}
                                  onChange={(e) => actualizarCaracteristica(campo.clave, e.target.value)}
                                  disabled={guardando}
                                  placeholder={campo.placeholder}
                                  className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-colors"
                                />
                              </div>
                            );
                          })}
                        </div>

                        {/* Especificaciones personalizadas adicionales */}
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-400">
                              Características Adicionales / Personalizadas
                            </span>
                            <button
                              type="button"
                              data-testid="btn-agregar-spec-personalizada"
                              onClick={agregarCampoPersonalizado}
                              disabled={guardando}
                              className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer transition-colors"
                            >
                              + Añadir característica personalizada
                            </button>
                          </div>

                          {camposPersonalizados.map((cp, idx) => (
                            <div key={cp.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                maxLength={100}
                                data-testid={`input-spec-personalizada-clave-${idx}`}
                                placeholder="Nombre (ej: resistencia_agua)"
                                value={cp.clave}
                                onChange={(e) =>
                                  actualizarCampoPersonalizado(cp.id, "clave", e.target.value)
                                }
                                disabled={guardando}
                                className="w-1/3 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-colors font-mono"
                              />
                              <input
                                type="text"
                                maxLength={2000}
                                data-testid={`input-spec-personalizada-valor-${idx}`}
                                placeholder="Valor (ej: Certificación IP68)"
                                value={cp.valor}
                                onChange={(e) =>
                                  actualizarCampoPersonalizado(cp.id, "valor", e.target.value)
                                }
                                disabled={guardando}
                                className="grow rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-colors"
                              />
                              <button
                                type="button"
                                data-testid={`btn-eliminar-spec-personalizada-${idx}`}
                                onClick={() => eliminarCampoPersonalizado(cp.id)}
                                disabled={guardando}
                                title="Eliminar campo"
                                className="px-2 py-1 rounded text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/60 transition-colors cursor-pointer text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={cancelarFormulario}
                        disabled={guardando}
                        className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs text-slate-300 font-doto uppercase transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardando}
                        className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {guardando ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                            Guardando...
                          </>
                        ) : modoFormulario === "crear" ? (
                          "Crear Producto"
                        ) : (
                          "Guardar Cambios"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Listado de Productos */}
              {cargando ? (
                <div className="py-12 text-center text-slate-400 font-mono animate-pulse">
                  Consultando catálogo de productos con el servidor...
                </div>
              ) : productos.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center space-y-3">
                  <p className="text-slate-400 text-xs">
                    No hay productos registrados en el catálogo.
                  </p>
                  {modoFormulario === "ninguno" && (
                    <button
                      type="button"
                      onClick={abrirCrear}
                      className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer inline-block"
                    >
                      Registrar Primer Producto
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-doto">
                      <tr>
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3">Categoría</th>
                        <th className="py-2.5 px-3">Marca</th>
                        <th className="py-2.5 px-3 text-right">Precio Ref.</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {productos.map((prod) => (
                        <tr key={prod.idProducto} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            #{prod.idProducto}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-100">{prod.nombre}</div>
                            {prod.descripcion && (
                              <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                {prod.descripcion}
                              </div>
                            )}
                            {prod.caracteristicas && Object.keys(prod.caracteristicas).length > 0 && (
                              <div className="mt-1">
                                <span
                                  data-testid={`badge-specs-${prod.idProducto}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-950/60 text-cyan-300 border border-cyan-800/50"
                                  title={`Especificaciones: ${Object.keys(prod.caracteristicas).join(", ")}`}
                                >
                                  <span>⚡</span>
                                  <span>{Object.keys(prod.caracteristicas).length} specs</span>
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/80 text-[10px]">
                              {getNombreCategoria(prod.idCategoria)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            <span className="px-2 py-0.5 rounded border border-slate-800 bg-slate-900/80 text-[10px]">
                              {getNombreMarca(prod.idMarca)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                            {prod.precioReferencia !== null && prod.precioReferencia !== undefined
                              ? `$${Number(prod.precioReferencia).toFixed(2)}`
                              : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => abrirEditar(prod)}
                                disabled={guardando || eliminando}
                                aria-label={`Editar ${prod.nombre}`}
                                className="px-2 py-1 rounded text-[10px] font-bold uppercase font-doto text-amber-400 hover:text-amber-200 border border-amber-900/40 hover:bg-amber-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setProductoEliminando(prod)}
                                disabled={guardando || eliminando}
                                aria-label={`Eliminar ${prod.nombre}`}
                                className="px-2 py-1 rounded text-[10px] font-bold uppercase font-doto text-red-400 hover:text-red-200 border border-red-900/40 hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: CATEGORÍAS (CRUD COMPLETO)                    */}
          {/* ========================================================= */}
          {tabActiva === "categorias" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider font-doto">
                    Gestión de Categorías
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Total registradas: <span className="text-slate-200 font-semibold">{categorias.length}</span>
                  </p>
                </div>
                {modoFormularioCat === "ninguno" && (
                  <button
                    type="button"
                    onClick={abrirCrearCategoria}
                    className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span>+</span> Nueva Categoría
                  </button>
                )}
              </div>

              {/* Formulario Categorías */}
              {modoFormularioCat !== "ninguno" && (
                <div className="rounded-xl border border-red-900/50 bg-slate-950/80 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-400 font-doto flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      {modoFormularioCat === "crear"
                        ? "Registrar Nueva Categoría"
                        : `Editar Categoría: ${categoriaEditando?.nombre || ""}`}
                    </h4>
                    <button
                      type="button"
                      onClick={cancelarFormularioCategoria}
                      disabled={guardandoCat}
                      className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  <form onSubmit={guardarCategoria} className="space-y-3" noValidate>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={idCatNombreInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Nombre de la Categoría <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={idCatNombreInput}
                          type="text"
                          maxLength={100}
                          value={formCatNombre}
                          onChange={(e) => setFormCatNombre(e.target.value)}
                          disabled={guardandoCat}
                          placeholder="Ej: Smartphones, Laptops, Audio..."
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                            erroresFormCat.nombre
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        />
                        {erroresFormCat.nombre && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresFormCat.nombre}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={idCatDescInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          id={idCatDescInput}
                          rows={2}
                          maxLength={500}
                          value={formCatDescripcion}
                          onChange={(e) => setFormCatDescripcion(e.target.value)}
                          disabled={guardandoCat}
                          placeholder="Descripción de la categoría de dispositivos..."
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                            erroresFormCat.descripcion
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        />
                        {erroresFormCat.descripcion && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresFormCat.descripcion}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={cancelarFormularioCategoria}
                        disabled={guardandoCat}
                        className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs text-slate-300 font-doto uppercase transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardandoCat}
                        className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {guardandoCat ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                            Guardando...
                          </>
                        ) : modoFormularioCat === "crear" ? (
                          "Crear Categoría"
                        ) : (
                          "Guardar Cambios"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Listado de Categorías */}
              {cargando ? (
                <div className="py-12 text-center text-slate-400 font-mono animate-pulse">
                  Consultando catálogo de categorías con el servidor...
                </div>
              ) : categorias.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center space-y-3">
                  <p className="text-slate-400 text-xs">
                    No hay categorías registradas en el catálogo.
                  </p>
                  {modoFormularioCat === "ninguno" && (
                    <button
                      type="button"
                      onClick={abrirCrearCategoria}
                      className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer inline-block"
                    >
                      Registrar Primera Categoría
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-doto">
                      <tr>
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Descripción</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {categorias.map((cat) => (
                        <tr key={cat.idCategoria} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            #{cat.idCategoria}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {cat.nombre}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-sm">
                            {cat.descripcion || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded border border-emerald-900/60 bg-emerald-950/40 text-emerald-400 text-[10px] font-mono">
                              Activa
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => abrirEditarCategoria(cat)}
                                disabled={guardandoCat || eliminandoCat}
                                aria-label={`Editar ${cat.nombre}`}
                                className="px-2 py-1 rounded text-[10px] font-bold uppercase font-doto text-amber-400 hover:text-amber-200 border border-amber-900/40 hover:bg-amber-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setCategoriaEliminando(cat)}
                                disabled={guardandoCat || eliminandoCat}
                                aria-label={`Eliminar ${cat.nombre}`}
                                className="px-2 py-1 rounded text-[10px] font-bold uppercase font-doto text-red-400 hover:text-red-200 border border-red-900/40 hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: MARCAS (CRUD COMPLETO)                         */}
          {/* ========================================================= */}
          {tabActiva === "marcas" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/60">
                <div>
                  <h3 className="font-bold text-white text-xs uppercase tracking-wider font-doto">
                    Gestión de Marcas
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Total registradas: <span className="text-slate-200 font-semibold">{marcas.length}</span>
                  </p>
                </div>
                {modoFormularioMarca === "ninguno" && (
                  <button
                    type="button"
                    onClick={abrirCrearMarca}
                    className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span>+</span> Nueva Marca
                  </button>
                )}
              </div>

              {/* Formulario Marcas */}
              {modoFormularioMarca !== "ninguno" && (
                <div className="rounded-xl border border-red-900/50 bg-slate-950/80 p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-red-400 font-doto flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      {modoFormularioMarca === "crear"
                        ? "Registrar Nueva Marca"
                        : `Editar Marca: ${marcaEditando?.nombre || ""}`}
                    </h4>
                    <button
                      type="button"
                      onClick={cancelarFormularioMarca}
                      disabled={guardandoMarca}
                      className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  <form onSubmit={guardarMarca} className="space-y-3" noValidate>
                    <div className="space-y-3">
                      <div>
                        <label htmlFor={idMarcaNombreInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Nombre de la Marca <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={idMarcaNombreInput}
                          type="text"
                          maxLength={100}
                          value={formMarcaNombre}
                          onChange={(e) => setFormMarcaNombre(e.target.value)}
                          disabled={guardandoMarca}
                          placeholder="Ej: Nothing, Apple, Samsung, Xiaomi..."
                          className={`w-full rounded-lg bg-slate-900 border px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                            erroresFormMarca.nombre
                              ? "border-red-500 focus:ring-red-500"
                              : "border-slate-800 focus:border-red-600 focus:ring-red-600"
                          }`}
                        />
                        {erroresFormMarca.nombre && (
                          <p className="mt-1 text-[10px] text-red-400">{erroresFormMarca.nombre}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor={idMarcaDescInput} className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Descripción
                        </label>
                        <textarea
                          id={idMarcaDescInput}
                          rows={2}
                          value={formMarcaDescripcion}
                          onChange={(e) => setFormMarcaDescripcion(e.target.value)}
                          disabled={guardandoMarca}
                          placeholder="Información sobre la marca, sede o perfil tecnológico..."
                          className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={cancelarFormularioMarca}
                        disabled={guardandoMarca}
                        className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-1.5 text-xs text-slate-300 font-doto uppercase transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardandoMarca}
                        className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {guardandoMarca ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                            Guardando...
                          </>
                        ) : modoFormularioMarca === "crear" ? (
                          "Crear Marca"
                        ) : (
                          "Guardar Cambios"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Listado de Marcas */}
              {cargando ? (
                <div className="py-12 text-center text-slate-400 font-mono animate-pulse">
                  Consultando catálogo de marcas con el servidor...
                </div>
              ) : marcas.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center space-y-3">
                  <p className="text-slate-400 text-xs">
                    No hay marcas registradas en el catálogo.
                  </p>
                  {modoFormularioMarca === "ninguno" && (
                    <button
                      type="button"
                      onClick={abrirCrearMarca}
                      className="rounded-lg bg-red-600 hover:bg-red-500 px-3.5 py-1.5 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer inline-block"
                    >
                      Registrar Primera Marca
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-doto">
                      <tr>
                        <th className="py-2.5 px-3">ID</th>
                        <th className="py-2.5 px-3">Nombre</th>
                        <th className="py-2.5 px-3">Descripción</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {marcas.map((m) => (
                        <tr key={m.idMarca} className="hover:bg-slate-900/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                            #{m.idMarca}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">
                            {m.nombre}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-sm">
                            {m.descripcion || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded border border-emerald-900/60 bg-emerald-950/40 text-emerald-400 text-[10px] font-mono">
                              Activa
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => abrirEditarMarca(m)}
                                disabled={guardandoMarca || eliminandoMarca}
                                aria-label={`Editar ${m.nombre}`}
                                className="px-2 py-1 rounded text-[10px] font-bold uppercase font-doto text-amber-400 hover:text-amber-200 border border-amber-900/40 hover:bg-amber-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => setMarcaEliminando(m)}
                                disabled={guardandoMarca || eliminandoMarca}
                                aria-label={`Eliminar ${m.nombre}`}
                                className="px-2 py-1 rounded text-[10px] font-bold uppercase font-doto text-red-400 hover:text-red-200 border border-red-900/40 hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DIÁLOGO ACCESIBLE DE CONFIRMACIÓN DE ELIMINACIÓN DE PRODUCTO */}
        {productoEliminando && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-eliminar"
            aria-describedby="desc-confirmar-eliminar"
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-100"
          >
            <div className="w-full max-w-md rounded-xl border border-red-800 bg-slate-900 p-5 shadow-2xl text-slate-100 font-mono">
              <div className="flex items-center gap-2 text-red-500 mb-3">
                <span className="text-lg">⚠️</span>
                <h4 id="titulo-confirmar-eliminar" className="font-bold text-sm uppercase font-doto text-white">
                  Confirmar Eliminación de Producto
                </h4>
              </div>
              <p id="desc-confirmar-eliminar" className="text-xs text-slate-300 mb-2 leading-relaxed">
                ¿Estás seguro de que deseas eliminar el producto{" "}
                <strong className="text-white font-bold">&ldquo;{productoEliminando.nombre}&rdquo;</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                El backend ejecutará un borrado lógico (estado inactivo) y retornará HTTP 204 No Content.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setProductoEliminando(null)}
                  disabled={eliminando}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-doto uppercase transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarEliminacionProducto}
                  disabled={eliminando}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-bold font-doto uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {eliminando ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar Producto"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIÁLOGO ACCESIBLE DE CONFIRMACIÓN DE ELIMINACIÓN DE CATEGORÍA */}
        {categoriaEliminando && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-eliminar-cat"
            aria-describedby="desc-confirmar-eliminar-cat"
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-100"
          >
            <div className="w-full max-w-md rounded-xl border border-red-800 bg-slate-900 p-5 shadow-2xl text-slate-100 font-mono">
              <div className="flex items-center gap-2 text-red-500 mb-3">
                <span className="text-lg">⚠️</span>
                <h4 id="titulo-confirmar-eliminar-cat" className="font-bold text-sm uppercase font-doto text-white">
                  Confirmar Eliminación de Categoría
                </h4>
              </div>
              <p id="desc-confirmar-eliminar-cat" className="text-xs text-slate-300 mb-2 leading-relaxed">
                ¿Estás seguro de que deseas eliminar la categoría{" "}
                <strong className="text-white font-bold">&ldquo;{categoriaEliminando.nombre}&rdquo;</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                El backend ejecutará un borrado lógico (estado inactivo) para conservar la integridad referencial de los productos asociados.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoriaEliminando(null)}
                  disabled={eliminandoCat}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-doto uppercase transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarEliminacionCategoria}
                  disabled={eliminandoCat}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-bold font-doto uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {eliminandoCat ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar Categoría"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIÁLOGO ACCESIBLE DE CONFIRMACIÓN DE ELIMINACIÓN DE MARCA */}
        {marcaEliminando && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-confirmar-eliminar-marca"
            aria-describedby="desc-confirmar-eliminar-marca"
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-100"
          >
            <div className="w-full max-w-md rounded-xl border border-red-800 bg-slate-900 p-5 shadow-2xl text-slate-100 font-mono">
              <div className="flex items-center gap-2 text-red-500 mb-3">
                <span className="text-lg">⚠️</span>
                <h4 id="titulo-confirmar-eliminar-marca" className="font-bold text-sm uppercase font-doto text-white">
                  Confirmar Eliminación de Marca
                </h4>
              </div>
              <p id="desc-confirmar-eliminar-marca" className="text-xs text-slate-300 mb-2 leading-relaxed">
                ¿Estás seguro de que deseas eliminar la marca{" "}
                <strong className="text-white font-bold">&ldquo;{marcaEliminando.nombre}&rdquo;</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mb-4">
                El backend ejecutará un borrado lógico (estado inactivo) para conservar la integridad referencial de los productos asociados.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMarcaEliminando(null)}
                  disabled={eliminandoMarca}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-doto uppercase transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarEliminacionMarca}
                  disabled={eliminandoMarca}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs text-white font-bold font-doto uppercase transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {eliminandoMarca ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-white animate-ping"></span>
                      Eliminando...
                    </>
                  ) : (
                    "Eliminar Marca"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pie del modal */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500 font-mono">
            TecReview // Módulo administrativo verificado
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white uppercase tracking-wider font-doto transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
