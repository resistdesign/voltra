# Voltra

![Voltra Gem Logo 2024 Square.png](https://docs.voltra.app/images/Voltra%20Gem%20Logo%202024%20Square.png "Voltra")

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
<td><img src="https://docs.voltra.app/images/crystal-mountain.png" style="width: 200em;" /></td>
</tr>
</tbody>
</table>

## Features

| API                                                                         | App                                           | IaC                                                           |
|-----------------------------------------------------------------------------|-----------------------------------------------|---------------------------------------------------------------|
| RPC                                                                         | Form Generation: TypeScript Type Driven       | Chainable Stacks                                              |
| CORS                                                                        | Easy Layout                                   | Full Parameter Support: Groups/Labels/Types/etc...            |
| Auth: Public/Secured/Role Based                                             | State Management                              | Packs: Easy to add Database/Storage/Auth/Functions/etc...     |
| Routing: Nesting/Handlers/Injected Handlers                                 | Routing: Param Handlers/Parallel Routes/Hooks | Utilities: Patching Stacks/Constants/Standard Includes/etc... |
| ORM: TypeScript Type Driven Auto-generated Data Contexts with Relationships |                                               | Typed Build Spec Creation                                     |
|                                                                             |                                               | Typed Resource Parameters                                     |

## App TODO:

### Input types:

- [x] string
- [ ] specific string types (e.g. email, phone number, long text, etc.)
- [x] number
- [x] boolean
- Primitive options selection:
- [x] option selector
- [x] option selector w/ custom value
- [x] option selector w/search
- [x] option selector w/search w/ custom value

- ---

- Advanced input types:

- ---

- [x] custom (i.e. date picker)
- [ ] default/JSON editor
- Designate primary field for object selection:
- Object search form???
- [ ] existing object selector
- [ ] existing object selector multiple
- [ ] existing object selector w/ search
- [ ] existing object selector w/ advanced search (Advanced object field query)

- ---

- [ ] new object forms and sub-forms

- ---

- [ ] array of all of the above

### TypeInfoForm:

- [x] labels
- [ ] arrays
- [ ] navigation to sub-types
- [ ] advanced input types, including custom
- [ ] universal field change handler*
- [ ] validation
