
const {Writable} = require('stream'),
	packet = require('../packet.js'),
	ENUM = require('../enum.js');

class Stream {

	constructor(handle) {
		this.handle = handle;
	}

	get client() {
		return this.handle.client;
	}

	send(data) {
		if (this.handle.connected) {
			return this.client.send(packet.toBuffer(data));
		}
		return this.handle._connected.then(() => {
			return this.client.send(packet.toBuffer(data));
		});
	}

	onKey(key) {
		return new Promise((resolve) => {
			let msg = () => {
				resolve();
				this.handle.removeListener(key, msg);
			};
			this.handle.on(key, msg);
		});
	}

	create(file) {
		let thread = packet.key(),
			streamOpen = false,
			openCb = null;

		this.send({action: ENUM.UPLOAD,	thread: thread, file: file});
		this.onKey(thread).then(() => {
			streamOpen = true;
			if (openCb) {
				openCb();
				openCb = null;
			}
		});

		let w = new Writable({
			write: (chunk, encoding, callback) => {
				let key = packet.key();
				let payload = {
					action: ENUM.UPLOAD_PART,
					thread: thread,
					key: key,
					data: chunk
				};
				if (!streamOpen) {
					openCb = () => {
						this.send(payload);
						this.onKey(key).then(callback);
					};
				} else {
					this.send(payload);
					this.onKey(key).then(callback);
				}
			},
			final: (callback) => {
				this.send({action: ENUM.UPLOAD_END, thread: thread}).then(() => {
					callback();
					w.destroy();
				});
			}
		});
		return w;
	}

}

module.exports = Stream;
