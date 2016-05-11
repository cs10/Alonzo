# Alonzo Grows Up
> Or, how to develop a chatbot.

---

## Setup Alonzo
Alonzo is designed to be deployed on Heroku and connected to HipChat. The initial setup has already been done, so adapting Alonzo should be easy. This section gives a high level overview of how to develop Alonzo. We'll get more detailed later and in other docs.

1. Clone this repo to your machine.
2. These are the dependencies you should have:
    `node` (with `npm`) and the `heroku-toolbelt`
    On OS X systems, [`brew`](brew) is a good way to install these.
	* In general, you should have a recent version of `node` and `npm`.
3. If you have just cloned the repo, you should make sure to `npm install`.
4. Make a free Herkou account and get access to the Herkou app named 'alonzo'. Talk to the head TA to get access.
5. In your local copy of this repo add a remote as follows (this will allow you to push to Herkou in the next step):

    ```
    heroku git:remote -a alonzo
    ```
7. To update alonzo on Herkou just push to this repo (this will deploy live to the chatbot):

    ```
    git push origin master
    ```

8. All of the CS10 config values (these are things like api keys, usernames, passwords, etc...) are held in a separate private repo. However, all of the config variables that alonzo actually uses live on Heroku (Heroku.com > Alonzo > Settings > Config Vars).

## Other Notes
* Before developing always run npm -i. This will install any new scripts that might have been added since you last worked on Alonzo.
* When you're adding third party scripts be sure to `npm install --save SCRIPT` so others don't run into any issues!

### Testing Alonzo Locally

#### Unit Testing
The framework is in place such that you can run the command `npm test` and a series of automated unit tests will run on alonzo.  To see how to write these tests check out [this package][hubot-testing] and also check out the testing scripts in the tests/ folder.  It is a good idea to run `npm test` before pushing any changes to Alonzo.  These tests are faily difficult to get right, but with some time could prove to be really cool.

#### Bcourses Testing
Sometimes you might want to test out a script that uses the bcourses api \(for an example see scripts/cs/checkoffs.js\). However, maybe you don't want whatever changes you make to be refelcted in the actual course. To solve this problem canvas \(Bcourses\) provides a test instance that is an almost exact replica of the current cs10 site \(the one catch is that it is a 3 week old version of the course site\). To have Alonzo use this test instance instead go to scripts/cs10/bcourses-config.js and chang the TEST variable at the top to `true`.  MAKE SURE NOT TO PUSH TO GITHUB WITH THIS VARIABLE SET TO TRUE!!! There is an `npm test` unit test that will fail if the value is set to true, so it's good to always run `npm test` as a sanity check.

#### Testing By Hand
You can test Alonzo by hand by running the following:

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

#### hubot-scripts repo
Please don't use scripts from [hubot-scripts][hubot-scripts]. The repo is officially deprecated an no longer maintained! You should search for the script in question as it's own package, or just create a new script inside the local scripts directory. Please make sure any configuration is documented.

#### external-scripts
Alonzo is able to load scripts from third-party `npm` packages! To enable
this functionality you can follow the following steps.

1. `npm install --saves` to make sure those packages are installed. The --save option will save the packages into the package.json file.

To enable third-party scripts that you've added you will need to add the package
name as a double quoted string to the `external-scripts.json` file in this repo.

A good collection of scripts can be found in the [hubot-scripts organization](https://github.com/hubot-scripts).  This organization is technically closed now, so many of the newest hubot scripts are hosted just on npm.

## Next Steps
* If you want to get more into development check out the deployment.md document in this repo.
* Otherwise have fun writing new features for Alonzo \(or fixing old ones....\)!

[help]: http://alonzo.herokuapp.com/Alonzo/help
[hubot-scripts]: https://github.com/github/Hubot-scripts
[scripts]: https://github.com/github/Alonzo/blob/master/docs/scripting.md
[heroku-node-docs]: http://devcenter.heroku.com/articles/node-js
[deploy-heroku]: https://github.com/github/Hubot/blob/master/docs/deploying/heroku.md
[hubot-testing]: https://github.com/mtsmfm/hubot-test-helper