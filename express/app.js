require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const express = require("express");
const cors = require("cors");
var bodyParser = require("body-parser");
const _ = require("lodash");

const port = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

function toSlug(str) {
    str = str.replace(/^\s+|\s+$/g, ""); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to = "aaaaeeeeiiiioooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }

    str = str
        .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
        .replace(/\s+/g, "-") // collapse whitespace and replace by -
        .replace(/-+/g, "-"); // collapse dashes

    return str;
}

function dimensionsToInches(str) {
    let feet = 0;
    let inch = 0;
    let match;
    const feetRegex = /(\d+)'/;
    const inchRegex = /(\d+)"/;

    if ((match = str.match(feetRegex))) {
        feet = parseInt(match[1]);
        str = str.replace(new RegExp(`^${match[0]}`), "");
    }

    if ((match = str.match(inchRegex))) {
        inch = parseInt(match[1]);
    }

    if (feet || inch) {
        return feet * 12 + inch;
    }

    return parseInt(str.replace(/[^\d]+/g, ""));
}

app.post("/api/pallet", (req, res) => {
    const { palletId } = req.body;

    axios
        .get(
            `https://www.liquidation.com/auction/container?id=${palletId}&_cmd=view&_table=pallet`
        )
        .then((doc) => {
            const $ = cheerio.load(doc.data);
            const table = $("table.data");
            const header = table.find("tr.header");
            const tableRows = table.find("tr:not(.header)");

            const labels = [];
            const keys = [];
            const keysMap = {};

            header.find("td").each((i, el) => {
                labels.push($(el).text());
                keys.push(toSlug($(el).text()));
                keysMap[toSlug($(el).text())] = i;
            });

            const rows = [];

            tableRows.each((i, el) => {
                const row = {};
                $(el)
                    .find("td")
                    .each((i, el) => {
                        row[keys[i]] = dimensionsToInches($(el).text());
                    })
                    .get();
                rows.push(row);
            });

            res.json({
                labels,
                keys,
                rows,
            });
        })
        .catch((err) => console.error(err));
});

//Listen to server
app.listen(port, () => {
    console.log(`Server Established and  running on Port ⚡${port}`);
});
