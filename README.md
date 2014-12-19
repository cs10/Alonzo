# Alonzo

Alonzo is the sassy (and helpful!) bot for CS10. He's our mascot. Alonzo has attitude, but that's OK, because he's pretty awesome in general! He's a big help to everyone on the team!

This CS10's version of GitHub's Campfire bot, hubot. He's pretty cool.

This version is designed to be deployed on Heroku.

## Cool Story, Bro But I want X
Sure, make a pull request! Don't push directly to master even if you can avoid it.

## Setup Alonzo
Alonzo is designed to be deployed on Heroku and connected to HipChat. This will give the basics of getting up to speed with Alonzo. Alonzo has already gone through initial deployments, so it should be easy to update.

1. Checkout out the main [Hubout Docs][hubot-docs]
2. As well as the [hipchat-adapter][hc-adap] docs.
3. These are the dependencies you should have:
    `node` (with `npm`) and the `heroku-toolbelt`
    On OS X systems, [`brew`](brew) is a good way to install these.
4. If you have just cloned the repo, you should make sure to `npm install`.
5. When you're adding scripts be sure to `npm install --save DEP` so others don't run into any issues!
6. To update Herkou:
    ```
    git push heroku master
    heroku restart
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

## Scripting

Take a look at the scripts in the `./scripts` folder for examples.
Delete any scripts you think are useless or boring.  Add whatever functionality you
want Alonzo to have. Read up on what you can do with Alonzo in the [Scripting Guide][scripts].

#### Alonzo-scripts
Alonzo uses many scripts which originate from [hubot-scripts][Hubot-scripts]. Feel free to add and configure some more if they're interesting :)

To enable scripts from the hubot-scripts package, add the script name with
extension as a double quoted string to the `hubot-scripts.json` file.

#### external-scripts
Alonzo is now able to load scripts from third-party `npm` packages! To enable
this functionality you can follow the following steps.

1. Add the packages as dependencies into your `package.json`
2. `npm install` to make sure those packages are installed

To enable third-party scripts that you've added you will need to add the package
name as a double quoted string to the `external-scripts.json` file in this repo.

##### Redis Persistence
Alonzo has been setup to use redis already. If it ever becomes not needed it can be turned off.

[config]: config_notes.md
[Hubot-scripts]: https://github.com/github/Hubot-scripts
[scripts]: https://github.com/github/Alonzo/blob/master/docs/scripting.md
[heroku-node-docs]: http://devcenter.heroku.com/articles/node-js
[deploy-heroku]: https://github.com/github/Hubot/blob/master/docs/deploying/heroku.md
[heroku]: http://www.heroku.com