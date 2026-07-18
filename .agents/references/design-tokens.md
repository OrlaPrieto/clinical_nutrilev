# Clinical Nutrilev - Design Tokens & Visual Styles Reference

This document catalogs the theme variables, component styles, and utility patterns of the `clinical_nutrilev` application. AI coders must strictly use these pre-defined configurations for UI modifications.

---

## 🎨 Theme Colors (CSS Variables)

Colors are reactively configured via CSS variables under the parent `.theme-*` classes in [theme.scss](file:///Users/orla09i/Desktop/Projects/clinical_nutrilev/apps/frontend/src/theme.scss).

| Variable | Description |
| :--- | :--- |
| `--nutri-rose` | Main active highlight color (e.g. Pink, Sage Green, Lavender, Amber, or Blue depending on theme). |
| `--nutri-rose-light` | Lighter hue for hover actions or highlights. |
| `--nutri-rose-soft` | Soft accent/background tint (alpha-friendly). |
| `--nutri-rose-extra` | Very soft background tint, matches card scroll rails. |
| `--nutri-bg` | Main app background (white in light mode, `#080808` or black in dark mode). |
| `--nutri-text` | Primary body text color (`#111111` or `#ffffff`). |

---

## 🧱 Component Styles (Tailwind `@layer components`)

For consistent spacing, shadows, and radii, use these Tailwind component shortcuts defined in [styles.scss](file:///Users/orla09i/Desktop/Projects/clinical_nutrilev/apps/frontend/src/styles.scss):

* **`.btn-primary`**
  * *Description:* Pulsante principal.
  * *Classes:* `bg-nutri-rose text-white px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:bg-nutri-rose/90 active:scale-95 flex items-center justify-center gap-2`
* **`.btn-secondary`**
  * *Description:* Pulsante secundario / contorno.
  * *Classes:* `bg-white text-nutri-rose border-2 border-nutri-rose px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:bg-nutri-rose/5 active:scale-95 flex items-center justify-center gap-2`
* **`.card-nutri`**
  * *Description:* Tarjetas clínicas principales de contenido.
  * *Classes:* `bg-white dark:bg-[#111111] rounded-4xl shadow-nutri border border-nutri-rose/10 p-6 transition-all duration-300 hover:border-nutri-rose/30`
* **`.input-nutri`**
  * *Description:* Estilo de inputs de texto y selectores.
  * *Classes:* `w-full bg-white dark:bg-white/5 border-2 border-nutri-rose/10 rounded-2xl px-6 py-4 outline-none transition-all duration-300 focus:border-nutri-rose/40 focus:ring-4 focus:ring-nutri-rose/5`
* **`.modal-overlay`**
  * *Description:* Fondo opaco detrás de modales.
  * *Classes:* `fixed inset-0 bg-nutri-text/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300`
* **`.modal-content`**
  * *Description:* Contenedor interno del modal.
  * *Classes:* `bg-nutri-bg w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-5xl shadow-2xl relative animate-fade-up`

---

## ⚡ Animations (CSS Utilities)

* **`.animate-fade-up`** -> Fades in and slides up from 20px offset.
* **`.animate-fade-in`** -> Fades in opacity smoothly.
* **`.animate-scale-up`** -> Spring scale-up from `scale(0.95)` to `scale(1)`.
