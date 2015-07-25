// Copula expression
{
    function pull(target, index) {
        return target.map(function(value){
            return value[index];
        });
    }
}

start
    = add

add
    = left:sub ws* '+' ws* right:add { return {type: 'add', value:[left, right] }; }
    / sub

sub
    = left:del ws* '-' ws* right:sub { return {type: 'sub', value:[left, right] }; }
    / del

del
    = left:mul ws* '/' ws* right:del { return {type: 'del', value:[left, right] }; }
    / mul

mul
    = left:mod ws* '*' ws* right:mul {return {type: 'mul', value:[left, right] }; }
    / mod

mod
    = left:expr ws* '%' ws* right:mod {return {type: 'mod', value:[left, right] }; }
    / expr

expr
    = target:(pointer / primitive / array) filters:filters* " " *{ return {type: 'expr', value:[target].concat(filters) }; }
    / group

group
    = '(' ws* value:add ws* ')' {return {type: 'group', value: value}; }

filters
    =  ws* "|" ws* filter:literal args:(filter_args)* {return {type: 'filter', value:[filter].concat(args) }};

filter_args
    = " "+ value:(pointer / primitive / array / group) { return {type: 'arg', value: value}; }

primitive
	= float / integer / bool / null / string

float
	= sign:("+" / "-")? pre:number "." post:digit { return {type: 'float', value: parseFloat((sign ? sign[0] : '') + pre + '.' + post, 10)} ; }

integer
	= sign:("+" / "-")? pre:number { return {type: 'integer', value: parseInt((sign ? sign[0] : '') + pre, 10) }; }

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
    = ' ' / '\t'

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
    = begin:(float / integer / string / bool / literal / array) path:(path)* { return {type: 'pointer', value: [begin].concat(path) }; }

array
    = '[' ws* first:(list_value) others:(list_items)* ws* ']' { return { type: 'array', value: [first].concat(others) }; }

args
    = '(' ws* first:(list_value) others:(list_items)* ws* ')' { return {type: 'args', value: [first].concat(others) }; }
    / '(' ws* value:(list_value)? ws* ')' { return {type: 'args', value: value ? [value]:[]}; }

path
    = path_literal
    / index
    / args

path_literal
    = '.' value:literal { return value; }

index = '[' ' '* value:(path_list / path_index / path_range ) ' '* ']' { return {type:'index', value:value}; }

path_index
    = integer / string / pointer / array

path_range
    = start:(integer / pointer) '..' end:(integer / pointer)? { return {type: 'range', value:[start, end]}; };

path_list
    = first:( list_value ) others:( list_items )+ { return { type: 'list', value: [first].concat(others) }; }

list_items
    = " "* "," " "* value:(list_value) { return value; }

list_value
    = pointer / primitive / array

literal
    = a:[A-Za-z_$] b:([A-Za-z0-9_$]*) { return {type: 'literal', value: a + b.join('')}; }
