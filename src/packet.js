
const ENUM = require('./enum.js');

class Packet {

	constructor() {
		this._id = 1;
	}

	key() {
		this._id = (this._id + 1 % 0xffffffff);
		// return Math.floor(Math.random() * Math.pow(255, l));
		return this._id;
	}

	toJson(buffer) {
		if (buffer[0] === ENUM.UPLOAD) {
			return {
				action: ENUM.UPLOAD,
				thread: buffer.readUIntBE(1, 4),
				file: buffer.slice(6, buffer.length).toString()
			};
		}
		if (buffer[0] === ENUM.UPLOAD_PART) {
			return {
				action: ENUM.UPLOAD_PART,
				thread: buffer.readUIntBE(1, 4),
				key: buffer.readUIntBE(5, 4),
				data: buffer.slice(9, buffer.length)
			};
		}
		if (buffer[0] === ENUM.UPLOAD_RESPONSE) {
			return {
				action: ENUM.UPLOAD_RESPONSE,
				key: buffer.readUIntBE(1, 4)
			};
		}
		if (buffer[0] === ENUM.UPLOAD_END) {
			return {
				action: ENUM.UPLOAD_END,
				thread: buffer.readUIntBE(1, 4)
			};
		}
		if (buffer[0] === ENUM.REMOVE) {
			return {
				action: ENUM.REMOVE,
				thread: buffer.readUIntBE(1, 4),
				file: buffer.slice(6, buffer.length).toString()
			};
		}
		if (buffer[0] === ENUM.ERROR) {
			return {
				action: ENUM.ERROR,
				error: buffer.slice(1, buffer.length)
			};
		}
		if (buffer[0] === ENUM.HASH) {
			return {
				action: ENUM.HASH,
				thread: buffer.readUIntBE(1, 4),
				file: buffer.slice(6, buffer.length).toString()
			};
		}
		if (buffer[0] === ENUM.HASH_RESPONSE) {
			return {
				action: ENUM.HASH_RESPONSE,
				thread: buffer.readUIntBE(1, 4),
				hash: buffer.slice(6, buffer.length).toString()
			};
		}
		throw new Error('packet format not handled');
	}

	toBuffer(json) {
		if (json.action === ENUM.UPLOAD) {
			let b = Buffer.alloc(Buffer.byteLength(json.file, 'utf8') + 1 + 4 + 1);
			b[0] = ENUM.UPLOAD;
			b.writeUIntBE(json.thread, 1, 4);
			b.write(json.file, 6);
			return b;
		}
		if (json.action === ENUM.UPLOAD_PART) {
			let b = Buffer.alloc(4 + 4 + 1);
			b[0] = ENUM.UPLOAD_PART;
			b.writeUIntBE(json.thread, 1, 4);
			b.writeUIntBE(json.key, 5, 4);
			return Buffer.concat([b, json.data]);
		}
		if (json.action === ENUM.UPLOAD_RESPONSE) {
			let b = Buffer.alloc(4 + 1);
			b[0] = ENUM.UPLOAD_RESPONSE;
			b.writeUIntBE(json.key, 1, 4);
			return b;
		}
		if (json.action === ENUM.UPLOAD_END) {
			let b = Buffer.alloc(4 + 1);
			b[0] = ENUM.UPLOAD_END;
			b.writeUIntBE(json.thread, 1, 4);
			return b;
		}
		if (json.action === ENUM.REMOVE) {
			let b = Buffer.alloc(Buffer.byteLength(json.file, 'utf8') + 1 + 4 + 1);
			b[0] = ENUM.REMOVE;
			b.writeUIntBE(json.thread, 1, 4);
			b.write(json.file, 6);
			return b;
		}
		if (json.action === ENUM.REMOVE_RESPONSE) {
			let b = Buffer.alloc(4 + 1);
			b[0] = ENUM.HASH_RESPONSE;
			b.writeUIntBE(json.thread, 1, 4);
			return b;
		}
		if (json.action === ENUM.ERROR) {
			let b = Buffer.alloc(json.error.length + 1 + 1);
			b[0] = ENUM.ERROR;
			b.write(json.error, 1);
			return b;
		}
		if (json.action === ENUM.HASH) {
			let b = Buffer.alloc(Buffer.byteLength(json.file, 'utf8') + 1 + 4 + 1);
			b[0] = ENUM.HASH;
			b.writeUIntBE(json.thread, 1, 4);
			b.write(json.file, 6);
			return b;
		}
		if (json.action === ENUM.HASH_RESPONSE) {
			let b = Buffer.alloc(json.hash.length + 1 + 4 + 1);
			b[0] = ENUM.HASH_RESPONSE;
			b.writeUIntBE(json.thread, 1, 4);
			b.write(json.hash, 6);
			return b;
		}
		throw new Error('packet format not handled');
	}

}

module.exports = new Packet();
