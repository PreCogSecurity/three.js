/**
 * @fileoverview Minimal lodash subset used by the three.js unit tests.
 *
 * `test/unit/qunit-utils.js` and `test/unit/SmartComparer.js` only ever touch
 * eight lodash helpers ( plus the chainable `_( obj ).keys().difference().value()`
 * form ). Vendoring just those means the browser harnesses in
 * `test/unit/unittests_*.html` can be opened straight from a fresh clone --
 * they previously required `npm install` to have populated `node_modules/`,
 * which made the suite unrunnable for anyone without a package install.
 *
 * This file is loaded as a plain <script> in the browser and `require()`d by
 * `test/node/run.js`. It has no dependencies and touches neither the DOM nor
 * the file system.
 *
 * @author BlueHound / PreCog Security
 */

( function () {

	'use strict';

	var methods = {};

	methods.forEach = function ( collection, iteratee ) {

		if ( collection === null || collection === undefined ) return collection;

		if ( typeof collection === 'string' || typeof collection.length === 'number' ) {

			for ( var i = 0; i < collection.length; i ++ ) iteratee( collection[ i ], i, collection );

		} else {

			Object.keys( Object( collection ) ).forEach( function ( key ) {

				iteratee( collection[ key ], key, collection );

			} );

		}

		return collection;

	};

	methods.each = methods.forEach;

	methods.forOwn = function ( object, iteratee ) {

		if ( object === null || object === undefined ) return object;

		Object.keys( Object( object ) ).forEach( function ( key ) {

			iteratee( object[ key ], key, object );

		} );

		return object;

	};

	methods.keys = function ( object ) {

		return ( object === null || object === undefined ) ? [] : Object.keys( Object( object ) );

	};

	methods.values = function ( object ) {

		return methods.keys( object ).map( function ( key ) {

			return object[ key ];

		} );

	};

	methods.map = function ( collection, iteratee ) {

		var result = [];

		methods.forEach( collection, function ( value, key ) {

			result.push( iteratee( value, key ) );

		} );

		return result;

	};

	methods.filter = function ( collection, predicate ) {

		var result = [];

		methods.forEach( collection, function ( value, key ) {

			if ( predicate( value, key ) ) result.push( value );

		} );

		return result;

	};

	methods.any = function ( collection, predicate ) {

		var found = false;

		methods.forEach( collection, function ( value ) {

			if ( ! found && predicate( value ) ) found = true;

		} );

		return found;

	};

	methods.some = methods.any;

	methods.every = function ( collection, predicate ) {

		var result = true;

		methods.forEach( collection, function ( value ) {

			if ( ! predicate( value ) ) result = false;

		} );

		return result;

	};

	methods.difference = function ( array ) {

		var lookup = [];

		Array.prototype.slice.call( arguments, 1 ).forEach( function ( other ) {

			( other || [] ).forEach( function ( value ) {

				lookup.push( value );

			} );

		} );

		return ( array || [] ).filter( function ( value ) {

			return lookup.indexOf( value ) === - 1;

		} );

	};

	function sameBytes( a, b ) {

		if ( a.byteLength !== b.byteLength ) return false;

		var aBytes = new Uint8Array( a.buffer || a, a.byteOffset || 0, a.byteLength );
		var bBytes = new Uint8Array( b.buffer || b, b.byteOffset || 0, b.byteLength );

		for ( var i = 0; i < aBytes.length; i ++ ) {

			if ( aBytes[ i ] !== bBytes[ i ] ) return false;

		}

		return true;

	}

	methods.isEqual = function ( a, b ) {

		if ( a === b ) return true;

		// lodash considers NaN equal to itself.
		if ( typeof a === 'number' && typeof b === 'number' ) return isNaN( a ) && isNaN( b );

		if ( a === null || b === null || typeof a !== 'object' || typeof b !== 'object' ) return false;

		// Typed arrays and ArrayBuffers compare by content, not by identity.
		var hasArrayBuffer = typeof ArrayBuffer !== 'undefined';
		var aIsBuffer = hasArrayBuffer && ( ArrayBuffer.isView( a ) || a instanceof ArrayBuffer );
		var bIsBuffer = hasArrayBuffer && ( ArrayBuffer.isView( b ) || b instanceof ArrayBuffer );

		if ( aIsBuffer || bIsBuffer ) return aIsBuffer && bIsBuffer && sameBytes( a, b );

		if ( Array.isArray( a ) !== Array.isArray( b ) ) return false;

		var aKeys = methods.keys( a );
		var bKeys = methods.keys( b );

		if ( aKeys.length !== bKeys.length ) return false;

		for ( var i = 0; i < aKeys.length; i ++ ) {

			if ( ! methods.isEqual( a[ aKeys[ i ] ], b[ aKeys[ i ] ] ) ) return false;

		}

		return true;

	};

	methods.isFinite = function ( value ) {

		return typeof value === 'number' && isFinite( value );

	};

	methods.isFunction = function ( value ) {

		return typeof value === 'function';

	};

	methods.isObject = function ( value ) {

		var type = typeof value;
		return value !== null && ( type === 'object' || type === 'function' );

	};

	methods.isArray = Array.isArray;

	// Helpers that participate in the chainable wrapper form.
	var CHAINABLE = [ 'keys', 'values', 'map', 'filter', 'each', 'forEach', 'forOwn', 'any', 'some', 'every', 'difference' ];

	function chain( value ) {

		var wrapper = {};

		CHAINABLE.forEach( function ( name ) {

			wrapper[ name ] = function () {

				return chain( methods[ name ].apply( methods, [ value ].concat( Array.prototype.slice.call( arguments ) ) ) );

			};

		} );

		wrapper.value = function () {

			return value;

		};

		wrapper.valueOf = function () {

			return value;

		};

		wrapper.toString = function () {

			return JSON.stringify( value );

		};

		return wrapper;

	}

	// `_` is callable ( the chain wrapper ) and carries the static helpers.
	var lodash = function ( value ) {

		return chain( value );

	};

	Object.keys( methods ).forEach( function ( name ) {

		lodash[ name ] = methods[ name ];

	} );

	if ( typeof module !== 'undefined' && module.exports ) {

		module.exports = lodash;

	}

	if ( typeof window !== 'undefined' ) {

		window._ = lodash;

	}

	if ( typeof global !== 'undefined' ) {

		global._ = lodash;

	}

}() );
