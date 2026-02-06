# EasyLayout Demo Pico Cleanup

## Goals
- Remove unnecessary custom styling from `site/app/src/client/EasyLayoutDemo.tsx`.
- Use normal semantic elements and let Pico CSS provide the look.
- Keep the demo behavior unchanged for web layout preview and native coordinate output.

## Checklist
- [x] Replace styled-components wrappers with plain elements.
- [x] Preserve Web/Native demo content while removing custom visual theming styles.
- [x] Verify the file compiles in the site app TypeScript project. (Focused check run; only unrelated pre-existing TS2732 remains in `site/common/DemoTypeInfoMap.ts`.)

## Follow-up
- [x] Add elegant borders to each EasyLayout area using Pico theme variables.
- [x] Keep markup simple while making area boundaries visually clear.
- [x] Add a template textarea playground driven by component state.
- [x] Memoize web/native layout generation from the current template input.
- [x] Render web areas and native coords dynamically from generated layout data.
- [x] Handle invalid template input gracefully without breaking demo rendering.
- [x] Explicitly demo web output by showing generated web areas and CSS details.
- [x] Drive rendered web area components from web template details instead of native area names.
