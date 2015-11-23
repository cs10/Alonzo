// Description:
//   Look up the group numbers of students on bcourses
//
// Dependencies:
//   bcourses library see ./bcourses-config.js
//	 cs10 Caching see ./cs10-caching.js
//
// Configuration:
//   See bcourses
//
// Commands:
//   hubot <group-name> group for <sid>  --> example: Final project group for 23456778
//
// Author:
//  Andrew Schmitt

// This sets up all the bCourses interface stuff
var cs10 = require('./bcourses-config.js');
//stuff for caching
var cs10Cache = require('./cs10-caching.js');

module.exports = function(robot) {

	// Tries to match '<assignment-name> group for <sid>'
	// TODO: HANLDE PAGINATION AND RATE LIMITING then this can be activated
	// robot.respond(/(.+?)(?=\s*group for\s*(\d+))/i, {id: 'cs10.bcourses-groups.group-for-sid'}, function(msg) {
	// 	var assgn = msg.match[1],
	// 		sid = msg.match[2];
	// 	getGroupForSID(assgn, sid, function(error, group) {
	// 		if (error) {
	// 			msg.send(error.msg);
	// 			return;
	// 		}
	// 		msg.send(`Group for sid: ${sid} is ${group}`);
	// 	});
	// });
};

function getCategoryID(groups, assgn) {
	var re;
	for (var grp_name in groups) {
		//space and case insensitive
		var regexStr = grp_name.replace(' ', '\\s*');
		re = new RegExp(regexStr, 'i');
		if (assgn.match(re)) {
			return groups[grp_name];
		}
	}
}

function getGroupForSID(assgn, sid, cb) {
	var groupCache = cs10Cache.studentGroups();

	// If cache is invalid refresh it and try again
	if (!cs10Cache.cacheIsValid(groupCache)) {
		cs10Cache.cacheStudGroups(function(respObj) {
			if (respObj.error) {
				cd(respObj);
				return;
			}
			getGroupForSID(assgn, sid, cb);
		});
		return;
	}

	var catID = getCategoryID(groupCache.cacheVal, assgn);

	// If no group id can be matched list available groups
	if (!catID) {
		var groups = "";
		for (var grp_name in groupCache.cacheVal) {
			groups += `${grp_name}\n`
		};
		cb({msg: `Could not find a group with that name. Possible groups are:\n ${groups}`}, null);
		return;
	}

	// Get all groups for the group category
	// TODO: deal with some pagination and rate-limiting here
	cs10.get(`/group_categories/${catID}/groups`, {per_page: 100}, function (error, resp, groups) {

		if (error) {
			cb({msg: `Could not find a matching group for student: ${sid}`}, null);
			return;
		}

		// Check all groups for matching sid
		groups.forEach(function(grp) {
			if (+grp.members_count > 0) {
				cs10.get('/groups/' + grp.id +'/users', '', function (error2, resp2, students) {
					if (error2) {
						cb({msg: `Could not find a matching group for student: ${sid}`}, null);
						return;
					}
					console.log(students);
					students.forEach(function(stud) {
						if (stud.sis_user_id === sid) {
							cb(null, grp.name);
							return;
						}
					});
				});
			}
		});
	});
}