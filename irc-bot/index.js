var irc = require('irc');

module.exports = (function() {

	var _config
		, _client
		, _streams = []
		, _commands = {
			'help': {
				params: null,
				desc: 'Display this help message.',
				callback: _displayHelp,
				output: 'sender'
			},
			'killall': {
				params: null,
				desc: 'Kill all streams.',
				callback: _killAllStreams,
				output: 'channel'
			},
			'kill': {
				params: ['id'],
				desc: 'Kill the stream with id.',
				callback: _killStream,
				output: 'sender'
			}
		};

	function _initClient() {
		_client = new irc.Client(_config.server, _config.nick, {
			channels: _config.channels,
			password: _config.password
		});
	}

	function _getMessages() {
		_client.addListener('message', function(from, to, msg) {
			_parseCommand(msg, from, to);
		});
	}

	function _parseCommand(message, sender, channel) {
		var regex = new RegExp('^' + _config.nick + '\\s(' + _getCommandNames().join('|') + ')\\s*(.+)*')
			, matches = message.match(regex)
			, command
			, value
			, output;

		if (!matches) return false;

		command = matches[1];
		value = matches[2];

		if (_commands[command].output != 'stream') {
			// Get output
			output = _commands[command].callback(sender, value);

			if (_commands[command].output == 'sender') {
				_client.say(sender, output)
			} else {
				_client.say(channel, output);
			}
		}
		// If command requests a stream output type, pass a new stream object
		else {
			var stream = _createStream(channel);

			_client.say(sender, 'New stream started with ID ' + stream.getId());
			_commands[command].callback(sender, value, stream);
		}
	}

	function _createStream(output) {
		_streams.push(new BotStream(_client, output))

		return _streams[_streams.length - 1];
	}

	function _getCommandNames() {
		var names = [];

		for(var i in _commands) {
			if (typeof _commands[i] == 'object') {
				names.push(i);
			}
		}

		return names;
	}

	function _displayHelp() {
		var msg = '';

		msg += '-------------------------------------------------------------------\n';
		msg += 'ABOUT\n';
		msg += '    Author: David Street\n';
		msg += '    Description: An IRC chat bot that returns Twitter streams\n';
		msg += '    License: MIT\n';
		msg += '    (c) 2014 David Street\n';
		msg += '-------------------------------------------------------------------\n';
		msg += 'COMMANDS\n';

		for(var i in _commands) {
			var params = (_commands[i].params ? '[' + _commands[i].params.join(', ') + '] ' : '');

			msg += '    ' + i + ' ' + params + '- ' + _commands[i].desc + '\n';
		}

		msg += '-------------------------------------------------------------------\n';

		return msg;
	}

	function _killAllStreams() {
		for (var i in _streams) {
			_streams[i].close();
		}
	}

	function _killStream(sender, id) {
		for (var i in _streams) {
			if (_streams[i].getId() == id) {
				_streams[i].close();
				break;
			}
		}

		return 'Stream ' + id + ' terminated.';
	}

	return {
		init: function(config) {
			_config = config;
			_config.channels = (typeof config.channels == 'string' ? [config.channels] : config.channels);
			
			_initClient();
			_getMessages();
		},

		addCommands: function(cmdConfig) {
			for(var i in cmdConfig) {
				if (!_commands.hasOwnProperty(i)) {
					_commands[i] = cmdConfig[i];
				}
			}
		}
	}

})();

var BotStream = function(client, outputTo) {

	var _client = client
		, _ouput = outputTo
		, _id = (new Date).getTime()
		, _open = true;

	return {
		onClose: function() {}

		, write: function(msg) {
			if (_open) _client.say(_ouput, msg);
		}

		, getId: function() {
			return _id;
		}

		, close: function() {
			_open = false;
			this.onClose();
		}
	}
}