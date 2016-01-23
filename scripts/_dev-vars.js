
var fs = require('fs')
var child_process = require('child_process');


function loadFromHeroku() {
    var dotenv = require('dotenv');

    try {
        // Grab Heroku Data
        child_process.execSync('hk env -a alonzo > .env');
        // Append public stuff to Heroku data
        child_process.execSync('cat .env.local >> .env');
        dotenv.load();
        console.log('Successfully grabbed env variables from Heroku');
    } catch (e) {
        console.log('Can\'t grab env variables from Heroku.');
        console.log('See README for directions on installing `hk`.');
        console.log(e);
        console.log('');
        // local (committed) variables
        dotenv.load({path: '.env.local'});
        console.log('Loading Local Files Only');
    }
}

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    loadFromHeroku();
}