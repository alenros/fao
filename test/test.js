// const assert = require('assert');
const chai = require('chai');
const assert = chai.assert;
const io = require('socket.io-client');
const Message = require('../src/common/message');
const A = require('async');

describe('Test Suite', function() {
	var sock1, sock2, sock3;

	beforeEach(function(done) {
		require('../src/server/main')
			.then(function() {
				sock1 = io('http://localhost:3000');
				sock2 = io('http://localhost:3000');
				sock3 = io('http://localhost:3000');

				function connectSocketFn(s) {
					return (cb) => {
						s.on('connect', function() {
							// console.log('connected');
							cb();
						});
						s.on('disconnect', function() {
							// console.log('disconnected');
						});
					};
				}

				A.parallel(
					[connectSocketFn(sock1), connectSocketFn(sock2), connectSocketFn(sock3)],
					() => { done(); }
				);
			})
			.catch(function(e) {
				console.error(e);
			});
	});

	afterEach(function(done) {
		[sock1, sock2, sock3].forEach(function(s) {
			if(s.connected) {
				debugger;
				s.disconnect();
				console.log('force disconnect');
			}
		});
		done();
	});
    
	describe('CREATE_ROOM', function() {
		it('accept valid login', function(done) {
			sock1.emit(Message.CREATE_ROOM, {
				username: 'playerA',
			});
			sock1.once(Message.CREATE_ROOM, function(data) {
				assert.notExists(data.err);
				done();
			});
		});
		it('reject missing username', function(done) {
			sock1.emit(Message.CREATE_ROOM, {});
			sock1.once(Message.CREATE_ROOM, function(data) {
				assert.exists(data.err);
				done();
			});
		});
		it('reject empty username', function(done) {
			sock1.emit(Message.CREATE_ROOM, {
				username: '',
			});
			sock1.once(Message.CREATE_ROOM, function(data) {
				assert.exists(data.err);
				done();
			});
		});
		it('reject long username', function(done) {
			sock1.emit(Message.CREATE_ROOM, {
				username: '123456789012345678901234567890',
			});
			sock1.once(Message.CREATE_ROOM, function(data) {
				assert.exists(data.err);
				done();
			});
		});
		it('reject user already in a room', function(done) {
			sock1.emit(Message.CREATE_ROOM, {
				username: 'playerB',
			});
			sock1.once(Message.CREATE_ROOM, function(data) {
				assert.notExists(data.err);
				sock1.emit(Message.CREATE_ROOM, {
					username: 'playerBB',
				});
				sock1.once(Message.CREATE_ROOM, function(data) {
					assert.exists(data.err);
					done();
				});
			});
		});
	});

	describe('JOIN_ROOM', function() {
		it('accept valid login', function(done) {
			sock1.emit(Message.CREATE_ROOM, {
				username: 'bob',
			});
			sock1.once(Message.CREATE_ROOM, function(data) {
				let roomCode = data.roomState.roomCode;
				sock2.emit(Message.JOIN_ROOM, {
					username: 'larry',
					roomCode,
				});
				sock2.once(Message.JOIN_ROOM, function(data) {
					assert.notExists(data.err);
					done();
				});
			});
		});
		it('reject missing roomCode', function(done) {
			sock2.emit(Message.JOIN_ROOM, {
				username: 'nobody',
				roomCode: 1234, // what are the chances?
			});
			sock2.once(Message.JOIN_ROOM, function(data) {
				assert.exists(data.err);
				done();
			});
		});
		// it('reject join full room', function(done) {

		// });
		it('reject missing roomCode', function(done) {
			sock2.emit(Message.JOIN_ROOM, {
				username: 'xyz',
			});
			sock2.once(Message.JOIN_ROOM, function(data) {
				assert.exists(data.err);
				done();
			});
		});
		it('reject missing username', function(done) {
			sock2.emit(Message.JOIN_ROOM, {
				roomCode: 1234,
			});
			sock2.once(Message.JOIN_ROOM, function(data) {
				assert.exists(data.err);
				done();
			});
		});
		// not gonna bother with username validation tests right now
		it('reject duplicate username in room', function(done) {
			sock1.emit(Message.CREATE_ROOM, {
				username: 'spartacus',
			});
			sock1.once(Message.CREATE_ROOM, function(data) {
				let roomCode = data.roomState.roomCode;
				sock2.emit(Message.JOIN_ROOM, {
					username: 'spartacus',
					roomCode,
				});
				sock2.once(Message.JOIN_ROOM, function(data) {
					assert.exists(data.err);
					done();
				});
			});
		});
	});
});