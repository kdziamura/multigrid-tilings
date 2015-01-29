function View (w, h, zoom) {
	w = w || 1000;
	h = h || 1000;
	zoom = zoom || 100;

	this.setSize(w, h);
	this.setCenter(w/2, h/2);
	this.setZoom(zoom);

	this.defineContexts();
	this.setupContexts();

	this._createElement();
}

View.CONTEXTS = ['grids', 'tiles', 'gol', 'overlay'];

View.prototype.setSize = function (w, h) {
	this.size = new Complex(w, h);
};

View.prototype.setCenter = function (x, y) {
	this.center = new Complex(x, y);
};

View.prototype.setZoom = function (zoom) {
	this.zoom = zoom;
};

View.prototype.defineContexts = function () {
	var canvases = [];
	var contexts = {};

	_.each(View.CONTEXTS, function (ctxName, i) {
		var canvas = document.createElement('canvas');
		canvas.classList.add(ctxName);
		canvases[i] = canvas;
		contexts[ctxName] = canvas.getContext('2d');
	});

	this.canvases = canvases;
	this.contexts = contexts;
};

View.prototype.setupContexts = function () {
	_.each(View.CONTEXTS, (function (ctxName, i) {
		var ctx = this.getContext(ctxName);

		ctx.canvas.width = this.size.re;
		ctx.canvas.height = this.size.im;
		ctx.translate(this.center.re, this.center.im);
		ctx.scale(this.zoom, this.zoom);
		ctx.lineWidth = 1 / this.zoom;

		ctx.fillStyle = 'white';
		ctx.strokeStyle = 'white';
	}).bind(this));
};

View.prototype._createElement = function () {
	var canvases = this.canvases;
	var container = document.createElement('div');

	_.each(View.CONTEXTS, function (ctxName, i) {
		container.appendChild(canvases[i]);
	});

	this.el = container;
};

View.prototype.getPoint = function (e) {
	return new Complex(e.pageX, e.pageY).sub(this.center).div(this.zoom);
};

View.prototype.getContextName = function (el) {
	var i = this.canvases.indexOf(el);

	return i < 0 ? null : View.CONTEXTS[i];
};

View.prototype.getContext = function (ctxName) {
	return this.contexts[ctxName] || null;
};

View.prototype.drawPoint = function (ctx, point, radius) {
	radius = radius || 1;

	ctx.moveTo(point.re, point.im);
	ctx.arc(point.re, point.im, radius / this.zoom, 0, 2 * Math.PI);
};

View.prototype.clearContext = function (ctx) {
	ctx.clearRect(-this.center.re, -this.center.im, this.size.re, this.size.im);
};