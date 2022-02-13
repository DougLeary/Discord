var discordServerName;
if (process.argv.length >= 3) {
    discordServerName = process.argv[2];
} else {
    discordServerName = "Dragonbone Test";    //HalfAstral Plane";
}

// Discord bot
const Discord = require('discord.js');
const fetchAll = require('discord-fetch-all');

const client = new Discord.Client();
var discordServer;
var diceChannel;

function getGamedayChannel() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = today.getMonth() + 1;
  const dd = today.getDate();
  const gameDay = mm + '-' + dd + '-' + yyyy;
  return discordServer.channels.cache.find(channel => channel.name.includes(gameDay));
}

function notifyDiceChannel(channel) {
  console.log("Setting dice channel: " + channel.name);
//  channel.send("# DragonBone will operate here.");
}

function shouldScrubAuthor(name) {
  //console.log("checking msg by " + name);
    return (name == "DiceParser"
        || name == "Sidekick"
        || name == "DragonBone");
}
function shouldScrubText(text) {
  //console.log("Checking text " + text);
    return (text.startsWith("!d") 
        || text.startsWith("/r")
        || text.startsWith("!s"));
}

function scrubChannel(channel) {
    // delete roll-related messages and any from DiceParser, Sidekick or DragonBone
    fetchAll.messages(channel, {
        reverseArray: true, // Reverse the returned array
        userOnly: false, // Only return messages by users
        botOnly: false, // Only return messages by bots
        pinnedOnly: false, // Only returned pinned messages
    }).then(
        (messages) => {
            console.log("Found",messages.length," messages");
            var nDeleted = 0;
            for (msg of messages) {
                if (shouldScrubAuthor(msg.author.username)
                    || shouldScrubText(msg.content.replace(/\d+/g, ''))) {
                    msg.delete();
                    nDeleted++;
                }
            }
            console.log(`Deleted ${nDeleted} roll-related messages.`);
            //                scrubChannel(channel);
        },
        () => {
            console.log("No messages available");
        }
    );
}

function rollInitiative(channel) {
    // roll d6 for party and monsters, report results
    let d1 = 0;
    let d2 = 0;
    let who = "Party";
    while (d1 == d2) {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
    }
    if (d2 > d1) { who = "Enemy"; }
    channel.send(`Initiative roll... Party: ${d1}, Enemy: ${d2}... ${who} has initiative.`);
}

function getDiceChannel() {
  discordServer = client.guilds.cache.find(guild => guild.name === discordServerName);
  let channel = discordServer.channels.cache.find(channel => (
    channel.name.startsWith("roll") || channel.name.startsWith("dice")));
  if (!channel) {
    channel = getGamedayChannel();
  }
  if (channel) {
    notifyDiceChannel(channel);
  } else {
    console.log("Could not find a channel whose name starts with \"roll\" or \"dice\" or today's date (m-d-y).\nI will watch for one, or you can type \"!dbone\" in the channel you want me to use.");
  }
  return channel;
}

client.once('ready', () => {
  console.log('DragonBone emulator connected to Discord server ' + discordServerName);
  diceChannel = getDiceChannel();
});

// handle discord commands
client.on('message', message => {
  // console.log(message.channel.name + ": " + message.author);
  // console.log(client.user);
  if (message.content.startsWith('Details')) {    // check for crit or fumble
    if (message.content.includes('(20)')) {
        message.channel.send('! ! ! ! CRITICAL!');
    } else if (message.content.includes('(1)')) {
        message.channel.send('- - - FuMbLe! - - -');
    }
  } else if (message.content.startsWith("!i")) {  // !initiative - roll initiative for both sides
    rollInitiative(message.channel);
    message.delete();
  } else if (message.content.startsWith("!db")) {     // !dbone - tell dragonbone to use the current channel to roll dice
      diceChannel = message.channel;
      notifyDiceChannel(diceChannel);
      message.delete();
  } else if (message.content.startsWith("!s")) {  // !scrub - remove die rolls from this channel
      scrubChannel(message.channel);
      message.delete();
  }
});

// if the dice channel gets deleted look for a new one
client.on('channelDelete', channel => {
  if (channel.name == diceChannel.name) {
    console.log("\nChannel " + channel.name + " deleted.")
    diceChannel = getDiceChannel();
  }
});
  
client.on('channelCreate', channel => {
  diceChannel = getDiceChannel();
});

client.login('NzU4NTcyNzgwMjkwOTY1NTUy.X2w59A.3CPzeC8GyuF0KXmetZY9jZ2SrjY');  // login to discord

// create an http server to receive requests from DragonBone
const HTTP_PORT = 8090;
const http = require('http');
const { userInfo, loadavg } = require('os');

const requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hey, D-Bone!');
  let url = req.url.toString();
  if (url.includes("/roll/")) {
    const args = req.url.split('/');
    const result = args[args.length - 1];
    if (diceChannel) {
      console.log("Sending '" + result + "' to " + diceChannel.name);
      diceChannel.send("DragonBone rolled d20: " + result);
    } else {
      console.log("No current dice channel.")
    }
  } else if (url.includes("/map/")) {

  }
}

const server = http.createServer(requestListener);
server.listen(HTTP_PORT);
