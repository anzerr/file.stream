
const {Writable} = require('stream'),
	packet = require('../packet.js'),
	ENUM = require('../enum.js');

class Stream {

	get client() {
		return this.handle.client;
	}

	constructor(handle) {
		this.handle = handle;
	}

	send(data) {
		if (this.handle.connected) {
			return this.client.send(packet.toBuffer(data));
		}
		return this.handle._connected.then(() => {
			return this.client.send(packet.toBuffer(data));
		});
	}

	on(key) {
		return new Promise((resolve) => {
			let msg = (res) => {
				if (res.action === ENUM.HASH_RESPONSE) {
					resolve(res);
				} else {
					resolve();
				}
				this.handle.removeListener(key, msg);
			};
			this.handle.on(key, msg);
		});
	}

	create(file) {
		let thread = packet.key(),
			streamOpen = false,
			resolve = null,
			open = new Promise((r) => {
				resolve = r;
			});

		this.send({action: ENUM.UPLOAD,	thread: thread, file: file});
		this.on(thread).then(() => {
			streamOpen = true;
			resolve();
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
					open.then(() => {
						this.send(payload);
						this.on(key).then(callback);
					});
				} else {
					this.send(payload);
					this.on(key).then(callback);
				}
			},
			final: (callback) => {
				let s = () => {
					this.send({action: ENUM.UPLOAD_END, thread: thread}).then(() => {
						callback();
						w.destroy();
					});
				};
				if (!streamOpen) {
					open.then(s);
				} else {
					s();
				}
			}
		});
		return w;
	}

}

module.exports = Stream;
