var match_details_old = null;
var match_details = {};
var settings = {};
var guildCache = {};
var timers = {};
var start = new Event('start');
var analyseCounter = 0;
var border_mapping = {
    0: 'red',
    1: 'green',
    2: 'blue',
    3: 'center'
}
var location_mapping = {
    'tl': 'top left',
    'tr': 'top right',
    'bl': 'bottom left',
    'br': 'bottom right'
}

var themeTemplate = function(data){
    return  '<div class="notification ' + data.type + ' ' + data.color + ' ' + data.border + '-border ' + data.position + '" id="objective_' + data.id + '">' +
        '   <div class="container">' +
        '       <div class="icon"></div>' +
        '   </div>' +
        '   <div class="container info">' +
        '       <div class="label">' +
        '           <span class="time">5:00</span>' +
        '           <span class="name">' + data.name + '</span>' +
        '           <span class="guild"></span>' +
        '       </div>' +
        '       <div class="timer">' +
        '           <div class="background">' +
        '               <div class="bar"></div>' +
        '               <div class="ticks"></div>' +
        '           </div>' +
        '       </div>' +
        '   </div>' +
        '</div>';
}

var infoTemplate = function(data){
    return  '<div class="notification info"><div class="label">' + data.message + '</div></div>';
}

function resetAnalyseCounter() {
    analyseCounter = 0;
    infoNotification('Server selected');
}

function analyseMatchDetails() {
    match_details = JSON.parse(localStorage.getItem('match_details'));
    if(analyseCounter++ > 3) {
        for(var mapId in match_details.maps) {
            var map = match_details.maps[mapId];
            if(settings.notifications[border_mapping[mapId]]) {
                for (var objectiveId in map.objectives) {
                    var newobjective = map.objectives[objectiveId];
                    var oldobjective = match_details_old.maps[mapId].objectives[objectiveId];

                    if(newobjective.owner != oldobjective.owner) {
                        if(objectives[newobjective.id].type != 'ruin') {
                            if(newobjective.owner.toLowerCase() != 'neutral') {
                                dispatchEvent('objectiveFlipped', {'objective': newobjective, 'map': mapId});
                            }
                        }
                    }
                    if('owner_guild' in newobjective) {
                        if(newobjective.owner_guild != oldobjective.owner_guild) {
                            dispatchEvent('objectiveClaimed', {'objective': newobjective});
                        }
                    }
                }
            }
        }
    }
    match_details_old = match_details;
}

function objectiveClaimed(event) {
    var objective = event.detail.objective;
    if (objective.owner_guild in guildCache) {
        dispatchEvent('setClaimedObjectiveGuild', {'objective': objective, 'guild': guildCache[objective.owner_guild]});
    } else {
        $.getJSON('https://api.guildwars2.com/v1/guild_details.json?guild_id=' + objective.owner_guild, function(data){
            guildCache[objective.owner_guild] = data;
            dispatchEvent('setClaimedObjectiveGuild', {'objective': objective, 'guild': data});
        });
    }
}

function updateNotificationGuildTag(event) {
    var objective = event.detail.objective;
    var guildinfo = event.detail.guild;
    var name = objectives[objective.id].name[settings.language];
    $('#objective_' + objective.id + ' .guild').html('[' + guildinfo.tag + ']');
    console.log(name + " claimed by " + guildinfo.guild_name + ' [' + guildinfo.tag + ']');
}

function objectiveFlipped(event) {
    var objective = event.detail.objective;
    var map = event.detail.map;
    if (objective.id in objectives) {
        var name = objectives[objective.id].name[settings.language];
        var color = objective.owner.toLowerCase();
        var server = settings.servers[match_details[color]];
        var type = objectives[objective.id].type;
        var border = border_mapping[map];
        var position = location_mapping[settings.position.location];
        console.log(name + " (" + type + ") flipped by " + server[settings.language] + ' (' + color + ') on ' + border_mapping[border] + ' border');

        $.amaran({
            content:{
                'themeName': 'overlay',
                'id': objective.id,
                'name': name,
                'type': objectives[objective.id].type,
                'border': border,
                'color': color,
                'position': position
            },
            'inEffect': 'fadeOut',
            'outEffect': 'fadeOut',
            'delay': 300000,
            'closeOnClick': false,
            'themeTemplate': themeTemplate,
            'position': position
        });

        if(objective.id in timers) {
            clearTimeout(timers[objective.id]);
        }
        timers[objective.id] = setTimeout(function(){
            updateNotificationTimer(objective.id, 300)
        }, 1000);
    }
}

function updateNotificationTimer(objectiveId, tick) {
    tick--;
    var percentage = 100 - (tick / 300 * 100);
    var m = Math.floor(tick/60);
    var s = tick - m * 60;
    if(s < 10) s = '0' + s;
    var divId = '#objective_' + objectiveId;
    $(divId + ' .time').html(m + ':' + s);

    if($(divId).hasClass('left')){
        $(divId + ' .timer .bar').css('left', 0);
        $(divId + ' .timer .bar').css('width', 100 - percentage + '%');
    } else if($(divId).hasClass('right')) {
        $(divId + ' .timer .bar').css('left', percentage + '%');
        $(divId + ' .timer .bar').css('width', 100 - percentage + '%');
    }
    // change bar

    if(tick <= 300) {
        setTimeout(function(){
            updateNotificationTimer(objectiveId, tick);
        }, 1000);
    }
}

function infoNotification(message) {
    var message = message || "Notification";
    $.amaran({
        content:{
            'themeName': 'info',
            'message': message
        },
        'delay': 1000,
        'themeTemplate': infoTemplate,
        'clearAll':true,
        'position': location_mapping[settings.position.location]
    });
}

function updatePositioning() {
    var location = settings.position.location;
    var notifications = $('.notification');
    if(location.charAt(1) == 'l') {
        notifications.removeClass("right");
        notifications.addClass("left");
    }
    if(location.charAt(1) == 'r') {
        notifications.removeClass("left");
        notifications.addClass("right");
    }
    infoNotification('Updated position');
}

function handleExternalEvents(storageEvent) {
    var event = new Event(storageEvent.newValue);
    document.dispatchEvent(event);
}

function dispatchEvent(name, data) {
    data = data || false;
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent(name, true, true, data);
    document.dispatchEvent(event);
}

function fetchObjectives() {
    $.ajax('js/gw2_objectives.json').done(function(json){
        objectives = JSON.parse(json);
    });
}

function loadSettings() {
    var loadedSettings = JSON.parse(localStorage.getItem("settings"));
    if(loadedSettings != null) {
        settings = loadedSettings;
    }
}

function loadSound() {
    ion.sound({
        sounds: [
            {name: 'bell_ring'}
        ],
        path: 'sounds/',
        multiplay: true
    });
}

function playSound() {
    if(settings.sound) {
        ion.sound.stop();
        ion.sound.play('bell_ring', {
            'volume': settings.volume/100
        });
    }
}

window.addEventListener("storage", handleExternalEvents);
document.addEventListener("updatedMatchDetails", analyseMatchDetails);
document.addEventListener("objectiveFlipped", objectiveFlipped);
document.addEventListener("objectiveFlipped", playSound);
document.addEventListener("objectiveClaimed", objectiveClaimed);
document.addEventListener("serverSelected", resetAnalyseCounter);
document.addEventListener("setClaimedObjectiveGuild", updateNotificationGuildTag);
document.addEventListener("start", loadSettings);
document.addEventListener("settingsSaved", loadSettings);
document.addEventListener("updatedLocation", updatePositioning);
document.addEventListener("start", fetchObjectives);
document.addEventListener("start", loadSound);
document.addEventListener("start", updatePositioning);

document.dispatchEvent(start);