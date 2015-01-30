(function () {

var grids = 5;
var contexts = [];
var view = null;

var multigrid;

var params = {
	angleStep: (1 + grids % 2) * Math.PI / grids,
	shift: 1 / grids,
	unitInterval: 1, //_.map({length: 10}, function() {return Math.random() * 3;}),
	gridsNum: grids,
	linesNum: 10
};

var startPoint = new Complex(0);



var chunks = [];
function render () {
	var ctx = view.getContext('tiles');
	var chunk = chunks.shift();
	if (chunk) {
		multigrid.renderTiles(ctx, chunk);
	}
	requestAnimationFrame(render);
}

function renderIntersections(e) {
	var gridsCtx = view.getContext('grids');

	requestAnimationFrame(function () {
		gridsCtx.fillStyle = 'white';

		gridsCtx.beginPath();

		_.each(e.data, function(point) {
			view.drawPoint(gridsCtx, point);
		});

		gridsCtx.fill();
		gridsCtx.closePath();
	});
}

function renderPopulation(e) {
	var polygons = e.data;
	var golCtx = view.getContext('gol');

	view.clearContext(golCtx);
	golCtx.fillStyle = 'gold';
	golCtx.strokeStyle = 'orange';

	requestAnimationFrame(function () {
		golCtx.beginPath();
		_.each(polygons, multigrid.renderPolygon.bind(multigrid, golCtx, null));
		golCtx.fill();
		golCtx.stroke();
		golCtx.closePath();
	});
}

function stackChunks(e) {
	chunks.push(e.data);
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
			view.setZoom(controller.zoom);
			view.setupContexts();
		});
	},

	start: function () {
		var zoom = this.zoom;
		this.polygonsStream = new Worker('Multigrid/workers/data_stream.js');
		this.intersectionsStream = new Worker('Multigrid/workers/process_intersections.js');
		this.gameOfLifeStream = new Worker('Multigrid/workers/game_of_life.js');

		if (this.randomAngle) {
			params.angleStep = Math.random() * 2 * Math.PI;
		}

		multigrid = Multigrid.byParams(params, startPoint, this.isSkipOverflow);

		this.polygonsStream.addEventListener('message', stackChunks, false);
		this.polygonsStream.postMessage([params, startPoint, this.isSkipOverflow]);

		this.intersectionsStream.addEventListener('message', renderIntersections, false);
		this.intersectionsStream.postMessage([params, startPoint, this.isSkipOverflow]);

		this.gameOfLifeStream.addEventListener('message', renderPopulation, false);
		this.gameOfLifeStream.postMessage({
			type: 'init',
			params: params,
			startPoint: startPoint,
			isSkipOverflow: this.isSkipOverflow,
			toBirth: this.toBirth,
			toSurvive: this.toSurvive,
			isNeumannOnly: this.isNeumannOnly
		});

		requestAnimationFrame(function() {
			multigrid._renderGrids(view.getContext('grids'));
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

	golRandom: function () {
		this.gameOfLifeStream.postMessage({
			type: 'randomize',
			chance: this.coverage
		});
	},

	golRun: false,

	golToggleRun: function (isRun) {
		if (isRun) {
			this.interval = setInterval(this.golStep.bind(this), 50);
		} else {
			clearInterval(this.interval);
			this.interval = null;
		}
	},

	randomAngle: false,

	toBirth: '3',
	toSurvive: '2,3',
	isNeumannOnly: false,
	interval: null,

	zoom: 10,
	isSkipOverflow: false,

	coverage: 0.2,

	polygonsStream: null,
	intersectionsStream: null,
	gameOfLifeStream: null
};


window.onload = function() {
	var cache = {};
	var textLabel = document.querySelector('.label');

	view = new View(window.innerWidth, window.innerHeight, controller.zoom);
	document.body.appendChild(view.el);

	view.el.addEventListener('mousemove', function (e) {
		var point = view.getPoint(e);
		var tuple = multigrid.getTuple(point);

		var intersectionTuple;
		var gridIds;
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
				var dist = new Complex(intersection[0]).sub(point).abs();
				if (minDist === null || dist < minDist) {
					minDist = dist;
					nearestIntersection = intersection;
				}
			});

			return nearestIntersection;
		})();

		cache.coords = nearestIntersection[1];

		intersectionTuple = multigrid.getTuple(nearestIntersection[0]);
		gridIds = [cache.coords[0][0], cache.coords[1][0]];
		polygon = multigrid.getPolygon(intersectionTuple, gridIds);

		window.requestAnimationFrame(function () {
			textLabel.innerHTML = tuple;

			var overlayCtx = view.getContext('overlay');

			view.clearContext(overlayCtx);
			overlayCtx.lineWidth = 2 / view.zoom;

			overlayCtx.fillStyle = 'hsla(0, 100%, 100%, 0.3)';
			overlayCtx.beginPath();
			multigrid.renderPolygon(overlayCtx, null, polygon);
			overlayCtx.fill();
			overlayCtx.stroke();
			overlayCtx.closePath();

			overlayCtx.fillStyle = 'white';
			overlayCtx.beginPath();
			view.drawPoint(overlayCtx, cache.interpolated, 10);
			overlayCtx.fill();
			overlayCtx.closePath();
		});

	});

	view.el.addEventListener('mousedown', function (e) {
		var point = view.getPoint(e);
		var cell;

		if (e.ctrlKey) {
			startPoint = point;
			controller.update();
		} else if (view.getContextName(e.target) === 'overlay') {
			controller.gameOfLifeStream.postMessage({
				type: 'toggle',
				cell: multigrid._getCellCoordinates(cache.coords)
			});
		}
	});

	document.addEventListener('keydown', function (e) {
		if (e.keyCode === 16) {
			view.getContext('tiles').canvas.style.opacity = 0;
		}
	});
	document.addEventListener('keyup', function (e) {
		if (e.keyCode === 16) {
			view.getContext('tiles').canvas.style.opacity = 1;
		}
	});


	var gui = new dat.GUI();

	var f1 = gui.addFolder('Multigrid params');
	var f2 = gui.addFolder('Game of Life');

	f1.add(params, 'angleStep').listen();
	f1.add(controller, 'autoAngle');
	f1.add(controller, 'randomAngle').listen();
	f1.add(params, 'shift', 0, 1);
	f1.add(params, 'gridsNum').min(2).step(1);
	f1.add(params, 'linesNum').min(1).step(1);
	f1.add(controller, 'zoom', 1);
	f1.add(controller, 'isSkipOverflow');

	f2.add(controller, 'toBirth');
	f2.add(controller, 'toSurvive');
	f2.add(controller, 'coverage').min(0).max(1);
	f2.add(controller, 'golRandom');
	f2.add(controller, 'golStep');
	var runGol = f2.add(controller, 'golRun');
	f2.add(controller, 'isNeumannOnly');

	runGol.onChange(controller.golToggleRun.bind(controller));

	gui.add(controller, 'update');

	f1.open();
	f2.open();

	controller.start();
};

}).call(null);