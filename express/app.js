import "dotenv/config";
import axios from "axios";
import cheerio from "cheerio";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

var port = process.env.PORT || 4000;

var app = express();

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
    var feetRegex = /(\d+)'/;
    var inchRegex = /(\d+)"/;

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

app.post("/api/pallet", function (req, res) {
    var { palletId } = req.body;

    axios
        .get(
            `https://www.liquidation.com/auction/container?id=${palletId}&_cmd=view&_table=pallet`
        )
        .then(function (doc) {
            var $ = cheerio.load(doc.data);
            var table = $("table.data");
            var header = table.find("tr.header");
            var tableRows = table.find("tr:not(.header)");

            var labels = [];
            var keys = [];
            var keysMap = {};

            header.find("td").each(function (i, el) {
                labels.push($(el).text());
                keys.push(toSlug($(el).text()));
                keysMap[toSlug($(el).text())] = i;
            });

            var rows = [];

            tableRows.each(function (i, el) {
                var row = {};
                $(el)
                    .find("td")
                    .each(function (i, el) {
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
        .catch(function (err) {
            console.error(err);
        });
});

app.use(express.static(path.join(__dirname, "../", "dist")));

//Listen to server
app.listen(port, function () {
    console.log(`Server Established and  running on Port ⚡${port}`);
});
