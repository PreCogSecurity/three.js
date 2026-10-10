/**
 * @fileoverview Typed errors.
 *
 * Until now three.js signalled fatal conditions by `throw`-ing bare string
 * literals and writing free-form text to `console.error()`. Neither is
 * programmatically detectable: a host application cannot branch on the failure
 * kind, cannot log it as structured data, and a string throw is invisible to
 * `instanceof Error` checks and to most error reporters ( Sentry, Bugsnag,
 * ... ), which silently drop it.
 *
 * `THREE.ThreeError` is a real `Error` ( so existing `catch` blocks keep
 * working ) that additionally carries a stable, machine-readable `code` and an
 * optional `details` payload.
 *
 * @author BlueHound / PreCog Security
 */

THREE.ThreeError = function ( message, code, details ) {

	this.name = 'THREE.ThreeError';
	this.message = message || 'Unspecified three.js error.';
	this.code = code || 'THREE_UNKNOWN';

	if ( details !== undefined ) {

		this.details = details;

	}

	if ( Error.captureStackTrace ) {

		Error.captureStackTrace( this, THREE.ThreeError );

	} else {

		this.stack = ( new Error( this.message ) ).stack;

	}

};

THREE.ThreeError.prototype = Object.create( Error.prototype );
THREE.ThreeError.prototype.constructor = THREE.ThreeError;

THREE.ThreeError.prototype.toString = function () {

	return this.name + ' [' + this.code + ']: ' + this.message;

};

// Stable identifiers. Applications may switch on these; the human readable
// message is explicitly NOT part of the contract and may change at any time.
THREE.ThreeError.CODES = {

	// WebGL
	CONTEXT_CREATION_FAILED: 'WEBGL_CONTEXT_CREATION_FAILED',
	SHADER_COMPILE_FAILED: 'WEBGL_SHADER_COMPILE_FAILED',
	PROGRAM_LINK_FAILED: 'WEBGL_PROGRAM_LINK_FAILED',

	// Asset / model loading. Model files are untrusted input.
	INVALID_JSON: 'INVALID_JSON',
	UNSUPPORTED_OBJECT_TYPE: 'UNSUPPORTED_OBJECT_TYPE',
	UNSUPPORTED_GEOMETRY_TYPE: 'UNSUPPORTED_GEOMETRY_TYPE'

};
