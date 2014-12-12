var grids = 11;
var angleStep = (1 + grids % 2) * Math.PI / grids;
var multigrid = Multigrid.byParams(angleStep, 1 / grids, grids, 30);
var ctx = document.createElement('canvas').getContext('2d');

function test (func, times, log) {
	var timeStart;
	var timeEnd;
	var averageTime;
	var i;

	timeStart = performance.now();

	for (i = 0; i < times; i++) {
		func();
	}

	timeEnd = performance.now();

	averageTime = (timeEnd - timeStart) / times;

	console.log(log, averageTime);

	return averageTime;
}

var wholeTime = 0;

wholeTime += test(function () {
	multigrid.getIntersections();
}, 10, 'getIntersections');

wholeTime += test(function () {
	multigrid.getPolygons();
}, 10, 'getPolygons');

wholeTime += test(function () {
	multigrid._renderTiles(ctx);
}, 10, 'renderTiles');

console.log('---------------------------');
console.log('whole time', wholeTime);
console.log('intersections', multigrid.intersections.length);
console.log('speed', multigrid.intersections.length / wholeTime);