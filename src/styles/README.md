## styles

Place for global styles/tokens (Tailwind layers, CSS variables, shared animations).

Current entrypoints:
- `src/index.css` (global)
- `src/App.css` (legacy app styles)

Safe refactor approach: we’ll migrate gradually to files under `src/styles/` without breaking imports.

