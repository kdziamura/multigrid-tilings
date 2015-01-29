importScripts('Complex.js');
importScripts('helpers.js');
importScripts('Multigrid.js');

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
	var multigrid = Multigrid.byParams(data[0], data[1]);

	multigrid.processIntersections(stackPoints);
	postMessage(points);
	close();

}, false);
