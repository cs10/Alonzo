# Alonzo

Alonzo is the sassy (and helpful!) bot for CS10. He's our mascot. Alonzo has attitude, but that's OK, because he's pretty awesome in general! He's a big help to everyone on the team!

This CS10's version of GitHub's Campfire bot, hubot. He's pretty cool.

This version is designed to be deployed on [Heroku][heroku].

[heroku]: http://www.heroku.com

## Cool Story, Bro

## Setup Alonzo
Some dependencies:
* nodejs, coffee-script
* heroku-toolbelt
* icu4c
* hubot-hipchat adapter

### Testing Alonzo Locally

You can test Alonzo by running the following.

    % bin/hubot

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


### Scripting

Take a look at the scripts in the `./scripts` folder for examples.
Delete any scripts you think are useless or boring.  Add whatever functionality you
want Alonzo to have. Read up on what you can do with Alonzo in the [Scripting Guide](https://github.com/github/Alonzo/blob/master/docs/scripting.md).

### Redis Persistence

If you are going to use the `redis-brain.coffee` script from `Alonzo-scripts`
(strongly suggested), you will need to add the Redis to Go addon on Heroku which requires a verified
account or you can create an account at [Redis to Go][redistogo] and manually
set the `REDISTOGO_URL` variable.

    % heroku config:set REDISTOGO_URL="..."

If you don't require any persistence feel free to remove the
`redis-brain.coffee` from `Alonzo-scripts.json` and you don't need to worry
about redis at all.

[redistogo]: https://redistogo.com/

## Adapters

Adapters are the interface to the service you want your Alonzo to run on. This
can be something like Campfire or IRC. There are a number of third party
adapters that the community have contributed. Check
[Hubot Adapters][Hubot-adapters] for the available ones.

If you would like to run a non-Campfire or shell adapter you will need to add
the adapter package as a dependency to the `package.json` file in the
`dependencies` section.

Once you've added the dependency and run `npm install` to install it you can
then run Alonzo with the adapter.

    % bin/Hubot -a <adapter>

Where `<adapter>` is the name of your adapter without the `Hubot-` prefix.

[Hubot-adapters]: https://github.com/github/Hubot/blob/master/docs/adapters.md

## Alonzo-scripts

There will inevitably be functionality that everyone will want. Instead
of adding it to Alonzo itself, you can submit pull requests to
[Hubot-scripts][Hubot-scripts].

To enable scripts from the Hubot-scripts package, add the script name with
extension as a double quoted string to the `Hubot-scripts.json` file in this
repo.

[Hubot-scripts]: https://github.com/github/Hubot-scripts

## external-scripts

Tired of waiting for your script to be merged into `Hubot-scripts`? Want to
maintain the repository and package yourself? Then this added functionality
maybe for you!

Alonzo is now able to load scripts from third-party `npm` packages! To enable
this functionality you can follow the following steps.

1. Add the packages as dependencies into your `package.json`
2. `npm install` to make sure those packages are installed

To enable third-party scripts that you've added you will need to add the package
name as a double quoted string to the `external-scripts.json` file in this repo.

## Deployment

    % heroku create --stack cedar
    % git push heroku master
    % heroku ps:scale app=1

If your Heroku account has been verified you can run the following to enable
and add the Redis to Go addon to your app.

    % heroku addons:add redistogo:nano

If you run into any problems, checkout Heroku's [docs][heroku-node-docs].

You'll need to edit the `Procfile` to set the name of your Alonzo.

More detailed documentation can be found on the
[deploying Alonzo onto Heroku][deploy-heroku] wiki page.


[heroku-node-docs]: http://devcenter.heroku.com/articles/node-js
[deploy-heroku]: https://github.com/github/Hubot/blob/master/docs/deploying/heroku.md

## Restart the bot

You may want to get comfortable with `heroku logs` and `heroku restart`
if you're having issues.
