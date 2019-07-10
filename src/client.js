
const net = require('net.socket'),
	Stream = require('./client/stream.js'),
	packet = require('./packet.js'),
	ENUM = require('./enum.js');

class Client extends require('events') {

	constructor(uri) {
		super();
		this._uri = uri;
		this.connected = false;
		this._stream = new Stream(this);
		this.connect();
	}

	connect() {
		this.client = new net.Client(this._uri);
		this.connected = false;
		let resolve = null;
		this._connected = new Promise((r) => {
			resolve = r;
		});
		this.client.on('connect', () => {
			this.connected = true;
			resolve();
		});
		this.client.on('error', (e) => {
			this.emit('error', e);
		});
		this.client.on('close', (e) => {
			this.emit('close', e);
		});
		this.client.on('message', (res) => {
			let json = packet.toJson(res);
			if (this.isResponse(json.action)) {
				this.emit(json.key || json.thread, json);
				return;
			}
			if (json.action === ENUM.ERROR) {
				this.emit('error', json.error);
			}
		});
	}

	isResponse(action) {
		return (
			action === ENUM.UPLOAD_RESPONSE ||
			action === ENUM.REMOVE_RESPONSE ||
			action === ENUM.HASH_RESPONSE
		);
	}

	close() {
		this.connected = false;
		this._connected = null;
		return this.client.close();
	}

	createUploadStream(file) {
		return this._stream.create(file);
	}

	hash(file) {
		let thread = packet.key();
		this._stream.send({action: ENUM.HASH, thread: thread, file: file});
		return this._stream.on(thread).then((res) => res.hash);
	}

	remove(file) {
		let thread = packet.key();
		this._stream.send({action: ENUM.REMOVE,	thread: thread, file: file});
		return this._stream.on(thread);
	}

}

module.exports = Client;
