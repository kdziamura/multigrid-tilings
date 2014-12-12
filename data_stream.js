importScripts('Complex.js');
importScripts('helper.js');
importScripts('Multigrid.js');

var intersections = [];
var chunks = [];

var timer = setInterval(function() {
	postMessage(chunks.shift());
}, 1000/60);

function stackIntersections (intersection) {
	intersections.push(intersection);

	if (intersections.length === 200) {
		chunks.push(intersections);
		intersections = [];
	}
}

// var interval = setInterval(function(){
// 	postMessage(intersections);
// 	intersections = [];
// }, 20);

addEventListener('message', function(e) {
	var data = e.data;
	var multigrid = new Multigrid.byParams(data);

	multigrid.processIntersections(stackIntersections);

}, false);
