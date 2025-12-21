# Voltra

![Voltra Logo Inverse 2025.svg](https://docs.voltra.app/images/Voltra%20Logo%20Inverse%202025.svg "Voltra")

<style>

.nav-button {
  background: linear-gradient(145deg, #b285c9, #5e3a76); color: white; border: none; border-radius: 50px; padding:
15px 30px; font-size: 18px; font-weight: bold; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0
8px 15px rgba(0, 0, 0, 0.1); transition: all 0.3s ease; cursor: pointer; text-decoration: none; display: inline-block;"
onmouseover="this.style.background='linear-gradient(145deg, #a374b9, #4d2d61)'; this.style.boxShadow='0 6px 8px rgba(0,
0, 0, 0.2), 0 12px 20px rgba(0, 0, 0, 0.2)'; this.style.transform='translateY(-2px)';" onmouseout="
this.style.background='linear-gradient(145deg, #b285c9, #5e3a76)'; this.style.boxShadow='0 4px 6px rgba(0, 0, 0, 0.1), 0
8px 15px rgba(0, 0, 0, 0.1)'; this.style.transform='translateY(0)';
}

</style>

------------

<a class="nav-button" href="https://docs.voltra.app">See The Demos</a>

## Usage

### Install

```bash
yarn add @resistdesign/voltra
```

## With our powers combined!

<table style="border: 0 solid black;">
<tbody>
<tr>
<td>Voltra is a state-of-the-art platform designed to streamline the creation of cloud infrastructure and complex web
applications. It features a robust API with RPC, CORS, and versatile authentication options, alongside dynamic app
development tools like TypeScript-driven form generation. The platform excels in Infrastructure as Code (IaC), offering
features like chainable stacks and comprehensive parameter support. Its intuitive interface simplifies the addition of
databases, storage, authentication, and functions through easy-to-use packs. Furthermore, Voltra enhances development
workflows with advanced state management, and a smart, lightweight routing system for React
front-end apps.</td>
<td><img src="https://docs.voltra.app/images/Voltra%20Robot%20Coming%20Together.png" style="width: 200em;" /></td>
</tr>
</tbody>
</table>

## Features

| API                                                                         | App                                           | IaC                                                           |
|-----------------------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------------|
| RPC                                                                         | Easy Layout                                   | Full Parameter Support: Groups/Labels/Types/etc...            |
| Auth: Public/Secured/Role Based                                             | State Management                              | Packs: Easy to add Database/Storage/Auth/Functions/etc...     |
| Routing: Nesting/Handlers/Injected Handlers                                 | Routing: Param Handlers/Parallel Routes/Hooks | Utilities: Patching Stacks/Constants/Standard Includes/etc... |
| ORM: TypeScript Type Driven Auto-generated Data Contexts with Relationships |                                               | Typed Build Spec Creation                                     |
|                                                                             |                                               | Typed Resource Parameters                                     |

## Releasing

Voltra publishes npm packages from GitHub Releases. The release tag is used verbatim
as the npm package version, so it must be valid SemVer without a leading `v`.

### Stable releases

Use tags like:

```
3.0.0
```

### Pre-releases (alpha, beta, rc)

Use tags like:

```
3.0.0-alpha.0
3.0.0-beta.1
3.0.0-rc.1
```

When the GitHub Release is marked as a prerelease, the npm publish step uses the
`next` dist-tag instead of `latest`. Consumers can install prereleases with:

```bash
npm install @resistdesign/voltra@next
```
