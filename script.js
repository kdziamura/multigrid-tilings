var grids = 5;
var multigrid;

var angleStep = (1 + grids % 2) * Math.PI / grids;
angleStep = Math.random() * 2 * Math.PI;

var params = {
	angleStep: angleStep,
	shift: 1 / grids,
	gridsNum: grids,
	linesNum: 20
};

multigrid = Multigrid.byParams(params);



var canvas = document.querySelectorAll('canvas')[0];
var ctx = canvas.getContext('2d');
var translate = [canvas.width / 2, canvas.height / 2];
var zoom = 10;


var canvasOverlay = document.querySelectorAll('canvas')[1];
var ctxOverlay = canvasOverlay.getContext('2d');

ctx.translate(translate[0], translate[1]);
ctx.scale(zoom, zoom);
ctx.lineWidth = 1 / zoom;

ctxOverlay.translate(translate[0], translate[1]);
ctxOverlay.scale(zoom, zoom);
ctxOverlay.lineWidth = 1 / zoom;



var textLabel = document.querySelector('.label');
document.addEventListener('mousemove', function (e) {
	var totalOffsetX = 0;
	var totalOffsetY = 0;
	var canvasX = 0;
	var canvasY = 0;
	var currentElement = e.target;
	var point;
	var tuple;
	var interpolated;

	while (currentElement) {
		totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
		totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
		currentElement = currentElement.offsetParent;
	}

	canvasX = e.pageX - totalOffsetX;
	canvasY = e.pageY - totalOffsetY;

	point = new Complex(canvasX - translate[0], canvasY - translate[1]).div(zoom);
	tuple = multigrid.getTuple(point);

	interpolated = multigrid.getVertice(tuple);


	textLabel.innerHTML = tuple;

	window.requestAnimationFrame(function () {
		ctxOverlay.clearRect(-translate[0], -translate[1], 2 * translate[0], 2 * translate[1]);
		// ctxOverlay.beginPath();
		// ctxOverlay.moveTo(point.re, point.im);
		// ctxOverlay.lineTo(interpolated.re, interpolated.im);
		// ctxOverlay.stroke();

		ctxOverlay.beginPath();
		ctxOverlay.arc(interpolated.re, interpolated.im, 0.2, 0, 2 * Math.PI);
		ctxOverlay.closePath();
		ctxOverlay.fill();
	});

});






// window.requestAnimationFrame(function animate() {
	// ctx.clearRect(-translate[0], -translate[1], 2 * translate[0], 2 * translate[1]);


	// multigrid._renderGrids(ctx);
	// multigrid._renderIntersections(ctx);



	// multigrid._renderTiles(ctx);

	var worker = new Worker('data_stream.js');

	worker.addEventListener('message', function(e) {
	  requestAnimationFrame(function() {
	  	multigrid.renderTiles(ctx, e.data);
	  });
	}, false);

	worker.postMessage(params);

	// multigrid.render(ctx);

	// setTimeout(function () {
	// 	multigrid = Multigrid.byParams(angleStep, 1 / grids, grids, 20);
	// 	window.requestAnimationFrame(animate);
	// }, 0);
// });
