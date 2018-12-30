
const net = require('net.socket'),
	fs = require('fs.promisify'),
	remove = require('fs.remove'),
	packet = require('./packet.js'),
	path = require('path'),
	ENUM = require('./enum.js');

class Server {

	constructor(cwd, uri) {
		this.cwd = cwd;
		this.write = {};
		this.server = new net.Server(uri);
		this.server.on('message', (res) => {
			this.run(res.client, packet.toJson(res.payload));
		});
	}

	close() {
		return this.server.close();
	}

	run(client, json) {
		if (json) {
			if (json.action === ENUM.UPLOAD) {
				let p = path.join(this.cwd, json.file);
				fs.mkdir(path.parse(p).dir, {recursive: true}).then(() => {
					this.write[json.thread] = fs.createWriteStream(p);
					client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.thread
					}));
				});
			}
			if (json.action === ENUM.UPLOAD_PART) {
				this.write[json.thread].write(json.data, () => {
					client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.key
					}));
				});
			}
			if (json.action === ENUM.UPLOAD_END) {
				this.write[json.thread].end();
				this.write[json.thread] = null;
			}
			if (json.action === ENUM.REMOVE) {
				remove(path.join(this.cwd, json.file)).then(() => {
					client.send(packet.toBuffer({
						action: ENUM.UPLOAD_RESPONSE,
						key: json.thread
					}));
				});
			}
		}
	}

}

module.exports = Server;
