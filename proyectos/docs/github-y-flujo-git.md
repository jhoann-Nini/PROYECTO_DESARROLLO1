# GitHub y flujo de trabajo con Git

## 1. Información general

**Proyecto:** TecnoReview  
**Repositorio:** PROYECTO_DESARROLLO1  
**Plataforma:** GitHub  
**Sistema de control de versiones:** Git  
**Rama principal:** `main`  
**Estado:** En desarrollo

Repositorio oficial:

https://github.com/jhoann-Nini/PROYECTO_DESARROLLO1.git

---

## 2. Objetivo

Este documento establece las reglas para el uso de Git y GitHub durante el desarrollo de TecnoReview.

Su propósito es:

- Mantener un historial organizado de cambios.
- Evitar modificaciones accidentales en la rama `main`.
- Permitir que cada integrante trabaje de manera independiente.
- Facilitar la integración del trabajo mediante Pull Requests.
- Registrar quién realizó cada cambio.
- Reducir conflictos entre los integrantes.
- Mantener el código del proyecto organizado.
- Facilitar la recuperación de versiones anteriores.

---

## 3. Repositorio principal

El proyecto utiliza un repositorio central en GitHub.

La estructura general de trabajo será:

```text
GitHub
   │
   └── main
        │
        ├── rama de Adrian S
        ├── rama de Miguel A
        ├── rama de Estevan
        ├── rama de Adrian V
        ├── rama de Adrian C
        └── rama de NINI
```

### Lo más importante para ustedes

Para tu responsabilidad concreta, yo dejaría estas **5 reglas como obligatorias**:

1. **Nadie hace `push` directo a `main`.**
2. **Cada integrante trabaja en su rama.**
3. **Todo cambio importante entra mediante Pull Request.**
4. **Antes del Merge se revisa que funcione y que no rompa lo existente.**
5. **Nunca subir `.env`, contraseñas ni claves de Supabase/Google.**
