const EventEmitter = require('events').EventEmitter;
const Logger = require('./Logger');
const Router = require('./Router');
const io = require('socket.io-client');
const config = require('../config/config');

const logger = new Logger('MediaHandler');

class MediaHandler extends EventEmitter
{
	constructor()
	{
		logger.info('constructor()');

		super();

		this._mediaNodesAddresses = config.mediaNodes;

		this._mediaNodes = {};

		this._routers = {};
	}

	async createRouter({ mediaCodecs })
	{
		logger.info('createRouter()');

		const mediaNode = this._mediaNodesAddresses[
			Math.floor(Math.random() * this._mediaNodesAddresses.length)
		];

		return new Promise((resolve, reject) =>
		{
			const socket = io(
				`wss://${mediaNode}?secret=${config.mediaNodeSecret}`, { rejectUnauthorized: false });

			socket.on('connect', async () =>
			{
				try
				{
					await this._request(socket, 'createRouter', { mediaCodecs });

					resolve(new Router({ socket }));
				}
				catch (error)
				{
					logger.warn('createRouter() | [error:"%o"]', error);

					reject(error);
				}
			});
		});
	}

	_timeoutCallback(callback)
	{
		let called = false;

		const interval = setTimeout(
			() =>
			{
				if (called)
					return;
				called = true;
				callback(new Error('Request timeout.'));
			},
			10000
		);

		return (...args) =>
		{
			if (called)
				return;
			called = true;
			clearTimeout(interval);

			callback(...args);
		};
	}

	_request(socket, method, data = {})
	{
		return new Promise((resolve, reject) =>
		{
			socket.emit(
				'workerRequest',
				{ method, data },
				this._timeoutCallback((err, response) =>
				{
					if (err)
					{
						reject(err);
					}
					else
					{
						resolve(response);
					}
				})
			);
		});
	}
}

module.exports = MediaHandler;