importScripts('Complex.js');
importScripts('helpers.js');
importScripts('Multigrid.js');

var chunk = null;
var chunks = [];
var timer = null;

function compare (lastSubgridIds, subgridIds) {
	return lastSubgridIds[0] === subgridIds[0] && lastSubgridIds[1] === subgridIds[1];
}

function stackIntersections (tuple, subgridIds) {
	if (!chunk) {
		chunk = {
			tuples: [],
			subgridIds: subgridIds
		};
	}

	if (compare(chunk.subgridIds, subgridIds)) {
		chunk.tuples.push(tuple);
	} else {
		chunks.push(chunk);

		chunk = {
			tuples: [tuple],
			subgridIds: subgridIds
		};
	}

}



addEventListener('message', function(e) {
	var data = e.data;
	var multigrid = new Multigrid.byParams(data);

	multigrid.processIntersections(stackIntersections, true);


	if (!timer) {
		timer = setInterval(function() {
			var shiftedChunk = chunks.shift();
			if (shiftedChunk) {
				postMessage(shiftedChunk);
			} else {
				postMessage(chunk);
				clearInterval(timer);
				close();
			}
		}, 1000/60);
	}

}, false);
