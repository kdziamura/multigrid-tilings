importScripts('../libs/Complex.js');
importScripts('../libs/collections.js');
importScripts('../Multigrid.js');

var points = [];

function stackPoints (point, gridIds) {
	points.push(point);
	if (points.length === 500) {
		postMessage(points);
		points = [];
	}
}


addEventListener('message', function(e) {
	var data = e.data;
	var multigrid = Multigrid.byParams(data[0], data[1], data[2]);

	console.time('Intersections generation');

	multigrid.processIntersections(stackPoints);
	postMessage(points);

	console.timeEnd('Intersections generation');

	close();
}, false);
