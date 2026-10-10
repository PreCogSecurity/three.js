/**
 * @fileoverview Regression specs for THREE.WebGLRenderer context creation.
 *
 * When no WebGL context could be obtained the renderer used to `throw` a bare
 * string inside a `try` block that caught and only logged it. Construction then
 * continued with a `null` GL context and blew up several frames later inside
 * `WebGLExtensions` with an unrelated TypeError.
 *
 * These specs use a canvas whose `getContext()` returns `null`, which is exactly
 * what a head-less environment ( CI, server side rendering, blocked GPU ) does.
 */

'use strict';

QUnit.module( 'WebGLRenderer', {

	beforeEach: function () {

		this.canvas = document.createElement( 'canvas' );
		this.canvas.getContext = function () {

			return null;

		};

	}

} );

QUnit.test( 'throws a typed, coded error when no context can be created', function ( assert ) {

	var thrown = null;

	try {

		new THREE.WebGLRenderer( { canvas: this.canvas } );

	} catch ( error ) {

		thrown = error;

	}

	assert.ok( thrown !== null, 'construction failed loudly instead of continuing' );
	assert.ok( thrown instanceof THREE.ThreeError, 'error is a THREE.ThreeError' );
	assert.ok( thrown instanceof Error, 'error is an Error (not a bare string)' );
	assert.strictEqual( thrown.code, THREE.ThreeError.CODES.CONTEXT_CREATION_FAILED, 'error carries a stable code' );
	assert.ok( /WebGL context/.test( thrown.message ), 'message names the failing step' );

} );

QUnit.test( 'assert.throws recognises the error type', function ( assert ) {

	var canvas = this.canvas;

	assert.throws( function () {

		new THREE.WebGLRenderer( { canvas: canvas } );

	}, THREE.ThreeError );

} );
