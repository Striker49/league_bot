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


let puuid;
let playerId;
let championId;
let latestPatch;
let png;
let spell1Img = {};
let spell2Img = {};
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

    const { type, id, data } = req.body;

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
            const summonerName = data.options.find(opt => opt.name === 'summonername')?.value;
            const summonerTag = data.options.find(opt => opt.name === 'summonertag')?.value;

            await getSummoner(summonerName, summonerTag);
            await getGames();
            await getActiveGame();

            if (!activeGame.gameId)
                return res.json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: { content: `Status: Not currently in game.` }
                });
                return res.json({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        embeds: [
                            {
                                image: { url: png }, // Champion icon
                                title: `${capitalize(summonerName)}`,
                                description: `Status: In Game\nGame Mode: ${activeGame.gameMode}\nGame Type: ${activeGame.gameQueueConfigId == 420 ? 'Ranked' : activeGame.gameType}`,
                                fields: [
                                    {
                                        name: "",
                                        value: `${spell1Img.image}`,
                                        inline: true
                                        
                                    },
                                    {
                                        name: "",
                                        value: `${spell2Img.image}`,
                                        inline: true
                                    }
                                ]
                            },

                        ]
                    }
                });
                
            console.error(`Unknown command: ${data.name}`);
            return res.status(400).json({ error: 'Unknown command' });
        }
    }

    console.error(`Unknown interaction type: ${type}`);
    return res.status(400).json({ error: 'Unknown interaction type' });
});

async function getSummoner(summonerName, tag) {
    summonerName = summonerName.replace(" ", "%20");
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tag}`;
    const headers = { "X-Riot-Token":RIOT_API_KEY };


    try {
        const response = await axios.get(url, { headers });
        //console.log(response.data);
        puuid = response.data["puuid"];
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
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
        console.error("RIOT_API_KEY", RIOT_API_KEY);
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
        console.log("No game found..!");
    else {
        for (i = 0; activeGame.participants[i]; i++) {
        if (activeGame.participants[i].puuid == puuid) {
            playerId = i;
            championId = activeGame.participants[i].championId;
            break;
            }
        }
        await fetchChampionId();
        png = await fetchChampionImg(championMap[championId], activeGame.participants[i].spell1Id, activeGame.participants[i].spell2Id);
        console.log("activeGame", activeGame);
        console.log('png: ', png);
        console.log('spell1: ', spell1Img.name);
        console.log('spell2: ', spell2Img.name);
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

async function fetchChampionImg(championName, spell1, spell2) {
    const response = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await response.json();
    latestPatch = versions[0];
    spellMap = await fetchSSId()
    //console.log("spellMap", spellMap);
    spell1Img = await getSpellImageAndName(spell1);
    spell2Img = await getSpellImageAndName(spell2);
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

function resetVar() {
    puuid;
    games = {};
    gameData = {};
    playerId;
    championId;
    championMap = {};
    activeGame = {};
}
