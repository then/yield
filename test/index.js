'use strict';

var assert = require('assert');
var Promise = require('promise');
var ty = require('../');


function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(undefined); }, time);
  });
}

var ready = Promise.from(null);
function test(description, fn) {
  return ready = ready.then(function () {
    console.log('start ' + description);
    return ty.spawn(fn);
  }).then(function () {
    console.log('passed ' + description);
  }, function (err) {
    console.log('failed ' + description);
    throw err;
  });
}

test('ty.async', function* () {
  var fn1 = ty.async(function* () {
    var x = yield 10;
    var y = yield [5, 27];
    return x + y[0] + y[1];
  });
  assert(fn1() === 42, 'calling a function that only yields values returns a value');
  var fn2 = ty.async(function* () {
    var x = yield Promise.from(10);
    var y = yield [Promise.from(5), Promise.from(27)];
    return x + y[0] + y[1];
  });
  var res2 = fn2();
  assert(typeof res2.then === 'function', 'calling a function that yields promises returns a promise');
  assert((yield res2) === 42, 'it can handle arrays of promises');
});

test('ty.using(Promise.from).async', function* () {
  var fn1 = ty.using(Promise.from).async(function* () {
    var x = yield 10;
    var y = yield [5, 27];
    return x + y[0] + y[1];
  });
  assert((yield fn1()) === 42, 'calling a function that only yields values returns a value');
  var fn2 = ty.using(Promise.from).async(function* () {
    var x = yield Promise.from(10);
    var y = yield [Promise.from(5), Promise.from(27)];
    return x + y[0] + y[1];
  });
  var res2 = fn2();
  assert(typeof res2.then === 'function', 'calling a function that yields promises returns a promise');
  assert((yield res2) === 42, 'it can handle arrays of promises');
});

test('ty.using(Promise.from, delay).async', function* () {
  var step = 0;
  var next;
  var fn = ty.using(Promise.from, function (v) {
    return new Promise(function (resolve) {
      next = function () { resolve(v); };
    });
  }).async(function* () {
    step++;
    var x = yield 10;
    step++;
    var y = yield 20;
    step++;
    var z = yield 12;
    return x + y + z;
  });
  var result = fn();
  assert(step === 1, 'step1');
  next();
  yield delay(50);
  assert(step === 2, 'step2');
  next();
  yield delay(50);
  assert(step === 3, 'step3');
  next();
  assert((yield result) === 42, 'result is 42');
});

ready.done();
