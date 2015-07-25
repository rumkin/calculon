void function () {
    "use strict";

    var parser = require('./parser.js');

    exports.parser = parser;
    exports.new = function(options) {
        return newEvaluator(options);
    };
    exports.eval = exports.new();

    function newEvaluator(options) {
        options = options || {
            primitives: false
        };

        function evaluate(expression, scope) {
            var ast = parser.parse(expression);
            scope = scope || {};

            return expr(ast, scope);
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

                args = token.value.slice(1).map(function(token){
                    if (token.value.type === 'group') {
                        return expr(token.value.value, scope);
                    } else {
                        return extract(token.value, scope, scope);
                    }
                });

                args.unshift(value);
                value = filter.apply(scope, args);
                filters.shift();
            }

            return value;
        }

        // Something very odd but it's 07:09. So who cares...
        function expr(ast, scope, inner) {
            var value, left, right;

            switch(ast.type) {
                case 'expr':
                    value = extract(ast.value[0], scope, scope);
                    value = filter(ast.value.slice(1), value, scope);
                    break;

                case 'group':
                    value = expr(ast.value, scope);
                    break;

                default:
                    left = expr(ast.value[0], scope, true);
                    right = expr(ast.value[1], scope, true);

                    value = [left, ast.type, right];
            }

            if (inner || !Array.isArray(value)) return value;

            value = flatten(value);

            var precedence = ['mod', 'del', 'mul', 'sub', 'add'];
            var op, i, result;

            while (precedence.length || value.length > 1) {
                op = precedence.shift();
                while (~(i = value.indexOf(op))) {
                    left = value[i-1];
                    right = value[i+1];
                    switch(op) {
                        case 'mul':
                            result = left * right;
                            break;
                        case 'del':
                            result = left / right;
                            break;
                        case 'sub':
                            result = left - right;
                            break;
                        case 'add':
                            result = left + right;
                            break;
                        case 'mod':
                            result = left % right;
                            break;
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
                    return extract(token, scope, null);
                });
            } else if (ast.type === 'null') {
                return null;
            } else if (ast.type === 'undefined') {
                return undefined;
            } else if (ast.type !== 'pointer') {
                return ast.value;
            }

            var result = scope;

            var select = ast.value.slice();
            var token, index, i, l, items;
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
                            return extract(token, scope, null);
                        });
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

                        if (token.type === 'pointer' || token.type === 'array') {
                            index = extract(token, scope, result);
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
                            index = extract(items[0], scope, result);

                            if (result.hasOwnProperty(index)) {
                                keys.push(index);
                                items.shift();
                            }
                        }

                        result = pick(keys, result);
                        break;
                    case 'args':
                        if (typeof result !== 'function') return undefined;

                        items = select[i].value.slice();
                        var newCtx;
                        var args = [];
                        while(items.length) {
                            args.push(extract(items.shift(), scope, result));
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
                var i, l, key;
                i = -1;
                l = keys.length;

                while (++i < l) {
                    key = keys[i];

                    if (isArray) {
                        list.push(result[key]);
                    } else {
                        list[key] = result[key];
                    }
                }

                return list;
            }

            return result;
        }

        function isPrimitive(target) {
            return target !== null && typeof target !== 'object';
        }

        function flatten() {
            var flat = [];
            for (var i = 0; i < arguments.length; i++) {
                if (arguments[i] instanceof Array) {
                    flat.push.apply(flat, flatten.apply(this, arguments[i]));
                } else {
                    flat.push(arguments[i]);
                }
            }
            return flat;
        }

        return evaluate;
    }


}();
