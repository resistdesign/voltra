# Plan: IaC Pack Declaration-Level Grouping for TypeDoc

## Goal
Make TypeDoc render visible group headings for IaC pack functions by placing `@group` tags on pack function declarations (not only re-export barrels).

## Checklist
- [x] Add `@group Resource Packs` to all exported IaC pack function declarations (`add*`) under `src/iac/packs/**`
- [x] Keep utility/constants exports unchanged unless they are actual packs
- [x] Run `yarn doc` and confirm docs build remains clean

## Run Status
- [x] Complete
