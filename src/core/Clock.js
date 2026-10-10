/**
 * @author alteredq / http://alteredqualia.com/
 */

// Monotonic-ish timestamp lookup, resolved on every call.
//
// `Clock` used to hard-reference `self.performance.now()`. That is a Web
// Window/Worker global: under Node.js -- server side rendering, head-less
// ( offscreen ) rendering and the unit test suite -- `self` does not exist at
// all, so merely constructing a Clock threw a ReferenceError. `performance`
// is also absent on older engines and can be stubbed out by a host.
//
// Resolving lazily keeps the animation loop alive everywhere. `Date.now()` is
// far coarser (~15ms on many platforms) but is universally available, and
// `performance.now()` is preferred whenever the host actually provides it.
function now() {

	var perf = ( typeof self !== 'undefined' && self ) ? self.performance : undefined;

	if ( ! perf && typeof performance !== 'undefined' ) perf = performance;

	return ( perf && typeof perf.now === 'function' ) ? perf.now() : Date.now();

}

THREE.Clock = function ( autoStart ) {

	this.autoStart = ( autoStart !== undefined ) ? autoStart : true;

	this.startTime = 0;
	this.oldTime = 0;
	this.elapsedTime = 0;

	this.running = false;

};

THREE.Clock.prototype = {

	constructor: THREE.Clock,

	start: function () {

		this.startTime = now();

		this.oldTime = this.startTime;
		this.running = true;

	},

	stop: function () {

		this.getElapsedTime();
		this.running = false;

	},

	getElapsedTime: function () {

		this.getDelta();
		return this.elapsedTime;

	},

	getDelta: function () {

		var diff = 0;

		if ( this.autoStart && ! this.running ) {

			this.start();

		}

		if ( this.running ) {

			var newTime = now();

			diff = 0.001 * ( newTime - this.oldTime );
			this.oldTime = newTime;

			this.elapsedTime += diff;

		}

		return diff;

	}

};
