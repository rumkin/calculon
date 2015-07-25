var fs = require('fs');
if (process.argv.length === 3 || process.argv.length === 4) {
	console.log(fs.readdirSync(process.cwd()).join('\n'));
}