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

_.eachPairs = function (array, callback) {
	var length = array.length;
	var i;
	var j;

	for (i = 0; i < length - 1; i++) {
		for (j = i + 1; j < length; j++) {
			callback(array[i], array[j]);
		}
	}
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

_.findIndex = function (array, check) {
	var length = array.length;
	var i;

	for (i = 0; i < length; i++) {
		if (check(array[i], i, array)) {
			return i;
		}
	}

	return -1;
};

_.contains = function (array, target, fromIndex) {
	fromIndex = (fromIndex < 0 ? Math.max(0, array.length + fromIndex) : fromIndex) || 0;
    return array.indexOf(target, fromIndex) > -1;
};

_.every = function (array, check) {
	var length = array.length;
	var i;

	for (i = 0; i < length; i++) {
		if (!check(array[i], i, array)) {
			return false;
		}
	}

	return true;
};