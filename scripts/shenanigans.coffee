console.log process.env

try
    process.env['HUBOT_TEST'] = 'IT WORKS'
catch error
    console.log error
