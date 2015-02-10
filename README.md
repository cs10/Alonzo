# Alonzo

Alonzo is the sassy (and helpful!) bot for CS10. He's our mascot. Alonzo has attitude, but that's OK, because he's pretty awesome in general! He's a big help to everyone on the team!

Alonzo is [CS10][awesomest-class]'s version of GitHub's Campfire bot, hubot. Currently, Alonzo is configured to work with our staff HipChat instance.

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
* @Alonzo question -- query wolfram alpha
* ++ and -- score tracking are built in. Award your favorite TA some points!
* Meme generation is built in (@Alonzo <Meme Text>)
* Something called Hubots Against Humanity...idk what that's about. ;)
* Google Translate, Google Maps, Google Images!
* XKCD, of course!
* Url, base64 encoding and decoding as well as a bunch of hashing functions
* Specific Images of:
	* Programmer Ryan Gosling
	* Pugs
	* Pusheen The Cat
	* Octocats!

#### Please see the full list of [generated commands][help].

### Our class use of 'chat-ops' is described in the [TA-Ops](https://github.com/cs10/TA-Ops) repo.

## Setup Alonzo
Alonzo is designed to be deployed on Heroku and connected to HipChat. The initial setup has already been done, so adapting Alonzo should be easy.

1. Clone this repo to your machine.
2. These are the dependencies you should have:
    `node` (with `npm`) and the `heroku-toolbelt`
    On OS X systems, [`brew`](brew) is a good way to install these.
3. If you have just cloned the repo, you should make sure to `npm install`.
4. When you're adding scripts be sure to `npm install --save DEP` so others don't run into any issues!
5. To update Herkou:
    ```
    git push heroku master
    heroku logs # make sure nothing broke!
    ```
7. All of the CS10 config values can be found in the file `.env [Alonzo]` (in a separate repo). The values are on Heroku or other places. You should be able to find where it is, if you have access. :)

More detailed documentation can be found on the
[deploying Alonzo onto Heroku][deploy-heroku] wiki page.

### Testing Alonzo Locally

You can test Alonzo by running the following.

    $ ./alonzo

You'll see some start up output about where your scripts come from and a
prompt.

    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading adapter shell
    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading scripts from /home/tomb/Development/Alonzo/scripts
    [Sun, 04 Dec 2011 18:41:11 GMT] INFO Loading scripts from /home/tomb/Development/Alonzo/src/scripts
    Alonzo>

Then you can interact with Alonzo by typing `Alonzo help`.

    Alonzo> Alonzo help

    Alonzo> animate me <query> - The same thing as `image me`, except adds a few
    convert me <expression> to <units> - Convert expression to given units.
    help - Displays all of the help commands that Alonzo knows about.
    ...

__Please at least run Alonzo locally before deploying!__

## Writing New Scripts

Take a look at the scripts in the `./scripts` folder for examples.
Delete any scripts you think are useless or boring. Add whatever functionality you want Alonzo to have. Read up on what you can do with Alonzo in the [Scripting Guide][scripts]. Scripts are pretty easy to write!

https://leanpub.com/automation-and-monitoring-with-hubot/read#leanpub-auto-cross-script-communication-with-events

#### Alonzo-scripts
Alonzo uses many scripts which originate from [hubot-scripts][Hubot-scripts]. Feel free to add and configure some more if they're interesting :) You can drop any new script into `./scripts` and run it will be run when Alonzo starts up. Just make sure to note any configuration that's needed.

#### external-scripts
Alonzo is now able to load scripts from third-party `npm` packages! To enable
this functionality you can follow the following steps.

1. Add the packages as dependencies into your `package.json`
2. `npm install` to make sure those packages are installed

To enable third-party scripts that you've added you will need to add the package
name as a double quoted string to the `external-scripts.json` file in this repo.

A good collection of scripts can be found in the [hubot-scripts organization](https://github.com/hubot-scripts).

[awesomest-class]: http://cs10.org/
[help]: http://alonzo.herokuapp.com/Alonzo/help
[Hubot-scripts]: https://github.com/github/Hubot-scripts
[scripts]: https://github.com/github/Alonzo/blob/master/docs/scripting.md
[heroku-node-docs]: http://devcenter.heroku.com/articles/node-js
[deploy-heroku]: https://github.com/github/Hubot/blob/master/docs/deploying/heroku.md