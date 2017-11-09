var tpu = require('./tpu.js');
var mongo = require('mongodb').MongoClient;

var client = false;

mongo.connect('mongodb://127.0.0.1/demoDb', (err, db) => {
    if (err) {
        return console.log("ERROR: Mongo connection failed for TPU - " + JSON.stringify(err));
    }
    client = db;
    tpu.processWords(db, "en", "you are a 'criminal'", (err, data) => {
        if (err) {
            return console.log(JSON.stringify(err));
        }
        return console.log(JSON.stringify(data));
    });
});

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    client.close();
    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
