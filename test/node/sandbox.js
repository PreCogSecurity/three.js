/**
 * @fileoverview Head-less browser environment for the three.js unit tests.
 *
 * The specs ( and a handful of `src/` modules ) reference a small, well known
 * slice of the DOM API. Rather than pulling in jsdom -- which would add a heavy
 * dependency tree that has to be installed before `npm test` can even start --
 * this module provides minimal, honest stubs.
 *
 * Everything here lives inside a dedicated `vm` context created by
 * `test/node/run.js`, so nothing leaks into the Node.js process or into the
 * library itself.
 */

'use strict';

// -----------------------------------------------------------------------------
// DOM stubs
// -----------------------------------------------------------------------------

function createElement( tagName ) {

	var element = {
		nodeName: String( tagName ).toUpperCase(),
		tagName: String( tagName ).toUpperCase(),
		style: {},
		children: [],
		parentNode: null,
		attributes: {},
		width: 300,
		height: 150,
		clientWidth: 300,
		clientHeight: 150,
		appendChild: function ( child ) {

			element.children.push( child );
			if ( child ) child.parentNode = element;
			return child;

		},
		removeChild: function ( child ) {

			var index = element.children.indexOf( child );
			if ( index !== - 1 ) element.children.splice( index, 1 );
			return child;

		},
		insertBefore: function ( child ) {

			return element.appendChild( child );

		},
		setAttribute: function ( name, value ) {

			element.attributes[ name ] = value;

		},
		getAttribute: function ( name ) {

			return Object.prototype.hasOwnProperty.call( element.attributes, name ) ? element.attributes[ name ] : null;

		},
		removeAttribute: function ( name ) {

			delete element.attributes[ name ];

		},
		addEventListener: function () {},
		removeEventListener: function () {},
		dispatchEvent: function () {

			return true;

		},
		getBoundingClientRect: function () {

			return { left: 0, top: 0, right: element.width, bottom: element.height, width: element.width, height: element.height };

		},
		focus: function () {},
		blur: function () {}
	};

	// A canvas without a WebGL backend: `getContext()` returns null so that code
	// paths which need a GPU fail loudly in the report instead of hanging.
	element.getContext = function () {

		return null;

	};

	return element;

}

function createDocument() {

	return {
		nodeName: '#document',
		documentElement: createElement( 'html' ),
		body: createElement( 'body' ),
		head: createElement( 'head' ),
		createElement: createElement,
		createElementNS: function ( ns, tagName ) {

			return createElement( tagName );

		},
		createTextNode: function ( text ) {

			return { nodeValue: text };

		},
		getElementById: function () {

			return null;

		},
		getElementsByTagName: function () {

			return [];

		},
		querySelector: function () {

			return null;

		},
		querySelectorAll: function () {

			return [];

		},
		addEventListener: function () {},
		removeEventListener: function () {}
	};

}

function createWindow( document ) {

	var listeners = {};

	var window = {
		document: document,
		navigator: { userAgent: 'node.js', appVersion: 'node.js' },
		location: { href: 'file:///test/unit/', protocol: 'file:', host: '', pathname: '/test/unit/', search: '' },
		devicePixelRatio: 1,
		innerWidth: 1024,
		innerHeight: 768,
		performance: { now: function () {

			return Date.now();

		} },
		addEventListener: function ( type, handler ) {

			( listeners[ type ] = listeners[ type ] || [] ).push( handler );

		},
		removeEventListener: function ( type, handler ) {

			var handlers = listeners[ type ] || [];
			var index = handlers.indexOf( handler );
			if ( index !== - 1 ) handlers.splice( index, 1 );

		},
		dispatchEvent: function () {

			return true;

		},
		requestAnimationFrame: function ( callback ) {

			return setTimeout( function () {

				callback( Date.now() );

			}, 16 );

		},
		cancelAnimationFrame: function ( handle ) {

			clearTimeout( handle );

		}
	};

	window.window = window;
	window.self = window;
	window.top = window;
	window.parent = window;

	return window;

}

// -----------------------------------------------------------------------------

/**
 * Builds the base globals shared by `src/` files and spec files.
 * @return {object}
 */
function createBrowserGlobals() {

	var document = createDocument();
	var window = createWindow( document );

	var globals = {
		console: console,
		document: document,
		navigator: window.navigator,
		location: window.location,
		performance: window.performance,
		setTimeout: setTimeout,
		clearTimeout: clearTimeout,
		setInterval: setInterval,
		clearInterval: clearInterval,
		// `_` is installed by run.js from the shared test/unit/lodash-shim.js.
		Image: function Image() {

			return { width: 0, height: 0, addEventListener: function () {}, removeEventListener: function () {}, setAttribute: function () {} };

		},
		Audio: function Audio() {

			return { addEventListener: function () {}, removeEventListener: function () {}, play: function () {}, connect: function () {} };

		},
		Float32Array: Float32Array,
		Uint16Array: Uint16Array,
		Uint32Array: Uint32Array,
		Int16Array: Int16Array,
		Int32Array: Int32Array,
		Uint8Array: Uint8Array,
		Uint8ClampedArray: Uint8ClampedArray,
		Int8Array: Int8Array
	};

	Object.keys( window ).forEach( function ( key ) {

		if ( ! ( key in globals ) ) globals[ key ] = window[ key ];

	} );

	globals.self = window;

	return globals;

}

module.exports = {
	createBrowserGlobals: createBrowserGlobals,
	createDocument: createDocument
};
