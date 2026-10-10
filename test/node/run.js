#!/usr/bin/env node
/**
 * @fileoverview Head-less unit test runner for three.js.
 *
 * Runs every spec under `test/unit` against the library sources in `src/` (not
 * the pre-built `build/three.js`), inside a sandboxed `vm` context, with no
 * third-party dependencies. This is what `npm test` and CI invoke.
 *
 * Usage:
 *   node test/node/run.js                 # run everything
 *   node test/node/run.js --filter=Vector # only spec files whose path matches
 *
 * Exits with 0 when every assertion passed and 1 otherwise.
 *
 * @author BlueHound / PreCog Security
 */

'use strict';

var fs = require( 'fs' );
var path = require( 'path' );
var vm = require( 'vm' );

var createQUnit = require( './qunit-shim' ).createQUnit;
var createBrowserGlobals = require( './sandbox' ).createBrowserGlobals;

var ROOT = path.resolve( __dirname, '..', '..' );
var UNIT_DIR = path.join( ROOT, 'test', 'unit' );

// Support files that are not specs.
//
// `qunit-1.18.0.js` is the vendored QUnit library used by the browser harnesses
// (`test/unit/unittests_*.html`). In Node it is replaced by `./qunit-shim`,
// which implements the same (small) API, so it is never evaluated -- loading it
// would overwrite the global `QUnit` / `test` / `ok` bindings and silently
// register nothing.
//
// `math/Constants.js` holds the shared fixtures ( x, y, z, w, zero3, one3, ... )
// that the legacy math specs rely on. None of the HTML harnesses ever loaded it,
// which is why those specs could not run at all.
var SUPPORT_FILES = [
	'qunit-utils.js',
	'SmartComparer.js',
	path.join( 'math', 'Constants.js' )
];

// Shared lodash subset, loaded with `require()` rather than evaluated inside
// the sandbox: the browser harnesses pull the very same file in via a <script>
// tag, so there is exactly one implementation to keep correct.
var LODASH_SHIM = path.join( UNIT_DIR, 'lodash-shim.js' );

// Everything under test/unit that must never be treated as a spec.
var NOT_A_SPEC = SUPPORT_FILES.concat( [ 'qunit-1.18.0.js', 'lodash-shim.js' ] );


// QUnit statics that specs call in their bare form.
var QUNIT_STATICS = [
	'module', 'test', 'asyncTest', 'start', 'stop'
];

// Assertion helpers that specs call in their bare form. These are resolved
// against the *currently running* test's assert object, which is what QUnit 1.x
// does in the browser.
var BARE_ASSERTIONS = [
	'ok', 'notOk', 'equal', 'notEqual', 'strictEqual', 'notStrictEqual',
	'deepEqual', 'notDeepEqual', 'propEqual', 'throws', 'expect', 'async'
];

/**
 * Specs that genuinely require a browser (real image decoding, a WebGL
 * context). They are reported as skipped with a reason rather than silently
 * dropped, so a reader can tell the difference between "not run" and "passed".
 */
var BROWSER_ONLY = {
	'test/unit/extras/ImageUtils.test.js': 'requires a browser image loader and network access'
};



// ---------------------------------------------------------------------------

function parseArgs( argv ) {

	var options = { filter: null, verbose: false };

	argv.forEach( function ( arg ) {

		if ( arg.indexOf( '--filter=' ) === 0 ) options.filter = arg.slice( 9 );
		else if ( arg === '--verbose' || arg === '-v' ) options.verbose = true;

	} );

	return options;

}

function walk( directory, predicate, collected ) {

	collected = collected || [];

	fs.readdirSync( directory ).forEach( function ( entry ) {

		var full = path.join( directory, entry );

		if ( fs.statSync( full ).isDirectory() ) {

			walk( full, predicate, collected );

		} else if ( predicate( full ) ) {

			collected.push( full );

		}

	} );

	return collected;

}

function rel( file ) {

	return path.relative( ROOT, file ).replace( /\\/g, '/' );

}

/**
 * Reads the ordered source manifests used by `utils/build/build.py` so the
 * runner loads exactly the files the official build concatenates.
 */
function sourceManifest() {

	var includesDir = path.join( ROOT, 'utils', 'build', 'includes' );
	var order = [ 'common.json', 'extras.json', 'math.json', 'canvas.json', 'css3d.json' ];
	var seen = {};
	var files = [];

	order.forEach( function ( name ) {

		var manifest = path.join( includesDir, name );

		if ( ! fs.existsSync( manifest ) ) return;

		JSON.parse( fs.readFileSync( manifest, 'utf8' ) ).forEach( function ( entry ) {

			if ( ! /\.js$/.test( entry ) ) return;

			var full = path.join( ROOT, entry );

			if ( seen[ entry ] || ! fs.existsSync( full ) ) return;

			seen[ entry ] = true;
			files.push( full );

		} );

	} );

	return files;

}

/**
 * Specs are auto-discovered so that a new test file is picked up by `npm test`
 * immediately, instead of silently needing a manual edit to one of the HTML
 * harnesses.
 */
function discoverSpecs() {

	return walk( UNIT_DIR, function ( file ) {

		return /\.js$/.test( file ) && NOT_A_SPEC.indexOf( path.basename( file ) ) === - 1;

	} ).sort();

}

// ---------------------------------------------------------------------------

function main() {

	var options = parseArgs( process.argv.slice( 2 ) );

	var sandbox = createBrowserGlobals();
	sandbox._ = require( LODASH_SHIM );

	var context = vm.createContext( sandbox );

	var QUnit = createQUnit( {
		log: function ( line ) {

			process.stdout.write( line + '\n' );

		}
	} );

	sandbox.QUnit = QUnit;

	// NOTE: `qunit-1.18.0.js` is deliberately NOT evaluated here. The browser
	// harnesses (`test/unit/unittests_*.html`) use the real QUnit library; in
	// Node it is replaced by `./qunit-shim`. Loading the bundled library would
	// overwrite the bindings installed below and silently register no tests.

	QUNIT_STATICS.forEach( function ( name ) {

		sandbox[ name ] = function () {

			return QUnit[ name ].apply( QUnit, arguments );

		};

	} );

	BARE_ASSERTIONS.forEach( function ( name ) {

		sandbox[ name ] = function () {

			return QUnit.assert[ name ].apply( QUnit.assert, arguments );

		};

	} );

	function evaluate( file ) {

		var code = fs.readFileSync( file, 'utf8' );

		try {

			vm.runInContext( code, context, { filename: rel( file ), displayErrors: true } );

		} catch ( error ) {

			process.stderr.write( 'Failed to load ' + rel( file ) + ': ' + error.stack + '\n' );
			process.exitCode = 1;
			throw error;

		}

	}

	// 1. The library itself.
	var sources = sourceManifest();

	sources.forEach( evaluate );

	if ( typeof sandbox.THREE === 'undefined' ) {

		process.stderr.write( 'FATAL: `src/Three.js` did not define a global THREE namespace.\n' );
		process.exitCode = 1;
		return;

	}

	// 2. Test support libraries.
	SUPPORT_FILES.forEach( function ( name ) {

		var file = path.join( UNIT_DIR, name );

		if ( fs.existsSync( file ) ) evaluate( file );

	} );

	// 3. Specs.
	var specs = discoverSpecs();

	if ( options.filter ) {

		var needle = options.filter.toLowerCase();

		specs = specs.filter( function ( file ) {

			return rel( file ).toLowerCase().indexOf( needle ) !== - 1;

		} );

	}

	var skippedSpecs = [];

	specs = specs.filter( function ( file ) {

		var reason = BROWSER_ONLY[ rel( file ) ];

		if ( reason === undefined ) return true;

		skippedSpecs.push( rel( file ) + ' -- ' + reason );
		return false;

	} );

	specs.forEach( evaluate );

	process.stdout.write( '# three.js r' + sandbox.THREE.REVISION + ' -- ' + sources.length + ' sources, ' + specs.length + ' spec files\n' );
	process.stdout.write( '# ' + QUnit._tests.length + ' tests registered' + ( skippedSpecs.length ? ', ' + skippedSpecs.length + ' spec file(s) skipped (browser only)' : '' ) + '\n\n' );

	skippedSpecs.forEach( function ( line ) {

		process.stdout.write( '# SKIP ' + line + '\n' );

	} );

	QUnit.run().then( function ( results ) {

		process.stdout.write( QUnit.formatReport( results ) + '\n' );
		process.exitCode = results.failed > 0 ? 1 : 0;

	}, function ( error ) {

		process.stderr.write( 'Test runner crashed: ' + ( error && error.stack ? error.stack : error ) + '\n' );
		process.exitCode = 1;

	} );

}

main();
