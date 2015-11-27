//  DESCRIPTION:
//  CS10 Authorization Framework for Chat Commands
//
//  This sets up a generic way to restrict access to commands to TAs only.
//  Based on "middleware" which is executed between after a command is matched
//  but before the function is executed. See the following docs.
// https://github.com/github/hubot/blob/master/docs/patterns.md#restricting-access-to-commands
// See also hubot-rbac
// See also hubot-confirmation
//
// COMMANDS
//   None
//


module.exports = function (robot) {
    // robot.listenerMiddleware (function (context, next, done) {
    //     next();
    // });
};