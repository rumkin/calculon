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
        let loca = location();
        return {
            type: type,
            value: value,
            line: loca.start.line,
            column: loca.start.column
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
    = _ value:(math) _ EOF { return value; }

EOF
    = !.

math
    = left:expr __ op:operator __ right:math { return token(op, [left, right]); }
    / expr

pos
    = '+' _ value:pointer {return token('pos', value); }
    / neg

neg
    = '-' _ value:pointer {return token('neg', value); }
    / pointer

expr
    = target:(pos) filters:filters+ { return token('expr', [target].concat(filters)); }
    / pos

filters
    =  __ "|" _ filter:literal args:(filter_args)* {return token('filter', [filter].concat(args))};

filter_args
    = space+ '_' { return token('place'); }
    / space+ value:(filter_arg) { return value; }

filter_arg
    = pointer

primitive
	= float / integer / bool / null / string / regex

float
	= pre:number "." post:digits { return token('float', parseFloat(pre + '.' + post, 10)) ; }

integer
	=  pre:(number / digits) { return token('integer', parseInt(pre, 10)); }

number
	= head:(number_head / digit) tail:('_' trinity)* {
	    return join(head, tail, 1).join('');
	}

// symbol
//    = '@' value:literal { return token('symbol', value.value); }

number_head
    = value:(digit digit digit?) { return value.join(''); }

trinity
    = value:(digit digit digit) { return value.join(''); }

digits
    = value:[0-9]+ { return value.join('') };

digit
    = [0-9]

bool
	= "true" { return token('bool', true); }
	/ "false" { return token('bool', false); }

null
	= "null" { return token('null'); }

undefined
    = "undefined" { return token('undefined'); }

space "whitespace"
    = ' '
    / '\t'
    / '\v'

linebreak
    = '\n'
    / '\r\n'
_
   = space*

__
  = (linebreak / space)*

template
    = '`' str:(template_item)* '`' { return token('template', joinTemplate(str)); }

template_item
    = '${' _ value:math _ '}' { return value; }
    / value:( escape / '\\$' ) { return value; }
    / value:( '\\`' ) { return value.slice(1); }
    / [^`]

string
    = double_quoted
    / single_quoted

double_quoted
    = '"' str:(escape / '\\"' / [^\\"\n] )* '"' { return token('string', str.join('')); }

single_quoted
    = "'" str:(escape / "\\'" / [^\\'\n] )* "'" { return token('string', str.join('')); }

escape
	= '\\\\' { return '\\\\'; }
  / '\\t' { return '\t'; }
  / '\\n' { return '\n'; }
  / '\\.' { return '.' }
  / '\\r' { return '\r'; }

regex
    = '/' value:(regex_escape / [^\/])* '/' flags:( regex_flags* ) { return token('regex', [value.join(''), flags.join('')]); }

regex_escape
    = '\\/'
    / '\\\\'
    / '\\['
    / '\\^'
    / '\\.'
    / '\\$'
    / '\\*'
    / '\\+'
    / '\\?'
    / '\\('
    / '\\)'
    / '\\{'
    / '\\|'

regex_flags
    = 'i'
    / 'g'
    / 'm'
    / 'u'

pointer
    = begin:(point / literal) path:(path)+ { return token('pointer', [begin].concat(path) ); }
    / point
    / value:literal { return token('pointer', [value]); }

point
    = primitive / template / array / object / group / ast

array
    = '[' _ value:(arg_list _)? ']' { return token('array', value ? value[0] : []); }

ast
    = '@{' _ value:math _ '}' { return token('ast', value); }

object "Object"
    = '{' __ first:object_pair rest:(__ ',' __ object_pair)* __ '}' { return token('object', join(first, rest, 3)); }
    / '{' __ '}' { return {type:'object', value:[]}; }

object_pair
    = key:object_key __ ':' __ value:math { return [key, value] };

object_key
    = literal
    / string
    / float
    / integer
    / '[' _ value:math _ ']' { return value; }

group
    = '(' _ value:math _ ')' {return token('group', value); }

args
    = '(' _ value:(arg_list _)? ')' { return token('args', value ? value[0] : []); }

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

index = '[' _ value:(path_list / path_index / path_range / path_last) _  ']' { return value }

path_index
    = value:(math) !(_ ',' / _ '..') { return token('index', value); }

path_range
    = start:(integer / pointer) '..' end:(integer / pointer)? { return token('range', [start, end]); };

path_list
    = first:( list_value ) others:( _ list_items )+ { return token('list', join(first, others, 1)); }
    / value:list_nest { return {type: 'list', value:[value] };}

path_last
    = '*' { return token('last'); }

list_items
    = "," _ value:(list_value) { return value; }

list_value
    = list_nest
    / math

list_nest
    = key:(string / integer / literal / group) _ ':' _ names:(array) { return token('decomp', [key, names]) }

literal "Literal"
    = a:[A-Za-z_$] b:([A-Za-z0-9_$]*) { return token('literal', a + b.join('')); }

operator
    = '+'
    / '-'
    / '*'
    / '/'
    / '%'
    / '^'
    / '=='
    / '!='
    / '...'
