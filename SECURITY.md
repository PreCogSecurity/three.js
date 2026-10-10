# Security Policy

## Supported versions

This repository is a fork of three.js r73. Security fixes are applied to the
`default` branch and are released with the next version bump; older revisions
are not patched.

| Version | Supported |
| --- | --- |
| `default` branch (r73+) | yes |
| anything older | no |

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Report it privately through GitHub's *Report a vulnerability* button on the
**Security** tab of the repository, or by email to the maintainers. Please
include:

* the revision (`THREE.REVISION`) and, if applicable, the built bundle name;
* a minimal reproduction (model file, texture or script);
* the impact you observed (denial of service, information disclosure, ...);
* the browsers/Node versions you tested.

We aim to acknowledge a report within three business days and to ship a fix or
a mitigation plan within thirty days. We will credit you in the release notes
unless you prefer otherwise.

## Threat model

three.js is a rendering library that runs in the browser. It has **no runtime
dependencies**, no network services of its own and no authentication surface,
so the interesting attack surface is *untrusted asset data*:

| Input | Entry point |
| --- | --- |
| `.json` models / scenes | `THREE.JSONLoader`, `THREE.ObjectLoader` |
| Mesh / geometry files | `THREE.Loader` helpers used by the JSON loaders |
| Textures | `THREE.TextureLoader`, `THREE.ImageLoader` |
| GLSL shader sources | `THREE.WebGLProgram`, `THREE.WebGLShader` |

Assets are routinely fetched from third-party CDNs or supplied by end users, so
they must be treated as hostile input. The loaders therefore:

* reject structurally invalid payloads with a coded `THREE.ThreeError` instead
  of dereferencing `undefined`;
* key their lookup maps with `Object.create( null )`, so a crafted `uuid` such
  as `__proto__` or `constructor` cannot resolve to, or overwrite, anything
  inherited from `Object.prototype`;
* iterate own properties only when walking a model's `children`, so a polluted
  `Object.prototype` cannot graft extra objects into the scene graph.

### Guidance for applications

* Validate model files **before** handing them to a loader if they come from an
  untrusted source; reject files above a size/vertex budget of your choosing.
* Fetch assets over HTTPS, and set `crossOrigin` explicitly when textures are
  served from another origin.
* Do not build `ShaderMaterial` sources from user input without a strict GLSL
  allow-list. Shader compilation failures now raise
  `THREE.ThreeError` with code `WEBGL_SHADER_COMPILE_FAILED` / `WEBGL_PROGRAM_LINK_FAILED`;
  catch them so one bad material cannot take down the whole render loop.
* Deploy a `Content-Security-Policy` on pages that load three.js. The library
  itself does not use `eval`, `new Function` or inline event handlers, and the
  ESLint rule set in `.eslintrc.json` (`no-eval`, `no-implied-eval`,
  `no-new-func`, `no-script-url`, `no-proto`) keeps it that way.

## Automated checks

`.github/workflows/ci.yml` runs on every push and pull request:

* `npm run lint` — ESLint over `src/` and `test/node/`, including the
  security-oriented rules above and `no-throw-literal`;
* `npm test` — the full head-less unit suite, on every supported Node LTS line;
* `npm audit --audit-level=high` — dependency vulnerability gate.

Dependabot (`.github/dependabot.yml`) keeps npm and GitHub Actions
dependencies current.
