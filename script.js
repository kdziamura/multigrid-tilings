var grids = 5;
var zoom = 15;
var side = 1000;

var multigrid;

var params = {
	angleStep: (1 + grids % 2) * Math.PI / grids,
	shift: 1 / grids,
	gridsNum: grids,
	linesNum: 50
};

function render (e) {
	requestAnimationFrame(function() {
		multigrid.renderTiles(tilesCtx, e.data);
	});
}

var controller = {
	reset: function () {
		this.worker.removeEventListener('message', render, false);
		this.worker.terminate();
		this.worker = null;

		requestAnimationFrame(function() {
			gridsCtx.clearRect(-side/2, -side/2, side, side);
			tilesCtx.clearRect(-side/2, -side/2, side, side);
		});
	},

	start: function () {
		this.worker = new Worker('data_stream.js');

		if (this.randomAngle) {
			params.angleStep = Math.random() * 2 * Math.PI;
		}

		multigrid = Multigrid.byParams(params);

		this.worker.addEventListener('message', render, false);

		this.worker.postMessage(params);

		requestAnimationFrame(function() {
			multigrid._renderGrids(gridsCtx);
		});
	},

	update: function () {
		this.reset();
		this.start();
	},

	autoAngle: function () {
		params.angleStep = (1 + params.gridsNum % 2) * Math.PI / params.gridsNum;
	},
	randomAngle: false,

	worker: null
};




window.onload = function() {
	var gridsCvs = document.createElement('canvas');
	var tilesCvs = document.createElement('canvas');
	var overlayCvs = document.createElement('canvas');

	gridsCvs.classList.add('grids');
	tilesCvs.classList.add('tiles');
	overlayCvs.classList.add('overlay');

	gridsCtx = gridsCvs.getContext('2d');
	tilesCtx = tilesCvs.getContext('2d');
	overlayCtx = overlayCvs.getContext('2d');


	_.each([gridsCtx, tilesCtx, overlayCtx], function (ctx) {
		ctx.canvas.width = side;
		ctx.canvas.height = side;
		ctx.translate(side/2, side/2);
		ctx.scale(zoom, zoom);
		ctx.lineWidth = 1 / zoom;

		document.body.appendChild(ctx.canvas);
	});

	overlayCtx.fillStyle = 'white';


	var textLabel = document.querySelector('.label');
	document.addEventListener('mousemove', function (e) {
		var point = new Complex(e.pageX - side/2, e.pageY - side/2).div(zoom);
		var tuple = multigrid.getTuple(point);

		var interpolated = multigrid.getVertice(tuple);

		textLabel.innerHTML = tuple;

		window.requestAnimationFrame(function () {
			overlayCtx.clearRect(-side/2, -side/2, side, side);

			overlayCtx.beginPath();
			overlayCtx.arc(interpolated.re, interpolated.im, 0.4, 0, 2 * Math.PI);
			overlayCtx.closePath();
			overlayCtx.fill();
		});

	});



	var gui = new dat.GUI();

	gui.add(params, 'angleStep').listen();
	gui.add(controller, 'autoAngle');
	gui.add(controller, 'randomAngle').listen();
	gui.add(params, 'shift', 0, 1);
	gui.add(params, 'gridsNum').min(2).step(1);
	gui.add(params, 'linesNum').min(1).step(1);
	gui.add(controller, 'update');


	controller.start();
};
