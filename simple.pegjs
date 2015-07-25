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
}

start
    = _ value:expr _ { return value; }

math
    = left:expr _ op:operator _ right:math { return {type:op, value: [left, right]}; }
    / expr

pos
    = '+' ws* value:val {return {type: 'pos', value:value}; }
    / neg

neg
    = '-' ws* value:val {return {type: 'neg', value:value}; }
    / val

expr
    = target:(pos) filters:filters+ { return {type: 'expr', value:[target].concat(filters) }; }
    / left:pos _ op:operator _ right:math { return {type:op, value: [left, right]}; }
    / pos

val
    = pointer / array / group

group
    = '(' _ value:expr _ ')' {return {type: 'group', value: value}; }

filters
    =  ws* "|" ws* filter:literal args:(filter_args)* {return {type: 'filter', value:[filter].concat(args) }};

filter_args
    = " "+ value:(filter_arg) { return {type: 'arg', value: value}; }

filter_arg
    = pointer / primitive / array / group


primitive
	= float / integer / bool / null / string

float
	= pre:number "." post:digit { return {type: 'float', value: parseFloat(pre + '.' + post, 10)} ; }

integer
	=  pre:number { return {type: 'integer', value: parseInt(pre, 10) }; }

number
	= value:[0-9_]+ { return value.join('').replace(/_/g,''); }

digit
    = value:[0-9]+ { return value.join('') };

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
    = float / integer / string / bool / null / array / group

array
    = '[' _ value:(arg_list _)? ']' { return {type: 'array', value: value ? value[0] : []}; }

args
    = '(' _ value:(arg_list _)? ')' { return {type: 'args', value: value ? value[0] : []}; }

arg_list
    = first:list_value _ others:(',' _ others:list_value _)* { return join(first, others, 2); }

path
    = path_literal
    / index
    / args

path_literal
    = '.' value:literal { return value; }

index = '[' ' '* value:(path_list / path_index / path_range ) ' '* ']' { return value; }

path_index
    = value:math !(_ ',' / _ '..') { return {type:'index', value:value}; }

path_range
    = start:(integer / pointer) '..' end:(integer / pointer)? { return {type: 'range', value:[start, end]}; };

path_list
    = first:( list_value ) others:( list_items )+ { return { type: 'list', value: [first].concat(others) }; }

list_items
    = " "* "," " "* value:(list_value) { return value; }

list_value
    = math

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