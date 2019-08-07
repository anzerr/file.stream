
const sync = require('./index.js'),
	fs = require('fs.promisify'),
	assert = require('assert');

let port = 5936 + Math.floor(Math.random() * 3000);

let s = new sync.Server(process.cwd(), `localhost:${port}`);
let client = new sync.Client(`localhost:${port}`);

let stream = (a, b) => {
	return new Promise((resolve) => {
		fs.createReadStream(a)
			.pipe(client.createUploadStream(b))
			.on('close', () => {
				resolve();
			});
	});
};

// uploaded files
let wait = [];
for (let i = 0; i < 10; i++) {
	wait.push(stream('./example.js', 'example' + i + '.js'));
}

let start = process.hrtime();
Promise.all(wait).then(() => {// get hash for files
	const NS_PER_SEC = 1e9;
	const diff = process.hrtime(start), sec = (diff[0] * NS_PER_SEC + diff[1]) / NS_PER_SEC;
	console.log('files per sec', 1 / (sec / 10), '10 files in', sec);

	let hash = [];
	for (let i = 0; i < 10; i++) {
		hash.push(client.hash('example' + i + '.js'));
	}
	return Promise.all(hash).then((res) => {
		assert.notEqual(res[0].match(/^[a-f0-9]{40}$/), null);
		for (let i = 1; i < 10; i++) {
			assert.equal(res[i - 1], res[i]);
		}
	});
}).then(() => { // remove files
	let remove = [];
	for (let i = 0; i < 10; i++) {
		remove.push(client.remove('example' + i + '.js'));
	}
	return Promise.all(remove);
}).then(async () => {
	await fs.writeFile('empty', '');
	await stream('empty', 'empty1');
	await client.remove('empty1');
	await fs.unlink('empty');
}).then(() => {
	client.close();
	client.on('error', (err) => {
		console.log(err);
		assert.notEqual(err.message.match('ECONNREFUSED'), null);
	});
	client.once('close', () => {
		console.log('closed client');
		client.connect();
		client.hash('example.js').then((res) => {
			assert.notEqual(res.match(/^[a-f0-9]{40}$/), null);
			return client.hash('examplea.js');
		}).then((res) => {
			assert.equal(res, '');
		}).then(() => {
			return s.close();
		}).then(() => {
			console.log('done');
		});
	});
	console.log('example finished');
}).catch(console.log);
