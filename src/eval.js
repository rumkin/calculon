void function () {
    "use strict";

    var parser = require('./parser.js');

    exports.parse = parser.parse;
    exports.new = function(options) {
        return newEvaluator(options);
    };
    exports.eval = exports.new();

    var opTokens = [
        '^', '+', '-', '/', '*', '%', '==', '!=', '...'
    ];

    var exprTokens = [
        'expr', 'pos', 'neg', 'group'
    ].concat(opTokens);

    function newEvaluator(options) {
        options = options || {
            primitives: false
        };

        function evaluate(expression, scope) {
            var ast = parser.parse(expression);
            scope = scope || {};

            return x(ast, scope);
        }

        function filter(filters, value, scope) {
            filters = filters.slice();
            var token, name, filter, args;

            while (filters.length) {
                token = filters[0];
                if (token.type !== 'filter') {
                    throw new Error('Unexpected token ' + token.type);
                }

                // get literal value
                name = token.value[0].value;

                if (typeof scope[name] !== 'function') {
                    return;
                }

                filter = scope[name];
                var placeholder = -1;

                args = token.value.slice(1).map(function(token, i){
                    if (token.type === 'place') {
                        placeholder = i;
                        return null;
                    } else {
                        return x(token, scope);
                    }
                });

                if (placeholder > -1) {
                    args[placeholder] = value;
                } else {
                    args.unshift(value);
                }

                value = filter.apply(scope, args);
                filters.shift();
            }

            return value;
        }

        function x(token, scope, context) {
            return isExprTok(token) ? expr(token, scope) : extract(token, scope, arguments.length > 2 ? context : scope);
        }

        // Something very odd but it's 07:09. So who cares...
        function expr(ast, scope, inner) {
            var value, left, right;

            switch(ast.type) {
                case 'expr':
                    value = x(ast.value[0], scope);
                    value = filter(ast.value.slice(1), value, scope);
                    return value;
                case 'group':
                    value = x(ast.value, scope);
                    return value;
                case 'pos':
                    return +x(ast.value, scope);
                case 'neg':
                    return -x(ast.value, scope);
                default:
                    value = unwind(ast, scope);

            }

            if (inner || !Array.isArray(value)) return value;

            var precedence = ['^', '%', '/', '*', '-', '+', '==', '!=', '...'];
            var op, i, result;

            while (precedence.length && value.length > 1) {
                op = precedence.shift();
                while (~(i = value.indexOf(op))) {
                    left = value[i-1];
                    right = value[i+1];
                    switch(op) {
                        case '*':
                            result = left * right;
                            break;
                        case '/':
                            result = left / right;
                            break;
                        case '-':
                            result = left - right;
                            break;
                        case '+':
                            result = left + right;
                            break;
                        case '%':
                            result = left % right;
                            break;
                        case '^':
                            result = Math.pow(left, right);
                            break;
                        case '==':
                            result = (left === right);
                            break;
                        case '!=':
                            result = (left !== right);
                        break;
                        case '...':
                            result = concat(left, right);
                            break;
                    }

                    value.splice(i, 2);
                    value[i-1] = result;
                }
            }

            return value[0];
        }


        function extract(ast, scope, context) {
            if (ast.type === 'array') {
                return ast.value.map(function(token){
                    return x(token, scope, scope);
                });
            } else if (ast.type === 'object') {
                return ast.value.reduce(function(result, pair) {
                    var key = x(pair[0], scope);
                    var value = x(pair[1]);

                    result[key] = value;

                    return result;
                }, {});
            } else if (ast.type === 'template') {
                return ast.value.map(function(token){
                    return x(token, scope, scope);
                }).join('');
            } else if (ast.type === 'null') {
                return null;
            } else if (ast.type === 'regex') {
                return new RegExp(ast.value[0], ast.value[1]);
            } else if (ast.type === 'ast') {
                return ast;
            } else if (ast.type === 'undefined') {
                return undefined;
            } else if (ast.type !== 'pointer') {
                return ast.value;
            }

            var result = scope;

            var select = ast.value.slice();
            var token, index, i, l, items, item;
            i = -1;
            l = select.length;

            while (++i < l) {
                switch(select[i].type) {
                    case 'integer':
                    case 'float':
                    case 'bool':
                    case 'string':
                        result = select[i].value;
                        context = result;

                        break;
                    case 'array':
                        result = context = select[i].value.map(function(token){
                            return x(token, scope, scope);
                        });
                        break;
                    case 'group':
                        result = context = expr(select[i].value, scope);
                        break;
                    case 'literal':
                        token = select[i];
                        index = token.value;

                        // Access to prototype's constructor is declined

                        if (result === null || result === undefined) {
                            return undefined;
                        } else if (! isPrimitive(result)) {

                            if (index === 'constructor' && !result.hasOwnProperty(index)) {
                                throw new Error('Access to constructor is declined');
                            }

                            context = result;
                            result = result[index];
                        } else if (options.primitives) {
                            var type = typeof result;
                            if (type in options.primitives && index in options.primitives[type]) {
                                context = result;
                                result = options.primitives[type][index];
                            } else {
                                return undefined;
                            }
                        } else {
                            return undefined;
                        }

                        break;
                    case 'index':
                        token = select[i].value;


                        if (isExprTok(token)) {
                            index = expr(token, scope);
                        } else if (token.type === 'pointer' || token.type === 'array') {
                            index = extract(token, scope, scope);
                        } else {
                            index = token.value;
                        }

                        if (result === null || result === undefined) {
                            return undefined;
                        } else if (! isPrimitive(result)) {

                            if (index === 'constructor' && !result.hasOwnProperty(index)) {
                                throw new Error('Access to constructor is declined');
                            }

                            context = result;
                            if (Array.isArray(index)) {
                                result = pick(index, result);
                            } else {
                                result = result[index];
                            }
                        } else if (options.primitives) {
                            var type = typeof result;
                            if (type in options.primitives && index in options.primitives[type]) {
                                context = result;
                                result = options.primitives[type][index];
                            } else {
                                return undefined;
                            }
                        } else {
                            return undefined;
                        }

                        break;
                    case 'range':
                        if (! Array.isArray(result)) return [];

                        var start, end;
                        token = select[i].value;

                        if (token[0].type === 'pointer') {
                            start = extract(token[0].value, scope, result);
                        } else {
                            start = token[0].value;
                        }

                        if (token[1] !== null) {
                            if (token[1].type === 'pointer') {
                                end = extract(token[1].value, scope, result);
                            } else {
                                end = token[1].value;
                            }
                        } else {
                            end = result.length;
                        }


                        if (typeof start !== 'number') return [];
                        if (typeof end !== 'number') return [];

                        context = result;
                        result = result.slice(start, end);

                        break;
                    case 'list':
                        items = select[i].value.slice();
                        var keys = [];

                        while (items.length) {
                            item = items[0];
                            if (item.type === 'decomp') {
                                index = x(item.value[0], scope);

                                if (result.hasOwnProperty(index)) {
                                    keys.push({from:index, keys: x(item.value[1], scope)});
                                }
                            } else {
                                index = x(items[0], scope);
                                if (result.hasOwnProperty(index)) {
                                    keys.push(index);
                                }
                            }


                            items.shift();
                        }

                        result = pick(keys, result);
                        break;
                    case 'args':
                        if (typeof result !== 'function') return undefined;

                        items = select[i].value.slice();
                        var newCtx;
                        var args = [];
                        while(items.length) {
                            args.push(x(items.shift(), scope));
                        }

                        newCtx = result;
                        if (select[i-1].type === 'args') {
                            context = scope;
                        }

                        result = result.apply(context, args);
                        context = result;

                        break;
                    default:
                        throw new Error('Unexpected token ' + select[i].type);
                }
            }

            function pick(keys, result) {
                var isArray = Array.isArray(result);
                var list = isArray ? [] : {};
                var i, l, key, val;
                i = -1;
                l = keys.length;

                while (++i < l) {
                    key = keys[i];

                    if (typeof key === 'object') {
                        if (result.hasOwnProperty(key.from) && typeof result[key.from] === 'object') {
                            val = pick(key.keys, result[key.from]);
                        } else {
                            val = {};
                        }
                        key = key.from;
                    } else {
                        val = result[key];
                    }

                    if (isArray) {
                        list.push(val);
                    } else {
                        list[key] = val;
                    }

                }

                return list;
            }

            return result;
        }

        function unwind(ast, scope) {
            var left = ast.value[0];
            var right = ast.value[1];

            var result = [
                x(left, scope),
                ast.type
            ];

            if (isOpTok(right)) {
                result = result.concat(unwind(right, scope));
            } else {
                result.push(x(right, scope));
            }

            return result;
        }

        function concat(a, b) {
            if (!Array.isArray(a)) {
                a = [a];
            }

            return a.concat(b);
        }

        function isPrimitive(target) {
            return target !== null && typeof target !== 'object';
        }

        function isExprTok(token) {
           return exprTokens.indexOf(token.type) > -1;
        }

        function isOpTok(token) {
            return opTokens.indexOf(token.type) > -1;
        }

        evaluate.x = x;
        evaluate.parse = parser.parse;
        return evaluate;
    }


}();
