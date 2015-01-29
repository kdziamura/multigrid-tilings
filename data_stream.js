importScripts('Complex.js');
importScripts('helpers.js');
importScripts('Multigrid.js');

var chunk = null;

function compare (lastGridIds, gridIds) {
	return lastGridIds[0] === gridIds[0] && lastGridIds[1] === gridIds[1];
}

function sendChunk (polygon, gridIds) {
	if (!chunk) {
		chunk = {
			polygons: [],
			gridIds: gridIds
		};
	}

	if (compare(chunk.gridIds, gridIds)) {
		chunk.polygons.push(polygon);
	} else {
		postMessage(chunk);

		chunk = {
			polygons: [polygon],
			gridIds: gridIds
		};
	}

}


addEventListener('message', function(e) {
	var data = e.data;
	var multigrid = Multigrid.byParams(data[0], data[1]);

	multigrid.processPolygons(sendChunk);
	postMessage(chunk);
	close();

}, false);
