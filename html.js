import cheerio from "cheerio";
import got from "got";
import fs from "fs";
import { google } from "googleapis";


function scrape($, chro, selector) {
    let out = $(chro).find(selector).text();
    out = out.replace(/\u00a0/g, " ").trim();
    return out;
}

async function html() {
    let url = "https://baseballmonster.com/lineups.aspx";
    let response = await got(url);
    let $ = cheerio.load(response.body);
    var data = {};
    data["games"] = [];
    $("div.lineup-holder").each(function () {

        let game = {};

        let awayTeam = {};
        let homeTeam = {};

        let time = scrape($, this, 'table > tbody > tr > td:nth-child(1) > div:nth-child(2)');
        if (time.indexOf(' ') > 0) {
            time = time.substring(0, time.indexOf(' '));
        }
        game["startTime"] = time;

        let temp = $(this).find('table > tbody > tr > td:nth-child(2) > div:nth-child(2) > div > div.float-left > span').text();
        game["temperature"] = temp;

        let wind = $(this).find('table > tbody > tr > td:nth-child(2) > div:nth-child(2) > div > div.float-left > img').attr('alt');
        let windDir = "";
        let windSpeed = "";
        if (wind != undefined && wind.includes("at")) {
            windDir = wind.match(/(?<=(Winds )).*(?=( at))/)[0];
            windSpeed = wind.match(/(?<=(at )).*/)[0];
        }
        game["windDirection"] = windDir;
        game["windSpeed"] = windSpeed;

        let precip = $(this).find('table > tbody > tr > td:nth-child(2) > div:nth-child(2) > div > div.rain-array-percent').text();
        if (precip == '') { precip = "0%"; }
        game["rainChance"] = precip;

        let rainArray = [];
        $(this).find('table > tbody > tr > td:nth-child(2) > div:nth-child(2) > div > div.rain-array > span').each(function () {
            let probHex = $(this).attr('style')
            probHex = probHex.substring(probHex.length - 3, probHex.length - 1);
            let prob = parseInt(probHex, 16);
            prob = (1 - (prob / 255.0)).toFixed(2);
            rainArray.push(prob);
        });
        game["rainDistribution"] = rainArray;


        let Ateam = scrape($, this, 'table > tbody > tr > td:nth-child(1) > div:nth-child(1)');
        if (Ateam.indexOf(' ') > 0) {
            Ateam = Ateam.substring(0, Ateam.indexOf(' '));
        }
        awayTeam["teamAbbr"] = Ateam;

        let Aruns = scrape($, this, 'table > tbody > tr > td:nth-child(1) > div:nth-child(1) > span');
        if (Aruns.indexOf(' ') > 0) {
            Aruns = Aruns.substring(0, Aruns.indexOf(' '));
        }
        awayTeam["runTotal"] = Aruns;

        let Aodds = scrape($, this, 'table > tbody > tr > td:nth-child(1) > div:nth-child(3)');
        Aodds = Aodds.match(/(?<=\)).+/g);
        if (Aodds != null) {
            Aodds = Aodds[0].trim().slice(1, -1);
        }
        else {
            Aodds = "";
        }
        awayTeam["odds"] = Aodds;

        let Astatus = $(this).find('table > tbody > tr > td:nth-child(1) > div:nth-child(5)').text();
        if (Astatus.includes("VERIFIED")) {
            awayTeam["lineupStatus"] = "Y";
        }
        else {
            awayTeam["lineupStatus"] = "N";
        }

        awayTeam["lineup"] = [];

        $(this).find("table > tbody > tr > td:nth-child(1) > table > thead:nth-child(2) > tr").each(function () {
            let order = $(this).find("td:nth-child(1)").text();
            let name = $(this).find("td.text-nowrap").text().replace(/\u00a0/g, " ").trim().replace(/\s\w+$/, '');
            let hand = "";
            if (name != "") {
                hand = $(this).find("td.text-nowrap").text().replace(/\u00a0/g, " ").trim().match(/\s\w+$/)[0].trim();

                let pos = $(this).find("td.text-center > span").text();

                var player = {
                    order: order,
                    name: name,
                    handedness: hand,
                    position: pos
                };

                awayTeam["lineup"].push(player);
            }
        });

        let AP = $(this).find('table > tbody > tr > td:nth-child(1) > table > thead:nth-child(2) > tr:nth-child(10) > td:nth-child(2)');
        let APname = AP.text().replace(/\u00a0/g, " ").trim().replace(/\s\w+$/, '');
        let APhand = AP.text().replace(/\u00a0/g, " ").trim().match(/\s\w+$/)[0].trim();
        let APpos = $(this).find('table > tbody > tr > td:nth-child(1) > table > thead:nth-child(2) > tr:nth-child(10) > td.text-center').text();

        var Apitcher = {
            order: 'P',
            name: APname,
            handedness: APhand,
            position: APpos
        };
        awayTeam["lineup"].push(Apitcher);

        let Hteam = scrape($, this, 'table > tbody > tr > td:nth-child(2) > div:nth-child(1)');
        if (Hteam.indexOf(' ') > 0) {
            Hteam = Hteam.split(' ')[1];
        }
        homeTeam["teamAbbr"] = Hteam;

        let Hruns = scrape($, this, 'table > tbody > tr > td:nth-child(2) > div:nth-child(1) > span');
        if (Hruns.indexOf(' ') > 0) {
            Hruns = Hruns.substring(0, Hruns.indexOf(' '));
        }
        homeTeam["runTotal"] = Hruns;

        let Hodds = scrape($, this, 'table > tbody > tr > td:nth-child(2) > div:nth-child(3)');
        Hodds = Hodds.match(/(?<=\)).+/g);
        if (Hodds != null) {
            Hodds = Hodds[0].trim().slice(1, -1);
        }
        else {
            Hodds = "";
        }
        homeTeam["odds"] = Hodds;

        let Hstatus = $(this).find('table > tbody > tr > td:nth-child(2) > div:nth-child(5)').text();
        if (Hstatus.includes("VERIFIED")) {
            homeTeam["lineupStatus"] = "Y";
        }
        else {
            homeTeam["lineupStatus"] = "N";
        }

        homeTeam["lineup"] = [];

        $(this).find("table > tbody > tr > td:nth-child(2) > table > thead:nth-child(2) > tr").each(function () {
            let order = $(this).find("td:nth-child(1)").text();
            let name = $(this).find("td.text-nowrap").text().replace(/\u00a0/g, " ").trim().replace(/\s\w+$/, '');
            let hand = "";
            if (name != "") {
                hand = $(this).find("td.text-nowrap").text().replace(/\u00a0/g, " ").trim().match(/\s\w+$/)[0].trim();

                let pos = $(this).find("td.text-center > span").text();

                var player = {
                    order: order,
                    name: name,
                    handedness: hand,
                    position: pos
                };

                homeTeam["lineup"].push(player);
            }
        });

        let HP = $(this).find('table > tbody > tr > td:nth-child(2) > table > thead:nth-child(2) > tr:nth-child(10) > td:nth-child(2)');
        let HPname = HP.text().replace(/\u00a0/g, " ").trim().replace(/\s\w+$/, '');
        let HPhand = HP.text().replace(/\u00a0/g, " ").trim().match(/\s\w+$/)[0].trim();
        let HPpos = $(this).find('table > tbody > tr > td:nth-child(2) > table > thead:nth-child(2) > tr:nth-child(10) > td.text-center').text();

        var Hpitcher = {
            order: 'P',
            name: HPname,
            handedness: HPhand,
            position: HPpos
        };
        homeTeam["lineup"].push(Hpitcher);



        game["awayTeam"] = awayTeam;
        game["homeTeam"] = homeTeam;

        data["games"].push(game);
    }
    );

    fs.writeFileSync("results.json", JSON.stringify(data));
    return data;
}

async function access() {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: "v4", auth: client });
    const spreadsheetId = "1djQsHfr4zgBfLBI-YmIb9-wA47DfzVfwOA6-otHcscg";


    await googleSheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Batter Import!A2:Z"
    });
    await googleSheets.spreadsheets.values.clear({
        spreadsheetId,
        range: "Game Import!A2:Z"
    });

    let JSONdata = html();
    let games = (await JSONdata).games;

    let indexB = 2;
    let indexG = 2;

    games.forEach(async function (game) {

        googleSheets.spreadsheets.values.append({
            spreadsheetId,
            range: `Batter Import!A${indexB}:I${indexB + 19}`,
            valueInputOption: "USER_ENTERED",
            resource: {
                values: [
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[0].order, game.awayTeam.lineup[0].name, game.awayTeam.lineup[0].handedness, game.awayTeam.lineup[0].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[1].order, game.awayTeam.lineup[1].name, game.awayTeam.lineup[1].handedness, game.awayTeam.lineup[1].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[2].order, game.awayTeam.lineup[2].name, game.awayTeam.lineup[2].handedness, game.awayTeam.lineup[2].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[3].order, game.awayTeam.lineup[3].name, game.awayTeam.lineup[3].handedness, game.awayTeam.lineup[3].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[4].order, game.awayTeam.lineup[4].name, game.awayTeam.lineup[4].handedness, game.awayTeam.lineup[4].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[5].order, game.awayTeam.lineup[5].name, game.awayTeam.lineup[5].handedness, game.awayTeam.lineup[5].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[6].order, game.awayTeam.lineup[6].name, game.awayTeam.lineup[6].handedness, game.awayTeam.lineup[6].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[7].order, game.awayTeam.lineup[7].name, game.awayTeam.lineup[7].handedness, game.awayTeam.lineup[7].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[8].order, game.awayTeam.lineup[8].name, game.awayTeam.lineup[8].handedness, game.awayTeam.lineup[8].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.homeTeam.teamAbbr, game.startTime, game.awayTeam.lineup[9].order, game.awayTeam.lineup[9].name, game.awayTeam.lineup[9].handedness, game.awayTeam.lineup[9].position, game.awayTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[0].order, game.homeTeam.lineup[0].name, game.homeTeam.lineup[0].handedness, game.homeTeam.lineup[0].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[1].order, game.homeTeam.lineup[1].name, game.homeTeam.lineup[1].handedness, game.homeTeam.lineup[1].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[2].order, game.homeTeam.lineup[2].name, game.homeTeam.lineup[2].handedness, game.homeTeam.lineup[2].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[3].order, game.homeTeam.lineup[3].name, game.homeTeam.lineup[3].handedness, game.homeTeam.lineup[3].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[4].order, game.homeTeam.lineup[4].name, game.homeTeam.lineup[4].handedness, game.homeTeam.lineup[4].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[5].order, game.homeTeam.lineup[5].name, game.homeTeam.lineup[5].handedness, game.homeTeam.lineup[5].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[6].order, game.homeTeam.lineup[6].name, game.homeTeam.lineup[6].handedness, game.homeTeam.lineup[6].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[7].order, game.homeTeam.lineup[7].name, game.homeTeam.lineup[7].handedness, game.homeTeam.lineup[7].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[8].order, game.homeTeam.lineup[8].name, game.homeTeam.lineup[8].handedness, game.homeTeam.lineup[8].position, game.homeTeam.lineupStatus],
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.homeTeam.teamAbbr, game.awayTeam.teamAbbr, game.startTime, game.homeTeam.lineup[9].order, game.homeTeam.lineup[9].name, game.homeTeam.lineup[9].handedness, game.homeTeam.lineup[9].position, game.homeTeam.lineupStatus]
                ],
            },
        });
        googleSheets.spreadsheets.values.append({
            spreadsheetId,
            range: `Game Import!A${indexG}:Z${indexG}`,
            valueInputOption: "RAW",
            resource: {
                values: [
                    [`${game.awayTeam.teamAbbr} @ ${game.homeTeam.teamAbbr} (${game.startTime})`, game.awayTeam.teamAbbr, game.awayTeam.odds, game.awayTeam.runTotal, game.homeTeam.teamAbbr, game.homeTeam.odds, game.homeTeam.runTotal, game.startTime, game.temperature, game.windDirection, game.windSpeed, game.rainChance, game.rainDistribution[0], game.rainDistribution[1], game.rainDistribution[2], game.rainDistribution[3], game.rainDistribution[4], game.rainDistribution[5], game.rainDistribution[6], game.rainDistribution[7]]
                ]
            }
        });
        indexB += 20;
        indexG++;
    });
}

html();
access();