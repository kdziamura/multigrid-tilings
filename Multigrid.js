/**
 * Creates grid
 * @param {Radian} angle angle of initial vector
 * @param {Number} shift shift the grid
 */
function Grid (angle, shift, step) {
	step = step || 1;
	shift = shift || 0;

	this.step = Complex.fromPolar(step, angle);
	this.shift = Complex.fromPolar(shift, angle);
	this.initial = new Complex(0, 1).mul(this.step);

	this.angle = angle;
	this.scalarStep = step;
	this.scalarShift = shift;

}

Grid.OBSERVATION_ERROR = 0.0000001;

Grid.prototype.getLine = function (id) {
	return Complex.fromPolar(id * this.scalarStep + this.scalarShift, this.angle);
};

Grid.prototype.getRibbonId = function (point) {
	var line = this.getСoordinate(point);
	var observationError = Math.abs(line % 1);

	observationError = Math.min(observationError, 1 - observationError);

	return observationError < Grid.OBSERVATION_ERROR ? Math.round(line) : Math.ceil(line);
};

Grid.prototype.getСoordinate = function (point) {
	var line = (this.step.dot(point) - this.scalarShift) / this.scalarStep;
	return line;
};

Grid.prototype.renderLine = function (ctx, lineId) {
	var half = new Complex(this.initial).mul(ctx.canvas.height);
	var line = this.getLine(lineId);
	var from = new Complex(line).sub(half);
	var to = line.add(half);

	ctx.moveTo(from.re, from.im);
	ctx.lineTo(to.re, to.im);
};

Grid.prototype.renderLines = function (ctx, from, to) {
	var i;

	to = (typeof to !== 'undefined') ? to : from + 1;

	ctx.beginPath();

	for (i = from; i < to; i++) {
		this.renderLine(ctx, i);
	}

	ctx.stroke();
	ctx.closePath();
};

Grid.prototype.subGrid = function (length, from) {
	from = (from || 0) - Math.floor(length / 2);
	return new SubGrid(this, from, length);
};

function SubGrid (grid, from, length) {
	this.grid = grid;
	this.from = from;
	this.to = from + length;
}

SubGrid.prototype.render = function (ctx) {
	this.grid.renderLines(ctx, this.from, this.to);
};


function Multigrid (subgrids, startPoint) {
	var tuple;

	this.subgrids = subgrids;

	if (startPoint) {
		tuple = this.getTuple(startPoint);

		_.each(this.subgrids, function (subgrid, i) {
			subgrid.from += tuple[i];
			subgrid.to += tuple[i];
		});
	}
}

Multigrid.byParams = function (params, startPoint) {
	var angleStep = params.angleStep;
	var shift = params.shift;
	var gridsNum = params.gridsNum;
	var linesNum = params.linesNum;
	var step = params.step;

	var subgrids = new Array(gridsNum);
	var i;
	var grid;
	var angle;

	for (i = 0; i < gridsNum; i++) {
		angle = angleStep * i;
		grid = new Grid(angle, shift, step);
		subgrids[i] = grid.subGrid(linesNum);
	}

	return new Multigrid(subgrids, startPoint);
};

Multigrid.prototype.getIntersectionsLength = function () {
	var linesSum = _.reduce(this.subgrids, function (sum, subgrid) {
		return sum + subgrid.to - subgrid.from;
	}, 0);

	var result = _.reduce(this.subgrids, function (sum, subgrid) {
		var lines = subgrid.to - subgrid.from;
		return sum + (linesSum - lines) * lines;
	}, 0);

	return result / 2;
};

Multigrid.prototype.processIntersections = function (callback) {
	this.processGrids(this._processIntersections.bind(this, callback));
};

Multigrid.prototype._processTuple = function (callback, point, subgridIds) {
	var tuple = this.getTuple(point);
	callback(tuple, subgridIds);
};

Multigrid.prototype.processTuples = function (callback) {
	this.processIntersections(this._processTuple.bind(this, callback));
};

Multigrid.prototype._processPolygon = function (callback, tuple, subgridIds) {
	var polygon = this.getPolygon(tuple, subgridIds);
	callback(polygon, subgridIds);
};


Multigrid.prototype.processPolygons = function (callback) {
	this.processTuples(this._processPolygon.bind(this, callback));
};

/**
 * Process subgrids intersections by callback with two args
 * @param  {Function} callback args is two subgrids to process
 * @return {Array}            array with callbacks returns
 */
Multigrid.prototype.processGrids = function (callback) {
	_.eachPairs(this.subgrids, callback);
};

Multigrid.prototype._vectorsIntersection = function (vectorA, vectorB) {
	return vectorA.is(0) ? new Complex(0) : new Complex(vectorB).mul(Math.pow(vectorA.abs(), 2) / vectorB.dot(vectorA));
};

Multigrid.prototype.getIntersection = function (lineCoordinates) {
	var lineCoordA = lineCoordinates[0];
	var lineCoordB = lineCoordinates[1];

	var gridA = this.subgrids[lineCoordA[0]].grid;
	var gridB = this.subgrids[lineCoordB[0]].grid;

	var pointA = this._vectorsIntersection(gridA.getLine(lineCoordA[1]), gridB.initial);
	var pointB = this._vectorsIntersection(gridB.getLine(lineCoordB[1]), gridA.initial);

	return pointA.add(pointB);
};

Multigrid.prototype._processIntersections = function (callback, subA, subB) {
	var subgrids = this.subgrids;
	var i;
	var j;
	var pointA;
	var pointB;
	var subgridIds;

	if (this._getAngle(subA, subB) % Math.PI === 0) {
		return;
	}

	subgridIds = [subgrids.indexOf(subA), subgrids.indexOf(subB)];

	for (i = subA.from; i < subA.to; i++) {
		pointA = this._vectorsIntersection(subA.grid.getLine(i), subB.grid.initial);

		for (j = subB.from; j < subB.to; j++) {
			pointB = this._vectorsIntersection(subB.grid.getLine(j), subA.grid.initial);

			callback(pointB.add(pointA), subgridIds);
		}
	}
};

/**
 * Get borders of point
 * @param  {Object} point      point
 * @param  {Array}  subgridIds array of subgrids of point, unnecesary
 * @return {Array}             array of pairs of subgridIds
 */
Multigrid.prototype.getBorders = function (point, subgridIds) {
	var tuple = this.getTuple(point);

	var borders = _.map(tuple, function (ribbonId, subgridId, tuple) {
		var border = new Array(2);

		if (subgridIds && _.contains(subgridIds, subgridId)) {
			border = [ribbonId - 1, ribbonId + 1];
		} else {
			border = [ribbonId - 1, ribbonId];
		}

		return border;
	});

	return borders;
};

////////////////////////////////
///TODO: move to static


/**
 * Parse string of coordinates to array. For example
 * '-1,2,3,1' -> [[-1,2], [3,1]]
 * @param  {String} cell coordinates
 * @return {Array}
 */
Multigrid.prototype._parseLineCoordinates = function (coordinates) {
	var c = _.map(coordinates.split(','), function (str) {
		return parseInt(str, 10);
	});

	return [[c[0], c[1]], [c[2], c[3]]];
};

Multigrid.prototype._getCellCoordinates = function (lineCoordinates) {
	var coords;

	if (lineCoordinates[0][0] < lineCoordinates[1][0]) {
		coords = (lineCoordinates[0].concat(lineCoordinates[1])).toString();
	} else {
		coords = (lineCoordinates[1].concat(lineCoordinates[0])).toString();
	}

	return coords;
};

////////////////////////////////


Multigrid.prototype._getVerticeNeigbourhood = function (point, subgridIds) {
	var intersections = [];
	var borders = this.getBorders(point, subgridIds);
	var getIntersection = this.getIntersection.bind(this);

	_.each(borders[0], function (lineIdA) {
		var coordA = [0, lineIdA];
		_.each(borders[1], function (lineIdB) {
			var coordB = [1, lineIdB];
			var lineCoordinates = [coordA, coordB];
			intersections.push([getIntersection(lineCoordinates), lineCoordinates]);
		});
	});

	_.each(borders, (function (border, subgridId) {
		if (subgridId < 2) {
			return;
		}

		var newIntersections = [];
		var currentStorage;
		var linesToIntersect = [[], []];

		var axis = this.subgrids[subgridId].grid;

		_.each(intersections, function (intersection) {
			var posOnAxis = axis.getСoordinate(intersection[0]);
			var borderId;

			if (posOnAxis >= border[0] && posOnAxis <= border[1]) {
				newIntersections.push(intersection);
			} else {
				borderId = posOnAxis < border[0] ? 0 : 1;
				currentStorage = linesToIntersect[borderId];
				_.each(intersection[1], function (coordinate) {
					var lineToIntersectId = _.findIndex(currentStorage, function (coordInStorage) {
						return coordInStorage[0] === coordinate[0] && coordInStorage[1] === coordinate[1];
					});
					if (lineToIntersectId === -1) {
						currentStorage.push(coordinate);
					} else {
						currentStorage.splice(lineToIntersectId, 1);
					}
				});
			}
		});

		_.each(linesToIntersect, function (storage, borderId) {
			var coordA = [subgridId, border[borderId]];
			_.each(storage, function (coordB) {
				var lineCoordinates = [coordA, coordB];
				newIntersections.push([getIntersection(lineCoordinates), lineCoordinates]);
			});
		});


		intersections = newIntersections;
	}).bind(this));

	return intersections;
};

Multigrid.prototype.getNeighbourhood = function (cell, isVonNeumannOnly) {
	var centerCoordinates = this._parseLineCoordinates(cell);

	return _.map(this._getNeighbourhood(centerCoordinates, isVonNeumannOnly), (function (intersection) {
		return this._getCellCoordinates(intersection[1]);
	}).bind(this));
};

Multigrid.prototype._getNeighbourhood = function (centerCoordinates, isVonNeumannOnly) {
	var getIntersection = this.getIntersection.bind(this);
	var centerIntersection = getIntersection(centerCoordinates);
	var intersections = this._getVerticeNeigbourhood(centerIntersection, [centerCoordinates[0][0], centerCoordinates[1][0]]);
	var vonNeumannNeighbourhood = [];

	// von Neumann neighbourhood
	_.each(centerCoordinates, (function (lineCoordinate) {
		var subAngle = this.subgrids[lineCoordinate[0]].grid.initial.arg();

		var pos = {
			compare: [-1, -1],
			intersections: new Array(2)
		};

		var neg = {
			compare: [1, 1],
			intersections: new Array(2)
		};

		_.each(intersections, function (intersection) {
			var angle = new Complex(intersection[0]).sub(centerIntersection).arg() - subAngle;

			var compareId = Math.ceil(Math.sin(angle));
			var compareVal = Math.cos(angle);

			if (!pos.intersections[compareId] || compareVal > pos.compare[compareId]) {
				pos.compare[compareId] = compareVal;
				pos.intersections[compareId] = intersection[1];
			}

			if (!neg.intersections[compareId] || compareVal < neg.compare[compareId]) {
				neg.compare[compareId] = compareVal;
				neg.intersections[compareId] = intersection[1];
			}
		});

		_.each([pos.intersections, neg.intersections], function (coordinates) {
			var a = coordinates[0];
			var b = coordinates[1];

			var coordB = (
				((a[0][0] === b[0][0]) && (a[0][1] === b[0][1])) ||
				((a[0][0] === b[1][0]) && (a[0][1] === b[1][1]))
			) ? a[0] : a[1];

			var lineCoordinates = [lineCoordinate, coordB];
			vonNeumannNeighbourhood.push([getIntersection(lineCoordinates), lineCoordinates]);
		});

	}).bind(this));


	return isVonNeumannOnly ? vonNeumannNeighbourhood : intersections.concat(vonNeumannNeighbourhood);
};

Multigrid.prototype.getPolygon = function (tuple, subgridIds) {
	var i;
	var polygon;
	var tuples;
	var gridId;
	var changes;

	changes = 2 * subgridIds.length - 2;

	tuples = new Array(changes + 1);
	polygon = new Array(changes + 2);

	tuples[0] = _.clone(tuple);

	for (i = 0; i < changes; i++) {
		gridId = subgridIds[i];

		tuples[i][gridId] += 1;
		tuples[i + 1] = _.clone(tuple);
		tuples[i + 1][gridId] += 1;

		polygon[i] = this.getVertice(tuples[i]);
	}
	polygon[changes] = this.getVertice(tuples[changes]);
	polygon[changes + 1] = this.getVertice(tuple);

	return polygon;
};


Multigrid.prototype.getTuple = function (point) {
	var tuple;

	tuple = _.map(this.subgrids, function (subgrid, i) {
		return subgrid.grid.getRibbonId(point);
	});

	return tuple;
};


Multigrid.prototype.getCoordinates = function (point) {
	var tuple;

	tuple = _.map(this.subgrids, function (subgrid, i) {
		return subgrid.grid.getСoordinate(point);
	});

	return tuple;
};


Multigrid.prototype.getVertice = function (tuple) {
	var vertice = new Complex(0);

	_.each(this.subgrids, function (subgrid, i) {
		vertice.add(Complex.fromPolar(tuple[i], subgrid.grid.angle));
	});

	return vertice;
};

Multigrid.prototype._getAngle = function (subA, subB) {
	var angle = subA.grid.angle - subB.grid.angle;
	var fullCircle = 2 * Math.PI;

	angle = (angle + fullCircle) % fullCircle;
	return Math.min(angle, fullCircle - angle);
};

Multigrid.prototype._addTyleType = function (subIdA, subIdB) {
	var angle = this._getAngle(this.subgrids[subIdA], this.subgrids[subIdB]);
	var uniqueness = angle * 1000 | 0;
	var id = this.tileTypes.indexOf(uniqueness);

	if (id === -1) {
		this.tileTypes.push(uniqueness);
		id = this.tileTypes.length - 1;
		this._preRenderTile(id, angle);
	}
};

Multigrid.prototype._getTileType = function (subA, subB) {
	var uniqueness = this._getAngle(subA, subB) * 1000 | 0;
	var id = this.tileTypes.indexOf(uniqueness);

	return id === -1 ? null : id;
};

Multigrid.prototype._setTileTypes = function () {
	this.processGrids(this._addTyleType.bind(this));
};

Multigrid.prototype._preRenderTile = function (id, angle) {
	var cvs = this.tiles[id] = document.createElement('canvas');
	var ctx = cvs.getContext('2d');
	var zoom = 50;

	var x = Math.abs(Math.cos(angle));
	var w = x + 1;

	cvs.width = zoom * w;
	cvs.height = zoom;

	ctx.scale(zoom, zoom);
	ctx.fillStyle = 'hsl(' + (60 * id) + ', 70%, 60%)';

	ctx.beginPath();

	ctx.moveTo(0, 0);
	ctx.lineTo(1, 0);
	ctx.lineTo(1, 0);
	ctx.lineTo(w, 1);
	ctx.lineTo(x, 1);

	ctx.fill();
	ctx.closePath();

	document.body.appendChild(cvs);
};

Multigrid.prototype._renderGrids = function (ctx) {
	var subgridsLength = this.subgrids.length;
	var colorStep = 360 / subgridsLength;

	ctx.save();

	_.each(this.subgrids, function (subgrid, i) {
		ctx.strokeStyle = 'hsl(' + i * colorStep + ', 80%, 30%)';
		subgrid.render(ctx);
	});

	ctx.restore();
};

Multigrid.prototype.renderPolygon = function (ctx, subgridIds, polygon) {
	_.each(polygon, function path (vertice, i) {
		if (i === 0) {
			ctx.moveTo(vertice.re, vertice.im);
		} else {
			ctx.lineTo(vertice.re, vertice.im);
		}
	});

	ctx.lineTo(polygon[0].re, polygon[0].im);
};

Multigrid.prototype.renderTiles = function (ctx, chunk) {
	var subgridIds = chunk.subgridIds;
	var hue = this._getAngle(this.subgrids[subgridIds[0]], this.subgrids[subgridIds[1]]) / Math.PI * 180 * 4;

	ctx.beginPath();
	_.each(chunk.polygons, this.renderPolygon.bind(this, ctx, subgridIds));

	ctx.fillStyle = 'hsl(' + hue + ', 55%, 55%)';
	ctx.fill();
	ctx.closePath();
};


// function Renderer(params) {
// 	this.zoom = params.zoom;
// 	this.size = params.size;
// 	this.sides = params.sides;
// 	this.multigrid = params.multigrid;


// 	this.cvs = {};
// 	this.createCvs('grids');
// 	this.createCvs('tiles');
// 	this.createCvs('overlay');
// }

// Renderer.prototype.createCvs = function (storage) {

// }