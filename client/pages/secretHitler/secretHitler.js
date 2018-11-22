var socket = io();
var loggedIn = localStorage.getItem("loggedIn");
var currentUser = localStorage.getItem("currentUser");
var nameOfHitler = 'Hitler';
var nameOfChancellor = 'Chancellor';
var nameOfPresident = 'President';
var nameOfFascists = 'Fascist';
var nameOfLiberals = 'Liberal';

//var inGame = false;
var gameState = false;
var liberals = [];
var fascists = [];
var players = [];
var hitler = '';
var choosingChancellor = false;
var voting = false;
var president = '';
var chancellor = '';
var presPolicies = [];
var chanPolicy = false;
var choosingPoliciesAsPres = false;
var choosingPolicyAsChan = false;
var presInvestigating = false;
var presExecuting = false;
var presChoosingNextPres = false;
var topThreePolicies = [];
var undesirables = [];
var vetoAvailable = false;
var vetoVoting = true;

var gameNumber = '';

function setup() {
    $('#controls').hide();
    $('#play-sh').hide();
    $('#leave-sh').hide();
    $('#ready-up').hide();
    $('#unready').hide();
    $('#leave-sh').prop("disabled", true);
    $('#voting').hide();
    $('#cards').hide();
    $('#inv-abl').prop('disabled', true);
    $('#inv-abl').hide();
    $('#exe-abl').prop('disabled', true);
    $('#exe-abl').hide();
    $('#spe-abl').prop('disabled', true);
    $('#spe-abl').hide();
    $('#pol-abl').prop('disabled', true);
    $('#pol-abl').hide();
    $('#veto').prop('disabled', true);
    $('#veto').hide();

    socket.emit('entered-sh-page');


    if (loggedIn && currentUser != "") {
        $('#logged-in').append('<div class="warning">You are logged in as ' + currentUser + '.</div>');
        $('#controls').show();
        $('#message').prop("disabled", true);
        $('#play-sh').show();
        $('#send').prop("disabled", true);
    } else if (gameState == false) {
        $('<p/>').text("You are not logged in and cannot play Secret Hitler. To log in, go back to the Chat page.").appendTo('#logged-in');
    } else if (gameState == true) {
        $('<p/>').text("Game in progress. You cannot play right now.").appendTo('#logged-in');
    }

    socket.on('sh-message', function (data) {
        console.log('sh-message');
        chat(data.user + ': ' + data.message, data.c);
    });

    socket.on('sh-player-joined', function (data) {
        console.log('sh-player-joined');
        chat(data.name + " has joined the lobby!");
        $('#players').append('<button id="' + data.name + '" class="player">' + data.name + "</button>");
        for (var i = 0; i < data.rp.length; i++) {
            $('#' + data.rp[i]).attr('class', 'player-ready');
        }
        if (data.name == currentUser) {
            $('#ready-up').show();
        }
        if (data.name == currentUser) {
            socket.emit('join-sh-lobby');
        }
    });

    socket.on('sh-in-progress', function () {
        console.log('sh-in-progress');
        $('#play-sh').hide();
        $('#logged-in').append('<div class="warning">You cannot join right now, there is a game in progress.</div>');
    });

    socket.on('not-enough-players', function () {
        chat('Not enough players to start game.', 'red');
    });

    socket.on('sh-player-left', function (data) {
        console.log('sh-player-left');
        chat(data.name + " has left the lobby!");
        $('#' + data.name).remove();
        if (data.h != '') {
            if (data.h == data.name && data.gs) {
                setTimeout(socket.emit('sh-end-game', nameOfHitler + " left,"), 5000);
                gameState = false;
            } else if (data.nl < 1 && data.gs) {
                setTimeout(socket.emit('sh-end-game', "ALL " + nameOfLiberals + "s LEFT,"), 5000);
                gameState = false;
            } else if (data.nf < 1 && data.gs) {
                setTimeout(socket.emit('sh-end-game', "ALL " + nameOfFascists + "s LEFT,"), 5000);
                gameState = false;
            }
        }
    });

    socket.on('sh-failed-join', function () {
        console.log('sh-failed-join');
        $('<div/>').text("failed to join, already in game").appendTo('#logged-in');
    });

    socket.on('show-active-players', function (data) {
        console.log('sh-show-active-players');
        for (var i = 0; i < data.p.length; i++) {
            $('#players').append('<div id="' + data.p[i] + '" class="player">' + data.p[i] + "</div>");
            if (data.rp.includes(data.p[i])) {
                $('#' + data.p[i]).attr('class', 'player-ready');
            }
        }
    });

    socket.on('sh-ready-up', function (data) {
        console.log('sh-ready-up');
        $('#' + data).attr('class', 'player-ready');
        chat(data + ' is ready to start!');
    });

    socket.on('sh-unready', function (data) {
        console.log('sh-unready');
        $('#' + data).attr('class', 'player');
    });

    socket.on('start-sh', function (data) {
        console.log('start-sh');
        gameState = true;
        $('#unready').hide();
        $('#ready-up').hide();
        $('#play-sh').prop('disable', true);
        chat("STARTING GAME WITH " + data + " PLAYERS...", 'green');
    });

    socket.on('choose-roles', function (data) {
        console.log('sh-choose-roles');
        hitler = data.h;
        liberals = data.l;
        fascists = data.f;
        players = data.p;
        if (hitler == currentUser) {
            socket.emit('join-sh-hitler');
            $('#assignment').append('<div class="role">You are ' + nameOfHitler + ', and a ' + nameOfFascists + '.</div>');
            $('#assignment').append('<div class="guide">Your goal is to enact 6 ' + nameOfFascists + ' policies or be elected as ' + nameOfChancellor + ' after 3 ' + nameOfFascists + ' policies are enacted.</div>');
        } else if (fascists.includes(currentUser)) {
            socket.emit('join-sh-fascists');
            $('#assignment').append('<div class="role">You are a ' + nameOfFascists + '.</div>');
            $('#assignment').append('<div class="guide">Your goal is to enact 6 ' + nameOfFascists + ' policies or to elect ' + nameOfHitler + ' as ' + nameOfChancellor + ' after 3 ' + nameOfFascists + ' policies are enacted.</div>');
        } else if (liberals.includes(currentUser)) {
            socket.emit('join-sh-liberals');
            $('#assignment').append('<div class="role">You are a ' + nameOfLiberals + '.</div>');
            $('#assignment').append('<div class="guide">Your goal is to enact 5 ' + nameOfLiberals + ' policies or to assassinate ' + nameOfHitler + '.</div>');
        }
        console.log(data.pres);
        $('#' + data.pres).attr('class', 'player-president');
        console.log(data.pres);
        showRoles();
        if (data.pres == currentUser) {
            nominateChancellor();
        }
    });

    socket.on('reset-sh', function (data) {
        flushChat();
        chat(data + " GAME ENDING...", '#ff0000');
        resetVars();
        var int = setInterval(function () {
            location.reload();
            clearInterval(int);
        }, 5000);
    });

    socket.on('otherUserDisconnect', function (data) {
        chat(data.name + " has disconnected from the lobby!");
        $('#' + data.name).remove();
        if (data.h != '') {
            if (data.h == data.name && data.gs) {
                setTimeout(socket.emit('sh-end-game', nameOfHitler + " left,"), 5000);
                gameState = false;
            } else if (data.nl < 1 && data.gs) {
                setTimeout(socket.emit('sh-end-game', "ALL " + nameOfLiberals + "s left,"), 5000);
                gameState = false;
            } else if (data.nf < 1 && data.gs) {
                setTimeout(socket.emit('sh-end-game', "ALL " + nameOfFascists + "s left,"), 5000);
                gameState = false;
            }
        }
    });

    socket.on('chancellor-nominated', function (data) {
        $('#' + data.c).attr('class', 'player-chancellor');
        chat(data.c + " has been nominated as " + nameOfChancellor + ".", 'cyan');
        chat("Vote for whether or not you support this government.", 'cyan');
        if (data.shp.includes(currentUser)) {
            $('#voting').show();
            voting = true;
        }
    });

    socket.on('voting-failed', function (data) {
        for(var i = 0; i < data.va.length; i++){
            chat(data.va[i] + " voted AGAINST this government!", 'red');
        }

        for(var i = 0; i < data.vf.length; i++){
            chat(data.vf[i] + " voted FOR this government!", 'green');
        }

        voting = false;

        chat("The election failed. The next nominee for " + nameOfPresident + " is " + data.presNom);
        $('#' + data.chan).attr('class', 'player');
        $('#' + data.pres).attr('class', 'player');
        $('#' + data.presNom).attr('class', 'player-president');

        if (data.presNom == currentUser) {
            nominateChancellor();
        }
    });

    socket.on('new-round', function (data) {
        chat("The new nominee for " + nameOfPresident + " is " + data.presNom);
        $('#' + data.chan).attr('class', 'player');
        $('#' + data.pres).attr('class', 'player');
        $('#' + data.presNom).attr('class', 'player-president');

        undesirables = data.u;
        console.log(undesirables);

        if (data.presNom == currentUser) {
            nominateChancellor();
        }
    })

    socket.on('voting-passed', function (data) {
        president = data.pres;
        chancellor = data.chan;

        for(var i = 0; i < data.va.length; i++){
            chat(data.va[i] + " voted AGAINST this government!", 'red');
        }

        voting = false;

        for(var i = 0; i < data.vf.length; i++){
            chat(data.vf[i] + " voted FOR this government!", 'green');
        }

        chat("The election was successful. " + president + " is the new " + nameOfPresident + " and " + chancellor + " is the new " + nameOfChancellor + ".", 'cyan');

        if (chancellor == hitler && data.fPols >= 3 && currentUser == president) {
            socket.emit('fascists-win', (nameOfHitler + " was elected after 3 " + nameOfFascists + " policies were enacted. " + nameOfFascists + "s win!"));
        } else if (president == currentUser) {
            presChoosePolicies(data.top);
        }

        if (chancellor == currentUser) {
            socket.emit('join-sh-chancellor', chancellor);
        }
    });

    socket.on('policies-to-chancellor', function (data) {
        chanChoosePolicy(data);
    });

    socket.on('policy-enacted', function (data) {
        if (data.policy) {
            chat("A " + nameOfFascists + " policy has been enacted.", 'red');
            topThreePolicies = data.top;
            $('#f-policies').html(nameOfFascists + ' Policies: ' + data.fPols);
            if (president == currentUser) {
                if (data.players < 7) {
                    if (data.fPols == 3) {
                        $('#pol-abl').show();
                        $('#pol-abl').prop('disabled', false);
                    } else if (data.fPols == 4 || data.fPols == 5) {
                        $('#exe-abl').show();
                        $('#exe-abl').prop('disabled', false);
                    } else if (data.fPols == 6) {
                        if(currentUser == president)
                            socket.emit('fascists-win', ('Six ' + nameOfFascists + ' policies enacted. ' + nameOfFascists + 's win.'));
                    } else {
                        socket.emit('next-round', '');
                    }
                } else if (data.players == 7 || data.players == 8) {
                    if (data.fPols == 2) {
                        $('#inv-abl').show();
                        $('#inv-abl').prop('disabled', false);
                    } else if (data.fPols == 3) {
                        $('#spe-abl').show();
                        $('#spe-abl').prop('disabled', false);
                    } else if (data.fPols == 4 || data.fPols == 5) {
                        $('#exe-abl').show();
                        $('#exe-abl').prop('disabled', false);
                    } else if (data.fPols == 6) {
                        if(currentUser == president)
                            socket.emit('fascists-win', ('Six ' + nameOfFascists + ' policies enacted. ' + nameOfFascists + 's win.'));
                    } else {
                        socket.emit('next-round', '');
                    }
                } else if (data.players == 9 || data.players == 10) {
                    if (data.fPols == 1 || data.players == 2) {
                        $('#inv-abl').show();
                        $('#inv-abl').prop('disabled', false);
                    } else if (data.fPols == 3) {
                        $('#spe-abl').show();
                        $('#spe-abl').prop('disabled', false);
                    } else if (data.fPols == 4 || data.fPols == 5) {
                        $('#exe-abl').show();
                        $('#exe-abl').prop('disabled', false);
                    } else if (data.fPols == 6) {
                        if(currentUser == president)
                            socket.emit('fascists-win', ('Six ' + nameOfFascists + ' policies enacted. ' + nameOfFascists + 's win.'));
                    } else {
                        socket.emit('next-round', '');
                    }
                }
                if (data.fPols == 5) {
                    socket.emit('allow-veto');
                    vetoAvailable = true;
                }
            }

        } else {
            chat("A " + nameOfLiberals + " policy has been enacted.", 'green');
            $('#l-policies').html(nameOfLiberals + ' Policies: ' + data.lPols);
            if ((data.lPols == 5) && (president == currentUser)) {
                socket.emit('liberals-win', ('Five ' + nameOfLiberals + ' policies enacted. ' + nameOfLiberals + 's win.'));
            }
            if (president == currentUser) {
                socket.emit('next-round', '');
            }
        }
    });

    socket.on('player-killed', function (data) {
        chat(data + ' was executed!', 'darkred');
        $('#' + data).remove();
        if (currentUser == data) {
            $('#message').prop("disabled", true);
            $('#send').prop("disabled", true);
            $('#leave-sh').hide();
            $('#leave-sh').prop("disabled", true);
            $('#play-sh').show();
            $('#play-sh').prop("disabled", false);
            $('#ready-up').hide();
            $('#unready').hide();
            if (gameState == true)
                $('#play-sh').hide();

        }
    });

    socket.on('sh-game-finished', function (data) {
        $('#leave-sh').hide();
        $('#leave-sh').prop("disabled", true);
        $('#play-sh').prop("disabled", false);
        $('#ready-up').hide();
        $('#unready').hide();
        $('#play-sh').hide();

        chat(data + ' Purge the game to play again.', 'cyan');
    });

    socket.on('sh-chaos', function (data) {
        chat("3 governments have been consecutively rejected! A random policy will be enacted!");
        if (data.t) {
            chat("A " + nameOfFascists + " policy has been enacted in the chaos!", 'red');
            $('#f-policies').html(nameOfFascists + ' Policies: ' + (data.f + 1));
        } else {
            chat("A " + nameOfLiberals + " policy has been enacted in the chaos!", 'green');
            $('#l-policies').html(nameOfLiberals + ' Policies: ' + (data.l + 1));
        }
        socket.emit('send-last-pres', president);
        if (currentUser == president) {
            socket.emit('chaos-policy-enacted', data.t);
        }
    });

    socket.on('notify-investigation', function (data) {
        chat(president + " has just investigated " + data + " and knows their party affiliation.", 'red');
    });

    socket.on('try-chan-nom-again', function (data) {
        if (currentUser == data) {
            nominateChancellor();
        }
    });

    socket.on('veto-on', function () {
        $('#veto').show();
        $('#veto').prop('disabled', false);
    });

    socket.on('veto-proposed', function(data) {
        chat(data + " has just proposed a veto!", 'cyan');
        if (currentUser == president) {
            chat("Vote on whether or not to veto.", 'cyan');
            vetoVoting = true;
            $('#voting').show();
        }
    });

    socket.on('veto-passed', function(data) {
        chat(data + " passed the veto!", 'green');
        choosingPolicyAsChan = false;
        socket.emit('leave-sh-chancellor');
        $('#' + chancellor).attr('class', 'player');
        chancellor = '';
        $('#veto').prop('disabled', true);
        $('#veto').hide();
        $('#card-a').hide();
        $('#card-a').prop('disabled', true);
        $('#card-b').hide();
        $('#card-b').prop('disabled', true);
        $('#card-c').hide();
        $('#card-c').prop('disabled', true);
        $('#cards').hide();
    });

    socket.on('veto-rejected', function(data) {
        chat(data + " rejected the veto!", 'red');
    });

    $('#send').click(function () {
        var input = $('#message');
        var text = input.val().trim();
        if (text.length > 0 && text.length < 250) {
            socket.emit('sh-message', {
                t: text,
                name: currentUser
            });
            input.val('');
        }
    });

    $('#message').on('keyup', function (e) {
        var ENTER_KEY = 13;
        if (e.keyCode === ENTER_KEY) {
            $('#send').click(); //sends message with enter key
        }
    });

    $('#leave-sh').click(function () {
        if (loggedIn) {
            $('#message').prop("disabled", true);
            $('#send').prop("disabled", true);
            $('#leave-sh').hide();
            $('#leave-sh').prop("disabled", true);
            $('#play-sh').show();
            $('#play-sh').prop("disabled", false);
            $('#ready-up').hide();
            $('#unready').hide();
            if (gameState == true)
                $('#play-sh').hide();
            socket.emit('sh-player-left', currentUser);
        } else {

        }
    });

    $('#chat-nav').click(function () {
        if (loggedIn) {
            socket.emit('sh-player-left', currentUser);
        } else {

        }
    });

    $('#play-sh').click(function () {
        if (loggedIn) {
            $('#message').prop("disabled", false);
            $('#send').prop("disabled", false);
            $('#play-sh').hide();
            $('#play-sh').prop("disabled", true);
            $('#leave-sh').show();
            $('#leave-sh').prop("disabled", false);
            //inGame = true;
            socket.emit('sh-player-joined', currentUser);
        } else {

        }
    });

    $('#ready-up').click(function () {
        socket.emit('sh-ready-up', currentUser);
        $('#ready-up').hide();
        $('#unready').show();
    });

    $('#unready').click(function () {
        socket.emit('sh-unready', currentUser);
        $('#ready-up').show();
        $('#unready').hide();
    });

    $('#purge-sh').click(function () {
        var input = $('#purge-password');
        var text = input.val().trim();
        if (text == "purge13") {
            setTimeout(socket.emit('sh-end-game', "GAME PURGED,"), 5000);
            gameState = false;
        }
    });

    $('#gov-yes').click(function () {
        if (voting) {
            socket.emit('yes-for-gov', currentUser);
        } else if (vetoVoting) {
            socket.emit('yes-to-veto');
            vetoVoting = false;
        }
        $('#voting').hide();
    });

    $('#gov-no').click(function () {
        if (voting) {
            socket.emit('no-for-gov', currentUser);
        } else if (vetoVoting) {
            socket.emit('no-to-veto');
            vetoVoting = false;
        }
        $('#voting').hide();
    });

    $('#card-a').click(function () {
        var cls = $('#card-a').attr('class');
        if (choosingPoliciesAsPres && cls == 'f-card') {
            console.log('chose liberal');
            presPolicies.push(true);
            $(this).hide();
            $(this).prop('disabled', true);
            if (presPolicies.length == 2) {
                console.log('policies: ' + presPolicies);
                $('#cards').hide();
                socket.emit('pres-chose-policies', presPolicies);
                choosingPoliciesAsPres = false;
                presPolicies = [];
            }
        } else if (choosingPolicyAsChan && cls == 'f-card') {
            $(this).hide();
            $(this).prop('disabled', true);
            chanPolicy = true;
            choosingPolicyAsChan = false;
            $('#cards').hide();
            socket.emit('chan-chose-policy', chanPolicy);
        } else if (choosingPoliciesAsPres && cls == 'l-card') {
            console.log('chose fascist');
            $(this).hide();
            $(this).prop('disabled', true);
            presPolicies.push(false);
            if (presPolicies.length == 2) {
                console.log('policies: ' + presPolicies);
                $('#cards').hide();
                socket.emit('pres-chose-policies', presPolicies);
                choosingPoliciesAsPres = false;
                presPolicies = [];
            }
        } else if (choosingPolicyAsChan && cls == 'l-card') {
            $(this).hide();
            $(this).prop('disabled', true);
            chanPolicy = false;
            choosingPolicyAsChan = false;
            $('#cards').hide();
            socket.emit('chan-chose-policy', chanPolicy);
        }
    });

    $('#card-b').click(function () {
        var cls = $('#card-b').attr('class');
        if (choosingPoliciesAsPres && cls == 'f-card') {
            console.log('chose liberal');
            presPolicies.push(true);
            $(this).hide();
            $(this).prop('disabled', true);
            if (presPolicies.length == 2) {
                console.log('policies: ' + presPolicies);
                $('#cards').hide();
                socket.emit('pres-chose-policies', presPolicies);
                choosingPoliciesAsPres = false;
                presPolicies = [];
            }
        } else if (choosingPolicyAsChan && cls == 'f-card') {
            $(this).hide();
            $(this).prop('disabled', true);
            chanPolicy = true;
            choosingPolicyAsChan = false;
            $('#cards').hide();
            socket.emit('chan-chose-policy', chanPolicy);
        } else if (choosingPoliciesAsPres && cls == 'l-card') {
            console.log('chose fascist');
            $(this).hide();
            $(this).prop('disabled', true);
            presPolicies.push(false);
            if (presPolicies.length == 2) {
                console.log('policies: ' + presPolicies);
                $('#cards').hide();
                socket.emit('pres-chose-policies', presPolicies);
                choosingPoliciesAsPres = false;
                presPolicies = [];
            }
        } else if (choosingPolicyAsChan && cls == 'l-card') {
            $(this).hide();
            $(this).prop('disabled', true);
            chanPolicy = false;
            choosingPolicyAsChan = false;
            $('#cards').hide();
            socket.emit('chan-chose-policy', chanPolicy);
        }
    });

    $('#card-c').click(function () {
        var cls = $('#card-c').attr('class');
        if (choosingPoliciesAsPres && cls == 'f-card') {
            console.log('chose liberal');
            presPolicies.push(true);
            $(this).hide();
            $(this).prop('disabled', true);
            if (presPolicies.length == 2) {
                console.log('policies: ' + presPolicies);
                $('#cards').hide();
                socket.emit('pres-chose-policies', presPolicies);
                choosingPoliciesAsPres = false;
                presPolicies = [];
            }
        } else if (choosingPolicyAsChan && cls == 'f-card') {
            $(this).hide();
            $(this).prop('disabled', true);
            chanPolicy = true;
            choosingPolicyAsChan = false;
            $('#cards').hide();
            socket.emit('chan-chose-policy', chanPolicy);
        } else if (choosingPoliciesAsPres && cls == 'l-card') {
            console.log('chose fascist');
            $(this).hide();
            $(this).prop('disabled', true);
            presPolicies.push(false);
            if (presPolicies.length == 2) {
                console.log('policies: ' + presPolicies);
                $('#cards').hide();
                socket.emit('pres-chose-policies', presPolicies);
                choosingPoliciesAsPres = false;
                presPolicies = [];
            }
        } else if (choosingPolicyAsChan && cls == 'l-card') {
            $(this).hide();
            $(this).prop('disabled', true);
            chanPolicy = false;
            choosingPolicyAsChan = false;
            $('#cards').hide();
            socket.emit('chan-chose-policy', chanPolicy);
        }
    });

    $('#inv-abl').click(function () {
        $('#inv-abl').prop('disabled', true);
        $('#exe-abl').prop('disabled', true);
        $('#spe-abl').prop('disabled', true);
        $('#pol-abl').prop('disabled', true);

        presInvestigating = true;
        chat('Choose a player to investigate.', 'cyan');
        $('#inv-abl').hide();
    });

    $('#pol-abl').click(function () {
        $('#inv-abl').prop('disabled', true);
        $('#exe-abl').prop('disabled', true);
        $('#spe-abl').prop('disabled', true);
        $('#pol-abl').prop('disabled', true);

        var polA = ''
        var polB = '';
        var polC = '';

        if (topThreePolicies[0]) {
            polA = 'fascist';
        } else {
            polA = 'liberal';
        }
        if (topThreePolicies[1]) {
            polB = 'fascist';
        } else {
            polB = 'liberal';
        }
        if (topThreePolicies[2]) {
            polC = 'fascist';
        } else {
            polC = 'liberal';
        }

        chat("The next three policies are " + polA + ', ' + polB + ', and ' + polC + '.', 'cyan');
        socket.emit('next-round', '');
        $('#pol-abl').hide();
    });

    $('#exe-abl').click(function () {
        $('#inv-abl').prop('disabled', true);
        $('#exe-abl').prop('disabled', true);
        $('#spe-abl').prop('disabled', true);
        $('#pol-abl').prop('disabled', true);

        presExecuting = true;
        chat('Choose a player to execute.', 'cyan');
        $('#exe-abl').hide();
    });

    $('#spe-abl').click(function () {
        $('#inv-abl').prop('disabled', true);
        $('#exe-abl').prop('disabled', true);
        $('#spe-abl').prop('disabled', true);
        $('#pol-abl').prop('disabled', true);

        presChoosingNextPres = true;
        chat('Choose a player to be selected as ' + nameOfPresident + ' for the next election.');
        $('#spe-abl').hide();
    });

    $('#veto').click(function () {
        socket.emit('propose-veto');
        $('#veto').hide();
    })

}

function draw() {
    $('.player').click(function () {
        var text = $(this).attr('id');
        if (choosingChancellor && text != currentUser) {
            if (undesirables.includes(text)) {
                chat('You cannot choose this person, they were recently elected as ' + nameOfChancellor + " or " + nameOfPresident, 'red');
                choosingChancellor = false;
                socket.emit('reset-chancellor-nom');
            } else {
                console.log('player clicked');
                socket.emit('chancellor-nominated', text);
                choosingChancellor = false;
            }
        }
        if (presInvestigating && text != currentUser) {
            if (liberals.includes(text)) {
                $(this).html(text + ": " + nameOfLiberals);
            } else if (fascists.inclues(text)) {
                $(this).html(text + ": " + nameOfFascists);
            }
            socket.emit('player-investigated', text);
            presInvestigating = false;
            socket.emit('next-round', '');
        }
        if (presExecuting && text != currentUser) {
            socket.emit('sh-player-killed', text);
            if (text == hitler) {
                socket.emit('liberals-win', (nameOfHitler + " was killed! " + nameOfLiberals + "s win!"));
            } else {
                socket.emit('next-round', '');
            }
            presExecuting = false;
        }
        if (presChoosingNextPres) {
            socket.emit('next-round', text);
            presChoosingNextPres = false;
        }
    });
}

function flushChat() {
    $('#log').remove();
    $('#chat').append('<div id="log"></div>');
}

function showRoles() {
    var numPlayers = players.length;
    if (numPlayers <= 6) {
        if (fascists.includes(currentUser)) {
            for (var i = 0; i < fascists.length; i++) {
                if (fascists[i] != hitler) {
                    $('#' + fascists[i]).html(fascists[i] + ': ' + nameOfFascists);
                } else {
                    $('#' + fascists[i]).html(fascists[i] + ': ' + nameOfHitler);
                }
            }
        }
    } else if (numPlayers > 6) {
        if (fascists.includes(currentUser) && currentUser != hitler) {
            for (var i = 0; i < fascists.length; i++) {
                if (fascists[i] != hitler) {
                    $('#' + fascists[i]).html(fascists[i] + ': ' + nameOfFascists);
                } else {
                    $('#' + fascists[i]).html(fascists[i] + ': ' + nameOfHitler);
                }
            }
        }
    }

    for (var i = 0; i < numPlayers; i++) {
        var atr = $('#' + players[i]).attr('class');
        console.log(atr);
        if (atr == 'player-ready')
            $('#' + players[i]).attr('class', 'player');
    }
}

function nominateChancellor() {
    chat("You are the " + nameOfPresident + ". Choose a " + nameOfChancellor + " candidate.", 'cyan');
    choosingChancellor = true;
}

function chat(msg, c) { //broadcast function
    if (c)
        $('#log').append('<div class="msg" style="border: solid ' + c + ' 3px">' + msg + '</div>');
    else
        $('#log').append('<p>' + msg + '</p>');

    document.getElementById('log').scrollTop = document.getElementById('log').scrollHeight;
}

function resetVars() {
    gameState = false;
    liberals = [];
    fascists = [];
    players = [];
    hitler = '';
    choosingChancellor = false;
    voting = false;
    president = '';
    chancellor = '';
    presPolicies = [];
    chanPolicy = false;
    choosingPoliciesAsPres = false;
    choosingPolicyAsChan = false;
    presInvestigating = false;
    presExecuting = false;
    presChoosingNextPres = false;
    topThreePolicies = [];
    undesirables = [];
}

function presChoosePolicies(top) {
    $('#cards').show();
    $('#card-a').show();
    $('#card-b').show();
    $('#card-c').show();
    choosingPoliciesAsPres = true;
    console.log('pres choose policies');
    $('#card-a').prop('disabled', false);
    $('#card-b').prop('disabled', false);
    $('#card-c').prop('disabled', false);
    if (top[0]) {
        $('#card-a').attr('class', 'f-card');
        $('#card-a').html(nameOfFascists + ' Policy');
    } else {
        $('#card-a').attr('class', 'l-card');
        $('#card-a').html(nameOfLiberals + ' Policy');
    }

    if (top[1]) {
        $('#card-b').attr('class', 'f-card');
        $('#card-b').html(nameOfFascists + ' Policy');
    } else {
        $('#card-b').attr('class', 'l-card');
        $('#card-b').html(nameOfLiberals + ' Policy');
    }

    if (top[2]) {
        $('#card-c').attr('class', 'f-card');
        $('#card-c').html(nameOfFascists + ' Policy');
    } else {
        $('#card-c').attr('class', 'l-card');
        $('#card-c').html(nameOfLiberals + ' Policy');
    }
}

function chanChoosePolicy(pols) {
    $('#cards').show();
    $('#card-a').show();
    $('#card-b').show();
    $('#card-c').hide();
    choosingPolicyAsChan = true;
    console.log('chan choose policies');
    $('#card-a').prop('disabled', false);
    $('#card-b').prop('disabled', false);
    $('#card-c').prop('disabled', true);
    if (pols[0]) {
        $('#card-a').attr('class', 'f-card');
        $('#card-a').html(nameOfFascists + ' Policy');
    } else {
        $('#card-a').attr('class', 'l-card');
        $('#card-a').html(nameOfLiberals + ' Policy');
    }

    if (pols[1]) {
        $('#card-b').attr('class', 'f-card');
        $('#card-b').html(nameOfFascists + ' Policy');
    } else {
        $('#card-b').attr('class', 'l-card');
        $('#card-b').html(nameOfLiberals + ' Policy');
    }
}
