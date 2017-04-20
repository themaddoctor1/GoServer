
var fs = require('fs');

module.exports = function (filename) {
    var module = {};

    var file = require(filename);
    module.addAccount = function (usernm, passwd) {
        //Ensure that the username is not taken
        for (var i = 0; i < file.users.length; i++) {
            if (file.users[i].username == usernm)
                return false;
        }
        
        //Add the user
        file.users.push({"username" : usernm, "password" : passwd});
        
        updateUserStore(file);
        return true;
    }

    module.getAccountValue = function (usernm, field) {
        if (field == "password") //Ban password access
            return undefined;
        for (var i = 0; i < file.users.length; i++) {
            if (file.users[i].username == usernm)
                return file.users[i][field];
        }
        return undefined;
    }

    module.setAccountValue = function (usernm, field, val) {
        if (field == "password") //Do not allow access to the password
            return;
        for (var i = 0; i < file.users.length; i++) {
            if (file.users[i].username == usernm) {
                file.users[i][field] = val;
                updateUserStore(file);
                return;
            }
        }
    }

    module.remAccount = function (usernm, passwd) {
        //Find and destroy the user
        for (var i = 0; i < file.users.length; i++)
            if (file.users[i].username == usernm) {
                //Verify the password
                if (file.users[i].password != passwd)
                    return false;
                file.users.splice(i, 1);

                updateUserStore(file);
                return true;
            }
        return false;
    }

    module.verifyPassword = function (usernm, passwd) {
        //Find the user
        for (var i = 0; i < file.users.length; i++)
            if (file.users[i].username == usernm)
                return file.users[i].password == passwd;

        return false;
    }

    function updateUserStore() {
        fs.writeFile(filename, JSON.stringify(file, null, 4), function (err) {
            if (err) return console.log(err);
            //console.log(JSON.stringify(file));
            //console.log('writing to ' + fileName);
        }, 4);
    }

    return module;
}


