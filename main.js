require('dotenv').config();
const axios = require('axios');

const RIOT_API_KEY = process.env.RIOT_API_KEY;

let puuid;
let games = {};
let gameData = {};
let playerId;
let championId;
let championMap;
let activeGame = {};

async function getSummoner(summonerName, tag) {
    summonerName = summonerName.replace(" ", "%20");
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tag}`;
    const headers = { "X-Riot-Token":RIOT_API_KEY };


    try {
        const response = await axios.get(url, { headers });
        console.log(response.data);
        puuid = response.data["puuid"];
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }
    getGames();
}

async function getGames() {
    url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids`;
    const headers = { 
        headers: { 
            "X-Riot-Token": RIOT_API_KEY 
        }
    };
    //console.log("Last 20 games", puuid);
    try {
        const response = await axios.get(url, headers);
        console.log(response.data);
        games = response.data;

    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }
    getWinOrLoss()

}

async function getWinOrLoss() {
    console.log("Last Game info: ", games[0]);
    url = `https://americas.api.riotgames.com/lol/match/v5/matches/${games[0]}`;
    const headers = { 
        headers: { 
            "X-Riot-Token":RIOT_API_KEY 
        }
    };
    try {
        const response = await axios.get(url, headers);
        console.log(response.data);
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
    getActiveGame()
}

async function getActiveGame() {
    console.log("\nChecking Active Game: ");
    url = `https://na1.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
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
        console.log("In Game");
        console.log(activeGame.gameMode);
        console.log(activeGame.gameType);
        console.log(championMap[championId]);
    }

}

async function fetchChampionId() {
    url = "https://ddragon.leagueoflegends.com/cdn/14.5.1/data/en_US/champion.json";

    try {
        const response = await axios.get(url);
        const ddragonData = response.data.data;
        championMap = Object.values(ddragonData).reduce((map, champ) => {
            map[parseInt(champ.key)] = champ.name;
            return map;
        }, {});
    }
    catch (error) {
        console.error("Error fetching champion Ids");
    }
}

//fetchChampionId();
getSummoner("astrasepram", "NA1");