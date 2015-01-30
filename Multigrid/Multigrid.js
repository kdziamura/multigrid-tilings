/**
 * Grid class
 * @param {Object} params params of grid
	{
		angle: {Number},
		unitInterval: {Number},
		shift: {Number},
		length: {Number},
		from: {Number}
	}
 */
function Grid (params) {
	var unitInterval = params.unitInterval || 1;
	var shift = params.shift || 0;
	this.vector = Complex.fromPolar(1, params.angle);

	this.unitVector = new Complex(this.vector).mul(unitInterval);
	this.normal = new Complex(0, 1).mul(this.vector);

	this.angle = params.angle;
	this.unitInterval = unitInterval;
	this.shift = shift * unitInterval;

	this.length = params.length;
	this.from = params.from !== undefined ? params.from : -Math.floor(params.length / 2);

}

Grid.OBSERVATION_ERROR = 0.0000001;

Grid.prototype.getLine = function (id) {
	return this.getVector(id * this.unitInterval + this.shift);
};

Grid.prototype.getVector = function (length) {
	return new Complex(this.vector).mul(length);
};

Grid.prototype.getRibbonId = function (point) {
	var line = this.getСoordinate(point);
	var observationError = Math.abs(line % 1);

	observationError = Math.min(observationError, 1 - observationError);

	return observationError < Grid.OBSERVATION_ERROR ? Math.round(line) : Math.ceil(line);
};

Grid.prototype.getСoordinate = function (point) {
	var line = (this.unitVector.dot(point) / this.unitInterval - this.shift) / this.unitInterval;
	return line;
};

Grid.prototype.renderLine = function (ctx, lineId) {
	var half = new Complex(this.normal).mul(ctx.canvas.height);
	var line = this.getLine(lineId);
	var from = new Complex(line).sub(half);
	var to = line.add(half);

	ctx.moveTo(from.re, from.im);
	ctx.lineTo(to.re, to.im);
};

Grid.prototype.render = function (ctx) {
	var i;
	var to = this.from + this.length;

	ctx.beginPath();

	for (i = this.from; i < to; i++) {
		this.renderLine(ctx, i);
	}

	ctx.stroke();
	ctx.closePath();
};

function Multigrid (grids, startPoint, isSkipOverflow) {
	var tuple;

	this.grids = grids;
	this.isSkipOverflow = !!isSkipOverflow;

	if (startPoint) {
		tuple = this.getTuple(startPoint);
		_.each(this.grids, function (grid, i) {
			grid.from += tuple[i];
		});
	}
}

Multigrid.byParams = function (params, startPoint, isSkipOverflow) {
	var grids = _.map({length: params.gridsNum}, function (val, i) {
		return new Grid({
			angle: params.angleStep * i,
			unitInterval: typeof params.unitInterval === 'number' ? params.unitInterval : params.unitInterval[i] || 1,
			shift: params.shift,
			length: params.linesNum
		});
	});

	return new Multigrid(grids, startPoint, isSkipOverflow);
};

Multigrid.prototype.getIntersectionsLength = function () {
	var linesSum = _.reduce(this.grids, function (sum, grid) {
		return sum + grid.length;
	}, 0);

	var result = _.reduce(this.grids, function (sum, grid) {
		var lines = grid.length;
		return sum + (linesSum - lines) * lines;
	}, 0);

	return result / 2;
};

Multigrid.prototype.processIntersections = function (callback) {
	this.processGrids(this._processIntersections.bind(this, callback));
};

Multigrid.prototype._processTuple = function (callback, point, gridIds) {
	var tuple = this.getTuple(point);
	callback(tuple, gridIds);
};

Multigrid.prototype.processTuples = function (callback) {
	this.processIntersections(this._processTuple.bind(this, callback));
};

Multigrid.prototype._processPolygon = function (callback, tuple, gridIds) {
	var polygon = this.getPolygon(tuple, gridIds);
	callback(polygon, gridIds);
};


Multigrid.prototype.processPolygons = function (callback) {
	this.processTuples(this._processPolygon.bind(this, callback));
};

/**
 * Process grids intersections by callback with two args
 * @param  {Function} callback args is two grids to process
 * @return {Array}            array with callbacks returns
 */
Multigrid.prototype.processGrids = function (callback) {
	_.eachPairs(this.grids, callback);
};

Multigrid.prototype._vectorsIntersection = function (vectorA, vectorB) {
	return vectorA.is(0) ? new Complex(0) : new Complex(vectorB).mul(Math.pow(vectorA.abs(), 2) / vectorB.dot(vectorA));
};

Multigrid.prototype.getIntersection = function (lineCoordinates) {
	var lineCoordA = lineCoordinates[0];
	var lineCoordB = lineCoordinates[1];

	var gridA = this.grids[lineCoordA[0]];
	var gridB = this.grids[lineCoordB[0]];

	var pointA = this._vectorsIntersection(gridA.getLine(lineCoordA[1]), gridB.normal);
	var pointB = this._vectorsIntersection(gridB.getLine(lineCoordB[1]), gridA.normal);

	return pointA.add(pointB);
};

Multigrid.prototype.isOverflow = function (point) {
	var grids = this.grids;
	var tuple = this.getTuple(point);

	var isOverflow = !_.every(tuple, function (ribbonId, gridId) {
		var x = ribbonId - grids[gridId].from;
		return x >= 0 && x <= grids[gridId].length;
	});

	return isOverflow;
};

Multigrid.prototype._processIntersections = function (callback, grids, gridIds) {
	var i;
	var j;
	var pointA;
	var pointB;
	var point;
	var gridA = grids[0];
	var gridB = grids[1];
	var gridATo = gridA.from + gridA.length;
	var gridBTo = gridB.from + gridB.length;

	if (Math.sin(this._getAngle(gridA, gridB)) === 0) {
		return;
	}

	for (i = gridA.from; i < gridATo; i++) {
		pointA = this._vectorsIntersection(gridA.getLine(i), gridB.normal);

		for (j = gridB.from; j < gridBTo; j++) {
			pointB = this._vectorsIntersection(gridB.getLine(j), gridA.normal);

			point = new Complex(pointB).add(pointA);
			if (this.isSkipOverflow && this.isOverflow(point)) {
				continue;
			}
			callback(point, gridIds);
		}
	}
};

/**
 * Get borders of point
 * @param  {Object} point      point
 * @param  {Array}  gridIds    array of grids of point, unnecesary
 * @return {Array}             array of pairs of gridIds
 */
Multigrid.prototype.getBorders = function (point, gridIds) {
	var tuple = this.getTuple(point);

	var borders = _.map(tuple, function (ribbonId, gridId, tuple) {
		var border = new Array(2);

		if (gridIds && _.contains(gridIds, gridId)) {
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


Multigrid.prototype._getVerticeNeigbourhood = function (point, gridIds) {
	var intersections = [];
	var borders = this.getBorders(point, gridIds);
	var getIntersection = this.getIntersection.bind(this);

	_.each(borders[0], function (lineIdA) {
		var coordA = [0, lineIdA];
		_.each(borders[1], function (lineIdB) {
			var coordB = [1, lineIdB];
			var lineCoordinates = [coordA, coordB];
			intersections.push([getIntersection(lineCoordinates), lineCoordinates]);
		});
	});

	_.each(borders, (function (border, gridId) {
		if (gridId < 2) {
			return;
		}

		var newIntersections = [];
		var currentStorage;
		var linesToIntersect = [[], []];

		var axis = this.grids[gridId];

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
			var coordA = [gridId, border[borderId]];
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
		var subAngle = this.grids[lineCoordinate[0]].normal.arg();

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

Multigrid.prototype.getPolygon = function (tuple, gridIds) {
	var vertices = new Array(2 * gridIds.length);

	var a = this.grids[gridIds[0]].vector;
	var b = this.grids[gridIds[1]].vector;

	vertices[0] = this.getVertice(tuple);
	vertices[1] = new Complex(vertices[0]).add(a);
	vertices[2] = new Complex(vertices[1]).add(b);
	vertices[3] = new Complex(vertices[0]).add(b);

	return vertices;
};


Multigrid.prototype.getTuple = function (point) {
	var tuple;

	tuple = _.map(this.grids, function (grid, i) {
		return grid.getRibbonId(point);
	});

	return tuple;
};


Multigrid.prototype.getCoordinates = function (point) {
	var tuple;

	tuple = _.map(this.grids, function (grid, i) {
		return grid.getСoordinate(point);
	});

	return tuple;
};


Multigrid.prototype.getVertice = function (tuple) {
	var vertice = new Complex(0);

	_.each(this.grids, function (grid, i) {
		vertice.add(grid.getVector(tuple[i]));
	});

	return vertice;
};

Multigrid.prototype._getAngle = function (gridA, gridB) {
	var angle = gridA.angle - gridB.angle;
	var fullCircle = 2 * Math.PI;

	angle = (angle + fullCircle) % fullCircle;
	return Math.min(angle, fullCircle - angle);
};

Multigrid.prototype._addTyleType = function (grids, gridIds) {
	var angle = this._getAngle(grids[0], grids[1]);
	var uniqueness = angle * 1000 | 0;
	var id = this.tileTypes.indexOf(uniqueness);

	if (id === -1) {
		this.tileTypes.push(uniqueness);
		id = this.tileTypes.length - 1;
		this._preRenderTile(id, angle);
	}
};

Multigrid.prototype._getTileType = function (gridA, gridB) {
	var uniqueness = this._getAngle(gridA, gridB) * 1000 | 0;
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
	var colorStep = 360 / this.grids.length;

	ctx.save();

	_.each(this.grids, function (grid, i) {
		ctx.strokeStyle = 'hsl(' + i * colorStep + ', 80%, 30%)';
		grid.render(ctx);
	});

	ctx.restore();
};

Multigrid.prototype.renderPolygon = function (ctx, gridIds, polygon) {
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
	var gridIds = chunk.gridIds;
	var hue = this._getAngle(this.grids[gridIds[0]], this.grids[gridIds[1]]) / Math.PI * 180 * 4;

	ctx.beginPath();
	_.each(chunk.polygons, this.renderPolygon.bind(this, ctx, gridIds));

	ctx.fillStyle = 'hsl(' + hue + ', 55%, 55%)';
	ctx.fill();
	ctx.closePath();
};