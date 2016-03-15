// Description:
//   Download late add response csv from google drive. 
//   Then email students and TAs with assignment due dates. 
//   Also propagate due dates to bCourses.
//
// Dependencies:
//   request
//   hubot-google-auth
//   csv
//   nodemailer
//   bcourses library see ./bcourses-config.js
//   cs10 caching library see ./caching.js
//   cs10 emailing library see ./emailer.js
//
// Configuration:
//   see ./bcourses-config.js for all configuration
//   cs10.LATE_ADD_FORM_URL - the link to the late add form for students to complete
//   cs10.LATE_ADD_FORM_PASSWORD - the password for the late add form that students get from their TAs
//   cs10.LATE_ADD_RESPONSES_DRIVE_ID - drive id of the late add form RESPONSES!
//
// Commands:
//   hubot refresh (force)? late data -  pulls the late data and uploads it to bcourses, optional include force
//   hubot test late add email - send a test email to andy@cs10.org
//   hubot test late add email all - send a test email to all the emails list in cs10.TA_EMAILS (see ./bcourses-config.js)
//
// Author:
//  Andrew Schmitt
var fs = require('fs');

var request = require('request');
var HubotGoogleAuth = require('hubot-google-auth');
var csv = require('csv');
var nodemailer = require('nodemailer');

var cs10 = require('./bcourses-config.js');
var cs10Cache = require('./caching.js');
var CS10Emailer = require('./emailer.js');

// Init the emailer object
var userEmail = process.env.MAILGUN_USER_EMAIL,
    userPassword = process.env.MAILGUN_USER_PASSWORD,
    emailer = new CS10Emailer(userEmail, userPassword);


// We'll initialize the google auth in the module.exports function
// since this is when we have access to the brain
var auth;

var CLIENT_ID = process.env.HUBOT_DRIVE_CLIENT_ID,
    CLIENT_SECRET = process.env.HUBOT_DRIVE_CLIENT_SECRET,
    REDIRECT_URL = process.env.HUBOT_DRIVE_REDIRECT_URL,
    SCOPES = 'https://www.googleapis.com/auth/drive';

// The google drive file ids for the late add file (responses)
var LATE_RESPONSES_ID = cs10.LATE_ADD_RESPONSES_DRIVE_ID;

// Field names in the student responses form
var DATE_FIELD = 'What day did you add the class?',
    NAME_FIELD = 'What is your name?',
    TA_FIELD = 'TA',
    SID_FIELD = 'What is your student id number (SID)?',
    EMAIL_FIELD = 'What is your preferred email address?',
    REASON_FIELD = 'Why did you add the class late?';

// A way to count whether all students got emails
var numEmails = 0,
    emailSucs = 0,
    emailFails = [],
    numAssignments = 0,
    assignmentFails = [],
    assignmentSucs = 0,
    emailsDone = false,
    assignmentsDone = false;

/**
 * Callback handlers
 */
var errorHandler = function(msg, cb) {
    if (cb) {
        return cb({
            err: null,
            msg: msg
        });
    }
    robot.logger.error(msg);
};

/**********************************************************
 * DOWNLOAD AND PROCESS LATE ADD RESPONSES CSV FROM DRIVE *
 **********************************************************/

/**
 * Downloads a file from the given links and places it into a csv parser.
 *
 * @param  link  the download link
 * @param  cb    the callback is called with the array of csv data
 */
var downloadCsvFromLink = function(link, cb) {

    // columns true means that each row is an object with columns as keys
    var parser = csv.parse({
        columns: true,
        trim: true,
        auto_parse: true,
        auto_parse_date: true
    }, function(err, data) {
        if (err) {
            return errorHandler('Error encountered when reading from google drive file', cb);
        }

        return cb(null, data);
    });

    var stream = request.get(link)
        .auth(null, null, true, auth.getTokens().token)
        .on('error', function(err) {
            cb({
                err: err,
                msg: 'Download Error: failed to download file'
            });
        })
        .pipe(parser);
}

/**
 * Downloads a file with given id from drive
 * Calls the callback with the modified date of the file
 */
var downloadDriveCsvFile = function(fileId, cb) {
    var authMsg = `Please authorize this app by visiting this url: ${auth.generateAuthUrl()}` +
        'then use the command @${robot.name} drive set code <code>';
    if (!auth.getTokens()) {
        return errorHandler(authMsg, cb);
    }

    auth.validateToken(function(err, resp) {

        if (err) {
            return errorHandler(`Could not refresh google auth tokens.\n${authMsg}`, cb);
        }

        var mimeType = 'text/csv';
        auth.google.drive('v2').files.get({
            fileId: fileId
        }, function(err, resp) {
            if (err) {
                return errorHandler(`API Error: Problem downloading late add response file`, cb);
            }

            var links = resp.exportLinks,
                modDate = resp.modifiedDate;

            if (!links || !links[mimeType]) {
                return errorHandler(`File Type Error: No export link found for mimeType: ${mimeType}`, cb);
            }

            downloadCsvFromLink(links[mimeType], function(err, data) {
                if (err) {
                    return cb(err);
                }

                return cb(null, data);
            });

        });
    });
}

/**
 * Gets the student responses file from google drive and downloads the csv file
 */
function processResponsesFile(force, cb) {

    var processStudentData = function(data) {
        var studData = {};

        var date = new Date(data[DATE_FIELD]);

        if (date < cs10.START_DATE) {
            date = cs10.START_DATE;
        }

        date.setHours(23);
        date.setMinutes(59);

        studData.sid = data[SID_FIELD];
        studData.name = data[NAME_FIELD];
        studData.ta = data[TA_FIELD];
        studData.date = date;
        studData.email = data[EMAIL_FIELD];
        studData.taEmail = cs10.TA_EMAILS[studData.ta];
        studData.emailSent = false;
        studData.assignments = []; // assignments that were successfully uploaded

        return studData;
    };

    downloadDriveCsvFile(LATE_RESPONSES_ID, function(err, data) {

        if (err) {
            return cb(err);
        }

        if (!data) {
            cb(null, null);
        }

        // Convert all the data into an array of the fields that we care about
        var allStudentData = [];
        for (var i = 0; i < data.length; i++) {
            allStudentData.push(processStudentData(data[i]));
        }

        cb(null, allStudentData);
    });
}

/******************
 * EMAIL STUDENTS *
 ******************/

/**
 * Calls the CS10EMAILER package to send an email to a given student
 */
var sendLateAddEmail = function(joinDate, dueDateMsgInfo, studObj, cb) {
    var recipients = [studObj.taEmail, studObj.email, cs10.ADMIN_EMAIL].join(','),
        subject = `[CS10] IMPORTANT: Late Add Due Dates for ${studObj.name}`,
        body = emailer.buildLateAddMessage(joinDate, dueDateMsgInfo, studObj);

    emailer.sendMail(recipients, subject, body, cb);
};

/**
 * Attempts to set assignment date for given set of students, who are late n weeks
 * If successful should cache the students as uploaded.
 *
 * @param  studs  an array of the students whose dates need to be set
 * @param  n      number of weeks that the students added late 
 */
function emailStudents(joinDate, force, studs, allAssignments, cb) {
    var assignments = getLateAddAssignments(joinDate, allAssignments);

    if (assignments.api.length == 0) {
        return cb({
            err: null,
            msg: `No late add assignments found for join date: ${joinDate.toDateString()}.`
        });
    }

    var apiInfo = assignments.api,
        messageInfo = assignments.msg;

    var studCb = function(stud, err, resp) {
        if (err) {
            emailFails.push({
                name: stud.name,
                email: stud.email
            });
        } else {
            // The students data should have been cached at this point (see below)
            var lateAddCache = cs10Cache.getLateAddData();

            if (!lateAddCache || !lateAddCache[+stud.sid]) {
                robot.logger.error(`EMAIL CB ERROR: late add cache is very broken :( sid: ${stud.sid} was not found`);
                emailFails += 1;
            } else {
                lateAddCache[+stud.sid].emailSent = true;
                cs10Cache.setLateAddData(lateAddCache);
                emailSucs += 1;
            }
        }

        if (emailFails.length + emailSucs == numEmails) {
            cb(null, {
                fails: emailFails,
                sucs: emailSucs
            });
        }
    }

    studs.forEach(function(stud) {

        if (!stud.emailSent || force) {
            sendLateAddEmail(joinDate, messageInfo, stud, studCb.bind(this, stud));
        }
    });
}

/****************************************
 * SET ASSIGNMENT OVERRIDES IN BCOURSES *
 ****************************************/

/**
 * Posts an assignment override with a new due date for the given set of students
 */
var postOverride = function(assignment, studentIds, dueDate, title, cb) {

    var oneDay = 1000 * 60 * 60 * 24;
    oldDueDate = new Date(assignment.due_at),
        unlockAt = new Date(assignment.unlock_at),
        lockAt = new Date(assignment.lock_at),
        difference = Math.round((lockAt - oldDueDate) / oneDay),
        minLockAtDate = addDays(dueDate, difference);

    if (lockAt < minLockAtDate) {
        lockAt = minLockAtDate;
    }

    var url = `${cs10.baseURL}assignments/${assignment.id}/overrides.json`,
        form = {
            'assignment_override[student_ids][]': studentIds.map(sid => cs10.normalizeSID(sid)),
            'assignment_override[title]': title,
            'assignment_override[due_at]': dueDate.toISOString(),
            'assignment_override[unlock_at]': unlockAt.toISOString(),
            'assignment_override[lock_at]': lockAt.toISOString()
        }
    cs10.post(url, '', form, function(err, resp) {
        cb(err, resp);
    });
}

/**
 * Attempts to set assignment date for a given set of students
 */
var setAssignmentDates = function(joinDate, studs, allAssignments, cb) {
    var assignments = getLateAddAssignments(joinDate, allAssignments);

    if (assignments.api.length == 0) {
        return cb({
            err: null,
            msg: `No late add assignments found for join date: ${joinDate.toDateString()}.`
        });
    }

    var apiInfo = assignments.api,
        messageInfo = assignments.msg;

    var studCb = function(studs, assignmentId, err, resp) {
        studs.forEach(function(stud) {
            if (err || resp.statusCode >= 400) {
                assignmentFails.push({
                    name: stud.name,
                    assignmentId: assignmentId
                });
            } else {
                // The students data should have been cached at this point (see uploadToBcourses)
                var lateAddCache = cs10Cache.getLateAddData();
                if (!lateAddCache || !lateAddCache[+stud.sid]) {
                    robot.logger.error(`ASSIGNMENT UPLOAD ERROR: late add cache is very broken :( sid: ${stud.sid} not found`);
                    assignmentFails += 1;
                } else {
                    if (lateAddCache[+stud.sid].assignments.indexOf(assignmentId) === -1) {
                        lateAddCache[+stud.sid].assignments.push(assignmentId);
                    }
                    cs10Cache.setLateAddData(lateAddCache);
                    assignmentSucs += 1;
                }
            }
        });

        if (assignmentFails.length + assignmentSucs == numAssignments) {
            cb(null, {
                fails: assignmentFails,
                sucs: assignmentSucs
            });
        }
    }

    var students,
        studentIds,
        studentNames,
        newDueDate;

    // Handle rate limiting by only sending 2 request per second
    var waitTime = 500;
    apiInfo.forEach(function(assignment) {
        students = studs.filter(stud => stud.assignments.indexOf(assignment.id) === -1);

        if (students.length === 0) {
            return;
        }

        studentIds = students.map(stud => stud.sid),
            studentNames = students.map(stud => stud.name).join(','),
            newDueDate = new Date(assignment.new_due_date);
        title = `Due at: ${newDueDate.toDateString()}, For: ${studentNames}`;

        setTimeout(postOverride, waitTime, assignment, studentIds, newDueDate, title, studCb.bind(this, studs, assignment.id));
        waitTime += 500;
    });
}

/**********************************************
 * START UPLOAD PROCESS AND DISPATCH REQUESTS *
 **********************************************/

/**
 * Returns a new date object with n days added to it
 */
var addDays = function(date, n) {
    return new Date(date.valueOf() + 864e5 * n);
}

/**
 * Returns a list of assignment objects.
 * Filters the list of assignments to only the late add assignments
 * and adds the number of extension days to each of these objects.
 */
function getLateAddAssignments(joinDate, allAssignments) {
    var lateAddAssignments = [],
        lateAddMessageInfo = [],
        rawLateAddAssignments = cs10.lateAddAssignments,
        bAsgn, lateAsgn,
        dueDate, newDueDate,
        extensionDays,
        prevDueDate = null;

    for (var assignId in rawLateAddAssignments) {
        for (var bcoursesId in allAssignments) {
            if (assignId === bcoursesId) {
                bAsgn = allAssignments[bcoursesId];
                lateAsgn = rawLateAddAssignments[assignId]

                // Only accept the new due date if it is not before the actual due date
                // The new due date may need to be calculated from the previous assignment's due date
                dueDate = new Date(bAsgn.due_at);
                extensionDays = lateAsgn.days;

                if (prevDueDate) {
                    newDueDate = addDays(prevDueDate, extensionDays);
                } else {
                    newDueDate = addDays(joinDate, extensionDays);
                }
                if (newDueDate < dueDate) {
                    newDueDate = dueDate;
                }

                bAsgn.new_due_date = newDueDate;
                prevDueDate = newDueDate;
                lateAddAssignments.push(bAsgn);
                lateAddMessageInfo.push({
                    name: lateAsgn.name,
                    date: newDueDate.toDateString() + ' at 11:59pm'
                });
                break;
            }
        }
    }

    return {
        api: lateAddAssignments,
        msg: lateAddMessageInfo
    };
}

/**
 * We need to do some uploading of past cached data in one of three cases:
 * - the force command is issued
 * - the student never got an email
 * - not all of the students assignments were uploaded
 */
var shouldUpload = function(force, stud) {
    var numAssignments = Object.keys(cs10.lateAddAssignments).length;

    return force || !stud.emailSent || !(stud.assignments.length == numAssignments);
}

/**
 * Set assignments dates for the given set of student info objects into bcourses.
 *
 * @param  force           boolean, forces an update of all late add data
 * @param  studentData     an array of student object to be uploaded see processStudentData above
 * @param  allAssignments  the cached array of all assignment objects from bCourses
 * @param  cb              you know
 */
function uploadToBcourses(force, allStudentData, allAssignments, cb) {

    // Determine what cached student data needs to be uploaded
    var cachedData = cs10Cache.getLateAddData() || {};

    var needsUpload = [];
    allStudentData.forEach(function(stud) {
        // If in the cache then fetch that object otherwise cache the data
        if (cachedData[stud.sid]) {
            stud = cachedData[stud.sid];
            stud.date = new Date(stud.date);
        } else {
            cachedData[stud.sid] = stud;
        }

        if (shouldUpload(stud)) {
            needsUpload.push(stud);
        }
    });

    cs10Cache.setLateAddData(cachedData);

    // Upload student data in groups partitioned by join date
    var student = [],
        addDateMap = {};

    for (var i = 0; i < needsUpload.length; i++) {
        stud = needsUpload[i];
        if (!addDateMap[stud.date.toDateString()]) {
            addDateMap[stud.date.toDateString()] = [];
        }
        addDateMap[stud.date.toDateString()].push(stud);
    }

    // Determine how many emails will be sent out
    numEmails = needsUpload.filter(stud => !stud.emailSent).length;
    emailFails = [];
    emailSucs = 0;

    // Determine how many assignments need to be uploaded
    var numLateAddAssignments = Object.keys(cs10.lateAddAssignments).length,
        numAssignmentsUploaded = 0;
    needsUpload.forEach(function(stud) {
        numAssignmentsUploaded += stud.assignments.length;
    });

    numAssignments = (needsUpload.length * numLateAddAssignments) - numAssignmentsUploaded;
    assignmentFails = [];
    assignmentSucs = 0;

    emailsDone = false;
    assignmentsDone = false;

    if (numEmails === 0) {
        emailsDone = true;
    }

    if (numAssignments === 0) {
        assignmentsDone = true;
    }

    if (assignmentsDone && emailsDone) {
        cb(null, {
            emails: {
                fails: [],
                sucs: 0
            },
            assignments: {
                fails: [],
                sucs: 0
            }
        });
    }

    for (var date in addDateMap) {
        emailStudents(new Date(date), force, addDateMap[date], allAssignments, function(err, resp) {
            emailsDone = true;

            if (emailsDone && assignmentsDone) {
                cb(null, {
                    emails: resp,
                    assignments: {
                        fails: assignmentFails,
                        sucs: assignmentSucs
                    }
                });
            }
        });
        setAssignmentDates(new Date(date), addDateMap[date], allAssignments, function(err, resp) {
            assignmentsDone = true;

            if (emailsDone && assignmentsDone) {
                cb(null, {
                    emails: {
                        fails: emailFails,
                        sucs: emailSucs
                    },
                    assignments: resp
                });
            }
        });
    }
}

/**
 * Reads from the late add responses spreadsheet and makes the appropriate updates to bcourses
 * This is the starting point for the late add updater
 *
 * @param  force  boolean, forces an update of all late add data
 * @param  cb     the callback function (err, resp)
 */
function updateLateData(force, cb) {
    var error = false;

    // First make sure that the assignments cache is valid and usable
    cs10Cache.allAssignments(function(err, resp) {

        if (err) {
            return cb(err);
        }

        processResponsesFile(force, function(err, studentsToUpload) {
            if (err) {
                return cb(err);
            }

            uploadToBcourses(force, studentsToUpload, resp.cacheVal, cb);
        });
    });
}


/***********************************************
 * PROCESS EMAIL/UPLOAD FAILURES AND SUCCESSES *
 ***********************************************/

var processAssignmentResults = function(msg, results) {
    msg.send(`Number of assignment uploads failed: ${results.fails.length}`);
    if (results.fails.length > 0) {
        var failures = "",
            f;
        for (var i = 0; i < results.fails.length; i++) {
            f = results.fails[i];
            failures += `\tstudent: ${f.name}, assignment: ${f.assignmentId}\n`;
        }
        msg.send(failures)
    }
    msg.send(`Number of assignment uploads succeeded: ${results.sucs}`);
}

var processEmailResults = function(msg, results) {
    msg.send(`Number of emails failed: ${results.fails.length}`);
    if (results.fails.length > 0) {
        var failures = "",
            a;
        for (var i = 0; i < results.fails.length; i++) {
            a = results.fails[i];
            failures += `\tfailed to: ${a.name} at ${a.email}\n`;
        }
        msg.send(failures)
    }
    msg.send(`Number of emails succeeded: ${results.sucs}`);

}


/*********************************
 * TEST EXAMPLES FOR THE EMAILER *
 *********************************/

var taEmailList = Object.keys(cs10.TA_EMAILS).map(key => cs10.TA_EMAILS[key]).join(',');

var testStudent = {
    sid: '12345',
    name: 'Michael Ball',
    ta: 'Andy',
    date: new Date('2/10/2016'),
    email: 'andy@cs10.org',
    taEmail: 'andy@cs10.org'
}

var testAllTAs = {
    sid: '12345',
    name: 'Michael Ball',
    ta: 'Andy',
    date: new Date('2/10/2016'),
    email: 'andy@cs10.org',
    taEmail: taEmailList
}

/*******************
 * ROBOT FUNCTIONS *
 *******************/

module.exports = function(robot) {

    robot.brain.on('loaded', function() {
        auth = new HubotGoogleAuth(
            'HUBOT_DRIVE',
            CLIENT_ID,
            CLIENT_SECRET,
            REDIRECT_URL,
            SCOPES,
            robot.brain
        );
    });

    robot.respond(/(force)?\s*refresh\s*(force)?\s*late\s*(?:add)?\s*data/i, {
        id: 'cs10.late-add-updater.refresh'
    }, function(res) {
        var msg = '',
            force = false;
        if (res.match[1] || res.match[2]) {
            force = true;
            msg = 'force ';
        }
        res.send(`Attempting to ${msg}update student late data in bcourses...`);
        updateLateData(force, function(err, resp) {
            if (err) {
                return msg.send(err.msg);
            }

            processEmailResults(res, resp.emails);
            processAssignmentResults(res, resp.assignments);
        });
    });

    robot.respond(/test late (add)?\s*email/i, {
        id: 'cs10.late-add-updater.test'
    }, function(msg) {
        msg.send('testing late add emailer....');
        cs10Cache.allAssignments(function(err, resp) {
            if (err) {
                msg.send('Could not get all assignments: \n' + err.msg);
            }

            numEmails = 1;
            emailFails = [];
            emailSucs = 0;

            emailStudents(testStudent.date, [testStudent], resp.cacheVal, function(err, resp) {
                if (err) {
                    return msg.send(err.msg);
                }

                processEmailResults(msg, resp);
            });

        });
    });

    robot.respond(/test late (add)?\s*email all\s*(tas)?/i, {
        id: 'cs10.late-add-updater.test'
    }, function(msg) {
        msg.send('testing late add emailer to all TAs....');
        cs10Cache.allAssignments(function(err, resp) {
            if (err) {
                msg.send('Could not get all assignments: \n' + err.msg);
            }

            numEmails = 1;
            emailFails = [];
            emailSucs = 0;

            emailStudents(testAllTAs.date, [testAllTAs], resp.cacheVal, function(err, resp) {
                processEmailResults(msg, resp);
            });

        });
    });

    robot.respond(/show late\s*(add)?\s*data/i, {
        id: 'cs10.late-add-updater.show'
    }, function(msg) {

    });
}