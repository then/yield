'use strict';

exports.using = using;
exports.async = async;
exports.spawn = spawn;
exports.evaluate = evaluate;
function using(castPromise, unwrap) {
  return {
    async: function (fn) { return async(fn, castPromise, unwrap); },
    spawn: function (fn) { return evaluate(fn.apply(null, Array.prototype.slice.call(arguments, 1)), castPromise, unwrap); },
    evaluate: function (generator) { return evaluate(generator, castPromise, unwrap); }
  }
}
function evaluate(generator, castPromise, unwrap) {
  unwrap = unwrap || identity;
  castPromise = castPromise || identity;

  function onNext(value) {
    return handle(generator.next(value));
  }
  function onThrow(error) {
    return handle(generator.throw(error));
  }

  function handle(result){ // { done: [Boolean], value: [Object] }
    if (result.done) return castPromise(result.value);
    return step(unwrap(result.value));
  }
  function step(value) {
    if (isPromise(value)) {
      return when(value, castPromise, step, onThrow);
    }
    if (Array.isArray(value)) {
      if (value.some(isPromise))
        return step(all(value, castPromise));
      else
        return onNext(value);
    }
    if (isGenerator(value)) {
      var result;
      try {
        result = evaluate(value, castPromise, unwrap);
      } catch (ex) {
        return onThrow(ex);
      }
      return step(result);
    }
    return onNext(value);
  }

  return handle(generator.next());
}

function async(makeGenerator, castPromise, unwrap){
  return function (){
    var generator = makeGenerator.apply(this, arguments)
    return evaluate(generator, castPromise, unwrap);
  }
}
function spawn(makeGenerator, castPromise, unwrap){
  var generator = makeGenerator();
  return evaluate(generator, castPromise, unwrap);
}

function identity(v) {
  return v;
}

/**
 * Return true if the value is a promise
 *
 * @param {*} v - maybe a promise
 * @return {Boolean}
 */
function isPromise(v) {
  return v && (typeof v == 'object' || typeof v == 'function') && typeof v.then == 'function';
}

/**
 * Return true if the value is a generator
 *
 * @param {*} v - maybe a generator
 * @return {Boolean}
 */
function isGenerator(v) {
  return v && typeof v.next === 'function' && typeof v.throw === 'function';
}

/**
 * Take an array of promises or values and convert it to a Promise for an array of values.
 * If none of the values are promises, it will return a normal array.
 *
 * @param {Array.<Promise>} array
 * @return {Promise.<Array>|Array}
 */
function all(array, castPromise) {
  return array.reduce(function (accumulator, value) {
    return when(accumulator, castPromise, function (accumulator) {
      return when(value, castPromise, function (value) {
        accumulator.push(value);
        return accumulator;
      });
    });
  }, []);
}

/**
 * Handle either values or promises for natural chaining
 *
 * @param {Promise}  promise - either a promise or a value
 * @param {Function} fn - a function to call when the promise is fullfilled
 *                        or immediately with a value
 * @return {Promise}
 */
function when(promise, castPromise, fn, eb) {
  if (isPromise(promise)) {
    if (castPromise) return castPromise(promise).then(fn, eb);
    else return promise.then(fn, eb);
  }
  else return fn(promise);
}
