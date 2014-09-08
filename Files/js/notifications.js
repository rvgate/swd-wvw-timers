var match_details_old = null;
var match_details = {};
var settings = {};
var guildCache = {};
var start = new Event('start');

function clearOldMatchDetails() {
    match_details_old = null;
}

function analyseMatchDetails() {
    match_details = JSON.parse(localStorage.getItem('match_details'));
    if(match_details_old != null) {
        for(var mapId in match_details.maps) {
            var map = match_details.maps[mapId];
            for (var objectiveId in map.objectives) {
                var newobjective = map.objectives[objectiveId];
                var oldobjective = match_details_old.maps[mapId].objectives[objectiveId];
                // change owner or change guild?
                if(newobjective.owner != oldobjective.owner) {
                    dispatchEvent('objectiveFlipped', {'objective': newobjective});
                }
                if('owner_guild' in newobjective) {
                    if(newobjective.owner_guild != oldobjective.owner_guild) {
                        dispatchEvent('objectiveClaimed', {'objective': newobjective});
                    }
                }
            }

        }
    }
    match_details_old = match_details;
}

function objectiveClaimed(event) {
    var objective = event.detail.objective;
    var name = objectives[objective.id].name[settings.language];
    if (objective.owner_guild in guildCache) {
        var guild = guildCache[objective.owner_guild];
    }
}

function objectiveFlipped(event) {

    var objective = event.detail.objective;
    var name = objectives[objective.id].name[settings.language];
    var color = objective.owner.toLowerCase();
    var server = settings.servers[match_details[color]];
    console.log(name + " got flipped by " + server[settings.language]);
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
        preload: true
    });
}

function playSound() {
    if(settings.sound) {
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
document.addEventListener("serverSelected", clearOldMatchDetails);

document.addEventListener("start", loadSettings);
document.addEventListener("settingsSaved", loadSettings);
document.addEventListener("start", fetchObjectives);
document.addEventListener("start", loadSound);


document.dispatchEvent(start);