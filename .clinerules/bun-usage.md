# Bun Usage Rules

## Package Manager

- **Always use `bun`** for all package management and script execution
- Use `bun run` instead of `npm run`, `npx`, or `yarn`
- Use `bun x` instead of `npx` for one-off commands
- Use `bun add` instead of `npm install`
- Use `bun pm ls` for listing dependencies

## Examples

```bash
# Good
bun run dev:my-app
bun x nx typecheck
bun add -d eslint

# Bad (do not use)
npm run dev:my-app
npx nx typecheck
yarn add eslint
```
