var _ = {};

_.clone = function (array) {
	var length = array.length;
	var copy = new Array(length);
	var i;

	for (i = 0; i < length; i++) {
		copy[i] = array[i];
	}

	return copy;
};

_.each = function (array, callback) {
	var length = array.length;
	var i;

	for (i = 0; i < length; i++) {
		callback(array[i], i, array);
	}

	return array;
};

_.map = function (array, callback) {
	var length = array.length;
	var copy = new Array(length);
	var i;

	for (i = 0; i < length; i++) {
		copy[i] = callback(array[i], i, array);
	}

	return copy;
};

_.reduce = function (array, callback, initial) {
	var length = array.length;
	var i;
	var result = initial;

	for (i = 0; i < length; i++) {
		result = callback(result, array[i], i, array);
	}

	return result;
};