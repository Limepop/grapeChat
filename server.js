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

//non-resettable (^those too^)
var users = [];
var userColors = [];
var lWins = 0;
var fWins = 0;

//resettable
var shPlayers = [];
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
var chanNom = '';
var presNom = '';
var prevPresNom = '';
var presIndex = 0;
var fPols = 0;
var lPols = 0;
var turnNum = 0;
var deck = [];
var votersForGov = [];
var votersAgainstGov = [];

//Bots
var bots = [];
var fascistBots = [];
var liberalBots = [];
var hitlerBots = [];
var numBots = 0;
var botNominee = [];
var currentBot = 0;
var gameOver = false;
var fCardCount = 0;
var fascistPres = false;
var fascistChan = false;
var presPolicies = [];
var chanPolicy = false;
var peekResult = 0;
var target = '';
var vetoAvailable = false;
var lastPres = '';

var nameOfHitler = 'Hitler';
var nameOfChancellor = 'Chancellor';
var nameOfPresident = 'President';
var nameOfFascists = 'Fascist';
var nameOfLiberals = 'Liberal';

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

    //Secret Hitler
    {
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
            if (readyPlayers.length == shPlayers.length) {
                //Populate lobby with bots
                while (readyPlayers.length < 5) {
                    addBot();
                }
                io.emit('start-sh', readyPlayers.length);
                io.emit('choose-roles', setRoles());
                shGameActive = true;
                turnNum++;
                if (deck.length >= 3)
                    topThreePolicies = [deck.pop(), deck.pop(), deck.pop()];
                else
                    buildDeck();
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

        socket.on('join-sh-chancellor', function (data) {
            socket.join('sh-chancellor');
            console.log(data + " is the new chancellor.");
            if (!gameOver) {
                botPres();
            }
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
            chanNom = data;
            io.emit('chancellor-nominated', {
                c: chanNom,
                p: presNom,
                shp: shPlayers
            });
            autoVote();
        })

        socket.on('yes-for-gov', function (data) {
            votesForGov++;
//            console.log("Players: " + shPlayers + "; Votes for: " + votesForGov + "; Votes against: " + votesAgainstGov + "; Total votes: " + (votesForGov + votesAgainstGov));
            votersForGov.push(data);
            checkVotes();
        });

        socket.on('no-for-gov', function (data) {
            votesAgainstGov++;
//            console.log("Players: " + shPlayers + "; Votes for: " + votesForGov + "; Votes against: " + votesAgainstGov + "; Total votes: " + (votesForGov + votesAgainstGov));
            votersAgainstGov.push(data);
            checkVotes();
        });

        socket.on('pres-chose-policies', function (data) {
            if (vetoAvailable) {
                io.to('sh-chancellor').emit('veto-on');
            }
            io.to('sh-chancellor').emit('policies-to-chancellor', data);
            presPolicies = data;
            if (!gameOver) {
                botChan();
            }
        });

        socket.on('chan-chose-policy', function (data) {
//            console.log("deck: " + deck);
            if (deck.length >= 3) {
                topThreePolicies = [deck.pop(), deck.pop(), deck.pop()];
            } else {
                buildDeck();
            }
//            console.log("top 3: " + topThreePolicies);
//            console.log("deck: " + deck);
            if (data) {
                fPols++;
            } else {
                lPols++;
            }
//            console.log('chan chose fPols: ', fPols);
//            console.log('chan chose lPols: ', lPols);
            io.emit('policy-enacted', {
                policy: data,
                fPols: fPols,
                lPols: lPols,
                players: shPlayers.length,
                top: topThreePolicies
            });
            rejectedGovs = 0;
            socket.leave('sh-chancellor');
            chanPolicy = data;
            printResults();
            botPowers();
        });

        socket.on('next-round', function (data) {
            nextRound(data);
        });

        socket.on('sh-player-killed', function (data) {
            killPlayer(data);
        });

        socket.on('liberals-win', function (data) {
            lWins++;
            io.emit('sh-game-finished', data);
            gameOver = true;
        });

        socket.on('fascists-win', function (data) {
            fWins++;
            io.emit('sh-game-finished', data);
            gameOver = true;
        });

        socket.on('reset-chancellor-nom', function (data) {
            io.emit('try-chan-nom-again', presNom);
        });

        socket.on('chaos-policy-enacted', function (data) {
            console.log('player pres, chaos');
            chaos(data);
        });

        socket.on('player-investigated', function (data) {
            io.emit('notify-investigation', data);
        });

        socket.on('allow-veto', function() {
            vetoAvailable = true;
        });

        socket.on('propose-veto', function () {
            io.emit('veto-proposed', chancellor);
        });

        socket.on('yes-to-veto', function () {
            io.emit('veto-passed', president);
            if (deck.length >= 3) {
                topThreePolicies = [deck.pop(), deck.pop(), deck.pop()];
            } else {
                buildDeck();
            }
            rejectedGovs++;
//            console.log("Rejected governments: " + rejectedGovs);
            if (rejectedGovs >= 3) {
                rejectedGovs = 0;
                undesirables = [];
                io.emit('sh-chaos', {
                    f: fPols,
                    l: lPols,
                    t: topThreePolicies[0]
                });
                if (lastPres == '' || bots.includes(lastPres)) {
                    console.log('bot pres, veto chaos');
                    chaos(topThreePolicies[0]);
                }
            }
            if (!gameOver) {
//                console.log('veto passed');
                printResults();
                nextRound('');
                chancellor = '';
            }
        });

        socket.on('no-to-veto', function() {
            io.emit('veto-rejected', president);
        });

        socket.on('leave-sh-chancellor', function() {
            socket.leave('sh-chancellor');
        });

        socket.on('send-last-pres', function(data) {
            lastPres = data;
            console.log("lastPres: " + lastPres);
        });

        socket.on('allow-veto', function() {
            vetoAvailable = true;
        });

        socket.on('propose-veto', function () {
            io.emit('veto-proposed', chancellor);
        });

        socket.on('yes-to-veto', function () {
            io.emit('veto-passed', president);
            if (deck.length >= 3) {
                topThreePolicies = [deck.pop(), deck.pop(), deck.pop()];
            } else {
                buildDeck();
            }
            rejectedGovs++;
            console.log("Rejected governments: " + rejectedGovs);
            if (rejectedGovs >= 3) {
                rejectedGovs = 0;
                undesirables = [];
                io.emit('sh-chaos', {
                    f: fPols,
                    l: lPols,
                    t: topThreePolicies[0]
                });
            }
            if (!gameOver) {
                console.log('veto passed');
                printResults();
                nextRound('');
                chancellor = '';
            }
        });

        socket.on('no-to-veto', function() {
            io.emit('veto-rejected', president);
        });

        socket.on('leave-sh-chancellor', function() {
            socket.leave('sh-chancellor');
        });
    }

    //Grapes Against Humanity
    {
        socket.on('joined-g', function () {
            socket.join('g-lobby');
        });

        socket.on('g-message', function (data) {
            var message = {
                user: data.name,
                message: data.t,
                c: userColors[users.indexOf(data.name)]
            };
            io.to('g-lobby').emit('g-message', message);
        });

    }
});

//Add a bot to the game
function addBot() {
    numBots++;
    botName = 'bot'+numBots;
    shPlayers.push(botName);
    if (readyPlayers.includes(botName))
        readyPlayers.splice(readyPlayers.indexOf(botName), 1);
    io.emit('sh-player-joined', {
        name: botName,
        num: shPlayers.length,
        rp: readyPlayers
    });
    readyPlayers.push(botName);
    io.emit('sh-ready-up', botName);
    bots.push(botName);
}

//Bot nominates a chancellor
function autoChancellor() {
    if (bots.includes(presNom)){
        console.log("A bot is president. Selecting a chancellor...");
        botNominee = shPlayers[Math.floor(Math.random() * (shPlayers.length))];
        while (undesirables.includes(botNominee) || presNom == botNominee) {
            botNominee = shPlayers[Math.floor(Math.random() * (shPlayers.length))];
        }
        chanNom = botNominee;
        io.emit('chancellor-nominated', {
            c: chanNom,
            p: presNom,
            shp: shPlayers
        });
        autoVote();
    }
}

//Bot votes
function autoVote() {
    currentBot = 0;
    if (fascists.includes(presNom)) {
        fascistPres = true;
    } else {
        fascistPres = false;
    }
    if (fascists.includes(chanNom)) {
        fascistChan = true;
    } else {
        fascistChan = false;
    }
    console.log("Bots voting...");
    while (currentBot < bots.length) {
        if (fascists.includes((bots[currentBot]))) {
            if (fascistPres || fascistChan) {
                botYes();
            } else {
                botNo();
            }
        } else {
            if (Math.floor(Math.random()*2) == 1){
                botYes();
            } else {
                botNo();
            }
        }
        currentBot++;
    }
}

//Bot votes yes
function botYes() {
    votesForGov++;
//    console.log("Players: " + shPlayers + "; Votes for: " + votesForGov + "; Votes against: " + votesAgainstGov + "; Total votes: " + (votesForGov + votesAgainstGov));
    votersForGov.push(bots[currentBot]);
    checkVotes();
}

//Bot votes no
function botNo() {
    votesAgainstGov++;
//    console.log("Players: " + shPlayers + "; Votes for: " + votesForGov + "; Votes against: " + votesAgainstGov + "; Total votes: " + (votesForGov + votesAgainstGov));
    votersAgainstGov.push(bots[currentBot]);
    checkVotes();
}

//Bot chooses policies as president
function botPres() {
    fCardCount = 0;
    if (bots.includes(president)) {
        console.log("A bot is president. Selecting policies...")
        for (var i = 0; i < topThreePolicies.length; i++) {
            if(topThreePolicies[i]) {
                fCardCount++;
            }
        }
        if ((fCardCount == 0) || ((fCardCount == 1) && !fascistPres)) {
            presPolicies.push(false, false);
        } else if (fCardCount == 1 || ((fCardCount == 2) && !fascistPres)){
            presPolicies.push(true, false);
        } else {
            presPolicies.push(true, true);
        }
        console.log("Fascist Cards: " + fCardCount);
        if (vetoAvailable) {
            io.to('sh-chancellor').emit('veto-on');
        }
        io.to('sh-chancellor').emit('policies-to-chancellor', presPolicies);
        botChan();
    }
}

//Bot chooses policy as chancellor
function botChan() {
    fCardCount = 0;
    console.log("Top 3: " + topThreePolicies);
    if (bots.includes(chancellor)) {
        console.log("A bot is chancellor. Enacting a policy...")
        for (var i = 0; i < presPolicies.length; i++) {
            if(presPolicies[i]) {
                fCardCount++;
            }
        }
        if ((fCardCount == 0) || ((fCardCount == 1) && !fascistChan)) {
            chanPolicy = false;
        } else {
            chanPolicy = true;
        }
        if (deck.length >= 3) {
            topThreePolicies = [deck.pop(), deck.pop(), deck.pop()];
        } else {
            buildDeck();
        }
        if (chanPolicy) {
            fPols++;
        } else {
            lPols++;
        }
//        console.log('bot fPols: ', fPols);
//        console.log('bot lPols: ', lPols);
        io.emit('policy-enacted', {
            policy: chanPolicy,
            fPols: fPols,
            lPols: lPols,
            players: shPlayers.length,
            top: topThreePolicies
        });
        rejectedGovs = 0;
        printResults();
        botPowers();
    }
}

//Print and clear election results for AI debugging
function printResults() {
  console.log("Pres Pols: " + presPolicies);
  console.log("Chan Pol: " + chanPolicy);
  console.log("Bots: " + bots);
  console.log("Fascists: " + fascists);
  console.log("Liberals: " + liberals);
  console.log("President: " + president);
  console.log("Chancellor: " + chancellor);
  presPolicies = [];
  fCardCount = 0;
}

//Bot uses presidential powers
function botPowers() {
    if (bots.includes(president)) {
        console.log("A bot is president. Checking powers...")
        if (chanPolicy) {
            if (fPols == 3) {
                policyPeek();
            } else if (fPols == 4 || fPols == 5) {
                execution();
            } else if (fPols == 6) {
                fWins++;
                io.emit('sh-game-finished', ('Six ' + nameOfFascists + ' policies enacted. ' + nameOfFascists + 's win.'));
                gameOver = true;
            } else {
                nextRound('');
            }
            if (fPols == 5) {
                vetoAvailable = true;
            }
        } else {
            console.log("Liberal policy enacted. No presidential power.")
            if ((lPols == 5) && (bot.includes(president))) {
                lWins++;
                io.emit('sh-game-finished', ('Five ' + nameOfLiberals + ' policies enacted. ' + nameOfLiberals + 's win.'));
                gameOver = true;
            } else if (bots.includes(president)) {
                  nextRound('');
            }
        }
    }
}

function policyPeek() {
    fCardCount = 0;
    for (var i = 0; i < topThreePolicies.length; i++) {
        if(topThreePolicies[i]) {
            fCardCount++;
        }
    }
    console.log("Policy peek, " + fCardCount + " fascist cards.");
    if (((presIndex == shPlayers.length + 1) && (fascists.includes(shPlayers[0]))) || (fascists.includes(shPlayers[presIndex +1]))) {
        policyLie();
    } else {
        policyTruth();
    }
    nextRound('');
}

function policyLie() {
    console.log("Fascist president. Lying...");
    if (fCardCount == 3) {
        peekResult = 3;
    } else {
        peekResult = fCardCount + 1;
    }
    peekReport();
}

function policyTruth() {
    console.log("Liberal president. Reporting...");
    peekResult = fCardCount;
    peekReport();
}

function peekReport() {
    var message = "";
    if (peekResult == 3) {
        message = "There are three " + nameOfFascists + " policies and no " + nameOfLiberals + " policies."
    } else if (peekResult == 2) {
        message = "There are two " + nameOfFascists + " policies and one " + nameOfLiberals + " policy."
    } else if (peekResult == 1) {
        message = "There is one " + nameOfFascists + " policy and two " + nameOfLiberals + " policies."
    } else {
        message = "There are no " + nameOfFascists + " policies and three " + nameOfLiberals + " policies."
    }
    var report = {
        user: president,
        message: message
    };
    io.sockets.emit('sh-message', report);
    console.log(president + ': ' + report.message);
}

function execution() {
    if (fascists.includes(president)) {
        console.log("Fascist president. Executing liberal...");
        target = liberals[Math.floor(Math.random() * (liberals.length))];
        while (target == president) {
            console.log("Target: " + target);
            target = liberals[Math.floor(Math.random() * (liberals.length))];
        }
    } else {
        console.log("Liberal president. Executing a random player...");
        target = shPlayers[Math.floor(Math.random() * (shPlayers.length))];
        while (target == president) {
            console.log("Target: " + target);
            target = shPlayers[Math.floor(Math.random() * (shPlayers.length))];
        }
    }
    killPlayer(target);
    console.log("Executing " + target);
    if (target == hitler) {
        lWins++;
        io.emit('sh-game-finished', nameOfHitler + " was killed! " + nameOfLiberals + "s win!");
        gameOver = true;
    } else {
        nextRound('');
    }
}

//Checks if all votes are in
function checkVotes() {
//    console.log(shPlayers.length);
    if (votesAgainstGov + votesForGov == shPlayers.length) {
        console.log("all votes in");
        if (votesAgainstGov >= votesForGov) {
            console.log("voting failed");
            nextPresident();
            io.emit('voting-failed', {
                presNom: presNom,
                pres: prevPresNom,
                chan: chanNom,
                va: votersAgainstGov,
                vf: votersForGov
            });
            votesForGov = 0;
            votesAgainstGov = 0;
            rejectedGovs++;
            votersAgainstGov = [];
            votersForGov = [];
            if (rejectedGovs >= 3) {
                rejectedGovs = 0;
                undesirables = [];
                io.emit('sh-chaos', {
                    f: fPols,
                    l: lPols,
                    t: topThreePolicies[0]
                });
                if (lastPres == '' || bots.includes(lastPres)) {
                    console.log('bot pres, reject chaos');
                    chaos(topThreePolicies[0]);
                }
            }
            if (!gameOver) {
//                console.log('votes checked');
                autoChancellor();
            }
        } else if (votesForGov > votesAgainstGov) {
            console.log("voting passed");
            president = presNom;
            chancellor = chanNom;
            undesirables = [];
            if (shPlayers.length > 5) {
                undesirables.push(president);
            }
            undesirables.push(chancellor);
            io.emit('voting-passed', {
                pres: president,
                chan: chancellor,
                top: topThreePolicies,
                fPols: fPols,
                va: votersAgainstGov,
                vf: votersForGov,
                go: gameOver
            });
            votesForGov = 0;
            votesAgainstGov = 0;
            votersAgainstGov = [];
            votersForGov = [];
            if (hitler == chancellor && fPols >= 3) {
                if (bots.includes(president)) {
                fWins++;
                io.emit('sh-game-finished', nameOfHitler + " was elected after 3 " + nameOfFascists + " policies were enacted. " + nameOfFascists + "s win!");
                }
                gameOver = true;
            } else if (bots.includes(chancellor) && !gameOver) {
                botPres();
            }
        }
    }
}

//Advances the round
function nextRound(data) {
    votersForGov = [];
    votersAgainstGov = [];
    if (data == '') {
        console.log("next round");
        nextPresident();
        turnNum++;
        io.emit('new-round', {
            presNom: presNom,
            pres: president,
            chan: chancellor,
            u: undesirables
        });
        autoChancellor();
    } else {
        turnNum++;
        presNom = data;
        autoChancellor();
        io.emit('new-round', {
            presNom: data,
            pres: president,
            chan: chancellor,
            u: undesirables
        });
    }
}

function killPlayer(data) {
    if (shPlayers.includes(data)) {
        shPlayers.splice(shPlayers.indexOf(data), 1);
    }
    if (readyPlayers.includes(data)) {
        readyPlayers.splice(readyPlayers.indexOf(data), 1);
    }
    if (liberals.includes(data)) {
        liberals.splice(liberals.indexOf(data), 1);
    }
    if (fascists.includes(data)) {
        fascists.splice(fascists.indexOf(data), 1);
    }
    if (bots.includes(data)) {
        bots.splice(bots.indexOf(data), 1);
    }
    io.emit('player-killed', data);
}

function chaos(data) {
    if (deck.length >= 3) {
        topThreePolicies.splice(0,1);
        topThreePolicies.push(deck.pop());
    } else {
        buildDeck();
    }
    if (data) {
        fPols++;
    } else {
        lPols++;
    }
            console.log('chaos fPols: ', fPols);
            console.log('chaos lPols: ', lPols);
    if (lPols >= 5) {
        lWins++;
        io.emit('sh-game-finished', ('Five ' + nameOfLiberals + ' policies enacted. ' + nameOfLiberals + 's win.'));
        gameOver = true;
    } else if (fPols >= 6) {
        fWins++;
        io.emit('sh-game-finished', ('Six ' + nameOfFascists + ' policies enacted. ' + nameOfFascists + 's win.'));
        gameOver = true;
    }
    rejectedGovs = 0;
    undesirables = [];
  }

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

function buildDeck() {
    deck = [];
    topThreePolicies = [];
    for (var i = 0; i < (11 - fPols); i++) {
        deck.push(true);
    }
    for (var i = 0; i < (6 - lPols); i++) {
        deck.push(false);
    }
    shuffle(deck);
    topThreePolicies = [deck.pop(), deck.pop(), deck.pop()];
    console.log('deck: ' + deck);
    console.log('top 3: ' + topThreePolicies);
}

function setRoles() {
    shuffle(shPlayers);
    var hIndex = 0;

    buildDeck();

    if (shPlayers.length < 5) {
        numFascists = shPlayers.length / 2;
        numLiberals = shPlayers.length - numFascists;
    } else if (shPlayers.length == 5) {
        numFascists = 2;
        numLiberals = 3
    } else if (shPlayers.length == 6) {
        numFascists = 2;
        numLiberals = 4
    } else if (shPlayers.length == 7) {
        numFascists = 3;
        numLiberals = 4;
    } else if (shPlayers.length == 8) {
        numFascists = 3;
        numLiberals = 5;
    }

    hitler = shPlayers[hIndex];
    if (bots.includes(hitler)){
        hitlerBots.push(hitler);
    }

    var i = 0;
    while (i < shPlayers.length) {
        for (var z = 0; z < numFascists; z++) {
            fascists.push(shPlayers[i]);
            if (bots.includes(shPlayers[i])) {
                fascistBots.push(shPlayers[i]);
                console.log("added fascistbot");
            } else {
                console.log("added fascist");
            }
            i++;
        }
        for (var f = 0; f < numLiberals; f++) {
            liberals.push(shPlayers[i]);
            if (bots.includes(shPlayers[i])) {
                liberalBots.push(shPlayers[i]);
                console.log("added liberalbot");
            } else {
                console.log("added liberal");
            }
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

    presNom = roles.pres;
    presIndex = shPlayers.indexOf(roles.pres);
    console.log("chose roles.");
    console.log("fascists = " + fascists);
    console.log("liberals = " + liberals);
    console.log("shPlayers = " + shPlayers);
    console.log("numFascists = " + numFascists);
    console.log("numLiberals = " + numLiberals);
    autoChancellor();
    return roles;

}

function nextPresident() {
    var index = presIndex;
    prevPresNom = presNom;
    if (index >= shPlayers.length - 1)
        presNom = shPlayers[0];
    else
        presNom = shPlayers[index + 1];

    presIndex = shPlayers.indexOf(presNom);
}

function resetShVars() {
    deck = [];
    shPlayers = [];
    readyPlayers = [];
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
    rejectedGovs = 0;
    topThreePolicies = [];
    chanNom = '';
    presNom = '';
    prevPresNom = '';
    presIndex = 0;
    fPols = 0;
    lPols = 0;
    turnNum = 0;
    votersForGov = [];
    votersAgainstGov = [];
    bots = [];
    fascistBots = [];
    liberalBots = [];
    hitlerBots = [];
    numBots = 0;
    botNominee = [];
    currentBot = 0;
    gameOver = false;
    fCardCount = 0;
    fascistPres = false;
    fascistChan = false;
    presPolicies = [];
    chanPolicy = false;
    peekResult = 0;
    target = '';
}
