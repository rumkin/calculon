# Calculon

Rich expressions parser and compiler for DSL written on JavaScript. Calculon is
a subset of JavaScript created for template string rendering. It's inspired by
many languages such a Ruby to create user friendly syntax. It simple but
expressive and contains construction destructuring, array slicing, filters,
pipelining, ast inlining and other cool things.

Calculon is safe and doesn't allow to access to JS properties or overwrite them
from expressions.

Calculon is fault tolerant and tries not to produce any exceptions on runtime.
So undefined filters and variables are normal and produces undefined values.

```calculon
1 | add 2 | mul 5 == 15 // -> true
"b" | concat "a" _ "c" | toUpperCase // -> "ABC"
`Hi there ${ n | plural "time" "times" }!` -> Hi there 1 time.
{
  background: n | gte 1 "red" "green",
  border: `${ [0, 2][n] } + px solid`
} // -> {background: red, border: '2px solid'}
[1, 2, 3, 4][0..n] // -> [0, 1]
```

## Installation

Via npm:

```bash
npm i calculon
```

### Usage

```javascript
const Calculone = require('calculone');
const calc = Calculone.new({
  primitives: {
    number: {
      add(a, b) {
        return a + b;
      }
    }
  },
  filters: {
    add(a, b) {
      return a + b;
    }
  }
});

calc('1.add(1)'); // -> 2
calc('1 | add 1'); // -> 2
```

## Syntax

### Primitives

Calculon contains basic primitives for numbers, strings and booleans.

#### Numbers

Numbers could be defined like so:

```calculon
10
-10
1000
1_000
-1_023.12 == -1023.12
```

Currently calculon supports decimal numbers only.

#### Strings

Strings should be surrounded with single quote, double quote or akut:

```calculon
"Hello"
'Hello'
`Hello`
```

Strings with akut could contain calculon expressions to evaluate:

```calculon
`Hello ${ username | toUpperCase } `
```

#### Booleans

Booleans are the same as in JS:

```calculon
true
false
```

### Arrays

Calculon support arrays:

```calculon
[1, 2, 3]
```

Array could contain values of any type. To get array value by its index use square brackets:

```calculon
[1,2,3][0] // -> 1
```

Also array could return the last item by magic index `*`:

```calculon
[1,2,3,4][*] // -> 4
```

### Objects

Objects are the same as in JS:

```calculon
{a: 1}
{"a": 1}
{["a" + "a"]: 1}
```

### AST

Calculon allow to use ast as a first class citizen. So it allow to pass AST as an arugment or use in other way:

```calculon
@{a.toString()
[@{a | toLowerCase}, @{1 + a}]
```
Example below creates single ast and array of two ast values.

### Smart destructuring

#### Arrays

To get slice from array you can just use simple range extraction:

```calculon
[1, 2, 3, 4][1..2] // -> [2, 3]
```

Or use another array:

```calculon
[1,2,3,4][[1,2]] // -> [2, 3]
```

#### Objects

Calculon allow to get exact keys from object and put it into new object:

```calculon
{a: 1, b: 2, c: 3}['a', 'c'] // -> {a: 1, c: 3}
```

Nested objects can be destructured too:

```calculon
{a: {b: 1, c: 2}}['a':['c']] // -> {a: {c: 2}}
```


### Filters and pipes

Calculon contains filters syntax:

```calculon
"a" | toUpperCase // -> "A"
```

Filters could be piped:

```calculon
"Hello" | toUpperCase | reverse // -> "OLLEH"
```

Filters could have arguments separated with whitespace:

```
"0" | repeat 5 // -> '00000'
```

To pass filtered value to exact position in filters arguments use underscore:

```
"b" | concat "a" _ "c" // -> "abc"
```

#### Define filter

Filters are defines when calculon instantiates with `options.filters`:

```javascript
var eval = Calculon.new({
  filters: {
    add(a, b) {
      return a + b;
    },
  },
});
```

### Primitives' methods

Calculon allows to override methods own methods for primitives. For example we
can define `not` method for booleans to invert boolean value:

```javascript
var eval = Calculon.new({
  primitivies: {
    boolean: {
      not(value) {
        return !value;
      }
    }
  }
});

eval('true.not()'); //-> false
eval('false.not()'); //-> true
eval('isOk.not()', {isOk: true}); //-> false
```

## Security

Calculon doesn't allow to overwrite object constructors (or even get it) so it's
safe to use with untrusted code. Also calculon is read only and it has no
constructions to modify values or variables.

## Credentials

Parser is made with [PegJS](https://www.npmjs.com/package/pegjs) powerful
and simple parser generator.

## License

MIT.
