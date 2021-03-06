
### `Intro`
![GitHub Actions status | linter](https://github.com/anzerr/file.stream/workflows/linter/badge.svg)
![GitHub Actions status | publish](https://github.com/anzerr/file.stream/workflows/publish/badge.svg)
![GitHub Actions status | test](https://github.com/anzerr/file.stream/workflows/test/badge.svg)

A client and server to handle streaming files with pipes and remove them from a remote server

#### `Install`
``` bash
npm install --save git+https://github.com/anzerr/file.stream.git
npm install --save @anzerr/file.stream
```

### `Example`
``` javascript
const sync = require('file.stream');

let port = 5936;
new sync.Server(process.cwd(), 'localhost:' + port);
let client = new sync.Client('localhost:' + port);
fs.createReadStream('./example.js')
	.pipe(client.createUploadStream('example1.js'))
	.on('close', () => {
		client.remove('example1.js').then(() => {
			console.log('removed file');
		});
	});
```