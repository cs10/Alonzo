# Course Setup
This document goes over what variables need to be changed each semester so that Alonzo can perform useful functions for cs10.

## Step 1: Set values in `scripts/cs10/bcourses-config.js`

`bcourses-config.js` contains all of the variables that any of the cs10 Alonzo scripts might need.  These include things like important course dates, TA names and emails, etc.  You'll notice that there is one very important section with the header:
```
/************************************************
 * STUFF THAT NEEDS TO BE UPDATED EACH SEMESTER *
 ************************************************/

// LAST UPDATED FOR: SPRING 2016 - ANDY
```
This is the section that you will need to change most if not all of the variables within.
Things to note when updating these varaibles:
* All strings can be single or double quoted except for strings that look like the following:
```
cs10.gradebookURL = \`${bCoursesURL+cs10.baseURL}gradebook\`;
````
Note that the string on the right is enclosed with backquotes \(\`\). This is because it is a variable interpolation string. You can read more about this on google if you're interested.
* Assignment Ids come from bcourses urls.  Just click on the assignment in bcourses and then the id will can be found by searching the url string like this:
```
https://bcourses.berkeley.edu/courses/<course-id>/assignments/<assignment-id>
```
Everything else is fairly well documented in the file itself.

## Step 2: Setup Heroku Config Variables

You can find the list of config variables that Alonzo will need to use on Heroku. Go to the page for the Alonzo app on heroku and then go to Settings > reveal config variables.  Here you can modfiy, delete and add config variables.  If you ever run into a problem where a scripts that used to work is now failing it is very likely that it needs one of its config variables updated (web apis often times require that you get a new api key every so often). Here is a list of the config variables that you will definitely need to update each semester (each variable has a link to an instructions page):
* [HUBOT_CANVAS_KEY][canvas-key] - this is what allows hubot to interact with bcourses.
* [HUBOT_GITHUB_TOKEN][github-token] - this should be set to whoever is currently the cs10 dev position (or a Head TA)

There are many other varibales that are used by more specific scripts. If you run into problems with these scripts it is likely that there associated config variables need to be updated. Google will help with this, but looking the documentation for that specific package can also be very helpful.


[canvas-key]: https://guides.instructure.com/m/4214/l/40399-how-do-i-obtain-an-api-access-token-for-an-account
[github-token]: https://help.github.com/articles/creating-an-access-token-for-command-line-use/