function pad(a,b){return(1e15+a+"").slice(-b)}
function number_format (number, decimals, dec_point, thousands_sep) {
    number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
    var n = !isFinite(+number) ? 0 : +number,
        prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
        sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
        dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
        s = '',
        toFixedFix = function (n, prec) {
            var k = Math.pow(10, prec);
            return '' + Math.round(n * k) / k;
        };
    // Fix for IE parseFloat(0.55).toFixed(0) = 0;
    s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    if (s[0].length > 3) {
        s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
    }
    if ((s[1] || '').length < prec) {
        s[1] = s[1] || '';
        s[1] += new Array(prec - s[1].length + 1).join('0');
    }
    return s.join(dec);
}

var ticker;

var start = new Event('start');
var serversUpdated = new Event('serversUpdated');
var serverSelected = new Event('serverSelected');
var changeLanguage = new Event('changeLanguage');
var matchSelected = new Event('matchSelected');
var updatedMatchDetails = new Event('updatedMatchDetails');
var updatedNotifications = new Event('updatedNotifications');
var updatedRefreshRate = new Event('updatedRefreshRate');
var updatedSound = new Event('updatedSound');
var updatedVolume = new Event('updatedVolume');
var tickEvent = new Event('tickEvent');
var settingsSaved = new Event('settingsSaved');
var settingsLoaded = new Event('settingsLoaded');

var settings = {
    'servers': {},
    'server': 2012,
    'language': 'en',
    'refresh_rate': 5,
    'sound': true,
    'volume': 100,
    'position': {
        'location': 'bl',
        'offset': [10, 30]
    },
    'notifications': {
        'red': true,
        'green': true,
        'blue': true,
        'center': true
    }
};

var match_details = {
    'id': -1,
    'date': new Date(),
    'red': -1,
    'blue': -1,
    'green': -1,
    'scores': {}
}

var score_mapping = {
    'red': 0,
    'blue': 1,
    'green': 2
}

function setLanguage(newLanguage) {
    settings.language = newLanguage;
    document.dispatchEvent(changeLanguage);
    saveSettings();
}

function setServer(newServer) {
    settings.server = parseInt(newServer);
    document.dispatchEvent(serverSelected);
    saveSettings();
}

function setNotifications(border, value) {
    settings.notifications[border] = value;
    document.dispatchEvent(updatedNotifications);
    saveSettings();
}

function setRefreshRate(seconds) {
    settings.refresh_rate = seconds;
    document.dispatchEvent(updatedRefreshRate);
    saveSettings();
}

function setSound(value) {
    settings.sound = value;
    document.dispatchEvent(updatedSound);
    saveSettings();
}

function setVolume(value) {
    settings.volume = value;
    document.dispatchEvent(updatedVolume);
    saveSettings();
}

function fetchServers() {
    $.ajax('js/world_names.json').done(function(json){
        settings.servers = JSON.parse(json);
        document.dispatchEvent(serversUpdated);
    });
}

function populateLanguages() {
    var defaults = [
        {"value": "en", "description": "English"},
        {"value": "de", "description": "German"},
        {"value": "es", "description": "Spanish"},
        {"value": "fr", "description": "French"}
    ];

    var language = $('#language');
    language.empty();
    for(var index in defaults) {
        var lang = defaults[index];
        var option = $('<option />');
        option.val(lang.value);
        option.text(lang.description);
        if(lang.value == settings.language) option.attr('selected', 'selected');
        language.append(option);
    }
}

function populateServers() {
    var servers = $('#servers');
    servers.empty();
    for (var server_id in settings.servers) {
        var server_name = settings.servers[server_id];
        var option = $('<option />');
        option.val(server_id);
        option.text(server_name[settings.language]);
        if(server_id == settings.server) {
            option.attr('selected', 'selected');
            document.dispatchEvent(serverSelected);
        }
        servers.append(option);
    }
}

function playSound() {
    if(settings.sound) {
        ion.sound.play('bell_ring', {
            'volume': settings.volume/100
        });
    }
}

function populateVolume() {
    console.log(settings.volume);
    var slider = $('#volume').slider({
        'min': 1,
        'max': 100,
        'orientation': 'horizontal',
        'value': settings.volume,
        'tooltip': 'show'
    });

    slider.on('slide', function(data){
        setVolume(data.value);
    });

    slider.on('slideStop', function(){
       playSound();
    });
}

function populateBorderNames() {
    $('.server_red .name').each(function(){ this.innerHTML = settings.servers[match_details.red][settings.language]});
    $('.server_blue .name').each(function(){ this.innerHTML = settings.servers[match_details.blue][settings.language]});
    $('.server_green .name').each(function(){ this.innerHTML = settings.servers[match_details.green][settings.language]});
}

function populateScoreboard() {
    var max = Math.max.apply(Math, match_details.scores);

    $('.server_red .progress-bar').each(function(){
        $(this).css("width", match_details.scores[score_mapping["red"]] / max * 100 + "%");
    });

    $('.server_blue .progress-bar').each(function(){
        $(this).css("width", match_details.scores[score_mapping["blue"]] / max * 100 + "%");
    });

    $('.server_green .progress-bar').each(function(){
        $(this).css("width", match_details.scores[score_mapping["green"]] / max * 100 + "%");
    });

    $('.server_red .score').each(function(){ this.innerHTML = number_format(match_details.scores[score_mapping['red']])});
    $('.server_blue .score').each(function(){ this.innerHTML = number_format(match_details.scores[score_mapping['blue']])});
    $('.server_green .score').each(function(){ this.innerHTML = number_format(match_details.scores[score_mapping['green']])});

    $('#update_time').html(
        pad(match_details.date.getHours(), 2) + ':' +
        pad(match_details.date.getMinutes(),2) + ':' +
        pad(match_details.date.getSeconds(),2)
    );
}

function populateNotifications() {
    var css_map = {"red": "bg-danger", "green": "bg-success", "blue": "bg-primary", "center": "bg-info"};
    for (var border in settings.notifications ) {
        var row = $('.border_' + border + '.bg');
        if(settings.notifications[border]) {
            row.addClass(css_map[border]);
        } else {
            row.removeClass(css_map[border]);
        }
        row.find("input").each(function(){
           $(this).prop("checked", settings.notifications[border] ? 'checked' : '');
        });
    }
}

function populateRefreshRate() {
    $('#refresh_rate').val(settings.refresh_rate);
}

function populateSound() {
    ion.sound({
        sounds: [
            {name: 'bell_ring'}
        ],
        path: 'sounds/',
        preload: true
    });
    $('#sound').prop("checked", settings.sound ? 'checked' : '');
}

function updateMatchDetails() {
    if(match_details.id != -1) {
        $.getJSON('https://api.guildwars2.com/v1/wvw/match_details.json?match_id=' + match_details.id, function(data){
            match_details.scores = data.scores;
            match_details.maps = data.maps;
            match_details.date = new Date();
            document.dispatchEvent(updatedMatchDetails);
        });
    }
}

function setMatch() {
    $.getJSON('https://api.guildwars2.com/v1/wvw/matches.json', function(data){
        data.wvw_matches.forEach(function(match){
            red_id = parseInt(match.red_world_id);
            blue_id = parseInt(match.blue_world_id);
            green_id = parseInt(match.green_world_id);
            if($.inArray(settings.server, [red_id, blue_id, green_id]) > -1) {
                match_details.id = match.wvw_match_id;
                match_details.red = red_id;
                match_details.blue = blue_id;
                match_details.green = green_id;
                document.dispatchEvent(matchSelected);
                return true;
            }
        });
    });
}

function tick() {
    ticker = setTimeout(tick, settings.refresh_rate * 1000);
    document.dispatchEvent(tickEvent);
}

function restartTicker() {
    clearTimeout(ticker);
    tick();
}

function loadSettings() {
    var loadedSettings = JSON.parse(localStorage.getItem("settings"));
    if(loadedSettings != null) {
        settings = loadedSettings;
    }
    document.dispatchEvent(settingsLoaded);
}

function saveSettings() {
    localStorage.setItem("settings", JSON.stringify(settings));
    document.dispatchEvent(settingsSaved);
}

// bind events
document.addEventListener('start', loadSettings);
document.addEventListener('start', fetchServers);
document.addEventListener('start', populateLanguages);
document.addEventListener('start', populateNotifications);
document.addEventListener('start', populateRefreshRate);
document.addEventListener('start', populateSound);
document.addEventListener('start', populateVolume);
document.addEventListener('start', tick);
document.addEventListener('serversUpdated', populateServers);
document.addEventListener('changeLanguage', populateServers);
document.addEventListener('changeLanguage', populateLanguages);
document.addEventListener('serverSelected', setMatch);
document.addEventListener('matchSelected', updateMatchDetails);
document.addEventListener('matchSelected', populateBorderNames);
document.addEventListener('updatedMatchDetails', populateScoreboard);
document.addEventListener('updatedNotifications', populateNotifications);
document.addEventListener('updatedSound', playSound);
document.addEventListener('updatedRefreshRate', restartTicker);
document.addEventListener('tickEvent', updateMatchDetails);

// bind user interaction
$('#servers').on('change', function(){ setServer(this.value)});
$('#language').on('change', function(){ setLanguage(this.value)});
$('#refresh_rate').on('change', function(){ setRefreshRate(this.value)});

$('input[name="notifications_red"]').change(function(){setNotifications("red", this.checked)});
$('input[name="notifications_blue"]').change(function(){setNotifications("blue", this.checked)});
$('input[name="notifications_green"]').change(function(){setNotifications("green", this.checked)});
$('input[name="notifications_center"]').change(function(){setNotifications("center", this.checked)});
$('input[name="sound"]').change(function(){setSound(this.checked)});

document.dispatchEvent(start);