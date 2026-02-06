# URGENT FIX TYPEDOC CONFIG

After executing the plan `planning/complete/plan_remove_root_entry_src_index.md`, TypeDoc now has the wrong entrypoint for documentation and produces almost nothing.

I think that each of the exports in package.json are going to need to be entry points.

## Checklist

- [x] Compare `typedoc.json` entry points with `package.json` export surface.
- [x] Update `typedoc.json` to use all `src/*/index.ts` entry points that map to package exports.
- [x] Run `yarn doc` to verify docs generation is restored.
