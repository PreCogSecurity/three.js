/**
 * @fileoverview A dependency-free, QUnit 1.x compatible test harness.
 *
 * The three.js specs under `test/unit` were historically only executable from a
 * browser (`test/unit/unittests_*.html` against a pre-built `build/three.js`),
 * which meant `npm test` could never run them and CI had nothing to gate on.
 * This shim implements the subset of the QUnit API those specs actually use so
 * the very same spec files can also run head-less against `src/` in Node.
 *
 * Design rules:
 *   - Zero dependencies: `npm test` must work from a fresh clone with no network.
 *   - Fail closed: exceptions, time-outs and assertion-count mismatches are
 *     reported as failures, so a spec can never pass silently.
 *   - No global leakage: specs run inside a `vm` context owned by the runner.
 */

'use strict';

// -----------------------------------------------------------------------------
// Equality helpers
// -----------------------------------------------------------------------------

function tagOf( value ) {

	return Object.prototype.toString.call( value ).slice( 8, - 1 );

}

function isTypedArray( value ) {

	return ArrayBuffer.isView( value ) && ! ( value instanceof DataView );

}

function isDomNode( value ) {

	return typeof Node !== 'undefined' && value instanceof Node;

}

function ownKeys( object ) {

	return Object.getOwnPropertyNames( object );

}

function equalBytes( a, b ) {

	if ( a.length !== b.length ) return false;

	for ( var i = 0; i < a.length; i ++ ) {

		if ( a[ i ] !== b[ i ] ) return false;

	}

	return true;

}

/**
 * Structural equality used by `deepEqual`. Cycles are tolerated so that
 * scene-graph objects ( child.parent === child ) can be compared.
 */
function deepEqual( actual, expected, seen ) {

	if ( actual === expected ) return true;

	if ( typeof actual === 'number' && typeof expected === 'number' ) {

		// NaN equals NaN, mirroring QUnit.
		return isNaN( actual ) && isNaN( expected );

	}

	if ( actual === null || expected === null ) return false;

	if ( typeof actual !== 'object' || typeof expected !== 'object' ) return false;

	// Identity for exotic host objects ( DOM nodes, file handles ).
	if ( isDomNode( actual ) || isDomNode( expected ) ) return actual === expected;

	if ( isTypedArray( actual ) || isTypedArray( expected ) ) {

		if ( ! isTypedArray( actual ) || ! isTypedArray( expected ) ) return false;
		if ( actual.constructor !== expected.constructor ) return false;

		return equalBytes( new Uint8Array( actual.buffer, actual.byteOffset, actual.byteLength ), new Uint8Array( expected.buffer, expected.byteOffset, expected.byteLength ) );

	}

	var actualTag = tagOf( actual );
	var expectedTag = tagOf( expected );

	if ( actualTag !== expectedTag ) return false;

	if ( actualTag === 'Date' ) return actual.getTime() === expected.getTime();

	if ( actualTag === 'RegExp' ) return actual.source === expected.source && actual.flags === expected.flags;

	if ( actualTag === 'ArrayBuffer' ) return equalBytes( new Uint8Array( actual ), new Uint8Array( expected ) );

	if ( actualTag === 'Arguments' ) return deepEqual( Array.prototype.slice.call( actual ), Array.prototype.slice.call( expected ), seen );

	seen = seen || [];

	for ( var s = 0; s < seen.length; s ++ ) {

		if ( seen[ s ][ 0 ] === actual && seen[ s ][ 1 ] === expected ) return true;

	}

	seen.push( [ actual, expected ] );

	if ( actualTag === 'Array' ) {

		if ( actual.length !== expected.length ) return false;

		for ( var a = 0; a < actual.length; a ++ ) {

			if ( ! deepEqual( actual[ a ], expected[ a ], seen ) ) return false;

		}

		return true;

	}

	var actualKeys = ownKeys( actual ).sort();
	var expectedKeys = ownKeys( expected ).sort();

	if ( actualKeys.length !== expectedKeys.length ) return false;

	for ( var k = 0; k < actualKeys.length; k ++ ) {

		var key = actualKeys[ k ];

		if ( key !== expectedKeys[ k ] ) return false;
		if ( ! deepEqual( actual[ key ], expected[ key ], seen ) ) return false;

	}

	return true;

}

// -----------------------------------------------------------------------------
// Diagnostics
// -----------------------------------------------------------------------------

function typeName( value ) {

	if ( value === null ) return 'null';
	if ( value === undefined ) return 'undefined';

	return tagOf( value );

}

function preview( value, depth ) {

	depth = depth || 0;

	if ( value === null || value === undefined ) return String( value );

	var type = typeof value;

	if ( type === 'string' ) return JSON.stringify( value );
	if ( type === 'number' || type === 'boolean' ) return String( value );
	if ( type === 'function' ) return '[Function' + ( value.name ? ': ' + value.name : '' ) + ']';
	if ( type === 'symbol' ) return value.toString();

	if ( isDomNode( value ) ) return '[Node ' + ( value.nodeName || '?' ) + ']';

	if ( isTypedArray( value ) ) {

		return typeName( value ) + '( ' + value.length + ') [' + Array.prototype.slice.call( value, 0, 8 ).join( ', ' ) + ' ]';

	}

	if ( type === 'object' ) {

		if ( value.isVector3 ) return 'Vector3( ' + [ value.x, value.y, value.z ].join( ', ' ) + ' )';
		if ( value.isVector2 ) return 'Vector2( ' + [ value.x, value.y ].join( ', ' ) + ' )';
		if ( value.isVector4 ) return 'Vector4( ' + [ value.x, value.y, value.z, value.w ].join( ', ' ) + ' )';
		if ( value.isColor && typeof value.getHexString === 'function' ) return 'Color( ' + value.getHexString() + ' )';
		if ( value.isMatrix4 ) return 'Matrix4';
		if ( value.isMatrix3 ) return 'Matrix3';
		if ( value.isQuaternion ) return 'Quaternion( ' + [ value.x, value.y, value.z, value.w ].join( ', ' ) + ' )';
		if ( value.isEuler ) return 'Euler( ' + [ value.x, value.y, value.z, value.order ].join( ', ' ) + ' )';
		if ( value.isBufferAttribute ) return 'BufferAttribute[ ' + value.name + ' ] ' + typeName( value.array ) + '( ' + value.count + ' )';

		if ( Array.isArray( value ) ) return '[' + value.slice( 0, 8 ).map( function ( v ) {

			return preview( v, depth + 1 );

		} ).join( ', ' ) + ' ]';

		if ( depth > 1 ) return typeName( value );

		var keys = ownKeys( value );
		var ctor = ( value.constructor && value.constructor.name && value.constructor.name !== 'Object' ) ? value.constructor.name + ' ' : '';
		var body = keys.slice( 0, 8 ).map( function ( key ) {

			return key + ': ' + preview( value[ key ], depth + 1 );

		} ).join( ', ' );

		return ctor + '{ ' + body + ( keys.length > 8 ? ', ...' : '' ) + ' }';

	}

	return String( value );

}

function describeExpectation( expected ) {

	if ( typeof expected === 'function' ) return 'an instance of ' + ( expected.name || 'the given constructor' );
	if ( expected instanceof RegExp ) return 'to match /' + expected.source + '/';

	return preview( expected );

}

function describeError( error ) {

	if ( error && error.message ) return ( error.name || 'Error' ) + ': ' + error.message;

	return preview( error );

}

function pad( value, width ) {

	var text = String( value );

	while ( text.length < width ) text = ' ' + text;

	return text;

}

// -----------------------------------------------------------------------------
// QUnit
// -----------------------------------------------------------------------------

/**
 * @param {object} [options]
 * @param {function} [options.log] Receives one already formatted report line.
 * @param {number} [options.timeout] Per test timeout in milliseconds.
 * @return {object} QUnit-compatible facade.
 */
function createQUnit( options ) {

	options = options || {};

	var log = options.log || function ( line ) {

		process.stdout.write( line + '\n' );

	};
	var timeout = options.timeout || 15000;

	var tests = [];
	var currentModule = null;

	// ---------------------------------------------------------------------
	// Assertion API
	//
	// The public assertion API lives on one shared object so that helpers
	// registered later by `test/unit/qunit-utils.js`
	// (`QUnit.assert.success = ...`) are automatically inherited by every test,
	// exactly as in QUnit 1.x. Per-test objects are created with
	// `Object.create()` and carry only the mutable run state.
	// ---------------------------------------------------------------------

	var assertApi = {};

	assertApi.pushResult = function ( result, actual, expected, message ) {

		if ( this.finished ) {

			throw new Error( 'Assertion registered after the test finished: ' + message );

		}

		this.assertions.push( {
			result: !! result,
			actual: actual,
			expected: expected,
			message: message === undefined ? '' : String( message )
		} );

	};

	// Raw push: used by the custom assertions in test/unit/qunit-utils.js.
	assertApi.push = function ( result, actual, expected, message ) {

		this.pushResult( result, actual, expected, message );

	};

	assertApi.ok = function ( state, message ) {

		this.pushResult( state, state, true, message || ( state ? 'ok' : 'expected a truthy value, got ' + preview( state ) ) );

	};

	assertApi.notOk = function ( state, message ) {

		this.pushResult( ! state, state, false, message || ( state ? 'expected a falsy value, got ' + preview( state ) : 'ok' ) );

	};

	assertApi.equal = function ( actual, expected, message ) {

		this.pushResult( actual == expected, actual, expected, // eslint-disable-line eqeqeq
			message || ( preview( actual ) + ' should be equal to ' + preview( expected ) ) );

	};

	assertApi.notEqual = function ( actual, expected, message ) {

		this.pushResult( actual != expected, actual, expected, // eslint-disable-line eqeqeq
			message || ( preview( actual ) + ' should not be equal to ' + preview( expected ) ) );

	};

	assertApi.strictEqual = function ( actual, expected, message ) {

		this.pushResult( actual === expected, actual, expected, message || ( preview( actual ) + ' should be strictly equal to ' + preview( expected ) ) );

	};

	assertApi.notStrictEqual = function ( actual, expected, message ) {

		this.pushResult( actual !== expected, actual, expected, message || ( preview( actual ) + ' should not be strictly equal to ' + preview( expected ) ) );

	};

	assertApi.deepEqual = function ( actual, expected, message ) {

		this.pushResult( deepEqual( actual, expected ), actual, expected, message || ( preview( actual ) + ' should be deeply equal to ' + preview( expected ) ) );

	};

	assertApi.notDeepEqual = function ( actual, expected, message ) {

		this.pushResult( ! deepEqual( actual, expected ), actual, expected, message || ( preview( actual ) + ' should not be deeply equal to ' + preview( expected ) ) );

	};

	assertApi.propEqual = function ( actual, expected, message ) {

		this.deepEqual( actual, expected, message );

	};

	assertApi.throws = function ( block, expected, message ) {

		var raised = null;

		try {

			block();

		} catch ( error ) {

			raised = error;

		}

		var result;
		var detail = 'expected the block to throw';

		if ( expected !== undefined ) detail += ' ' + describeExpectation( expected );

		if ( raised === null ) {

			result = false;

		} else if ( expected === undefined ) {

			result = true;

		} else if ( typeof expected === 'function' ) {

			result = raised instanceof expected;
			detail = 'expected ' + ( expected.name || 'the given constructor' ) + ', got ' + describeError( raised );

		} else if ( expected instanceof RegExp ) {

			result = expected.test( String( raised && raised.message !== undefined ? raised.message : raised ) );
			detail = 'expected /' + expected.source + '/, got ' + describeError( raised );

		} else if ( typeof expected === 'object' && expected !== null ) {

			result = ( raised.name === expected.name ) && ( String( raised.message ) === String( expected.message ) );
			detail = 'expected ' + preview( expected ) + ', got ' + describeError( raised );

		} else {

			result = true;

		}

		this.pushResult( result, raised === null ? '(nothing thrown)' : describeError( raised ), expected, message || detail );

	};

	assertApi.expect = function ( count ) {

		this.expectedCount = count;

	};

	assertApi.async = function () {

		var self = this;

		this.pending ++;

		return function done() {

			if ( -- self.pending === 0 ) self.onSettled();

		};

	};

	assertApi.onSettled = function () {};

	function newAssert( test ) {

		var assert = Object.create( assertApi );

		assert.test = test;
		assert.expectedCount = null;
		assert.assertions = [];
		assert.pending = 0;
		assert.finished = false;
		assert.onSettled = function () {};

		return assert;

	}

	// ---------------------------------------------------------------------
	// Registration
	// ---------------------------------------------------------------------

	function QUnit() {}

	QUnit.config = { autostart: false };

	QUnit.module = function ( name, hooks ) {

		currentModule = {
			name: String( name ),
			beforeEach: hooks && hooks.beforeEach,
			afterEach: hooks && hooks.afterEach
		};

	};

	QUnit.test = function ( name, callback ) {

		tests.push( {
			name: String( name ),
			callback: callback,
			module: currentModule
		} );

	};

	QUnit.skip = function ( name ) {

		tests.push( { name: String( name ), skipped: true } );

	};

	// QUnit 1.x keeps a single live `assert` object; `test/unit/qunit-utils.js`
	// relies on this by calling `QUnit.assert.success()`.
	QUnit.assert = assertApi;

	QUnit._tests = tests;

	// Legacy global async control used by a couple of specs.
	QUnit._stop = 0;

	QUnit.start = function () {

		if ( QUnit._stop > 0 ) QUnit._stop --;

	};

	QUnit.stop = function () {

		QUnit._stop ++;

	};

	QUnit.util = {};

	QUnit.dump = preview;

	/**
	 * Runs every registered test and resolves with a result summary.
	 * @return {Promise<object>}
	 */
	QUnit.run = function () {

		var started = Date.now();

		var results = {
			total: 0,
			passed: 0,
			failed: 0,
			skipped: 0,
			assertions: 0,
			failures: [],
			duration: 0
		};

		var index = 0;

		log( '1..' + tests.length );

		function next() {

			if ( index >= tests.length ) {

				results.duration = Date.now() - started;
				return Promise.resolve( results );

			}

			var test = tests[ index ++ ];

			if ( test.skipped ) {

				results.skipped ++;
				return Promise.resolve().then( next );

			}

			return runTest( test ).then( function ( outcome ) {

				results.total ++;
				results.assertions += outcome.assertions.length;

				if ( outcome.error ) {

					// An exception (or a timeout) fails the test regardless of
					// how many assertions already passed.
					outcome.assertions.push( {
						result: false,
						actual: '(exception)',
						expected: '(no exception)',
						message: outcome.error
					} );

				}

				var failed = outcome.assertions.filter( function ( assertion ) {

					return ! assertion.result;

				} );

				if ( failed.length > 0 ) {

					results.failed ++;
					results.failures.push( { test: qualify( test ), assertions: failed } );

				} else {

					results.passed ++;

				}

				log( ( failed.length > 0 ? 'not ok ' : 'ok     ' ) + pad( index, 5 ) + ' - ' + qualify( test ) );

				return next();

			} );

		}

		function runTest( test ) {

			return new Promise( function ( resolve ) {

				var assert = newAssert( test );
				var settled = false;
				var timer = null;

				function finish( error ) {

					if ( settled ) return;
					settled = true;

					if ( timer !== null ) clearTimeout( timer );

					assert.finished = true;

					resolve( { assertions: assert.assertions, error: error } );

				}

				assert.onSettled = function () {

					finish( null );

				};

				QUnit.assert = assert;

				try {

					if ( test.module && test.module.beforeEach ) test.module.beforeEach( assert );

					// QUnit 1.x always passes the assert object, even when the
					// spec callback declares no parameters.
					if ( test.callback.length > 0 ) {

						test.callback( assert );

					} else {

						test.callback();

					}

					if ( test.module && test.module.afterEach ) test.module.afterEach( assert );

				} catch ( error ) {

					return finish( error && error.stack ? error.stack : String( error ) );

				}

				// An expected-assertion count mismatch is itself a failure: the
				// spec stopped short (or ran long), which means something is
				// wrong even when every recorded assertion passed.
				if ( assert.expectedCount !== null && assert.expectedCount !== assert.assertions.length ) {

					assert.pushResult( false, assert.assertions.length, assert.expectedCount, 'expected ' + assert.expectedCount + ' assertions, but ' + assert.assertions.length + ' were run' );

				}

				if ( assert.pending === 0 ) finish( null );

				timer = setTimeout( function () {

					finish( 'Timed out after ' + timeout + 'ms (an async callback never completed)' );

				}, timeout );

			} );

		}

		function qualify( test ) {

			return ( test.module && test.module.name ? test.module.name + ': ' : '' ) + test.name;

		}

		return next();

	};

	/**
	 * Formats a human readable report.
	 * @param {object} results
	 * @return {string}
	 */
	QUnit.formatReport = function ( results ) {

		var lines = [ '' ];

		results.failures.forEach( function ( failure ) {

			lines.push( 'FAILED: ' + failure.test );

			failure.assertions.forEach( function ( assertion ) {

				lines.push( '  ' + assertion.message );
				lines.push( '    actual:   ' + preview( assertion.actual ) );
				lines.push( '    expected: ' + preview( assertion.expected ) );

			} );

			lines.push( '' );

		} );

		lines.push( '# tests ' + results.passed + ' passed, ' + results.failed + ' failed, ' + results.skipped + ' skipped (' + results.total + ' total)' );
		lines.push( '# assertions ' + results.assertions );
		lines.push( '# duration ' + ( results.duration / 1000 ).toFixed( 2 ) + 's' );

		return lines.join( '\n' );

	};

	return QUnit;

}

module.exports = {
	createQUnit: createQUnit,
	deepEqual: deepEqual,
	preview: preview
};
