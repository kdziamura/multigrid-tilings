(function () {

var zoom = 50;
var grids = 5;
var side = 1000;
var contexts = [];
var center = new Complex(side/2, side/2);

var multigrid;

var params = {
	angleStep: (1 + grids % 2) * Math.PI / grids,
	shift: 1 / grids,
	step: 1,
	gridsNum: grids,
	linesNum: 5
};

var startPoint = new Complex(0);



var chunks = [];
function render () {
	var chunk = chunks.shift();
	if (chunk) {
		multigrid.renderTiles(tilesCtx, chunk);
	}
	requestAnimationFrame(render);
}

function renderIntersections(e) {

	requestAnimationFrame(function () {
		gridsCtx.fillStyle = 'white';

		gridsCtx.beginPath();

		_.each(e.data, function(point) {
			gridsCtx.moveTo(point.re, point.im);
			gridsCtx.arc(point.re, point.im, 1/controller.zoom, 0, 2 * Math.PI);
		});

		gridsCtx.closePath();

		gridsCtx.fill();
	});
}

function renderPopulation(e) {
	var polygons = e.data;

	setupCtx(golCtx);
	golCtx.fillStyle = 'navy';

	requestAnimationFrame(function () {
		golCtx.beginPath();
		_.each(polygons, multigrid.renderPolygon.bind(multigrid, golCtx, null));
		golCtx.closePath();
		golCtx.fill();
	});
}

function stackChunks(e) {
	chunks.push(e.data);
}

function getPoint(e) {
	return new Complex(e.pageX, e.pageY).sub(center).div(controller.zoom);
}

var controller = {
	reset: function () {
		this.polygonsStream.removeEventListener('message', stackChunks, false);
		this.polygonsStream.terminate();
		this.polygonsStream = null;

		this.intersectionsStream.removeEventListener('message', renderIntersections, false);
		this.intersectionsStream.terminate();
		this.intersectionsStream = null;

		this.gameOfLifeStream.removeEventListener('message', renderPopulation, false);
		this.gameOfLifeStream.terminate();
		this.gameOfLifeStream = null;


		cancelAnimationFrame(render);
		chunks = [];

		requestAnimationFrame(function() {
			_.each(contexts, setupCtx);
		});
	},

	start: function () {
		var zoom = this.zoom;
		this.polygonsStream = new Worker('data_stream.js');
		this.intersectionsStream = new Worker('process_intersections.js');
		this.gameOfLifeStream = new Worker('game_of_life.js');

		if (this.randomAngle) {
			params.angleStep = Math.random() * 2 * Math.PI;
		}

		multigrid = Multigrid.byParams(params, startPoint);

		this.polygonsStream.addEventListener('message', stackChunks, false);
		this.polygonsStream.postMessage([params, startPoint]);

		this.intersectionsStream.addEventListener('message', renderIntersections, false);
		this.intersectionsStream.postMessage([params, startPoint]);

		this.gameOfLifeStream.addEventListener('message', renderPopulation, false);
		this.gameOfLifeStream.postMessage({
			params: params,
			type: 'init'
		});

		requestAnimationFrame(function() {
			multigrid._renderGrids(gridsCtx);
		});

		requestAnimationFrame(render);
	},

	update: function () {
		this.reset();
		this.start();
	},

	autoAngle: function () {
		params.angleStep = (1 + params.gridsNum % 2) * Math.PI / params.gridsNum;
	},

	golStep: function () {
		this.gameOfLifeStream.postMessage({
			type: 'step'
		});
	},

	randomAngle: false,

	zoom: zoom,

	polygonsStream: null,
	intersectionsStream: null,
	gameOfLifeStream: null
};


function setupCtx (ctx) {
	ctx.canvas.width = side;
	ctx.canvas.height = side;
	ctx.translate(side/2, side/2);
	ctx.scale(controller.zoom, controller.zoom);
	ctx.lineWidth = 1 / controller.zoom;

	ctx.fillStyle = 'white';
	ctx.strokeStyle = 'white';
}


window.onload = function() {
	var cache = {};

	var gridsCvs = document.createElement('canvas');
	var tilesCvs = document.createElement('canvas');
	var overlayCvs = document.createElement('canvas');
	var golCvs = document.createElement('canvas');

	gridsCvs.classList.add('grids');
	tilesCvs.classList.add('tiles');
	overlayCvs.classList.add('overlay');
	golCvs.classList.add('gol');

	gridsCtx = gridsCvs.getContext('2d');
	tilesCtx = tilesCvs.getContext('2d');
	overlayCtx = overlayCvs.getContext('2d');
	golCtx = golCvs.getContext('2d');

	contexts = [gridsCtx, tilesCtx, golCtx, overlayCtx];


	_.each(contexts, function (ctx) {
		setupCtx(ctx);
		document.body.appendChild(ctx.canvas);
	});


	var textLabel = document.querySelector('.label');
	document.addEventListener('mousemove', function (e) {
		var point = getPoint(e);
		var tuple = multigrid.getTuple(point);

		var intersectionTuple;
		var subgridIds;
		var nearestIntersection;

		if (!_.every(tuple, function (val, key, tuple) {
			return cache.tuple && val === cache.tuple[key];
		})) {
			cache.tuple = tuple;
			cache.interpolated = multigrid.getVertice(tuple);
			cache.nearestIntersections = multigrid._getVerticeNeigbourhood(point);
		}

		nearestIntersection = (function () {
			var nearestIntersection = null;
			var minDist = null;

			_.each(cache.nearestIntersections, function (intersection) {
				var dist = new Complex(intersection[0]).sub(point).abs()
				if (minDist === null || dist < minDist) {
					minDist = dist;
					nearestIntersection = intersection;
				}
			});

			return nearestIntersection;
		})();

		cache.coords = nearestIntersection[1];

		intersectionTuple = multigrid.getTuple(nearestIntersection[0]);
		subgridIds = [cache.coords[0][0], cache.coords[1][0]];
		polygon = multigrid.getPolygon(intersectionTuple, subgridIds);

		window.requestAnimationFrame(function () {
			textLabel.innerHTML = tuple;

			overlayCtx.clearRect(-side/2, -side/2, side, side);
			overlayCtx.lineWidth = 2 / controller.zoom;

			overlayCtx.fillStyle = 'hsla(0, 100%, 100%, 0.3)';
			overlayCtx.beginPath();
			multigrid.renderPolygon(overlayCtx, null, polygon);
			overlayCtx.closePath();
			overlayCtx.stroke();
			overlayCtx.fill();

			overlayCtx.fillStyle = 'white';
			overlayCtx.beginPath();
			overlayCtx.arc(cache.interpolated.re, cache.interpolated.im, 0.2, 0, 2 * Math.PI);
			overlayCtx.closePath();
			overlayCtx.fill();
		});

	});

	document.addEventListener('mousedown', function (e) {
		var point = getPoint(e);
		var cell;

		if (e.ctrlKey) {
			startPoint = point;
			controller.update();
		} else if (e.target === overlayCvs) {
			controller.gameOfLifeStream.postMessage({
				type: 'toggle',
				cell: multigrid._getCellCoordinates(cache.coords)
			});
		}
	});

	document.addEventListener('keydown', function (e) {
		if (e.keyCode === 16) {
			tilesCvs.style.opacity = 0;
		}
	});
	document.addEventListener('keyup', function (e) {
		if (e.keyCode === 16) {
			tilesCvs.style.opacity = 1;
		}
	});


	var gui = new dat.GUI();

	gui.add(params, 'angleStep').listen();
	gui.add(controller, 'autoAngle');
	gui.add(controller, 'randomAngle').listen();
	gui.add(controller, 'zoom', 0);
	gui.add(params, 'shift', 0, 1);
	gui.add(params, 'gridsNum').min(2).step(1);
	gui.add(params, 'linesNum').min(1).step(1);
	gui.add(controller, 'golStep');
	gui.add(controller, 'update');


	controller.start();
};

}).call(null);