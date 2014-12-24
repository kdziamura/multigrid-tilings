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

Grid.prototype.getLine = function (id) {
	return Complex.fromPolar(id * this.scalarStep + this.scalarShift, this.angle);
};

Grid.prototype.getRibbonId = function (point) {
	var line = (this.step.dot(point) - this.scalarShift) / this.scalarStep;
	var observationError = Math.abs(line % 1);

	observationError = Math.min(observationError, 1 - observationError);

	return observationError < 0.0000001 ? Math.round(line) : Math.ceil(line);
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
	var i;
	var from;
	var to;
	var halfLength = new Complex(this.grid.initial).mul(ctx.canvas.height);

	ctx.beginPath();
	for (i = this.from; i < this.to; i++) {
		from = this.grid.getLine(i).sub(halfLength);
		to = new Complex(from).add(new Complex(halfLength).mul(2));

		ctx.moveTo(from.re, from.im);
		ctx.lineTo(to.re, to.im);
	}

	ctx.stroke();
	ctx.closePath();
};


function Multigrid (subgrids, startPoint) {
	this.subgrids = subgrids;

	// this.tileTypes = [];
	// this.tiles = [];
	// this._setTileTypes();

	// this.polygons = this.getPolygons();
}

Multigrid.byParams = function (params) {
	var angleStep = params.angleStep;
	var shift = params.shift;
	var gridsNum = params.gridsNum;
	var linesNum = params.linesNum;
	var step = params.step;
	var startPoint = params.startPoint;

	var subgrids = new Array(gridsNum);
	var i;
	var grid;
	var angle;

	for (i = 0; i < gridsNum; i++) {
		angle = angleStep * i;
		grid = new Grid(angle, shift, step);
		subgrids[i] = grid.subGrid(linesNum, startPoint[i] || 0);
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

Multigrid.prototype.processIntersections = function (callback, isTuple) {
	this.processGrids(this._intersections.bind(this, callback, isTuple));
};

/**
 * Process subgrids intersections by callback with two args
 * @param  {Function} callback args is two subgrids to process
 * @return {Array}            array with callbacks returns
 */
Multigrid.prototype.processGrids = function (callback) {
	var subgrids = this.subgrids;
	var length = subgrids.length;
	var i;
	var j;

	for (i = 0; i < length - 1; i++) {
		for (j = i + 1; j < length; j++) {
			callback(subgrids[i], subgrids[j]);
		}
	}

};


Multigrid.prototype._intersections = function (callback, isTuple, subA, subB) {
	var subgrids = this.subgrids;
	var i;
	var j;
	var pointA;
	var pointB;
	var a;
	var b;
	var point;
	var subgridIds;

	if (this._getAngle(subA, subB) % Math.PI === 0) {
		return;
	}

	subgridIds = [subgrids.indexOf(subA), subgrids.indexOf(subB)];

	for (i = subA.from; i < subA.to; i++) {
		a = subA.grid.getLine(i);
		pointB = a.is(0) ? new Complex(0) : new Complex(subB.grid.initial).mul(Math.pow(a.abs(), 2) / subB.grid.initial.dot(a));

		for (j = subB.from; j < subB.to; j++) {
			b = subB.grid.getLine(j);
			pointA = b.is(0) ? new Complex(0) : new Complex(subA.grid.initial).mul(Math.pow(b.abs(), 2) / subA.grid.initial.dot(b));

			point = pointA.add(pointB);

			callback(isTuple ? this.getTuple(point) : point, subgridIds);
		}
	}
};


Multigrid.prototype.getPolygon = function (subgridIds, tuple) {
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

	ctx.closePath();
	ctx.fill();

	document.body.appendChild(cvs);
};

Multigrid.prototype._renderIntersections = function (ctx, zoom) {
	ctx.fillStyle = 'white';

	ctx.beginPath();

	this.processIntersections(function(point) {
		ctx.moveTo(point.re, point.im);
		ctx.arc(point.re, point.im, 1/zoom, 0, 2 * Math.PI);
	});

	ctx.closePath();

	ctx.fill();
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


Multigrid.prototype.render = function (ctx) {
	this.processIntersections(this.renderTile.bind(this, ctx));
};




Multigrid.prototype.renderTile = function (ctx, subgridIds, tuple) {
	_.each(this.getPolygon(subgridIds, tuple), function path (vertice, i) {
		if (i === 0) {
			ctx.moveTo(vertice.re, vertice.im);
		} else {
			ctx.lineTo(vertice.re, vertice.im);
		}
	});
};

Multigrid.prototype.renderTiles = function (ctx, chunk) {
	var subgridIds = chunk.subgridIds;
	var hue = this._getAngle(this.subgrids[subgridIds[0]], this.subgrids[subgridIds[1]]) / Math.PI * 180 * 4;

	ctx.beginPath();
	_.each(chunk.tuples, this.renderTile.bind(this, ctx, subgridIds));
	ctx.closePath();

	ctx.fillStyle = 'hsl(' + hue + ', 55%, 55%)';
	// ctx.stroke();
	ctx.fill();

};
