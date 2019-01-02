
const net = require('net.socket'),
	fs = require('fs.promisify'),
	remove = require('fs.remove'),
	packet = require('./packet.js'),
	path = require('path'),
	mkdir = require('fs.mkdirp'),
	ENUM = require('./enum.js');

class Server extends require('events') {

	constructor(cwd, uri) {
		super();
		this.cwd = cwd;
		this.write = {};
		this._setup = {};
		this.server = new net.Server(uri);
		this.server.on('message', (res) => {
			this.run(res.client, packet.toJson(res.payload));
		});
		this.server.on('close', (e) => {
			this.emit('close', e);
		});
		this.server.on('open', () => {
			this.emit('open');
		});
		this.server.on('error', (e) => {
			this.emit('error', e);
		});
	}

	close() {
		return this.server.close();
	}

	error(client, e) {
		this.emit('error', e);
		client.send(packet.toBuffer({
			action: ENUM.ERROR,
			error: e.toString()
		}));
	}

	mkdir(dir) {
		if (this._setup[dir]) {
			return Promise.resolve();
		}
		return mkdir(dir).then(() => {
			this._setup[dir] = true;
		});
	}

	run(client, json) {
		if (json) {
			if (json.action === ENUM.UPLOAD) {
				let p = path.join(this.cwd, json.file);
				this.mkdir(path.parse(p).dir).then(() => {
					this.write[json.thread] = [p, fs.createWriteStream(p)];
					client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.thread
					})).catch((e) => this.error(client, e));
				}).catch((e) => this.error(client, e));
			}
			if (json.action === ENUM.UPLOAD_PART) {
				this.write[json.thread][1].write(json.data, (err) => {
					if (err) {
						this.error(client, err);
					}
					client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.key
					})).catch((e) => this.error(client, e));
				});
			}
			if (json.action === ENUM.UPLOAD_END) {
				if (!this.write[json.thread]) {
					this.error(client, new Error('missing write stream on server.'));
					return;
				}
				this.write[json.thread][1].end();
				this.emit('add', this.write[json.thread][0]);
				this.write[json.thread] = null;
			}
			if (json.action === ENUM.REMOVE) {
				let p = path.join(this.cwd, json.file);
				remove(p).then(() => {
					this.emit('remove', p);
					client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.thread
					})).catch((e) => this.error(client, e));
				}).catch((e) => this.error(client, e));
			}
		}
	}

}

module.exports = Server;
