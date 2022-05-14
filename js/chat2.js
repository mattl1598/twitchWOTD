var clientId = 'yh8h3dbxjsthjgm7bux5ckbrs73feg';
var redirectURI = "https://" + window.location.hostname;
var scope = 'chat:read+channel:read:redemptions';
var ws;

function parseFragment(hash) {
    var hashMatch = function(expr) {
      var match = hash.match(expr);
      return match ? match[1] : null;
    };
    var state = hashMatch(/state=(\w+)/);
    // sessionStorage.twitchOAuthToken = hashMatch(/access_token=(\w+)/);
    if (sessionStorage.twitchOAuthState == state)
        sessionStorage.twitchOAuthToken = hashMatch(/access_token=(\w+)/);
    return
};

function authUrl() {
    sessionStorage.twitchOAuthState = nonce(15);
    var url = 'https://api.twitch.tv/kraken/oauth2/authorize' +
        '?response_type=token' +
        '&client_id=' + clientId +
        '&redirect_uri=' + redirectURI +
        '&state=' + sessionStorage.twitchOAuthState +
        '&scope=' + scope;
    return url
}

// Source: https://www.thepolyglotdeveloper.com/2015/03/create-a-random-nonce-string-using-javascript/
function nonce(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function heartbeat() {
    message = {
        type: 'PING'
    };
    $('.ws-output').append('SENT: ' + JSON.stringify(message) + '\n');
    ws.send(JSON.stringify(message));
}

function listen() {
    let userId
    $.ajax({
        url: "https://id.twitch.tv/oauth2/validate",
        method: "GET",
        headers: {
            "Authorization": "OAuth " + sessionStorage.twitchOAuthToken
        }})
    .done(function(user) {
        console.log(user)
        userId = user.user_id
        let message = {
            type: 'LISTEN',
            nonce: nonce(15),
            data: {
                topics: ["channel-points-channel-v1." + userId],
                auth_token: sessionStorage.twitchOAuthToken
            }
        };
        $('.ws-output').append('SENT: ' + JSON.stringify(message) + '\n');
        ws.send(JSON.stringify(message));
    });
}

function connect() {
    var heartbeatInterval = 1000 * 60; //ms between PING's
    var reconnectInterval = 1000 * 3; //ms to wait before reconnect
    var heartbeatHandle;

    ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    ws.onopen = function(event) {
        $('.ws-output').append('INFO: Socket Opened\n');
        heartbeat();
        heartbeatHandle = setInterval(heartbeat, heartbeatInterval);
        listen()
    };

    ws.onerror = function(error) {
        $('.ws-output').append('ERR:  ' + JSON.stringify(error) + '\n');
    };

    ws.onmessage = function(event) {
        message = JSON.parse(event.data);
        $('.ws-output').append('RECV: ' + JSON.stringify(message) + '\n');
        if (message.type == 'RECONNECT') {
            $('.ws-output').append('INFO: Reconnecting...\n');
            setTimeout(connect, reconnectInterval);
        }
        parseMsg(message)
        $('.ws-output').scrollTop($('.ws-output')[0].scrollHeight);
    };

    ws.onclose = function() {
        $('.ws-output').append('INFO: Socket Closed\n');
        clearInterval(heartbeatHandle);
        $('.ws-output').append('INFO: Reconnecting...\n');
        setTimeout(connect, reconnectInterval);
    };
}

function parseMsg(message){
    if (message.type === "reward-redeemed" &&
        message.data.redemption.reward.title === "Word of the Day" &&
        message.data.redemption.status === "FULFILLED"
    ) {
        // let word = message.replace(/<[^>]*>?/gm, '')
        let word = message.data.redemption.user_input.split(" ")[0].replace(/<[^>]*>?/gm, '');
        $("#word").text(word);
        $("#word").css({
            fontSize: "calc(100vw/"+word.length+")",
        });
    }
}

$(function() {
    if (document.location.hash.match(/access_token=(\w+)/))
        parseFragment(document.location.hash);
    if (sessionStorage.twitchOAuthToken) {
        connect();
        $('.socket').show()
    } else {
        var url = authUrl()
        $('#auth-link').attr("href", url);
        $('.auth').show()
    }
});