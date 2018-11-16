const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const INDEX = __dirname + '/client/';

const server = app
    .use(express.static(INDEX))
    .listen(PORT, () => console.log(`Listening on ${ PORT }`));

const io = socketio(server);

var users = [];
var shPlayers = [];
var userColors = [];
var readyPlayers = [];

var numLiberals = 0;
var numFascists = 0;
var fascists = [];
var liberals = [];
var hitler = '';
var shGameActive = false;
var president = '';
var chancellor = '';
var undesirables = [];
var votesForGov = 0;
var votesAgainstGov = 0;
var rejectedGovs = 0;
var topThreePolicies = [];

io.on('connection', (socket) => {

    socket.on('user-login', function (data) {
        var name = data.t;
        var color = '#' + Math.floor(Math.random() * 16777215).toString(16);
        var u = true;

        u = users.includes(name) || shPlayers.includes(name);

        if (!u) {
            users.push(name); //store user in an array
            userColors.push(color);
            console.log(name + ' connected\nusers: ' + users.length); //log the connection
            socket.user = data.t;
            socket.emit('validated-login', {
                name: name,
                c: color
            });
        } else {
            socket.emit('rejected-login', "username taken!");
        }

    });

    socket.on('request-new-color', function (data) {
        userColors[users.indexOf(data)] = '#' + Math.floor(Math.random() * 16777215).toString(16);
    });

    socket.on('message', function (data) {
        var message = {
            user: data.name,
            message: data.t,
            c: userColors[users.indexOf(data.name)]
        };
        io.sockets.emit('message', message);

        console.log(data.name + ': ' + data);
    });

    socket.on('sh-message', function (data) {
        var message = {
            user: data.name,
            message: data.t,
            c: userColors[users.indexOf(data.name)]
        };
        io.emit('sh-message', message);
    });

    socket.on('sh-player-joined', function (data) {
        var color = userColors[users.indexOf(data)];

        if (!shPlayers.includes(data)) {
            shPlayers.push(data);
            if (readyPlayers.includes(data))
                readyPlayers.splice(readyPlayers.indexOf(data), 1);
            io.emit('sh-player-joined', {
                name: data,
                c: color,
                num: shPlayers.length,
                rp: readyPlayers
            });
        } else {
            socket.emit('sh-failed-join');
        }
    });

    socket.on('sh-player-left', function (data) {
        console.log('player-left');
        if (readyPlayers.includes(data)) {
            readyPlayers.splice(readyPlayers.indexOf(data), 1);
        }
        if (liberals.includes(data)) {
            liberals.splice(liberals.indexOf(data), 1);
        }
        if (fascists.includes(data)) {
            fascists.splice(fascists.indexOf(data), 1);
        }
        shPlayers.splice(shPlayers.indexOf(data), 1);
        io.emit('sh-player-left', {
            name: data,
            h: hitler,
            gs: shGameActive,
            nl: liberals.length,
            nf: fascists.length
        });
    });

    socket.on('entered-sh-page', function () {
        socket.emit('show-active-players', {
            p: shPlayers,
            rp: readyPlayers
        });
        if (shGameActive)
            socket.emit('sh-in-progress')
    });

    socket.on('sh-ready-up', function (data) {
        readyPlayers.push(data);
        io.emit('sh-ready-up', data);
        if (readyPlayers.length == shPlayers.length && readyPlayers.length >= 5) {
            io.emit('start-sh', readyPlayers.length);
            io.to('sh-lobby').emit('choose-roles', setRoles());
            shGameActive = true;
        }
    });

    socket.on('sh-unready', function (data) {
        readyPlayers.splice(readyPlayers.indexOf(data), 1);
        io.emit('sh-unready', data);
    });

    socket.on('disconnect', function () {
        if (!socket.user) //make sure socket has a user before proceeding
            return;

        if (users.indexOf(socket.user) > -1) {
            users.splice(users.indexOf(socket.user), 1);
            socket.broadcast.emit('otherUserDisconnect', {
                name: socket.user,
                h: hitler,
                gs: shGameActive
            });
            console.log(socket.user + 'disconnected\nusers: ' + users.length);

            if (shPlayers.includes(socket.user)) {
                io.emit('sh-player-left', socket.user);
                shPlayers.splice(shPlayers.indexOf(socket.user, 1));
                if (readyPlayers.includes(data)) {
                    readyPlayers.splice(readyPlayers.indexOf(data), 1);
                }
            }
        }
    });

    socket.on('choose-roles', function () {
        if (!shGameActive)
            io.to('sh-lobby').emit('choose-roles', setRoles());
        shGameActive = true;
    });

    socket.on('join-sh-lobby', function () {
        socket.join('sh-lobby');
    });

    socket.on('join-sh-hitler', function () {
        socket.join('sh-hitler');
    });

    socket.on('join-sh-liberals', function () {
        socket.join('sh-liberals');
    });

    socket.on('join-sh-fascists', function () {
        socket.join('sh-fascists');
    });
    
    socket.on('join-sh-chancellor', function(data){
        socket.join('sh-chancellor');
    });

    socket.on('sh-end-game', function (data) {
        var reason = data;
        for (var i = 0; i < shPlayers.length; i++) {
            io.emit('sh-player-left', shPlayers[i]);
        }
        resetShVars();
        io.emit('reset-sh', reason);
    });

    socket.on('chancellor-nominated', function (data) {
        chancellor = data;
        io.emit('chancellor-nominated', {
            c: chancellor,
            p: president
        });
    })

    socket.on('yes-for-gov', function (data) {
        votesForGov++;
        io.emit('yes-for-gov', data);
        console.log("Players: " + shPlayers + "; Votes for: " + votesForGov + "; Votes against: " + votesAgainstGov + "; Total votes: " + (votesAgainstGov + votesAgainstGov));

        if (votesAgainstGov + votesForGov == shPlayers.length) {
            console.log("all votes in");
            topThreePolicies = [];
            if (votesAgainstGov >= votesForGov) {
                console.log("voting failed");
                io.emit('voting-failed', {
                    presNom: nextPresident(),
                    pres: president,
                    chan: chancellor
                });
                votesForGov = 0;
                votesAgainstGov = 0;
                rejectedGovs++;
                if(rejectedGovs == 3){
                    io.emit('sh-chaos');
                }
            } else if (votesForGov > votesAgainstGov) {
                console.log("voting passed");
                for(var i = 0; i < 3; i++){
                    var rand = Math.random() >= .5;
                    topThreePolicies.push(rand);
                }
                io.emit('voting-passed', {
                    pres: president,
                    chan: chancellor,
                    top: topThreePolicies
                });
                votesForGov = 0;
                votesAgainstGov = 0;
                rejectedGovs = 0;
            }
        }
    });

    socket.on('no-for-gov', function (data) {
        votesAgainstGov++;
        console.log("Players: " + shPlayers + "; Votes for: " + votesForGov + "; Votes against: " + votesAgainstGov + "; Total votes: " + (votesAgainstGov + votesAgainstGov));
        io.emit('no-for-gov', data);

        if (votesAgainstGov + votesForGov == shPlayers.length) {
            console.log("all votes in");
            topThreePolicies = [];
            if (votesAgainstGov >= votesForGov) {
                console.log("voting failed");
                io.emit('voting-failed', {
                    presNom: nextPresident(),
                    pres: president,
                    chan: chancellor
                });
                votesForGov = 0;
                votesAgainstGov = 0;
                rejectedGovs++;
                if(rejectedGovs == 3){
                    
                }
            } else if (votesForGov > votesAgainstGov) {
                console.log("voting passed");
                for(var i = 0; i < 3; i++){
                    var rand = Math.random() >= .5;
                    topThreePolicies.push(rand);
                }
                io.emit('voting-passed', {
                    pres: president,
                    chan: chancellor,
                    top: topThreePolicies
                });
                votesForGov = 0;
                votesAgainstGov = 0;
                rejectedGovs = 0;
            }
        }
    });
    
    socket.on('pres-chose-policies', function(data){
        io.to('sh-chancellor').emit('policies-to-chancellor', data);
    });
    
    socket.on('chan-chose-policy', function(data){
        io.emit('policy-enacted', data);
    });

});

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function setRoles() {
    shuffle(shPlayers);

    var hIndex = 0;

    if (shPlayers.length < 5) {
        numFascists = shPlayers.length / 2;
        numLiberals = shPlayers.length - numFascists;
    } else if (shPlayers.length == 5) {
        numFascists = 2;
        numLiberals = 3
    } else if (shPlayers.length == 6) {
        numFascists = 3;
        numLiberals = 3
    } else if (shPlayers.length == 7) {
        numFascists = 3;
        numLiberals = 4;
    } else if (shPlayers.length == 8) {
        numFascists = 3;
        numLiberals = 5;
    }

    hitler = shPlayers[hIndex];

    var i = 0;
    while (i < shPlayers.length) {
        for (var z = 0; z < numFascists; z++) {
            fascists.push(shPlayers[i]);
            console.log("added fascist");
            i++;
        }
        for (var f = 0; f < numLiberals; f++) {
            liberals.push(shPlayers[i]);
            console.log("added liberal");
            i++
        }
    }

    var roles = {
        h: hitler,
        f: fascists,
        l: liberals,
        p: shPlayers,
        pres: shPlayers[Math.floor(Math.random() * (shPlayers.length))]
    };

    president = roles.pres;
    console.log("chose roles.");
    console.log("fascists = " + fascists);
    console.log("liberals = " + liberals);
    console.log("shPlayers = " + shPlayers);
    console.log("numFascists = " + numFascists);
    console.log("numLiberals = " + numLiberals);

    return roles;

}

function nextPresident() {
    var index = shPlayers.indexOf(president);
    if (index == shPlayers.length - 1)
        return shPlayers[0];
    else
        return shPlayers[index + 1];
}

function resetShVars() {
    shPlayers = [];
    readyPlayers = [];
    liberals = [];
    fascists = [];
    numLiberals = 0;
    numFascists = 0;
    fascists = [];
    liberals = [];
    hitler = '';
    shGameActive = false;
    president = '';
    chancellor = '';
    undesirables = [];
    votesForGov = 0;
    votesAgainstGov = 0;
}
