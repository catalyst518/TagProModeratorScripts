// ==UserScript==
// @name         Mod Tools Helper - Beta
// @namespace    http://www.reddit.com/u/bizkut
// @updateURL    https://github.com/catalyst518/TagProModeratorScripts/raw/master/modtools.user.js
// @downloadURL  https://github.com/catalyst518/TagProModeratorScripts/raw/master/modtools.user.js

// @version      1.12.1
// @description  It does a lot.  And then some.  I'm not even joking.  It does too much.
// @author       Bizkut
// @contributor  OmicroN
// @contributor  Carbon
// @contributor  Catalyst
// @include      https://tagpro-*.koalabeast.com/moderate/*
// @include      https://tagpro.koalabeast.com/moderate/*
// @include      http://tangent.jukejuice.com/moderate/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// ==/UserScript==

var bizAPI = "https://kylemcgrogan.com/api/";
var commentAPI = bizAPI + "comments/";
var evasionAPI = bizAPI + "evasion/";

var getActionURL = function(id, type, actionType) {
    return document.location.origin + '/moderate/' + type + '/' + id + '/' + actionType;
}

var banAction = function(id, type, count, reason, bansApplied) {
    $.post(getActionURL(id, type, 'ban'), {
        reason: reason,
        banCount: count,
        bansApplied: bansApplied
    }, function (data) {
            if (!data) return;
            if (data.alert) alert(data.alert);
            location.reload();
        } );
}

var unbanAction = function(id, type, bansRemoved) {
    $.post(getActionURL(id, type, 'unban'), {
        bansRemoved: bansRemoved
    }, function (data) {
            if (!data) return;
            if (data.alert) alert(data.alert);
            location.reload();
        } );
}

var muteAction = function(id, type, callback) {
    $.post(getActionURL(id, type, 'mute'), callback);
}

var unmuteAction = function(id, type, callback) {
    $.post(getActionURL(id, type, 'unmute'), callback);
}

var setEvasionProfileHeader = function(total, remaining, action) {
    var percentRemaining = (total-remaining)/total*100;
    document.getElementById("evasionProfileHeader").innerText = "Evasion Profile - "+action+" - "+percentRemaining.toFixed(1)+"% complete (" + $.active + " pending)";
    setActionInProgressTitle($.active);
}

var setActionInProgressTitle = function(activeCount) {
    document.title = "Action In Progress (" + activeCount + ")";
}

function isSyncSwitchEnabled() {
    return document.getElementById("onoffswitch").checked;
}

function disableButton(buttonId) {
    $("#"+buttonId).prop('disabled', true);
}

function enableButton(buttonId) {
    $("#"+buttonId).removeAttr('disabled');
}

var evasionSection = function() {
    var isProfile = window.location.href.indexOf("users/") > 0;
    var isIP = window.location.href.indexOf("ips/") > 0;
    if (!(isProfile || isIP)) return;

    var pageId = window.location.href.substring(window.location.href.lastIndexOf("/") + 1);
    var route = 'evasion_profile';

    if (isIP) {
        route = 'evasion_ips';

        /////////////// GRAB SPECTATOR LINK FOR UNREGISTERED USERS

        // start with getting the ip
        var ip = $('label:contains("IP Address")').next().text();

        // search the last 15 min of activity to see if still possibly playing
        $.getJSON(document.location.origin + '/moderate/chat?hours=0.25&ip=' + ip, function(data) {
            if (Object.keys(data).length) {
                // user the latest activity to calculate last activity
                var lastActivity = (((new Date()).getTime() - (new Date(data[0].when)).getTime()) / 1000 / 60 * 0.0166).toFixed(1);

                $('label:contains("IP Address")').parent().after('<div><label class="inline">Recent Activity</label><span class="ipchecked">' + lastActivity + ' hours ago</span></div>');

                var users = {};

                // loop through last 15 min of activity and find any
                Object.keys(data).forEach(function(item, index) {
                    if (typeof users[data[index].displayName] === 'undefined') {
                        users[data[index].displayName] = data[index].gameId;
                    }
                });

                // search found active users in last 15 minutes
                if (Object.keys(users).length) {
                    // search active games list
                    $.getJSON(document.location.origin + '/moderate/games', function(data4) {
                        // search through last active users/games
                        Object.keys(users).forEach(function(name, index) {
                            var gameId = users[name];
                            var someName = name;

                            // if last active users game is found in the current active games list then appaend spectator link to page
                            Object.keys(data4).forEach(function(item, index) {
                                if (data4[index].gameId == gameId) {
                                    if (data4[index].spectateUrl) {
                                        $('form:first').after('<a href="' + data4[index].spectateUrl + '&amp;target=' + someName + '" target="_blank" class="button tiny ipchecked">Spectate ' + someName + '</a>');
                                    }

                                    return;
                                }
                            });
                        });
                    });
                }
            }
        });
        //////////////////////////
    } else {
        var speclink = $('a:contains("Spectate")');
        speclink.attr('href', speclink.attr('href') + '&target=' + encodeURIComponent($('label:contains("Display Name")').next().text()));
    }

    $.get(evasionAPI + "find_evader/" + pageId, {}, function(response) {
        $('head').append('<style> .evasionSection { float:right; width:60%; border-left: 1px solid #fff; padding-left:20px;} .pad {padding: 10px;} .indent {padding-left:10px;}</style>');
        var evasionSection = $("<div class='evasionSection'/>"),
            addAccount,
            addIP;

        if (response.length == 0) {
            var newEvasionProfile = $('<button id="newProfile" class="small">Make new Ban Evasion Profile</button>');
            newEvasionProfile.on('click', function() {
                $.post(evasionAPI + route, {account_id:pageId}, function(res) {
                    location.reload();
                });
            });

            evasionSection.append(newEvasionProfile);
        }

        if ((response.length == 0 && isProfile) || isIP) {
            var existingEvasionProfile = $('<button id="existingProfile" class="small">Add to existing Ban Evasion Profile</button>');
            existingEvasionProfile.on('click', function() {
                var evasionId = prompt("Enter profile ID of evader", "");
                if (evasionId != "" && evasionId != null) {
                    $.post(evasionAPI + route, {account_id:pageId, existing_id:evasionId}, function(res) {
                        location.reload();
                    });
                }
            });
            evasionSection.append(existingEvasionProfile);
        }

        var evasionAccounts = $("<div/>");
        response.forEach(function(banProfile, index, array) {
            var evasionAccount = $("<div class='pad'/>");
            evasionAccount.append("<h2 id='evasionProfileHeader'>Evasion Profile</h2>");
            var evasionButtonToolTips = {
                ban:    "When sync is disabled, accounts and IPs linked to the evasion profile have their ban count increased by 1.\nThe ban reason is \"ban evasion\".",
                unban:  "When sync is disabled, accounts and IPs linked to the evasion profile have their ban count decreased by 1.",
                mute:   "When sync is disabled, accounts linked to the evasion profile have their mute count increased by 1.\nIPs linked to the evasion profile are unaffected.",
                unmute: "When sync is disabled, accounts linked to the evasion profile have their mute count decreased by 1.\nIPs linked to the evasion profile are unaffected."
            };
            var evasionBanButton = $("<button id='evasionBanButton' class='small' title='"+evasionButtonToolTips['ban']+"'>Ban</button>");
            var evasionUnbanButton = $("<button id='evasionUnbanButton' class='small' title='"+evasionButtonToolTips['unban']+"'>Unban</button>");
            var evasionMuteButton = $("<button id='evasionMuteButton' class='small' title='"+evasionButtonToolTips['mute']+"'>Mute</button>");
            var evasionUnmuteButton = $("<button id='evasionUnmuteButton' class='small' title='"+evasionButtonToolTips['unmute']+"'>Unmute</button>");

            //Source: https://proto.io/freebies/onoff/
            var styles = `
                .onoffswitch {
                    position: relative; width: 40px;
                    -webkit-user-select:none; -moz-user-select:none; -ms-user-select: none;
                }
                .onoffswitch-checkbox {
                    display: none;
                }
                .onoffswitch-label {
                    display: block; overflow: hidden; cursor: pointer;
                    height: 16px; padding: 0; line-height: 16px;
                    border: 2px solid #E3E3E3; border-radius: 16px;
                    background-color: #FFFFFF;
                    transition: background-color 0.15s ease-in;
                }
                .onoffswitch-label:before {
                    content: "";
                    display: block; width: 18px; margin: 0px;
                    background: #FFFFFF;
                    position: absolute; top: 0; bottom: 0;
                    right: 18px;
                    border: 2px solid #E3E3E3; border-radius: 16px;
                    transition: all 0.15s ease-in 0s;
                }
                .onoffswitch-checkbox:checked + .onoffswitch-label {
                    background-color: #ACE600;
                }
                .onoffswitch-checkbox:checked + .onoffswitch-label, .onoffswitch-checkbox:checked + .onoffswitch-label:before {
                   border-color: #ACE600;
                }
                .onoffswitch-checkbox:checked + .onoffswitch-label:before {
                    right: 0px;
                }
            `;

            var styleSheet = document.createElement("style")
            styleSheet.type = "text/css"
            styleSheet.innerText = styles
            document.head.appendChild(styleSheet);

            var syncText = $("<div style='display:inline-block;vertical-align:middle;padding-left:10px'>Sync?</div>");
            var switchHTML = `<div class='onoffswitch' style='display:inline-block;vertical-align:middle;padding-left:7px'>
                                  <input type='checkbox' name='onoffswitch' class='onoffswitch-checkbox' id='onoffswitch' checked>
                                  <label class='onoffswitch-label' for='onoffswitch'></label>
                              </div>`;
            var syncSwitch = $(switchHTML);

            var banEvasionReason = 7; //This is hacky as shit.  I should probably search the ban reason list for the id but i'm drunk coding.

            function syncEvasionAction(actionType, buttonId) {
                var keyword = "confirm"
                var text = "Sync is enabled...\nBefore continuing, please ensure the profile has fully loaded.\n\nThis process may take a while so please be patient.\nType \""+keyword+"\" to continue.";
                if ($.active > 0) {
                    alert("Please ensure the profile has fully loaded before syncing.\nThere are " + $.active + " open connections still loading.");
                    enableButton(buttonId);
                    return;
                } else if (keyword != prompt(text)) {
                    alert("Failed to verify, please ask for help.")
                    return;
                }

                var mainProfile = accountBanList.reduce(function(currentProfile, profile) {
                    return (profile.id != profId) ? currentProfile : profile //don't rely on current profile being index 0
                });

                var mainProfileBanCount = parseInt(mainProfile.el.attr('data-bancount')) + 1;
                var mainProfileMuteCount = parseInt(mainProfile.el.attr('data-mutecount')) + 1;

                var total = accountBanList.length;
                var current = total;
                setEvasionProfileHeader(total, total, actionType);

                accountBanList.forEach(function(profile) {
                    setEvasionProfileHeader(total, --current, actionType);
                    var numActionsToApply = 0;
                    if(actionType === "ban") {
                        currentBanCount = profile.el.attr('data-bancount')
                        numActionsToApply = Math.max(mainProfileBanCount - currentBanCount, 0);
                        var extraVariables = {
                            sync:   true,
                            reason: banEvasionReason, //hardcode to ban evasion
                            count:  currentBanCount
                        }
                    } else { //mute
                        currentMuteCount = profile.el.attr('data-mutecount')
                        numActionsToApply = mainProfileMuteCount - currentMuteCount;
                        extraVariables = {
                            sync:  true,
                            count: currentMuteCount
                        }
                    }
                    applyAction(null, profile.id, profile.type, actionType, numActionsToApply, extraVariables);
                });
                waitForZeroActiveRequestsThenRefresh();
            }

            function singleEvasionAction(actionType) {
                var total = accountBanList.length;
                var current = total;

                accountBanList.forEach(function(profile) {

                    //setting up extraVariables. Not required for un-X actions, but doesn't hurt.
                    if(actionType.indexOf("ban") > -1) {
                        var extraVariables = {
                            sync:   false,
                            reason: banEvasionReason,
                            count:  profile.el.attr('data-bancount')
                        }
                    } else {
                        extraVariables = {
                            sync:  false,
                            count: profile.el.attr('data-mutecount')
                        }
                    }
                    applyAction(null, profile.id, profile.type, actionType, 1, extraVariables);
                });
                waitForZeroActiveRequestsThenRefresh();
            }

            var accountBanList = [];

            evasionAccount.append(evasionBanButton);
            evasionAccount.append(evasionUnbanButton);
            evasionAccount.append(syncText);
            evasionAccount.append(syncSwitch);
            if (banProfile.profiles.length > 0) {
                var accounts = $("<p class='evasion_accounts' class=''></p>");
                accounts.append("<h2 class='indent'>Accounts</h2>");
                var accountList = $("<ul class='indent'/>");

                banProfile.profiles.forEach(function(profile, i, a) {
                    var link = $("<a class='ban_profile_account' href='//" + window.location.hostname + "/moderate/users/" + profile.profile_id +"'>" + profile.profile_id +"</a>");
                    var removeAccount = $("<span class='removeAccount ipchecked' data-id='"+profile.id+"'> ✗</span>");
                    accountBanList.push({
                        id: profile.profile_id,
                        type: 'users',
                        el: link
                    });
                    var list = $("<li class='indent'></li>");
                    list.append(link);
                    list.append(removeAccount);
                    accountList.append(list);
                });
                accounts.append(accountList);
                evasionAccount.append(accounts);
            }

            if (banProfile.ranges.length > 0) {
                var ips = $("<p class='evasion_ips' class='pad'></p>");
                ips.append("<h2 class='indent'>IPs</h2>");

                var ipList = $("<ul class='indent'/>");
                banProfile.ranges.forEach(function(ip, i, a) {
                    var link = $("<a class='ban_profile_ip' href='//" + window.location.hostname + "/moderate/ips/" + ip.tagpro +"'>" + ip.tagpro +"</a>");
                    var removeIP = $("<span class='removeIP ipchecked' data-id='"+ip.id+"'> ✗</span>");
                    accountBanList.push({
                        id: ip.tagpro,
                        type: 'ips',
                        el: link
                    });
                    var list = $("<li class='indent'></li>");
                    list.append(link);
                    list.append(removeIP);

                    ipList.append(list);
                });
                ips.append(ipList);
                evasionAccount.append(ips);
            }

            evasionBanButton.on('click', async function() {
                disableButton("evasionBanButton");
                if (dinkProtect(true)) {
                    if(isSyncSwitchEnabled()) {
                        await syncEvasionAction('ban', 'evasionBanButton');
                    } else {
                        await singleEvasionAction('ban');
                    }
                }
            });
            evasionUnbanButton.on('click', async function() {
                disableButton("evasionUnbanButton");
                if (dinkProtect(true)) {
                    await singleEvasionAction('unban');
                }
            });
            evasionMuteButton.on('click', async function() {
                disableButton("evasionMuteButton");
                filterForOnlyUsers();
                if (dinkProtect(true)) {
                    if(isSyncSwitchEnabled()) {
                        await syncEvasionAction('mute', 'evasionMuteButton');
                    } else {
                        await singleEvasionAction('mute');
                    }
                }
            });
            evasionUnmuteButton.on('click', async function() {
                disableButton("evasionUnmuteButton");
                filterForOnlyUsers();
                if (dinkProtect(true)) {
                    await singleEvasionAction('unmute');
                }
            });

            var filterForOnlyUsers = function() {
                accountBanList = accountBanList.filter(function(e) {
                    return e.type === 'users'; //only users can be muted
                });
            };

            evasionAccounts.append(evasionAccount);
        });
        evasionSection.append(evasionAccounts);
        $('form').before(evasionSection);

        var lastIP = '';
        if (isProfile) {
            lastIP = $('label:contains("Last IP")').next().text();
        }
        lastIP = lastIP || pageId;

        $.get(evasionAPI + "suspicious/" + lastIP, {}, function(response) {
            if (response[2] || response[3]) {
                var suspiciousSection = $("<div class='pad' />");
                suspiciousSection.append('<h2>Similar Flagged IPs</h2>');
                if (response[3]) {
                    var ipList = $("<ul class='indent' />");
                    response[3].forEach(function(item) {
                        ipList.append("<li class='indent'><a href='//" + window.location.hostname + "/moderate/ips/" + item +"'>" + item +"</a></li>" );
                    });
                    ipList.prepend("<h2>Very Similar</h2>");
                    suspiciousSection.append(ipList);
                }

                if (response[2]) {
                    var ipList = $("<ul class='indent' />");
                    response[2].forEach(function(item) {
                        ipList.append("<li class='indent'><a href='//" + window.location.hostname + "/moderate/ips/" + item +"'>" + item +"</a></li>" );
                    });
                    ipList.prepend("<h2>Somewhat Similar</h2>");
                    suspiciousSection.append(ipList);
                }
            }
            $(".evasionSection").append(suspiciousSection);
        });

        $("a.ban_profile_account").each(function(index, element) {
            var el = $(element);
            colorAccountInfo(el);
        });

        $("a.ban_profile_ip").each(function(index, element) {
            var el = $(element);
            colorAccountInfo(el, false);
        });

        $('.removeAccount').on('click', function(el) {
            var accountId = $(this).data('id');
            $.ajax({
                url: evasionAPI + "evasion_profile/" + accountId,
                type: 'DELETE',
                success: function(){
                    var id = this.url.substring(this.url.lastIndexOf("/")+1);
                    $(".removeAccount[data-id='"+id+"']").parent().remove();
                }
            });
        });
        $('.removeIP').on('click', function(el) {
            var ipId = $(this).data('id');
            $.ajax({
                url: evasionAPI + "evasion_ips/" + ipId,
                type: 'DELETE',
                success: function(){
                    var id = this.url.substring(this.url.lastIndexOf("/")+1);
                    $(".removeIP[data-id='"+id+"']").parent().remove();
                }
            });
        });
    });
};

var optionsLink = $('<a href="#" id="options">Options</a>');
var optionsPage = $("<div/>");
$("a[href='/moderate/modactions']").after(optionsLink);
optionsPage.append("<h2>SETTINGS!<h2/>");
optionsPage.append("<div><input type='checkbox' id='longTime' /><label for='longTime'>Full time on Chat Page (Adds seconds to times)</label></div><br/>");
optionsPage.append("<div><input type='checkbox' id='dinkProtect' /><label for='dinkProtect'>Enable dink protections (Requires verification to ban/unban)</label></div><br/>");
optionsPage.append("<div><input type='checkbox' id='reportCounter' /><label for='reportCounter'>Disable active reports counter in the Recent Reports header</label></div><br/>");
var countSelect = "<select id='commonCount'>";
for(var amount = 0; amount < 10; amount++) {
    if (amount+1 == GM_getValue("common_count", 5)) {
        countSelect += "<option value='"+(amount+1)+"' selected>"+(amount+1)+"</option>";
    } else {
        countSelect += "<option value='"+(amount+1)+"'>"+(amount+1)+"</option>";
    }
}
countSelect += "</select>  (Number of common accounts to find)<br/><br/>";
optionsPage.append(countSelect);
optionsPage.append("<p>Script brought to you by bizkut in collaboration with OmicroN and Carbon.</p><p>If you have any suggestions for more features or bugs, "
                   +"send a message to bizkut or Carbon on Slack.</p>");

function prepToggle(id, gm_val) {
    if(GM_getValue(gm_val)===true){
        $(id).prop('checked', true);
    }
    $(id).on('change', function() {
        if($(this).is(":checked")) {
            GM_setValue(gm_val, true)
        } else {
            GM_setValue(gm_val, false)
        }
    });
}
optionsLink.on('click',function() {
    $("#filters").remove();
    var contentSection = $("#content").addClass('noFilters pad');
    contentSection.empty();
    contentSection.append(optionsPage);
    prepToggle("#longTime", "longTime");
    prepToggle("#dinkProtect", "dink_protect");
    prepToggle("#reportCounter", "report_counter");
    $("#commonCount").on('change', function() {
        GM_setValue("common_count", $(this).val());
    });
});

function setMod() {
    if (GM_getValue('mod_username') === undefined) {
        $.get(window.location.origin, function (data) {
            var hrf = $(data).find("a:contains('Profile')")[0].href;
            $.get(hrf, function (data2) {
                GM_setValue('mod_username', $(data2).find("#reservedName").val());
            });
        });
    }
}
setMod();

/**
 * On any of the moderation tables where we display a bunch of rows
 * this function will make it display a row explaining there were no responses
 */
function addNoResponseCheck() {
    if (typeof moderate !== 'undefined') {
        moderate.oldBind = moderate.smartBind;
        moderate.smartBind = function($template, data) {
            var rows = moderate.oldBind($template, data);
            if (Array.isArray(rows) && rows.length == 0) {
                rows.push($("<tr><td style='font-size:2em'>No results</td></tr>"))
            }
            return rows;
        }
    }
};
addNoResponseCheck();

function dinkProtect(override = false) {
    if (override === true || GM_getValue("dink_protect") === true) {
        if (confirm("Are you sure you want to do that, you dink?")) {
            if (confirm("Like, absolutely sure?")) {
                return true;
            }
        }
        return false;
    } else {
        return true;
    }
}

function isMuteActive(text) {
    return text.indexOf("in") >= 0;
}

// #banCount is wrong sometimes, so manually parsing action history
function getActionHistory(data) {
    actions = Array.from(data)
                 .map(x => x.innerText)
                 .filter(f => /by.*hour ago/.test(f))
                 .filter(f => f.length < 100)
                 .filter(f => !f.endsWith(".")); //ip blocks removed

    if (actions.length > 1 && actions[actions.length-1].startsWith("unbanned")) {
        actions.pop();
    }
    return actions;
}

function getCountOfGivenActionType(arr, actionType) {
    return arr.filter(f => new RegExp("^"+actionType+" by").test(f)).length
}

function getActualBanCount(data) {
    allActions = getActionHistory(data);
    mutedActions = getCountOfGivenActionType(allActions, "muted");
    unmutedActions = getCountOfGivenActionType(allActions, "unmuted");
    unbannedActions = getCountOfGivenActionType(allActions, "unbanned");
    return allActions.length - mutedActions - unmutedActions - (2 * unbannedActions);
}

var newAcntHours = 48;
function colorAccountInfo(accountLink, extraInfo = true) {
    $.get(accountLink[0].href, function (data) {
        var children = $(data).children("form").children();
        var reserved = $(children[0]).find("span").text();
        var display = $(children[1]).find("span").text();
        accountLink.attr("data-name", reserved?reserved:display);
        var hoursAgo = ($(children[2]).children("span").text());
        var lastIp = ($(children[3]).children("a").text());
        var accountAge = ($(children[4]).children("span").text());
        if (accountLink[0].href.includes('ip')){
            var banInfo = ($(children[2]).children("span").text());
        } else {
            var banInfo = ($(children[8]).children("span").text()); // this gives us some text on current ban
        }
        var muteCount = ($(children[9]).children("span").text()); // this gives us some text with the number in parentheses was 8 before
        if (extraInfo) {
            accountLink.append(" - Last Played: " + hoursAgo + " | IP: " + lastIp + " | Age: " + accountAge);
        }

        var banCount = $(data).find("#banCount").val();
        var realBanCount = getActualBanCount($(data).find("div"));

        if (banCount) { //community bans mean we can't be sure when displayed>real
            accountLink.append(" | Bans: " + banCount);
        } else {
            accountLink.append(" | Bans: " + banCount);
        }

        if (muteCount.length) {
            muteCount = muteCount.match(/\(([^)]+)\)/)[1]; // Pull that number out
            accountLink.append(" | Mutes: " + muteCount);
            accountLink.attr('data-mutecount', muteCount);
        }
        var hours = hoursAgo.split(" ")[0];
        var hoursAsFloat = parseFloat(hours);
        var hoursAge = accountAge.split(" ")[0];
        var hoursAgeAsFloat = parseFloat(hoursAge);
        var muteText = $(children[9]).find("span").text();

        accountLink.attr('data-bancount', banCount);

        // Orange/Cyan added for new accounts by Ballzilla
        if (banInfo.length && !banInfo.includes("No ")) {
            accountLink.append(" (This user is currently banned)");
            if(hoursAgeAsFloat <= newAcntHours) {
                accountLink.css({
                    'color': 'orange'
                })
            } else {
                accountLink.css({
                    'color': 'red'
                })
            }
        } else if (isMuteActive(muteText)) {
            accountLink.css({
                'color': 'yellow'
            })
        } else if(hoursAgeAsFloat <= newAcntHours) {
            accountLink.css({
                'color': 'cyan'
            });
        }
        else if (hoursAsFloat <= 1) {
            accountLink.css({
                'color': 'green'
            });
        }
        accountLink.addClass('highlightPending')
    });
}

if (window.location.pathname.indexOf("fingerprints") > -1) {
    $("div a").each(function (index, domObject) {
        var obj = $(domObject);
        colorAccountInfo(obj);
    });
}

if (window.location.pathname.indexOf("reports") > -1) {
    $("#filters").append("<div style='margin: 0'><input type='checkbox' id='toggleSys' /><label for='toggleSys'>Hide system reports</label></div>");
    if(GM_getValue("hideSystem")===true){
        $("#toggleSys").prop('checked', true);
    }
    $("#toggleSys").on('change', function() {
        if($(this).is(":checked")) {
            GM_setValue("hideSystem", true)
        } else {
            GM_setValue("hideSystem", false)
        }
    });

    moderate.oldBind2 = moderate.smartBind;
    moderate.smartBind = function($template, data) {
        var rows = moderate.oldBind2($template, data);
        if (Array.isArray(rows)) {
            rows.forEach(function(element) {
                if (GM_getValue("hideSystem") === true) {
                    var ip = $(element).find("[data-bind=byIP]").text();
                    if (ip.includes("null")) {
                        $(element).css("display", "none");
                        return;
                    }
                }

                var gameReports = $(element).find("[data-bind=gameReports]");
                if (gameReports && parseInt(gameReports.text()) > 2) {
                    gameReports.parent("th").css("color", "red");
                }
            });
        }

        return rows;
    };
}

if(window.location.pathname.indexOf('chat') > -1) {
    $('#reportRows').on('click', 'th', function() {
        var $this = $(this);
        if ($this.parent().children()[6] != this) { return; }

        if ($this.data('selected')) {
            $this.removeData('selected');
        } else {
            $this.data('selected', true);
        }
        $this.css('background-color', $this.data('selected')?'#444':'');
    });

    $('#report .buttons').append($('<button id="copyToClipboard" class="small">Get Selected Text</button>').click(function() {
        var copyStr = "";
        $('#reportRows tr').find('th:eq(6)').each(function(idx, el) {
            var $el = $(el);
            if ($el.data('selected')) {
                copyStr = $el.prev().text()+ ": " + $el.text() + "   \n" + copyStr;
            }
        });
        copyStr = ">"+copyStr;

        $('.copybox').remove();
        var $text = $('<textarea class="copybox" style="height:1.2em;vertical-align:bottom"></textarea>').text(copyStr);
        $('#report .buttons').append($text);
        $text.select();
    }));
}

async function waitForZeroActiveRequestsThenRefresh() {
    refreshAttempted = false
    while (!refreshAttempted) {
        if ($.active === 0) {
            if (!!document.getElementById("evasionProfileHeader")) {
                document.getElementById("evasionProfileHeader").innerText = "Evasion Profile - Complete, refreshing";
            }
            refreshAttempted = true;
            location.reload();
        } else {
            setActionInProgressTitle($.active);
        }
        await new Promise(resolve => setTimeout(resolve, 250))
    }
};

if(window.location.pathname.indexOf('users') > -1 || window.location.pathname.indexOf('ips') > -1) {
    $("#shadowmuteButton").hide();
    $("#modcallMuteButton").attr('class', 'tiny');
    setActiveCountOnRecentReports(!GM_getValue('report_counter')); //note the !, enabling the checkbox disables functionality
    evasionSection();
    var profId = window.location.pathname.substr(window.location.pathname.lastIndexOf('/') + 1);
    var section = window.location.pathname.indexOf('users') > -1 ? 'users' : 'ips';
    if(window.location.pathname.indexOf('users') > -1) {
        var fingerprints = $('a[href*="fingerprints"]').parent();
        var par = fingerprints.parent();
        var togglePrints = $("<span id='togglePrints'>[-] Collapse</span>");
        if(GM_getValue("hideFingerprints")===true) {
            togglePrints = $("<span id='togglePrints'>[+] Expand</span>");
            fingerprints.hide();
        }
        togglePrints.on('click', function(e) {
            if(fingerprints.is(':visible')) {
                fingerprints.hide();
                GM_setValue("hideFingerprints", true);
                togglePrints.text('[+] Expand');
            } else {
                fingerprints.show();
                GM_setValue("hideFingerprints", false);
                togglePrints.text('[-] Collapse');
            }
        })
        $(par.children()[0]).after(togglePrints);

        var names = [];
        var fingerQueue = [];
        var fingerprintList = [];
        var totalFingerprints = 0;

        $('#togglePrints').next('div').find('a').each(function() {
            fingerprintList.push($(this).html());
        });

        totalFingerprints = fingerprintList.length;

        if (fingerprintList.length > 0) {
            var calculate = $("<button id='calcFingerprints' class='tiny' title="+totalFingerprints+">Find Common Accounts (May take some time) - "+totalFingerprints+" total</button>");
            var sharedAccountDiv = $("<div id='sharedAccounts'/>");
            sharedAccountDiv.append(calculate);
            fingerprints.parent().after(sharedAccountDiv);
            calculate.on('click', function(e) {
                e.preventDefault();
                for (i = 0; i < (fingerprintList.length < 10 ? fingerprintList.length : 10); i++)
                {
                    fingerQueue[i] = setTimeout(function(i) { setTimeout(checkfingerprint(i), 0) }, 0, i);
                }
            });
            function sortObject(obj) {
                var arr = [];
                for (var prop in obj) {
                    if (obj.hasOwnProperty(prop)) {
                        arr.push({
                            'key': prop,
                            'value': obj[prop]
                        });
                    }
                }
                arr.sort(function(a, b) { return b.value.count - a.value.count; });
                return arr;
            }

            function checkfingerprint(pos) {
                var queueId = fingerQueue[pos];

                $("#calcFingerprints").prop('disabled', true).css('backgroundColor', '#F4F4F4').html('Checking ' + (totalFingerprints - fingerprintList.length + 1) + ' of ' + totalFingerprints + ' fingerprints...');

                var fingerprint = fingerprintList.splice(0, 1);

                $.ajax({url: window.location.origin + '/moderate/fingerprints/' + fingerprint}).done(function(data) {
                    $(data).find('div > a').each(function() {
                        var link = '' + $(this).attr('href');
                        if (typeof names[link] == 'undefined') {
                            names[link] = {
                                count : 1,
                                name : $(this).html()
                            };
                        } else {
                            names[link].count += 1;
                        }
                    });
                }).always(function() {
                    if (fingerprintList.length == 0) {
                        for (i = 0; i < fingerQueue.length; i++) {
                            if (fingerQueue[i] == queueId) {
                                fingerQueue.splice(i, 1);
                            }
                        }

                        if (fingerQueue.length == 0) {
                            $("#calcFingerprints").remove();

                            arr = sortObject(names);
                            arr = arr.splice(0, GM_getValue("common_count",5));
                            var occurrances = $('<div>Top ' + GM_getValue("common_count",5) + ' Name Occurrances in ' + totalFingerprints + ' Fingerprints:</div>');
                            occurrances.append("<br/>");


                            $.each(arr, function(key, value) {
                                var link = $("<a href = '" + arr[key].key + "'>" + arr[key].value.name + " - <strong>Appears " + arr[key].value.count + " times</strong></a>");
                                colorAccountInfo(link);
                                occurrances.append(link).append("<br/>");
                            });

                            $("#sharedAccounts").append(occurrances);
                        }
                    } else {
                        checkfingerprint(pos);
                    }
                });
            }
        }
    }

    if(profId !== 'users') {
        $("<h2 id='comment_title'>Comments</h2>").appendTo("#content");

        $.get(commentAPI + "comment/"+profId, function (data) {
            $(data).insertAfter("#comment_title");

            $("<textarea id='comment_box' />").insertAfter($('#comments'));

            var makeComment = $("<button id='submitComment' class='tiny'>Submit</button>");
            var cancelComment = $("<button id='cancelComment' class='tiny'>Cancel</button>")
            var commented = false;
            makeComment.on('click', function() {
                var text = $("#comment_box").val();
                if($.trim(text).length !== 0) {
                    if(commented === false) {
                        commented = true;
                        if (GM_getValue('mod_username') !== undefined) {
                            $.post( commentAPI + "comment", { profile: profId, comment: text, modName: GM_getValue('mod_username') })
                                .done(function( data ) {
                                location.reload();
                            });
                        } else {
                            alert("Hmm, I can't find your username to post with :(");
                        }
                    } else {
                        alert("You already clicked comment once u dink");
                    }
                }
            });
            cancelComment.on('click', function() {
                $("#comment_box").val("");
            });

            makeComment.insertAfter($("#comment_box"));
            cancelComment.insertAfter(makeComment);
            $("<br/>").insertBefore(makeComment);
        });
    }

    function applyAction(e, id, type, actionType, actionAmount, extraVariables) {

        if(e != null) {
            e.preventDefault();
        }
        if (!dinkProtect()) {
            return;
        }

        var increment = actionAmount;

        if (actionType === 'ban') {
            banAction(id, type, extraVariables.count, extraVariables.reason, increment);
        } else if(actionType === 'unban') {
            unbanAction(id, type, increment);
        }
    }

    var currentBanCount = $("#banCount").val();

    function getIPInfo(ip) {
        GM_xmlhttpRequest({
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-key": "NTQ2ODo1cFZHbXNwRlg2b3dseXFxVnBmbWhsSTgzZGZrUUxvYQ=="
            },
            url: "http://v2.api.iphub.info/ip/"+ip,
            onload: function(response) {
                var json = JSON.parse(response.responseText),
                    type, color;
                if (json.block == 0) {
                    type = 'Residential or business';
                    color = '#04bd04'; // green
                } else if (json.block == 1) {
                    type = 'Non-residential IP';
                    color = '#e74c3c'; // red
                } else if (json.block == 2) {
                    type = 'Non-residential & residential IP';
                    color = '#f39c12'; // orange
                }

                var ipInfo = $("<div style='padding-left:20px'></div>");
                ipInfo.append("<div style='max-width:300px'><span>Country</span><span style='float:right'>"+json.countryName+"</span></div>");
                ipInfo.append("<div style='max-width:300px'><span>ISP</span><span style='float:right'>"+json.isp+"</span></div>");
                ipInfo.append("<div style='max-width:300px'><span>Type</span><span style='float:right; color:"+color+"'>"+type+"</span></div>");
                $('#ipCheck').parent().append(ipInfo);
            }
        });
    }

    var ipCheck = $("<button id='ipCheck' class='tiny'>VPN Check</button>");
    ipCheck.on('click', function(e) {
        e.preventDefault();
        var el = $(this);
        el.hide();
        getIPInfo(el.prev().text());
    });
    $('label:contains("'+ (section == 'users' ? 'Last IP' : 'IP Address') +'")').parent().append(ipCheck);

    //here
}

function setActiveCountOnRecentReports(optionEnabled) {
    var reportsJSONObj;
    reports = document.querySelectorAll('[title="Remove report"]');
    reportCount = reports.length;
    if(optionEnabled && reportCount>0) {
        getReportReasons(loopThroughReports);
    }
}

function getReportReasons(callback) {
    $.getJSON(document.location.origin+"/misc/kickReasons.json", function (data) {
        reportsJSONObj = data;
        callback();
    });
}

function loopThroughReports() {
    activeReportCounter = 0;
    for (var i=0; i<reportCount; i++) {
        reportReasonRaw = reports[i].parentNode.children[0].innerText;
        reportReason = reportReasonRaw.substr(0, reportReasonRaw.indexOf(" by ")); //remove reporter name
        activeReportCounter += doesReportIncrementCount(reportReason);
    }
    updateRecentReportsHeader(activeReportCounter);
}

function doesReportIncrementCount(reason) {
    for (var i=1; i<=Object.keys(reportsJSONObj).length; i++) {
        line = reportsJSONObj[i];
        if(reason == line.text && line.incrementReportCount) {
            return 1;
        }
    }
    return 0;
}

function updateRecentReportsHeader(activeReportCounter) {
    h2Elements = document.getElementsByTagName("h2");
    for(var i=0; i<h2Elements.length; i++) { //I don't know how to find the right one without looping through
        if(h2Elements[i].innerText.indexOf("Recent Reports (") >= 0) {
            h2Elements[i].innerText = "Recent Reports (24 hours) - " + activeReportCounter + " active";
            tooltipText = "Reports that do not count towards the active total:";
            for(var j=1; j<Object.keys(reportsJSONObj).length; j++) {
                if(!reportsJSONObj[j].incrementReportCount) {
                    tooltipText += "\n- " + reportsJSONObj[j].text;
                }
            }
            h2Elements[i].title = tooltipText;
        }
    }
}

// inject custom style for highlighting of ips
$('head').append('<style> .highlight { text-decoration: underline !important; color: red !important; } </style>');

function octetExistenceCheck(unsplitIpToCheck) {
    var ipToCheck = unsplitIpToCheck.split('.')
    if (!highRiskIpsTreeMap
           .has(ipToCheck[0])) {
        return "";
    }
    if (!highRiskIpsTreeMap.get(ipToCheck[0])
           .has(ipToCheck[1])) {
        return ipToCheck[0] + '.';
    }
    if (!highRiskIpsTreeMap.get(ipToCheck[0]).get(ipToCheck[1])
           .has(ipToCheck[2])) {
        return ipToCheck[0] + '.' + ipToCheck[1] + '.';
    }
    if (!highRiskIpsTreeMap.get(ipToCheck[0]).get(ipToCheck[1]).get(ipToCheck[2])
           .has(ipToCheck[3])) {
        return ipToCheck[0] + '.' + ipToCheck[1] + '.' + ipToCheck[2] + '.';
    }
    return unsplitIpToCheck;
}

// custom jquery function to search elements and highlight parts of the ip matching high risk ips
jQuery.fn.highlightRisk = function() {
    var node = this[0]

    var hasExtraInfo = false;
    var ipStringIndexStart, ipStringIndexEnd;

    var unsplitIpToCheck = node.data;

    if (node.data.includes("IP: ")) {
        hasExtraInfo = true //requires extra logic to highlight the correct part
        ipStringIndexStart = node.data.indexOf("IP:") + 4
        ipStringIndexEnd = node.data.indexOf("Age") - 3
        unsplitIpToCheck = unsplitIpToCheck.substring(ipStringIndexStart, ipStringIndexEnd)
    }

    var toHighlightString = octetExistenceCheck(unsplitIpToCheck);

    // if ipToCheck's octets matched any in the high risk list, we highlight the maximum number of matched octets
    if (toHighlightString.length > 0) {
        var spanNode = document.createElement('span');
        spanNode.className = 'highlight ipchecked';

        if (hasExtraInfo) {
            var unhighlightedSection = node.splitText(ipStringIndexStart).splitText(toHighlightString.length);
            spanNode.textContent = toHighlightString
            unhighlightedSection.parentNode.replaceChild(spanNode, unhighlightedSection.parentNode.childNodes[2])
        } else {
            var unhighlightedSection = node.splitText(toHighlightString.length);
            spanNode.textContent = node.data
            unhighlightedSection.parentNode.replaceChild(spanNode, unhighlightedSection.parentNode.childNodes[0])
        }
    }
};

function jsonToTreeMap(highRiskIps) {
    treeMap = new Map()

    for (const ip of new Set(highRiskIps)) {
        octets = ip.split('.')
        if (!treeMap.has(octets[0])) {
            treeMap.set(octets[0], new Map())
        }
        if (!treeMap.get(octets[0]).has(octets[1])) {
            treeMap.get(octets[0]).set(octets[1], new Map())
        }
        if (!treeMap.get(octets[0]).get(octets[1]).has(octets[2])) {
            treeMap.get(octets[0]).get(octets[1]).set(octets[2], new Map())
        }
        if (!treeMap.get(octets[0]).get(octets[1]).get(octets[2]).has(octets[3])) {
            treeMap.get(octets[0]).get(octets[1]).get(octets[2]).set(octets[3], new Map())
        }
    }
    return treeMap;
}

// Grab the list of High Risk IPs
$.get(evasionAPI + 'evaders', function(response) {
    highRiskIPs = JSON.parse(response);
    highRiskIpsTreeMap = jsonToTreeMap(highRiskIPs)

    // 0.1 second interval to check for new ips to match against
    setInterval(function() {
        $('a, span').not('.ipchecked').contents().each(function() {
            // set this element as checked so its not checked again; we must use parent because .contents() pulls the text node (nodeType 3) not the element that contains the text
            $(this).parent().addClass('ipchecked');

            if ($(this)[0].nodeType == 3 && $(this)[0].length > 0 && /\d+\.\d+\.\d+\.\d+/.test($(this)[0].nodeValue)) {
                setTimeout(function(ele) {
                    $(ele).highlightRisk();
                }, 0, this);
            }
        });
    }, 100);
});

/*
  When there are many evasion profiles, it can take a long time to load all of the extra info (importantly, the ip address). The normal highlightRisk loop is not sufficient
  in this case as it marks the node as "ipchecked" before the ip has actually been checked and highlighted.
  We therefore perform the same logic on a periodic loop (2.5s) for evasion info which loads late.
*/
setInterval(function() {
    $('.highlightPending').contents().each(function() {
        // set this element as checked so its not checked again; we must use parent because .contents() pulls the text node (nodeType 3) not the element that contains the text
        $(this).parent().removeClass('highlightPending');

        if ($(this)[0].nodeType == 3 && $(this)[0].length > 0 && /\d+\.\d+\.\d+\.\d+/.test($(this)[0].nodeValue)) {
            setTimeout(function(ele) {
                $(ele).highlightRisk();
            }, 0, this);
        }
    });
}, 2500);

var sortUserLastGame = function(ascOrDesc) {
    var userRows = $('tr');
    dashUsers = [];

    $('#reportRows').html('');
    recursiveLastPlayedSort(userRows, ascOrDesc);

    if (ascOrDesc === 'desc') {
        return 'asc';
    } else {
        return 'desc';
    }
}

var recursiveLastPlayedSort = function(userRows, ascOrDesc) {
    var currentLow = null;
    var currentLowHoursPlayed = null;
    var currentLowIndex = null;

    //  Only run it if we have rows to look at
    if (userRows.length > 0) {
        //  Find the current lowest number of hours played
        for (var i = 0; i < userRows.length; i++) {
            //  If it's a dash user we'll put them at the end
            if (userRows.eq(i).find('th:nth-child(4)').text() !== '-') {
                var hoursPlayed = userRows.eq(i).find('th:nth-child(4)').text().match(/\d+/g);

                if (hoursPlayed !== null && (parseInt(hoursPlayed, 10) < currentLowHoursPlayed || currentLow === null)) {
                    currentLowHoursPlayed = parseInt(hoursPlayed, 10);
                    currentLow = userRows.eq(i);
                    currentLowIndex = i;
                }
            } else {
                dashUsers.push(userRows.eq(i));
            }
        }

        //  Append the lowest row and splice the element out of the array
        if (currentLow !== undefined) {
            if (ascOrDesc === 'desc') {
                $('#reportRows').append(currentLow);
            } else {
                $('#reportRows').prepend(currentLow);
            }

            userRows.splice(currentLowIndex, 1);
        }

        recursiveLastPlayedSort(userRows, ascOrDesc);
    } else {
        //  Put the dash users we found at the end
        dashUsers.forEach(function(row) {
            if (ascOrDesc === 'desc') {
                $('#reportRows').append(row);
            } else {
                $('#reportRows').prepend(row);
            }
        });

        return;
    }
}

if (window.location.pathname.indexOf("users") > -1) {
    var ascOrDesc = 'desc';
    var dashUsers = [];

    $('th').click(function(e) {
        if ($(this).text() === 'Last Game') {
            ascOrDesc = sortUserLastGame(ascOrDesc);
        }
    });
}
