/**
 * @fileoverview Hardening specs for THREE.ObjectLoader / THREE.JSONLoader.
 *
 * Model files are untrusted input: they arrive from a CDN, a user upload or a
 * third party scene package. The loader therefore has to
 *
 *   1. reject structurally invalid payloads with a coded error instead of
 *      dereferencing `undefined` and surfacing a bare TypeError, and
 *   2. never let attacker controlled keys resolve to -- or overwrite -- members
 *      inherited from `Object.prototype`.
 *
 * NOTE: these specs pollute `Object.prototype` on purpose. The Node runner
 * evaluates everything inside a dedicated `vm` realm, so the pollution cannot
 * escape into the host process.
 */

'use strict';

QUnit.module( 'ObjectLoader' );

var loader = new THREE.ObjectLoader();

function minimalObject( extra ) {

	var object = {
		metadata: { type: 'object', version: 4.4 },
		geometries: [],
		materials: [],
		textures: [],
		object: {
			uuid: '11111111-1111-1111-1111-111111111111',
			type: 'Group',
			name: '',
			children: []
		}
	};

	for ( var key in extra ) {

		if ( Object.prototype.hasOwnProperty.call( extra, key ) ) object.object[ key ] = extra[ key ];

	}

	return object;

}

QUnit.test( 'parse rejects non-object payloads with a coded error', function ( assert ) {

	var inputs = [ null, undefined, 'not json', 42, true ];

	for ( var i = 0; i < inputs.length; i ++ ) {

		var thrown = null;

		try {

			loader.parse( inputs[ i ] );

		} catch ( error ) {

			thrown = error;

		}

		assert.ok( thrown instanceof THREE.ThreeError, 'rejected ' + JSON.stringify( inputs[ i ] ) );
		assert.strictEqual( thrown.code, THREE.ThreeError.CODES.INVALID_JSON, 'code is INVALID_JSON' );

	}

} );

QUnit.test( 'parseObject rejects non-object payloads', function ( assert ) {

	var thrown = null;

	try {

		loader.parseObject( null, {}, {} );

	} catch ( error ) {

		thrown = error;

	}

	assert.ok( thrown instanceof THREE.ThreeError, 'threw a THREE.ThreeError' );
	assert.strictEqual( thrown.code, THREE.ThreeError.CODES.UNSUPPORTED_OBJECT_TYPE, 'code is UNSUPPORTED_OBJECT_TYPE' );

} );

QUnit.test( 'JSONLoader.parse rejects non-object payloads', function ( assert ) {

	var thrown = null;

	try {

		new THREE.JSONLoader().parse( null );

	} catch ( error ) {

		thrown = error;

	}

	assert.ok( thrown instanceof THREE.ThreeError, 'threw a THREE.ThreeError' );
	assert.strictEqual( thrown.code, THREE.ThreeError.CODES.INVALID_JSON, 'code is INVALID_JSON' );

} );

QUnit.test( 'inherited properties are never treated as children', function ( assert ) {

	var evil = { type: 'Mesh', uuid: 'evil' };

	Object.defineProperty( Object.prototype, 'injectedChild', {
		value: evil,
		enumerable: true,
		configurable: true
	} );

	try {

		// `children` is a plain empty array. The previous implementation used
		// `for ( var child in data.children )`, which walks the prototype chain
		// and would happily graft the inherited object into the scene graph.
		var loaded = loader.parse( minimalObject() );

		assert.strictEqual( loaded.children.length, 0, 'no children were injected from the prototype chain' );

	} finally {

		delete Object.prototype.injectedChild;

	}

} );

QUnit.test( 'geometry lookups do not resolve inherited members', function ( assert ) {

	var json = minimalObject( { type: 'Mesh', geometry: 'constructor', material: undefined } );

	var loaded = loader.parse( json );

	// Without the prototype-less map, `geometries['constructor']` resolved to the
	// `Object` constructor and the mesh silently ended up with a function as its
	// geometry. It must now miss, so THREE.Mesh falls back to its own defaults.
	assert.notStrictEqual( loaded.geometry, Object, 'uuid "constructor" does not resolve to the Object constructor' );
	assert.ok( loaded.geometry instanceof THREE.Geometry, 'an unresolvable uuid falls back to an empty THREE.Geometry' );
	assert.ok( loaded.material instanceof THREE.MeshBasicMaterial, 'an absent material falls back to the MeshBasicMaterial default' );

} );

QUnit.test( 'a well formed scene still round-trips', function ( assert ) {

	var scene = new THREE.Scene();
	scene.name = 'root';

	var child = new THREE.Mesh( new THREE.BoxGeometry( 1, 1, 1 ), new THREE.MeshBasicMaterial() );
	child.name = 'cube';
	scene.add( child );

	var json = JSON.parse( JSON.stringify( scene.toJSON() ) );

	var loaded = new THREE.ObjectLoader().parse( json );

	assert.ok( loaded instanceof THREE.Scene, 'root type preserved' );
	assert.strictEqual( loaded.children.length, 1, 'children preserved' );
	assert.strictEqual( loaded.children[ 0 ].name, 'cube', 'child name preserved' );
	assert.ok( loaded.children[ 0 ] instanceof THREE.Mesh, 'child type preserved' );
	assert.ok( loaded.children[ 0 ].geometry instanceof THREE.Geometry, 'geometry rebuilt' );
	assert.ok( loaded.children[ 0 ].material instanceof THREE.MeshBasicMaterial, 'material rebuilt' );

} );
