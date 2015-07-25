var simple = require('./eval.js');

var len = 10000;
var bigList = new Array(len);

while (--len) {
    bigList[len] = len;
}

var scope = {
    props: ['a', 'b', 'b1', 'c', 'f'],
    a: {
        b: [1, 2, 3, 4, 5],
        b1: "hello",
        pipe: function(value) {
            return function(){
                return {
                    value: function(){
                        value.constructor = [3];
                        return value;
                    }
                };
            };
        },
        through: function(value){
            return value;
        },
        bigList: bigList
    },
    c: {
        f: {
            x: 1
        }
    },
    'true': {
        not: function(){
            return 'not true';
        }
    },
    multiply: function(target, value) {
        if (Array.isArray(target)){
            target = target.map(function(target){
                return target * value;
            });
        } else if (typeof target === 'number') {
            target = target * value;
        } else {
            target = NaN;
        }

        return target;
    },
    add: function(target, value) {
        if (Array.isArray(target)){
            target = target.map(function(target){
                return target + value;
            });
        } else if (typeof target === 'number') {
            target = target + value;
        } else {
            target = NaN;
        }

        return target;
    },
    wrap: function (target, start, end) {
        if (Array.isArray(target)){
            target = target.map(function(target){
                return start + target + end;
            });
        } else {
            target = start + target + end;
        }

        return target;
    },
    concat: function(target, value) {
        return target.concat(value);
    },
    times: function(v) {
        var array = new Array(v);
        while(v--) {
            array[v] = String.fromCharCode(75 + v);
        }
        return array;
    }
};

var start = Date.now();
var times = 100000;

//for (var i = 0, l = 100; i < l; i++) {
//    simple.eval(process.argv[2], scope)
//}

var eval2 = simple.new({
    primitives: {
        boolean: {
            not: function() {
                return !this;
            }
        },
        number: {
            not: function() {
                return -this;
            },
            add: function(value) {
                return this + value;
            }
        }
    }
});
//

var result = simple.parse(process.argv[2]);
console.log(result);

var out = eval2.expr(result, scope);
for (var i = 0, l = times; i < l; i++) {
    out = eval2.expr(result, scope);
}

console.log(out);

var end = Date.now() - start;
console.log('Time: %d sec, %d msec/ops', end/1000, end/times);
