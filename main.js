import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest } from './utils.js';
import { startServer, app, PORT } from './server.js';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { capitalize } from './utils.js';

import { ApplicationCommand, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { Canvas, loadImage, createCanvas } from 'canvas';
import { FormData } from 'node-fetch';

let puuid;
let playerId;
let championId;
let latestPatch;
let png;
let summoner = {};
let summonerName;
let summonerTag;
let spell1Img = {};
let spell2Img = {};
let iconImg = {};
let games = {};
let gameData = {};
let championMap = {};
let spellMap = {};
let activeGame = {};
let ddragonData = {};
let ddragonSS = {};


startServer();

const RIOT_API_KEY = process.env.RIOT_API_KEY;

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
    console.log("Received interaction request!");

    const { type, id, token, application_id, data } = req.body;

    if (type === InteractionType.PING) {
        console.log("Responding to PING verification.");
        return res.json({ type: InteractionResponseType.PONG });
    }

    if (type === InteractionType.APPLICATION_COMMAND) {
        console.log(`Command received: ${data.type}`);

        if (data.name === 'test') {
            return res.json({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: { content: `hello ${data[1]} ${getRandomEmoji()}` },
            });
        } 
        else if (data.name === 'active') {
            console.log("Handling 'active' command...");
        
            resetVar();
            summonerName = data.options.find(opt => opt.name === 'summonername')?.value;
            summonerTag = data.options.find(opt => opt.name === 'summonertag')?.value;
        
            await getPuuid(summonerName, summonerTag);
            await getActiveGame();
        
            if (!activeGame.gameId) {
                return res.json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: `Status: Not currently in game.` }
                });
            }
            res.json({
                type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
            });


            //const mainImageBuffer = await resizeImage(png, 800, 600);    // Larger size for main image
            const spell1Buffer = await resizeImage(spell1Img.image, 100, 100);     // Smaller size for spells
            //const spell2Buffer = await resizeImage(spell2Img.image, 100, 100);
    
            //const mainAttachment = new AttachmentBuilder(mainImageBuffer, { name: 'main.png' });
            const spell1Attachment = new AttachmentBuilder(spell1Buffer, { name: 'spell1.png' });
            //const spell2Attachment = new AttachmentBuilder(spell2Buffer, { name: 'spell2.png' });

        
            (async () => {
                try {
                    const opURL = `https://www.op.gg/summoners/na/${summonerName}-${summonerTag}`;
                    
                    const embeds = [
                               new EmbedBuilder()
                                    .setURL(opURL)
                                    .setImage(png)
                                    .setThumbnail(iconImg.image)
                                    .setColor('#0096FF')
                                    .setTitle(`${summonerName}`)
                                    .setDescription(`Status: In Game\nGame Mode: ${activeGame.gameMode == 'CHERRY' ? 'ARENA' : activeGame.gameMode}\nGame Type: ${activeGame.gameQueueConfigId == '420' ? 'Ranked' : activeGame.gameType}`)
                                    .setFooter({ text: "Jinx bot" }),
                                new EmbedBuilder()
                                    .setURL(opURL)
                                    .setImage(spell1Img.image)
                                    .setTitle("Summoner Spell 1")
                                    .setDescription("Spell details"),

                                new EmbedBuilder()
                                    .setURL(opURL)
                                    .setImage(spell2Img.image)
                                    .setTitle("Summoner Spell 2")
                                    .setDescription("Spell details")
                    ];

                    const files = [
                    //    {buffer: mainImageBuffer, name: 'main.png'},
                        {buffer: spell1Buffer, name: 'spell1.png'},
                    //    {buffer: spell2Buffer, name: 'spell2.png'},
                    ]
        

                    
                    const formData = new FormData;

                    
                    //files.forEach((file, index) => {
                    //    formData.append(`files[${index}]`, file.buffer, file.name);
                    //});
                    
                    //formData.append('payload_json', JSON.stringify({ embeds: embeds }));
                    //formData.append('files[0]', spell1Buffer, 'spell1.png');

                    try {
                        const response = await axios.patch(
                            `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`,
                            { embeds } , { headers: { "Content-Type": "application/json" } }
                        );
                    } catch (error) {
                        console.error("Error updating message:", error.response?.data || error.message);
                        const response = await axios.patch(
                            `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`,
                            { 'content': 'error patching'}
                        );
                    }
                } catch (error) {
                    console.error("Error updating message:", error.response?.data || error.message);
                    const response = await axios.patch(
                        `https://discord.com/api/v10/webhooks/${application_id}/${token}/messages/@original`,
                        { 'content': 'error'}
                    );
                }
            })();
        }
        
    }              

    //console.error(`Unknown interaction type: ${type}`);
    //return res.status(400).json({ error: 'Unknown interaction type' });
});

async function resizeImage(imageUrl, maxWidth, maxHeight) {
    const image = await loadImage(imageUrl);
    
    let ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
    let newWidth = image.width * ratio;
    let newHeight = image.height * ratio;

    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0099ff';

    ctx.drawImage(image, 0, 0, newWidth, newHeight);
  
    return canvas.toBuffer('image/png');
}

async function getPuuid(summonerName, tag) {
    summonerName.replace(" ", "%20");
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tag}`;
    const headers = { "X-Riot-Token":RIOT_API_KEY };


    try {
        const response = await axios.get(url, { headers });
        //console.log(response.data);
        puuid = response.data["puuid"];
        console.log(puuid);
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
    }
}

async function getGames() {
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`;
    const headers = { 
        headers: { 
            "X-Riot-Token": RIOT_API_KEY 
        }
    };
    //console.log("Last 20 games", puuid);
    try {
        const response = await axios.get(url, headers);
       // console.log(response.data);
        games = response.data;

    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }

}

async function getSummoner() {
    const url = `https://na1.api.riotgames.com/riot/summoner/v4/summoners/by-puuid/${puuid}`;
    const headers = { 
        headers: { 
            "X-Riot-Token": RIOT_API_KEY 
        }
    };
    try {
        const response = await axios.get(url, headers);
       // console.log(response.data);
        summoner = response.data;

    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }

}

async function getWinOrLoss() {
    console.log("Last Game info: ", games[0]);
    const url = `https://americas.api.riotgames.com/lol/match/v5/matches/${games[0]}`;
    const headers = { 
        headers: { 
            "X-Riot-Token":RIOT_API_KEY 
        }
    };
    try {
        const response = await axios.get(url, headers);
        //console.log(response.data);
        gameData = response.data;
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
    }
    let i;
    for (i = 0; gameData.metadata.participants[i]; i++) {
        if (gameData.metadata.participants[i] == puuid) {
            playerId = i;
            break;
        }
    }
    console.log("Last Game details:");
    console.log("gameMode", gameData.info.gameMode);
    console.log("Summoner", gameData.info.participants[i].riotIdGameName);
    console.log("Champion", gameData.info.participants[i].championName);
    console.log("Role", gameData.info.participants[i].role);
    console.log("win", gameData.info.participants[i].win);
}

async function getActiveGame() {
    console.log("\nChecking Active Game: ");
    const url = `https://na1.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
    const headers = { 
        headers: { 
            "X-Riot-Token":RIOT_API_KEY 
        }
    };
    try {
        const response = await axios.get(url, headers);
        activeGame = response.data;
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
    }
    let i;
    if (!activeGame.gameId)
        console.log(`No game found for ${summonerName}#${summonerTag}..!`);
    else {
        for (i = 0; activeGame.participants[i]; i++) {
        if (activeGame.participants[i].puuid == puuid) {
            playerId = i;
            championId = activeGame.participants[i].championId;
            break;
            }
        }
        await fetchChampionId();
        png = await fetchChampionImg(championMap[championId], activeGame.participants[i].spell1Id, activeGame.participants[i].spell2Id, activeGame.participants[i].profileIconId);
        //console.log("activeGame", activeGame);
        console.log('png: ', png);
        console.log('spell1: ', spell1Img.name);
        console.log('spell2: ', spell2Img.name);
        console.log('profileIcon: ', iconImg.image);
        console.log("In Game");
        console.log(activeGame.gameMode);
        console.log(activeGame.gameType);
        console.log(championMap[championId]);
    }
}

async function fetchChampionId() {
    const url = "https://ddragon.leagueoflegends.com/cdn/15.6.1/data/en_US/champion.json";

    try {
        const response = await axios.get(url);
        ddragonData = response.data;
        championMap = Object.values(ddragonData.data).reduce((map, champ) => {
            map[parseInt(champ.key)] = champ.name;
            return map;
        }, {});
    }
    catch (error) {
        console.error("Error fetching champion Ids");
    }
}

async function fetchChampionImg(championName, spell1, spell2, iconId) {
    const response = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await response.json();
    latestPatch = versions[0];
    spellMap = await fetchSSId()
    //console.log("spellMap", spellMap);
    spell1Img = await getSpellImageAndName(spell1);
    spell2Img = await getSpellImageAndName(spell2);
    iconImg = await getSummonerIcon(iconId);
    //console.log("ss img", spell1Img);
    //console.log("ss img", spell2);
    return `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/champion/${championName}.png`;
}

async function fetchSSId() {
    const url = "https://ddragon.leagueoflegends.com/cdn/15.6.1/data/en_US/summoner.json";

    try {
        const response = await axios.get(url);
        ddragonSS = response.data.data;
        spellMap = Object.values(ddragonSS).reduce((map, spell) => {
            map[parseInt(spell.key)] = spell.id;
            return map;
        }, {});
        //console.log("ss list: ", spellMap);
        return spellMap;
    }
    catch (error) {
        console.error("Error fetching spell Ids");
    }
}

async function getSpellImageAndName(spellId) {

    const spell = spellMap[spellId];

    //console.log("ss image link: ", spell);
    if (spell) {
        return {
            name: spell,
            image: `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/spell/${spell}.png`
        };
    }
    return null;
}

async function getSummonerIcon(iconId) {

    console.log("icon image link: ", iconId);
    if (iconId) {
        return {
            name: iconId,
            image: `https://ddragon.leagueoflegends.com/cdn/${latestPatch}/img/profileicon/${iconId}.png`
        };
    }
    else
        console.log("Profile icon not found");
    return null;
}

function resetVar() {
    puuid;
    games = {};
    gameData = {};
    playerId;
    championId;
    summonerName;
    summonerTag;
    championMap = {};
    activeGame = {};
    spell1Img = {};
}
