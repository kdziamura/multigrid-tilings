importScripts('Complex.js');
importScripts('helpers.js');
importScripts('Multigrid.js');

var chunk = null;

function compare (lastSubgridIds, subgridIds) {
	return lastSubgridIds[0] === subgridIds[0] && lastSubgridIds[1] === subgridIds[1];
}

function sendChunk (polygon, subgridIds) {
	if (!chunk) {
		chunk = {
			polygons: [],
			subgridIds: subgridIds
		};
	}

	if (compare(chunk.subgridIds, subgridIds)) {
		chunk.polygons.push(polygon);
	} else {
		postMessage(chunk);

		chunk = {
			polygons: [polygon],
			subgridIds: subgridIds
		};
	}

}


addEventListener('message', function(e) {
	var data = e.data;
	var multigrid = new Multigrid.byParams(data[0], data[1]);

	multigrid.processPolygons(sendChunk);
	postMessage(chunk);
	close();

}, false);
