## What changed

## How it was verified

## GitHub Pages checklist

GitHub Pages serves the **root of `main`**, and `index.html` loads the pre-compiled
`bundle/app.js`. Before merging:

- [ ] `npm run build` ran cleanly and `bundle/app.js`, `bundle/app.css` and
      `404.html` are committed (CI fails the build if they are stale).
- [ ] The `Request a GitHub Pages build` workflow run finished with
      `Pages build requested.` — check Settings → Pages → *Last build* points at
      the merge commit, not an older one.
