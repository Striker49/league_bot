require('dotenv').config();
const axios = require('axios');

const RIOT_API_KEY = process.env.RIOT_API_KEY;

let puuid;
let games = {};
let winLoss = {};

async function getSummoner(summonerName, tag) {
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${tag}?api_key=${RIOT_API_KEY}`;

    try {
        const response = await axios.get(url);
        console.log(response.data);
        puuid = response.data["puuid"];
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }
    getGames();
}

async function getGames() {
    url = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?&api_key=${RIOT_API_KEY}`;
    console.log("2nd f", puuid);
    try {
        const response = await axios.get(url);
        console.log(response.data);
        games = response.data;
        console.log("games: ", games);

    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }
    getWinOrLoss()

}

async function getWinOrLoss() {
    console.log("games2: ", games[1]);
    url = `https://americas.api.riotgames.com/lol/match/v5/matches/${games[0]}?&api_key=${RIOT_API_KEY}`;
    try {
        const response = await axios.get(url);
        console.log(response.data);
        winLoss = response.data;
    } catch (error) {
        console.error("Error fetching summoner:", error.response.data);
        console.error("RIOT_API_KEY", RIOT_API_KEY);
    }
    console.log("final", winLoss.info.teams[1].win);
}

getSummoner("Amado%20III", "Jimmy");
