![Alonzo-Icon][icon]

[![Build Status][travis-icon]][travis]
[icon]: http://snap.berkeley.edu/alonzo.svg
[travis-icon]: https://travis-ci.org/cs10/Alonzo.svg?branch=master
[travis]: https://travis-ci.org/cs10/Alonzo

# Alonzo
Alonzo is a chatbot for [CS10][awesomest-class]. He's our mascot. Alonzo has a bit of a sassy attitude sometimes, but that's OK, because he's pretty awesome! If you haven't heard about CS10, you should check out the class, and learn how [we're changing the world][bjc4nyc]!

Alonzo was born from GitHub's Campfire bot, hubot. Currently, Alonzo is configured to work with our staff HipChat instance, but this can all be adapted as necessary. Keep on reading if you want to deploy Alonzo yourself.

[awesomest-class]: http://cs10.org/
[bjc4nyc]: http://bjc.berkeley.edu/website/bjc4nyc.html

#### Who's Alonzo, really?
Alonzo's full name is, of course, [Alonzo Church][ac-wiki], the inventor of lambda calculus! He's the mascot of the CS10 class, as well as Snap<i>!</i>, and BJC.

## Current Functionality
##### Caution: This is may not be up to date always... Documentation is hard, man.
### CS10 Tools
* bCourses interaction for lab check offs and slip days
* Slip days are handled through a web endpoint /slipdays/:sid
* Commands:
	* @Alonzo locker -- show the locker combo
	* @Alonzo links  -- give common links to TAs.
	* @Alonzo todo @user `task` -- assign that person a task in Asana.
	* @Alonzo shorten `url` -- Get a bjc.link short URL

### Fun Stuff & Useful Tools!
* @Alonzo question -- query wolfram alpha [Warning, currently broken. :(]
* ++ and -- score tracking are built in. Award your favorite TA some points!
* Meme generation is built in (@Alonzo <Meme Text>)
* Something called Hubots Against Humanity...[idk what that's about. ;)]
* Google Translate, Google Maps, Google Images!
* XKCD, of course!
* Url, base64 encoding and decoding as well as a bunch of hashing functions
* Specific Images of:
	* Programmer Ryan Gosling
	* Pugs
	* Pusheen The Cat
	* Octocats!

#### Please see the full list of [generated commands][help].
[help]: http://alonzo.herokuapp.com/Alonzo/help


### Our class use of 'chat-ops' is described in the [TA-Ops][ta-ops] repo.
[ta-ops]: https://github.com/cs10/TA-Ops

## Getting Started
The [`docs/`][docs-folder] folder contains some documentation about Getting started with a chatbot, with a focus on deploying Alonzo for educational use.
Each file is numbered in the recommended order of reading.

[docs-folder]: docs/
