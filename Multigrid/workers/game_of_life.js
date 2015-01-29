importScripts('../libs/Complex.js');
importScripts('../libs/collections.js');
importScripts('../Multigrid.js');

function getNewPopulation (multigrid, toSurvive, toBirth, population) {
	var cellsWeight = {};
	// Get cells weight
	_.each(population, function (cell) {
		var neighbourhood = multigrid.getNeighbourhood(cell, isNeumannOnly);

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

function randomPopulation (multigrid, maxLength) {
	var population = [];
	var i = 0;
	var cell = '';

	var gridsLength = multigrid.grids.length;

	for (; i < maxLength; i++) {
		gridId = Math.floor(Math.random() * (gridsLength - 1));
		grid = multigrid.grids[gridId];
		line = grid.from + Math.floor(Math.random() * grid.length);

		cell = gridId + ',' + line;

		gridId = gridId + 1 + Math.floor(Math.random() * (gridsLength - gridId - 2));
		grid = multigrid.grids[gridId];
		line = grid.from + Math.floor(Math.random() * grid.length);

		cell += ',' + gridId + ',' + line;

		toggleCell(population, cell);
	}

	return population;
}

function toggleCell (population, cell) {
	var cellId = population.indexOf(cell);

	if (cellId !== -1) {
		population.splice(cellId, 1);
	} else {
		population.push(cell);
	}
}

function parseRule (toBirthStr, toSurviveStr) {
	toBirth = _.map(toBirthStr.split(','), function (n) {
		return parseInt(n, 10);
	});

	toSurvive = _.map(toSurviveStr.split(','), function (n) {
		return parseInt(n, 10);
	});
}

var toBirth = [];
var toSurvive = [];

var population;
var multigrid;
var isNeumannOnly = false;

addEventListener('message', function (e) {
	var data = e.data;

	if (data.type === 'init') {
		multigrid = Multigrid.byParams(data.params);
		parseRule(data.toBirth, data.toSurvive);
		isNeumannOnly = data.isNeumannOnly;
		population = [];
	} else if (data.type === 'step') {
		population = getNewPopulation(multigrid, toSurvive, toBirth, population);
	} else if (data.type === 'toggle') {
		toggleCell(population, data.cell);
	} else if (data.type === 'randomize') {
		population = randomPopulation(multigrid, data.maxLength);
	}

	var polygons = _.map(population, function (cell) {
		var coord = multigrid._parseLineCoordinates(cell);
		var point = multigrid.getIntersection(coord);
		var tuple = multigrid.getTuple(point);
		var gridIds = [coord[0][0], coord[1][0]];

		return multigrid.getPolygon(tuple, gridIds);
	});

	postMessage(polygons);

}, false);
