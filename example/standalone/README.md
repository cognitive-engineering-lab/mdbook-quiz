# Standalone example

This shows how to use the `@wcrichto/quiz` package in your own standalone web page. It provides a React quiz component. To build it, install [pnpm](https://pnpm.io/) and then run:

```
pnpm exec vite build
cd dist
python3 -m http.server
```

Then visit <http://localhost:8000>.