var should = require('should');
var Simple = require('..');

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
    },
    filters: {
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
        plural: function(v, one, many) {
            return v + ' ' + (v === 1 ? one : many);
        },
        glue: function() {
            return Array.prototype.join.call(arguments, '');
        },
    }
});

var globalScope = {
    foo: 1,
    obj: {
        a: 1,
        b: 2
    },
    user: {
        profile: {
            name: 'John',
            surname: 'Smith',
            age: 54,
            gender: 'male'
        },
        location: {
            city: 'Chicago',
            street: '453'
        }
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

    describe('Values & types', function() {
        test('obj', globalScope.obj);
        test('1', 1);
        test('1_000', 1000);
        test('1_000 + 10_000 + 100_000', 111000);
        test('1.5', 1.5);
        test('-1', -1);
        test('false', false);
        test('true', true);
        test('null', null);
        test('"ok"', 'ok');
        test('\'ok\'', 'ok');
        test('{foo: "bar"}', {foo: "bar"});
        test('{1.0: "bar"}', {1.0: "bar"});
        test('{true: "bar"}', {true: "bar"});
        test('{[1 + 2]: "bar"}', {3: "bar"});
        test('{foo: {bar: true}}', {foo: {bar:true}});
        test('{foo\n:\n{bar: true}}', {foo: {bar:true}});
        test('`Hello ${user.profile.name}!`', 'Hello John!');
        test('`Hello \\`${user.profile.name}\\`!`', 'Hello `John`!');
        test('`This is ${ "Jane" }! She is ${21 | plural "year" "years" } old!`', 'This is Jane! She is 21 years old!');
        test('`This is ${ [[{a: 1}, {b: 1}]][0][1].b | add (1 + 3) }`', 'This is 5');
        test('/^hello$/', /^hello$/);
    });

    describe('Primitives methods', function(){
        test('false.not()', true);
        test('0.add(4).mul(5)', 20);
        test('1.2.add(0.8)', 2);
        test('"hello".reverse()', 'olleh');
    });

    describe('Operators', function () {
        describe('Math', function() {
            test('1 + 2', 3);
            test('1 + 2', 3);
            test('1 + -1', 0);
            test('1 - -1', 2);
            test('2 * 5', 10);
            test('10 / 5', 2);
            test('10 % 5', 0);
            test('10 + (1 * 2) - (16 / (((2 ^ 2))))', 8);
            test('2 ^ 3', 8);
            test('2 + 3 - 1 * 3', 2);
            test('2 + foo', 2 + globalScope.foo);
            test('foo - foo', 0);
            test('[1, 2]...[3, 4]', [1, 2, 3, 4]);
            test('1...[2]', [1, 2]);
            test('1...2', [1, 2]);
            test('1|add 2 + 1|add 2', 6);
            test('(1|add 2 + 1|add 2)', 6);
            test('(1|add (2 | add 3))', 6);
        });

        describe('Logic', function(){
            test('2 == 3', false);
            test('2 != 3', true);
        });

        describe('Order', function(){
            test('1 + 2 == 3', true);
            test('1 + 2 == 3 ^ 2', false);
            test('1 + 3 ^ 2 + 1', 11);
            test('1 + 3 ^ (2 + 1)', 28);
        });
    });

    describe('Filters', function(){
        test('1 | bool', true);
        test('0 | bool', false);
        test('1 | add 2 | sub 1 | mul 2', 4);
        test('1 | add (2 + 1|mul 2)', 5);
        test('0 | or "ok"', 'ok');
        test('false | or "ok"', 'ok');
        test('true | or false', true);
        test('"a" | glue "b" "c"', 'abc');
        test('"b" | glue "a" _ "c"', 'abc');
        test('1\n\t| add 1\n\t| add 1\n\t| add 1', 4);
        test('1|nofilter|add 1', undefined);
    });

    describe('AST', function(){
       test('@{a}', {
           type:'ast',
           value: {
               type: 'pointer',
               value: [
                   {
                       type: 'literal',
                       value: 'a',
                       line: 1,
                       column: 3
                   }
               ],
               line: 1,
               column: 3
           },
           line: 1,
           column: 1
       });
    });

    describe('Values extraction', function(){
        test('obj.a', globalScope.obj.a);
        test('obj["a"]', globalScope.obj.a);
        test('[1,2,3][0 + 1]', 2);
        test('[1,2,3][0 + 1]', 2);
        test('[1,2,3][*]', 3);
        test('[][*]', undefined);
    });

    describe('Decomposition', function(){
        test('[1, 2][1, 0]', [2, 1]);
        test('[1, 2][[0, 1]]', [1, 2]);
        test('[1, 2, 3, 4, 5][1..3]', [2, 3, 4]);
        test('[1, 2, 3, 4, 5][0..1]', [1, 2]);
        test('obj["a", "b"]', {a:globalScope.obj.a, b:globalScope.obj.b});
        test('user["profile":["name"], "location":["city"]]', {profile:{name: "John"}, location: {"city": "Chicago"}});
        test('{a:1,b:2,c:3}["a","b"]', {a:1, b:2});
    });

    describe('Nests', function(){
        test('[1, 2][1, 0]', [2, 1]);
        test('[1, 2][[0, 1]]', [1, 2]);
        test('obj["a", "b"]', {a:globalScope.obj.a, b:globalScope.obj.b});
    });
});
