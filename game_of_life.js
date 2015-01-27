importScripts('Complex.js');
importScripts('helpers.js');
importScripts('Multigrid.js');

function getNewPopulation (multigrid, toSurvive, toBirth, population) {
	var cellsWeight = {};
	// Get cells weight
	_.each(population, function (cell) {
		var neighbourhood = multigrid.getNeighbourhood(cell);

		_.each(neighbourhood, function (cell) {
			if (cellsWeight[cell] !== undefined) {
				cellsWeight[cell] += 1;
			} else {
				cellsWeight[cell] = 1;
			}
		});
	});

	// Create new population
	var cells = Object.keys(cellsWeight);
	var newPopulation = [];

	_.each(cells, function (cell, cellId, cells) {
		var isAlive = _.contains(population, cell);
		if (isAlive && _.contains(toSurvive, cellsWeight[cell]) || !isAlive && _.contains(toBirth, cellsWeight[cell])) {
			newPopulation.push(cell);
		}
	});

	return newPopulation;
}

var toBirth = [1];
var toSurvive = [2, 3];

var population;
var multigrid;

addEventListener('message', function (e) {
	var data = e.data;
	var cellId;

	if (data.type === 'init') {
		multigrid = Multigrid.byParams(data.params);
		population = [];
	} else if (data.type === 'step') {
		population = getNewPopulation(multigrid, toSurvive, toBirth, population);
	} else if (data.type === 'toggle') {
		cellId = population.indexOf(data.cell);

		if (cellId !== -1) {
			population.splice(cellId, 1);
		} else {
			population.push(data.cell);
		}
	}

	var polygons = _.map(population, function (cell) {
		var coord = multigrid._parseLineCoordinates(cell);
		var point = multigrid.getIntersection(coord);
		var tuple = multigrid.getTuple(point);
		var subgridIds = [coord[0][0], coord[1][0]];

		return multigrid.getPolygon(tuple, subgridIds);
	});

	postMessage(polygons);

}, false);
