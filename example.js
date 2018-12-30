
const sync = require('./index.js'),
	fs = require('fs.promisify'),
	assert = require('assert');

let port = 5936;

let s = new sync.Server(process.cwd(), 'localhost:' + port);
let c = new sync.Client('localhost:' + port);

let wait = [];
for (let i = 0; i < 10; i++) {
	wait.push(new Promise((resolve) => {
		fs.createReadStream('./example.js')
			.pipe(c.createUploadStream('example' + i + '.js'))
			.on('close', () => {
				resolve();
			});
	}));
}

Promise.all(wait).then(async () => {
	let remove = [],
		base = await fs.readFile('./example.js');
	for (let i = 0; i < 10; i++) {
		assert.equal(base.toString('hex'), (await fs.readFile('example' + i + '.js')).toString('hex'));
		remove.push(c.remove('example' + i + '.js'));
	}
	return Promise.all(remove);
}).then(async () => {
	await s.close();
	await c.close();
	console.log('example finished');
}).catch(console.log);
