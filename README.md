three.js
========

#### JavaScript 3D library ####

The aim of the project is to create a lightweight 3D library with a very low level of complexity — in other words, for dummies. The library provides &lt;canvas&gt;, &lt;svg&gt;, CSS3D and WebGL renderers.

[Examples](http://threejs.org/examples/) — [Documentation](http://threejs.org/docs/) — [Migrating](https://github.com/mrdoob/three.js/wiki/Migration) — [Help](http://stackoverflow.com/questions/tagged/three.js)


### Usage ###

Download the [minified library](http://threejs.org/build/three.min.js) and include it in your html.
Alternatively see [how to build the library yourself](https://github.com/mrdoob/three.js/wiki/build.py,-or-how-to-generate-a-compressed-Three.js-file).

```html
<script src="js/three.min.js"></script>
```

This code creates a scene, a camera, and a geometric cube, and it adds the cube to the scene. It then creates a `WebGL` renderer for the scene and camera, and it adds that viewport to the document.body element. Finally it animates the cube within the scene for the camera.

```html
<script>

	var scene, camera, renderer;
	var geometry, material, mesh;

	init();
	animate();

	function init() {

		scene = new THREE.Scene();
		
		camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
		camera.position.z = 1000;

		geometry = new THREE.BoxGeometry( 200, 200, 200 );
		material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );

		mesh = new THREE.Mesh( geometry, material );
		scene.add( mesh );

		renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );

		document.body.appendChild( renderer.domElement );

	}

	function animate() {

		requestAnimationFrame( animate );

		mesh.rotation.x += 0.01;
		mesh.rotation.y += 0.02;

		renderer.render( scene, camera );

	}

</script>
```
If everything went well you should see [this](http://jsfiddle.net/f17Lz5ux/).

### Change log ###

[releases](https://github.com/mrdoob/three.js/releases)

### Installing from source ###

three.js has **no runtime dependencies** — `src/` is plain ES3/ES5 JavaScript
and `build/three.js` is a self-contained bundle. Cloning and using the library
requires nothing but the source tree.

```bash
git clone https://github.com/mrdoob/three.js.git
```

### Building, testing and linting ###

Development tooling (Node.js only) is declared in `package.json` and pinned by
`package-lock.json`. A Node LTS release is expected; `.nvmrc` records the
version used by CI.

```bash
nvm use        # optional: honours .nvmrc
npm ci         # reproducible install (no lockfile drift, no global tools)

npm test       # head-less unit suite -- runs every spec under test/unit/
npm run lint   # ESLint over src/ and test/node/
```

`npm test` runs the QUnit specs inside a sandboxed Node context (`test/node/`)
against the sources in `src/`. It needs no browser, no headless Chrome and no
network access, and it exits non-zero as soon as an assertion fails.

```bash
node test/node/run.js --filter=math   # run a subset
```

Both commands are enforced on every push and pull request by
[`.github/workflows/ci.yml`](.github/workflows/ci.yml), which also runs the
suite on every supported Node LTS line and gates on `npm audit`. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the full development workflow and for how
to add a spec.

### Repository layout ###

| Path | Contents |
| --- | --- |
| `src/` | Library source. This is what `npm test` and CI exercise. |
| `build/` | Generated bundles (`three.js`, `three.min.js`), produced by `utils/build/build.py` at release time. |
| `test/unit/` | QUnit specs plus the browser harnesses `unittests_*.html`. New specs are auto-discovered. |
| `test/node/` | Dependency-free head-less runner used by `npm test`. |
| `examples/` | Example scenes and the vendored example-only libraries. |
| `editor/` | The web editor, including its vendored CodeMirror/Tern bundles. |
| `docs/` | Generated API documentation. |
| `utils/` | Build, export and converter tooling. Not shipped to browsers. |

Vendored third-party bundles (CodeMirror, Tern, esprima, acorn, the Collada and
CTM loaders, ...) live under `editor/js/libs/` and `examples/js/libs/`. They are
third-party code, are excluded from linting via `.eslintignore`, and are not
maintained here.

### Error handling ###

Fatal conditions raise `THREE.ThreeError`, a real `Error` carrying a stable,
machine-readable `code`:

```js
try {

    renderer = new THREE.WebGLRenderer();

} catch ( error ) {

    if ( error instanceof THREE.ThreeError && error.code === THREE.ThreeError.CODES.CONTEXT_CREATION_FAILED ) {

        // fall back to a software renderer, show a message, ...

    }

    throw error;

}
```

The available codes are listed in `THREE.ThreeError.CODES`
(`src/core/ThreeError.js`). Match on `code`, never on the human readable
`message`, which may change between releases.

### Security ###

Please read [SECURITY.md](SECURITY.md) before reporting a vulnerability.
