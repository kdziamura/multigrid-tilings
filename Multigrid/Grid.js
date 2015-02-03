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

Grid.prototype.getNormalAngle = function () {
	return this.normal.arg();
};

/**
 * Get intersection of normal of grid and passed line
 * @param  {Object}
 * @return {Object}
 */
Grid.prototype.getIntersetionWithNormal = function (line) {
	return line.is(0) ? new Complex(0) : new Complex(this.normal).mul(Math.pow(line.abs(), 2) / this.normal.dot(line));
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