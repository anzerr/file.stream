
const net = require('net.socket'),
	Stream = require('./client/stream.js'),
	packet = require('./packet.js'),
	ENUM = require('./enum.js');

class Client extends require('events') {

	constructor(uri) {
		super();
		this.client = new net.Client(uri);
		this.connected = false;
		let resolve = null;
		this._connected = new Promise((r) => {
			resolve = r;
		});
		this.client.on('connect', () => {
			this.connected = true;
			resolve();
		});
		this.client.on('message', (res) => {
			let json = packet.toJson(res);
			if (json.action === ENUM.UPLOAD_RESPONSE) {
				this.emit(json.key);
			}
		});
		this._stream = new Stream(this);
	}

	close() {
		return this.client.close();
	}

	createUploadStream(file) {
		return this._stream.create(file);
	}

	remove(file) {
		let thread = packet.key();
		this._stream.send({action: ENUM.REMOVE,	thread: thread, file: file});
		return this._stream.onKey(thread);
	}

}

module.exports = Client;
