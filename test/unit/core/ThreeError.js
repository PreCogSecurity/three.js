/**
 * @fileoverview Regression specs for the typed error type.
 *
 * three.js used to `throw` bare string literals. A string throw is invisible
 * to `instanceof Error`, carries no stack, and cannot be branched on by the
 * host application. `THREE.ThreeError` restores all three.
 */

'use strict';

QUnit.module( 'ThreeError' );

QUnit.test( 'is a real Error', function ( assert ) {

	var error = new THREE.ThreeError( 'boom', 'SOME_CODE' );

	assert.ok( error instanceof THREE.ThreeError, 'instanceof THREE.ThreeError' );
	assert.ok( error instanceof Error, 'instanceof Error' );
	assert.ok( typeof error.stack === 'string' && error.stack.length > 0, 'carries a stack trace' );

} );

QUnit.test( 'exposes name, message and code', function ( assert ) {

	var error = new THREE.ThreeError( 'boom', 'SOME_CODE', { hint: 42 } );

	assert.strictEqual( error.name, 'THREE.ThreeError', 'name' );
	assert.strictEqual( error.message, 'boom', 'message' );
	assert.strictEqual( error.code, 'SOME_CODE', 'code' );
	assert.strictEqual( error.details.hint, 42, 'details payload' );

	assert.strictEqual( new THREE.ThreeError().code, 'THREE_UNKNOWN', 'code defaults to a known sentinel' );
	assert.strictEqual( new THREE.ThreeError().message, 'Unspecified three.js error.', 'message defaults' );
	assert.strictEqual( new THREE.ThreeError( 'x', 'Y' ).details, undefined, 'details is omitted when not supplied' );

} );

QUnit.test( 'toString is stable and includes the code', function ( assert ) {

	var text = new THREE.ThreeError( 'boom', 'SOME_CODE' ).toString();

	assert.strictEqual( text, 'THREE.ThreeError [SOME_CODE]: boom' );

} );

QUnit.test( 'codes are stable identifiers', function ( assert ) {

	var codes = THREE.ThreeError.CODES;

	assert.strictEqual( codes.CONTEXT_CREATION_FAILED, 'WEBGL_CONTEXT_CREATION_FAILED' );
	assert.strictEqual( codes.SHADER_COMPILE_FAILED, 'WEBGL_SHADER_COMPILE_FAILED' );
	assert.strictEqual( codes.PROGRAM_LINK_FAILED, 'WEBGL_PROGRAM_LINK_FAILED' );
	assert.strictEqual( codes.INVALID_JSON, 'INVALID_JSON' );

} );

QUnit.test( 'survives being thrown and caught', function ( assert ) {

	var caught = null;

	try {

		throw new THREE.ThreeError( 'boom', 'SOME_CODE' );

	} catch ( error ) {

		caught = error;

	}

	assert.ok( caught instanceof THREE.ThreeError, 'caught the typed error' );
	assert.strictEqual( caught.code, 'SOME_CODE', 'code survives the round trip' );

} );
