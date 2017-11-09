var Pluralize = require('pluralize');
var Tensify = require('tensify');
var langs = require('./languages.js').supportedLangs;
var DEFAULT_LANGUAGE = "en";
var BASE_COLLECTION_NAME = "Blocked_Phrases";
var REFRESH_MINS = 20;

var flagValue = {
	pass: "yes",
	fail: "controversial"
}

TPU = {};

var blockedWords = {};

var refresh = false;

TPU.processWords = (db, language, inputText, cb) => {
	if (!db) {
		return cb({ error: 'db connection not passed to TPU!' }, null);
	}
	if (!refresh) {
		// Cache the respone of blocked words for all languages from the database in memory
		refresh = setInterval(function () {
			for (i in langs) {
				fetchWords(db, langs[i], (err, list) => {
					blockedWords[langs[i]] = list;
				});
			}
		}, REFRESH_MINS * 60 * 1000);
	}
	// if the language parameter comes null of undefined, assign the default langue
	language = language || DEFAULT_LANGUAGE;
	// checks if the language passed in is contained in the list of supported languages otherwise use the default language
	if (langs.indexOf(language)) {
		console.log('The TPU does not support ' + language + ', using english');
		language = DEFAULT_LANGUAGE;
	}

	// fetch the word list from the database
	if (blockedWords[language] !== undefined) {
		var word = compare(inputText, blockedWords[language]);
		if (word.length > 0) {
			return cb(null, { "flag": flagValue.fail, "word": word });
		}
		return cb(null, { "flag": flagValue.pass, "word": null });
	}
	else {
		fetchWords(db, language, (err, blockList) => {
			// if an error is passed into the callback from cacher, pass
			if (err) {
				console.log(err);
				return cb(err, null);
			}

			var word = compare(inputText, blockList);
			if (word.length > 0) {
				return cb(null, { "flag": flagValue.fail, "word": word });
			}
			return cb(null, { "flag": flagValue.pass, "word": null });
		});
	}
}


/**
 * compares the input text against the list of words
 */
function compare(inputText, list) {
	var past, past_participle;
	var flaggedArray = [];
	// iterate through the entire block list
	for (i in list) {
		var word = list[i].toLowerCase().trim();
		var wordRegex = new RegExp('\\b' + escapeRegExp(word) + '\\b');
		var plural = Pluralize(word);
		var pluralRegex = new RegExp('\\b' + escapeRegExp(plural) + '\\b');
		try {
			past = Tensify(word).past;
			past_participle = Tensify(word).past_participle;
		} catch (e) {
			// console.log('Could not fetch past, past_participle of : ', word);
			past = word;
			past_participle = word;
		} finally {
			var pastRegex = new RegExp('\\b' + escapeRegExp(past) + '\\b');
			var past_participleRegex = new RegExp('\\b' + escapeRegExp(past_participle) + '\\b');
		}

		// if the inputText matches a blocked word, return "controversial"
		if (inputText.search(wordRegex) > -1) {
			return word;
		} else if (inputText.search(pluralRegex) > -1) {
			return plural;
		} else if (inputText.search(pastRegex) > -1) {
			return past;
		} else if (inputText.search(past_participleRegex) > -1) {
			return past_participle;
		}
	}
	return [];
}

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Get MongoDb collection name based on language to fetch blocked words
function getCollectionName(language) {
	if (language === "en") {
		return BASE_COLLECTION_NAME;
	} else {
		return BASE_COLLECTION_NAME + "_" + language;
	}
}

// Fetch blocked words from MongoDb
function fetchWords(db, language, cb) {
	if (!db) {
		return cb({ message: "Mongo Connection Error" }, null);
	}

	// get the collection of words inside the db based on the input language
	var collectionName = getCollectionName(language);
	var collection = db.collection(collectionName);
	var wordQuery = { is_general: true };

	collection.distinct("text", wordQuery, function (err, generalWords) {
		if (err) {
			return cb({
				message: "Mongo Query Error",
				error: err
			}, null);
		}
		return cb(null, generalWords);
	});
}

module.exports = TPU;