{
    function join(start, rest, n) {
        var result = [start];

        if (rest.length) {
            var i = -1;
            var len = rest.length;
            while(++i < len) {
                result.push(rest[i][n]);
            }
        }

        return result;
    }

    function token(type, value) {
        return {
            type: type,
            value: value,
            line: line(),
            column: column()
        };
    }

    function joinTemplate(values) {
        var i = -1;
        var l = values.length;
        var result = [];
        var current, item;
        current = '';
        while(++i < l) {
            item = values[i];
            if (typeof item === 'string') {
                if (current !== null) {
                    current += item;
                } else {
                    current = item;
                }
            } else {
                if (current !== null) {
                    result.push({type: 'string', value:current});
                    current = null;
                }
                result.push(item);
            }

            if (i === l - 1 && current) {
                result.push({type: 'string', value: current});
            }
        }

        return result;
    }
}

start
    = _ value:expr _ { return value; }

math
    = left:expr _ op:operator _ right:math { return {type:op, value: [left, right]}; }
    / expr

pos
    = '+' _ value:pointer {return {type: 'pos', value:value}; }
    / neg

neg
    = '-' _ value:pointer {return {type: 'neg', value:value}; }
    / pointer

group
    = '(' _ value:expr _ ')' {return {type: 'group', value: value}; }

expr
    = target:(pos) filters:filters+ { return {type: 'expr', value:[target].concat(filters) }; }
    / left:pos _ op:operator _ right:math { return {type:op, value: [left, right]}; }
    / pos


filters
    =  _ "|" _ filter:literal args:(filter_args)* {return {type: 'filter', value:[filter].concat(args) }};

filter_args
    = " "+ '_' { return {type: 'place'}; }
    / " "+ value:(filter_arg) { return value; }

filter_arg
    = pointer

primitive
	= float / integer / bool / null / string

float
	= pre:number "." post:digits { return {type: 'float', value: parseFloat(pre + '.' + post, 10)} ; }

integer
	=  pre:(number / digits) { return {type: 'integer', value: parseInt(pre, 10) }; }

number
	= head:(number_head / digit) tail:('_' trinity)* {
	    return join(head, tail, 1).join('');
	}

// symbol
//    = '@' value:literal { return {type: 'symbol', value: value.value}; }

number_head
    = value:(digit digit digit?) { return value.join(''); }

trinity
    = value:(digit digit digit) { return value.join(''); }

digits
    = value:[0-9]+ { return value.join('') };

digit
    = [0-9]

bool
	= "true" { return {type: 'bool', value: true}; }
	/ "false" { return {type: 'bool', value: false}; }

null
	= "null" { return {type:'null'}; }

undefined
    = "undefined" { return {type:'undefined'}; }

ws "whitespace"
    = ' '
    / '\t'
    / '\v'
_
   = ws*

template
    = '`' str:(template_item)* '`' { return token('template', joinTemplate(str)); }

template_item
    = '${' _ value:math _ '}' { return value; }
    / value:( escape / '\\$' / '\\`' / [^`] ) { return value; }

string
    = '"' str:(escape / '\\"' / [^\\"\n] )* '"' { return {type: 'string', value: str.join('')}; }
    / "'" str:(escape / "\\'" / [^\\'\n] )* "'" { return {type: 'string', value: str.join('')}; }

double_quoted
    = '"' str:(escape / '\\"' / [^\\"\n] )* '"' { return {type: 'string', value: str.join('')}; }

single_quoted
    = "'" str:(escape / "\\'" / [^\\'\n] )* "'" { return {type: 'string', value: str.join('')}; }

escape
	= '\\\\' / '\\t' / '\\n' / '\\.' / '\\r'

pointer
    = begin:(point / literal) path:(path)+ { return {type: 'pointer', value: [begin].concat(path) }; }
    / point
    / value:literal { return {type:'pointer', value: [value]}; }

point
    = primitive / template / array / object / group

array
    = '[' _ value:(arg_list _)? ']' { return {type: 'array', value: value ? value[0] : []}; }

object
    = '{' _ first:object_pair rest:(_ ',' _ object_pair)* _ '}' { return {type:'object', value: join(first, rest, 3)}; }
    / '{' _ '}' { return {type:'object', value:[]}; }

object_pair
    = key:object_key _ ':' _ value:math { return [key, value] };

object_key
    = literal
    / string
    / float
    / integer
    / '[' value:math ']' {return value;}

args
    = '(' _ value:(arg_list _)? ')' { return {type: 'args', value: value ? value[0] : []}; }

arg_list
    = first:arg_item _ others:(',' _ others:arg_item _)* { return join(first, others, 2); }

arg_item
    = expr

path
    = path_literal
    / index
    / args

path_literal
    = '.' value:literal { return value; }

index = '[' _ value:(path_list / path_index / path_range) _  ']' { return value }

path_index
    = value:(math) !(_ ',' / _ '..') { return {type:'index', value:value}; }

path_range
    = start:(integer / pointer) '..' end:(integer / pointer)? { return {type: 'range', value:[start, end]}; };

path_list
    = first:( list_value ) others:( _ list_items )+ { return { type: 'list', value: join(first, others, 1) }; }
    / value:list_nest { return {type: 'list', value:[value] };}

list_items
    = "," _ value:(list_value) { return value; }

list_value
    = list_nest
    / math

list_nest
    = key:(string / integer / literal / group) _ ':' _ names:(array) { return {type:'decomp', value: [key, names]} }

literal
    = a:[A-Za-z_$] b:([A-Za-z0-9_$]*) { return {type: 'literal', value: a + b.join('')}; }

operator
    = '+'
    / '-'
    / '*'
    / '/'
    / '%'
    / '^'
    / '=='
    / '!='