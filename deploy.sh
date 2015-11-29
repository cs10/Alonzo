#!/bin/bash
set -e # exit with nonzero exit code if anything fails

# Init a new repo
git init

# Inside this git repo we'll pretend to be a new user
git config --global user.name "Travis CI"
git config --global user.email "andy@cs10.org"

# The first and only commit to this new Git repo contains all the
# files present with the commit message "Deploy to GitHub Pages".
git add .
git commit -m "[ci skip] Deploy via Travis CI"

# Force push from the current repo's master branch to the remote
# repo's master branch. We redirect any output to
# /dev/null to hide any sensitive credential data that might otherwise be exposed.
GH_REF=https://github.com/cs10/Alonzo.git
git push --force "https://${GH_DEPLOY_TOKEN}@${GH_REF}" master > /dev/null 2>&1

# Push to heroku branch
HK_REF=https://git.heroku.com/alonzo.git
git push --force "https://${GH_DEPLOY_TOKEN}@${HK_REF}" master > /dev/null 2>&1