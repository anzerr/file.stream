
const path = require('path'),
	net = require('net.socket'),
	fs = require('fs.promisify'),
	hash = require('fs.hash'),
	remove = require('fs.remove'),
	mkdir = require('fs.mkdirp'),
	packet = require('./packet.js'),
	ENUM = require('./enum.js');

class Server extends require('events') {

	constructor(cwd, uri) {
		super();
		this.cwd = cwd;
		this.write = {};
		this._setup = {};
		this.server = new net.Server(uri);
		this.server.on('message', (res) => {
			this.run(res.client, packet.toJson(res.payload))
				.catch((err) => {
					res.client.close();
					this.emit('error', err);
				});
		}).on('close', (e) => {
			this.emit('close', e);
		}).on('open', () => {
			this.emit('open');
		}).on('error', (e) => {
			this.emit('error', e);
		}).on('connect', (client) => {
			client.on('error', (e) => {
				this.emit('error', e);
			});
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
		if (this._setup[dir] && this._setup[dir] > Date.now()) {
			return Promise.resolve();
		}
		return mkdir(dir).then(() => {
			this._setup[dir] = Date.now() + (1000 * 10);
		});
	}

	run(client, json) {
		if (json) {
			if (json.action === ENUM.UPLOAD) {
				let p = path.join(this.cwd, json.file), dir = path.parse(p).dir;
				return fs.stat(dir).then((stats) => {
					if (!stats.isDirectory()) {
						return remove(dir);
					}
				}).catch(() => {}).then(() => {
					return this.mkdir(dir);
				}).then(() => {
					this.write[json.thread] = [p, fs.createWriteStream(p)];
					return client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.thread
					})).catch((e) => this.error(client, e));
				}).catch((e) => this.error(client, e));
			}

			if (json.action === ENUM.UPLOAD_PART) {
				return new Promise((resolve) => {
					this.write[json.thread][1].write(json.data, (err) => {
						if (err) {
							this.error(client, err);
						}
						client.send(packet.toBuffer({
							action: ENUM.UPLOAD_RESPONSE,
							key: json.key
						})).then(() => resolve()).catch((e) => this.error(client, e));
					});
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
				return Promise.resolve();
			}

			if (json.action === ENUM.REMOVE) {
				let p = path.join(this.cwd, json.file);
				return remove(p).then(() => {
					this.emit('remove', p);
					return client.send(packet.toBuffer({
						action: ENUM.REMOVE_RESPONSE,
						thread: json.thread
					})).catch((e) => this.error(client, e));
				}).catch((e) => this.error(client, e));
			}

			if (json.action === ENUM.HASH) {
				let p = path.join(this.cwd, json.file);
				return fs.access(p).then(() => {
					return hash(p);
				}).then((res) => {
					return client.send(packet.toBuffer({
						action: ENUM.HASH_RESPONSE,
						hash: res,
						thread: json.thread
					})).catch((e) => this.error(client, e));
				}).catch(() => {
					client.send(packet.toBuffer({
						action: ENUM.HASH_RESPONSE,
						hash: '',
						thread: json.thread
					})).catch((e) => this.error(client, e));
				});
			}
		}
		return Promise.reject(new Error(`failed to use packet "${(json || {}).action}" is the client valid?`));
	}

}

module.exports = Server;
