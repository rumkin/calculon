var peg = require('pegjs');
var fs = require('fs');

switch (process.argv[2]) {
	case 'test':
		var parser = peg.generate(fs.readFileSync(process.argv[3], "utf8"));
		try {
			var result = parser.parse(fs.readFileSync(process.argv[4], "utf8"));
		} catch (err) {
			console.error('PARSE ERROR');
			if (err.name === 'SyntaxError') {
				console.error('%s at %d:%d', err.message, err.line, err.column);
			} else {
				console.error(err);
			}
		}

		console.log('>', JSON.stringify(result, null, 4));
		break;
	case 'build':
		var source = peg.generate(fs.readFileSync(process.argv[3], "utf8"), {output: 'source'});
		console.log('module.exports=', source + ';');
}
