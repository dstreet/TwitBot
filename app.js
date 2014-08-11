var Twit = require('twit')
	, nconf = require('nconf')
	, bot = require('./irc-bot')
	, twit
	, stream;

nconf.file( {file: './config.json'} );

twit = new Twit(nconf.get('twitter'));

bot.init(nconf.get('irc'));

bot.addCommands({
	'track': {
		params: ['keywords'],
		desc: 'Get a stream of Tweets containing the keywords. Keywords should be separated by a space or enclosed in quotes.',
		callback: getTrack,
		output: 'stream'
	}
});

function getTrack(sender, values, botStream) {
	var re = /((?:["'].*?["'])|(?:[a-zA-Z0-9]+))/g
		, keywords;

	if (!values) return false;

	keywords = values.match(re);

	for (var i = 0, len = keywords.length; i < len; i += 1) {
		keywords[i] = keywords[i].replace(/['"]/g, '');
	}

	var stream = twit.stream('statuses/filter', {track: keywords});

	stream.on('tweet', function (tweet) {
		var msg = '';
		msg += tweet.text + '\n';
		msg += '-------------------------------------------\n';
		msg += 'By: ' + tweet.user.name;

		botStream.write(msg);
	});

	botStream.onClose = function() {
		stream.stop();
	}
}