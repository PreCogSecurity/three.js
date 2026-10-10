/**
 * @fileoverview Regression specs for THREE.LightShadow.
 *
 * `LightShadow.prototype.copy()` did not return `this`, so
 * `new THREE.LightShadow().clone()` resolved to `undefined`. Every shadow
 * casting light copies its shadow in `clone()`, which meant
 * `directionalLight.clone().shadow` was `undefined` -- any later touch of
 * `light.shadow.map` / `light.shadow.camera` threw a TypeError.
 */

'use strict';

QUnit.module( 'LightShadow' );

function makeShadow() {

	return new THREE.LightShadow( new THREE.OrthographicCamera( - 5, 5, 5, - 5, 0.5, 100 ) );

}

QUnit.test( 'copy returns a usable shadow', function ( assert ) {

	var source = makeShadow();

	source.bias = 0.003;
	source.darkness = 0.25;
	source.mapSize.set( 1024, 256 );

	var copy = new THREE.LightShadow().copy( source );

	assert.ok( copy instanceof THREE.LightShadow, 'copy returns the destination' );
	assert.strictEqual( copy.bias, 0.003, 'bias copied' );
	assert.strictEqual( copy.darkness, 0.25, 'darkness copied' );
	assert.strictEqual( copy.mapSize.x, 1024, 'mapSize.x copied' );
	assert.strictEqual( copy.mapSize.y, 256, 'mapSize.y copied' );

} );

QUnit.test( 'clone returns a deep-enough copy', function ( assert ) {

	var source = makeShadow();
	source.mapSize.set( 128, 128 );

	var copy = source.clone();

	assert.ok( copy instanceof THREE.LightShadow, 'clone returns a LightShadow' );
	assert.ok( copy !== source, 'clone is a distinct object' );
	assert.ok( copy.camera !== source.camera, 'camera is cloned, not shared' );
	assert.strictEqual( copy.mapSize.x, 128, 'mapSize copied' );
	assert.notStrictEqual( copy.mapSize, source.mapSize, 'mapSize is not shared' );

	// The render target must never be shared between shadow instances.
	assert.strictEqual( copy.map, null, 'render target is not carried over' );

} );

QUnit.test( 'cloning a shadow casting light keeps a working shadow', function ( assert ) {

	var lights = [
		new THREE.DirectionalLight(),
		new THREE.PointLight(),
		new THREE.SpotLight()
	];

	for ( var i = 0; i < lights.length; i ++ ) {

		var light = lights[ i ];
		var copy = light.clone();

		assert.ok( copy.shadow instanceof THREE.LightShadow, light.type + '.clone().shadow is a LightShadow' );
		assert.ok( copy.shadow.camera !== undefined, light.type + '.clone().shadow.camera exists' );
		assert.ok( copy.shadow.mapSize instanceof THREE.Vector2, light.type + '.clone().shadow.mapSize exists' );

	}

} );
