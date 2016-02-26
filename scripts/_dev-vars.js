
var fs = require('fs')
var child_process = require('child_process');


function loadFromHeroku() {
    var dotenv = require('dotenv');

    try {
        // Ensure the command exists.
        child_process.execSync('which heroku');
        // Grab Heroku Data
        child_process.execSync('heroku config -s -a alonzo > .env');
        // Append public stuff to Heroku data
        child_process.execSync('cat .env.local >> .env');
        dotenv.load();
        console.log('Successfully grabbed env variables from Heroku');
    } catch (e) {
        console.log('Can\'t grab env variables from Heroku.');
        console.log(e);
        console.log('See README for directions on installing `heroku`.');
        console.log('');
        // local (committed) variables
        dotenv.load({path: '.env.local'});
        console.log('Loading Local Environments Only...');
    }
}

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    loadFromHeroku();
}

module.exports = function (robot) {
    // empty function. This kills WARNING logs.
}