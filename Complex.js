window.Complex = (function() {


	var math = (function () {
		var math;

		math = {
			sinh: Math.sinh || function(angle) {
				var temp = Math.exp(angle);
				return (temp - 1/temp) / 2;
			},

			cosh: Math.cosh || function(angle) {
				var temp = Math.exp(angle);
				return (temp + 1/temp) / 2;
			},

			sin: Math.sin,
			cos: Math.cos
		};

		return math;
	})();

	function parsePart (string) {
		var number = parseFloat(string);
		if (isNaN(number)) {
			if (string.indexOf('-') !== -1) {
				number = -1;
			} else {
				number = 1;
			}
		}
		return number;
	}

	function registerAliases (options) {
		var method, i, aliases, alias;
		for (method in options) {
			aliases = options[method];
			for (i = 0; i < aliases.length; i++) {
				alias = aliases[i];
				Complex.prototype[alias] = Complex.prototype[method];
			}
		}
	}

	function Complex (re, im) {
		if (typeof re === 'number') {
			this.re = re;
			this.im = im === undefined ? 0 : im;
		} else {
			this.re = re.re;
			this.im = re.im;
		}
	}

	Complex.toComplex = function (number) {
		if (typeof number === 'number') {
			return new Complex(number);
		} else {
			return number;
		}
	};

	Complex.fromPolar = function (r, phi) {
		var re = r * math.cos(phi),
			im = r * math.sin(phi);
		return new Complex(re, im);
	};

	Complex.fromString = function (string) {
		var complexRegexp = /([-+]?(?:\d*\.?\d+)?i)|([-+]?\d*\.?\d+)/g,
			values = string.match(complexRegexp),
			i, value,
			re = 0,
			im = 0;

		for (i = 0; i < values.length; i++) {
			value = parsePart(values[i]);
			if (values[i].indexOf('i') !== -1) {
				im += value;
			} else {
				re += value;
			}
		}

		return new Complex(re, im);
	};

	Complex.prototype = {
		copy: function() {
			return new Complex(this.re, this.im);
		},

		add: function(number) {
			if (typeof number === 'number') {
				this.scalarAdd(number);
			} else {
				this.re += number.re;
				this.im += number.im;
			}

			return this;
		},

		sub: function(number) {
			if (typeof number === 'number') {
				this.scalarAdd(-number);
			} else {
				this.re -= number.re;
				this.im -= number.im;
			}

			return this;
		},

		scalarAdd: function(number) {
			this.re += number;
			return this;
		},

		mul: function(number) {
			var a, b, c, d;

			if (typeof number === 'number') {
				this.scalarMul(number);
			} else {
				a = this.re;
				b = this.im;
				c = number.re;
				d = number.im;

				this.re = a * c - b * d;
				this.im = b * c + a * d;
			}

			return this;
		},

		div: function(number) {
			var a, b, c, d, divider;

			if (typeof number === 'number') {
				this.scalarDiv(number);
			} else {
				a = this.re;
				b = this.im;
				c = number.re;
				d = number.im;
				divider = c * c + d * d;

				if (a === 1 && b === 0) {
					this.re = c / divider;
					this.im = -(d / divider);
				} else {
					this.re = (a * c + b * d) / divider;
					this.im = (b * c - a * d) / divider;
				}
			}

			return this;
		},

		scalarMul: function(number) {
			this.re *= number;
			this.im *= number;

			return this;
		},

		scalarDiv: function(number) {
			this.re /= number;
			this.im /= number;

			return this;
		},

		dot: function(number) {
			return this.re * number.re + this.im * number.im;
		},

		conj: function() {
			this.im = -this.im;
			return this;
		},

		pow: function(number) {
			var complex = Complex.toComplex(number);

			var x = Complex(Math.log(this.abs()), Math.atan2(this.im, this.re)).mul(complex),
				r = Math.exp(x.re);

			this.re = r * math.cos(x.im);
			this.im = r * math.sin(x.im);

			return this;
		},

		sqrt: function() {
			var r = this.abs(),
				re, im;

			if (this.re >= 0) {
				re = 0.5 * Math.sqrt(2 * (r + this.re));
			} else {
				re = Math.abs(this.im) / Math.sqrt(2 * (r - this.re));
			}

			if (this.re <= 0) {
				im = 0.5 * Math.sqrt(2 * (r - this.re));
			} else {
				im = Math.abs(this.im) / Math.sqrt(2 * (r + this.re));
			}

			if (this.im >= 0) {
				this.re = re;
				this.im = im;
			} else {
				this.re = re;
				this.im = -im;
			}

			return this;
		},

		neg: function() {
			this.re = -this.re;
			this.im = -this.im;
			return this;
		},

		sin: function() {
			var re = this.re,
				im = this.im;

			this.re = math.sin(re) * math.cosh(im);
			this.im = math.cos(re) * math.sinh(im);
			return this;
		},

		cos: function() {
			var re = this.re,
				im = this.im;

			this.re = math.cos(re) * math.cosh(im);
			this.im = - math.sin(re) * math.sinh(im);
			return this;
		},

		sinh: function() {
			var re = this.re,
				im = this.im;

			this.re = math.sinh(re) * math.cos(im);
			this.im = math.cosh(re) * math.sin(im);
			return this;
		},

		cosh: function() {
			var re = this.re,
				im = this.im;

			this.re = math.cosh(re) * math.cos(im);
			this.im = math.sinh(re) * math.sin(im);
			return this;
		},

		tan: function() {
			var re = this.re,
				im = this.im,
				divider = math.cos(2 * re) + math.cosh(2 * im);

			this.re = math.sin(2 * re) / divider;
			this.im = math.sinh(2 * im) / divider;
			return this;
		},

		tanh: function() {
			var re = this.re,
				im = this.im,
				divider = math.cosh(2 * a) + math.cos(2 * b);

			this.re = math.sinh(2 * re) / divider;
			this.im = math.sin(2 * im) / divider;
			return this;
		},

		log: function(base) {
			var re, im;

			base = base || 0;

			re = Math.log(this.abs());
			im = this.arg() + base * 2 * Math.PI;

			this.re = re;
			this.im = im;

			return this;
		},

		exp: function() {
			var complex = Complex.fromPolar(Math.exp(this.real), this.im);
			this.re = complex.re;
			this.im = complex.im;

			return this;
		},

		rotate: function(angle) {
			var re, im,
				cos = math.cos(angle),
				sin = math.sin(angle);

			re = this.re * cos - this.im * sin;
			im = this.re * sin + this.im * cos;

			this.re = re;
			this.im = im;

			return this;
		},

		abs: function() {
			return Math.sqrt(this.re * this.re + this.im * this.im);
		},

		arg: function() {
			return Math.atan2(this.im, this.re);
		},

		is: function(number) {
			var result = false;

			if (typeof number === 'number') {
				result = this.im === 0 && this.re === number;
			} else {
				result = this.re === number.re && this.im === number.im;
			}
		},

		toString: function() {
			var text = '',
				re = this.re,
				im = this.im;

			if (re !== 0) {
				text += re;
			}

			if (im > 0) {
				text += (re === 0 ? '' : '+') + (im === 1 ? '' : im) + 'i';
			} else if (im < 0) {
				text += im + 'i';
			}

			return text || '0';
		}
	};

	var aliases = {
		arg: ['angle', 'phase'],
		copy: ['clone']
	};

	registerAliases(aliases);


	return Complex;
})();