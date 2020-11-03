var fs = require("fs");
var request = require('sync-request');
var archiver = require('archiver');


var input = isURL(process.argv[2]) ? JSON.parse(request('GET',process.argv[2]).body) : JSON.parse(fs.readFileSync(process.argv[2]));

input.data != undefined ? input=input.data : input=input;


 function isURL(str) {
     var urlRegex = '^(?!mailto:)(?:(?:http|https|ftp)://)(?:\\S+(?::\\S*)?@)?(?:(?:(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[0-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]+-?)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})))|localhost)(?::\\d{2,5})?(?:(/|\\?|#)[^\\s]*)?$';
     var url = new RegExp(urlRegex, 'i');
     return str.length < 2083 && url.test(str);
}

function string_to_slug(str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to = "aaaaeeeeiiiioooouuuunc------";
    for (var i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

function fixString(str) {
    return str
        .split("\n")
        .map(x => x.trim())
        .join("\n")
        .replace(/\n/g, "\n\t\t")
        .replace(/\{(.?)\}/g, "<sym-auto>$1</sym-auto>")

    

}

var _set = "";
_set += `mse_version: 2.0.2
game: magic
game_version: 2020-04-25
stylesheet: m15-altered
stylesheet_version: 2020-09-04
set_info:
	symbol: 
	masterpiece_symbol: 
styling:
	magic-m15-altered:
		text_box_mana_symbols: magic-mana-small.mse-symbol-font
		level_mana_symbols: magic-mana-large.mse-symbol-font
		overlay: 
	magic-m15-mainframe-dfc:
		text_box_mana_symbols: magic-mana-small.mse-symbol-font
		level_mana_symbols: magic-mana-large.mse-symbol-font
		overlay: 
	magic-old:
		text_box_mana_symbols: magic-mana-small.mse-symbol-font
		overlay: `;

const archive = archiver('zip', {
    zlib: { level: 0 } // Sets the compression level.
});
const output = fs.createWriteStream(__dirname + '/output.mse-set');

output.on('close', function () {
    console.log(archive.pointer() + ' total bytes');
    console.log('archiver has been finalized and the output file descriptor has closed.');
});

// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
output.on('end', function () {
    console.log('Data has been drained');
});

// good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', function (err) {
    if (err.code === 'ENOENT') {
        // log warning
    } else {
        // throw error
        throw err;
    }
});

// good practice to catch this error explicitly
archive.on('error', function (err) {
    throw err;
});

// pipe archive data to the file
archive.pipe(output);

input.forEach(card => {
    _set += `
card:${card.frame == 1997 ? `
	stylesheet: old
	stylesheet_version: 2015-06-23` : ""}
	has_styling: false
	time_created: 2020-10-05 14:14:37
	time_modified: 2020-10-05 15:11:36
	name: ${card.name}
	casting_cost: ${card.mana_cost.replace(/\{/g, "").replace(/\}/g, "")}
	image: ${string_to_slug(card.name)}
	super_type: <word-list-type>${card.type_line.toLowerCase().includes("summon") ? "Creature" : card.type_line.split(" — ")[0]}</word-list-type>
	sub_type: ${card.type_line.split(" — ")[1] != undefined ? card.type_line.split(" — ")[1] : card.type_line.split(" — ")[0].toLowerCase().includes("summon") ? card.type_line.split(" ").slice(1).join(" ") : ""}
	rarity: ${card.rarity != undefined ? card.rarity : ""}
	rule_text:
		${fixString(card.oracle_text)}
	flavor_text: ${card.flavor_text != undefined ? `<i-flavor>“${card.flavor_text}</i-flavor>` : ""}${(card.type_line.toLowerCase().includes("creature") || card.type_line.toLowerCase().includes("summon")) ? `
	power: ${card.power}
	toughness: ${card.toughness}` : ""}
	illustrator: ${card.artist != undefined ? card.artist : ""}`;


    archive.append(request('GET', card.image_uris.art_crop).body, { name: string_to_slug(card.name) })

    const file2 = fs.writeFileSync(__dirname + "/set", _set);

});
archive.append(_set, { name: 'set' });
archive.finalize();


