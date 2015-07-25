var should = require('should');
var Simple = require('./eval.js');

function add(a, b) {
    return a + b;
}

function sub(a, b) {
    return a - b;
}

function mul(a, b) {
    return a * b;
}

function del(a, b) {
    return a / b;
}

function filter(fn) {
    return function(value) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (Array.isArray(value)) {
            return value.map(function(value){
                return fn.apply(null, [value].concat(args));
            });
        } else {
            return fn.apply(null, [value].concat(args));
        }
    }
}

var simple = Simple.new({
    primitives: {
        number: {
            add: function(v) {
                return add(this, v);
            },
            sub: function (v) {
                return sub(this, v);
            },
            mul: function (v) {
                return mul(this, v);
            },
            del: function (v) {
                return del(this, v);
            }
        },
        boolean: {
            not: function() {
                return this === true ? false : true;
            }
        },
        string: {
            reverse: function() {
                var i = this.length;
                var result = '';
                while (i--) {
                    result += this[i];
                }
                return result;
            }
        }
    }
});

var globalScope = {
    add: filter(add),
    sub: filter(sub),
    mul: filter(mul),
    del: filter(del),
    or: function(v, alt) {
        return v || alt;
    },
    bool: function(value) {
        return !! value;
    },
    foo: 1,
    obj: {
        a: 1,
        b: 2
    }
};

function test(str, expect, scope) {
    var ast = simple.parse(str);
    scope = scope || globalScope;
    it('' + str + ' = ' + JSON.stringify(expect), function(){
        var result = simple.x(ast, scope);
        should(result).be.eql(expect);
    });
}

function dump(str, expect, scope) {
    var ast = simple.parse(str);

    console.log(JSON.stringify(ast, null, 2));

    scope = scope || globalScope;
    it('' + str + ' == ' + JSON.stringify(expect), function(){
        var result = simple.x(ast, scope);
        should(result).be.eql(expect);
    });
}

describe('Simple parser', function(){

    describe('Values', function() {
        test('obj', globalScope.obj);
        test('1', 1);
        test('1.5', 1.5);
        test('-1', -1);
        test('false', false);
        test('true', true);
        test('null', null);
        test('"ok"', 'ok');
        test('\'ok\'', 'ok');
    });

    describe('Primitives methods', function(){
        test('false.not()', true);
        test('0.add(4).mul(5)', 20);
        test('"hello".reverse()', 'olleh');
    });

    describe('Math', function(){
        test('(1 + 2)', 3);
        test('(1 + -1)', 0);
        test('(1 - -1)', 2);
        test('(1 + 2).add(2)', 5);
        test('(1 + 2) | add 2', 5);
        test('[1, 2] | add 2', [3, 4]);
        test('[1, 2] | mul 2', [2, 4]);
    });

    describe('Filters', function(){
        test('1 | bool', true);
        test('0 | bool', false);
        test('1 | add 2 | sub 1 | mul 2', 4);
        test('1 | add (2 + 1|mul 2)', 5);
        test('0 | or "ok"', 'ok');
    });

    describe('Decomposition', function(){
        test('[1, 2][1, 0]', [2, 1]);
        test('[1, 2][[0, 1]]', [1, 2]);
        test('obj["a", "b"]', {a:globalScope.obj.a, b:globalScope.obj.b});
    });

    describe('Nests', function(){
        test('[1, 2][1, 0]', [2, 1]);
        test('[1, 2][[0, 1]]', [1, 2]);
        test('obj["a", "b"]', {a:globalScope.obj.a, b:globalScope.obj.b});
    });
});