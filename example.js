
const sync = require('./index.js'),
	fs = require('fs.promisify'),
	assert = require('assert');

let port = 5936;

let s = new sync.Server(process.cwd(), 'localhost:' + port);
let c = new sync.Client('localhost:' + port);

let stream = (a, b) => {
	return new Promise((resolve) => {
		fs.createReadStream(a)
			.pipe(c.createUploadStream(b))
			.on('close', () => {
				resolve();
			});
	});
};

let wait = [];
for (let i = 0; i < 10; i++) {
	wait.push(stream('./example.js', 'example' + i + '.js'));
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
	await fs.writeFile('empty', '');
	await stream('empty', 'empty1');
	await c.remove('empty1');
	await fs.unlink('empty');
}).then(async () => {
	await s.close();
	await c.close();
	console.log('example finished');
}).catch(console.log);
