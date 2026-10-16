# stride — project management

`npm run dev` starts the app **and** its backend: a Vite plugin
(`server/plugin.ts`) serves the API at `/api` from the same origin, so there is
no second process to run.

## First run

A new install has no data. The first person to open the app sees **Set up your
workspace**: they name the workspace and create their account, which becomes the
**workspace owner**. Setup is only possible while no account exists.

From there the owner (and any admin) adds people on **Team & settings → Add
people**. There is no email in this product, so each new account gets a
one-time password, shown once, for the admin to pass on. The person signs in
with it and must choose their own password before they can continue. Admins can
also reset a password or deactivate an account from the member's ⋮ menu.

## Roles

Defined once in `src/shared/rbac.ts`. The server enforces them on every request,
and the UI uses the same table to hide or disable what a role can't do.

| Role | Can |
| --- | --- |
| Owner | Everything, including making and managing admins. There is one. |
| Admin | Add and manage members and viewers, projects, sprints, tasks |
| Member | Create and edit tasks, comment |
| Viewer | Read only |

## Data

Everything is saved to `server/.data/db.json` after each change. To start over
as a brand-new install, stop the server and delete `server/.data/`.

For screenshots, starting the server with `PMS_DEV_AUTOLOGIN=1` enables
`/api/dev/login-as?email=…&next=/path`, a password-less sign-in. It is off by
default; never set it anywhere real.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
