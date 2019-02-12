"use strict";
const http = require("http");
const url = require("url");
const path = require("path");
const fs = require("fs");
const qs = require("querystring");
const formidable = require("formidable");
const EventEmitter = require("events");
const PORT = 9001;

const EVEM = new EventEmitter();

const DEFAULT_FILE = "index.html";
const ROOTDIR = "./public";
const ERRDIR = "./private/errorpages";
const SKIN_FILE = "./private/skins/skins.json";

const extToMIME = {
	".css": "text/css",
	".html": "text/html",
	".htm": "text/html",
	".js": "application/javascript",
	".json": "application/json",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".pdf": "application/pdf",
	".png": "image/png",
	".svg": "image/svg+xml",
	".ttf": "font/ttf",
	".txt": "text/plain",
	".ico": "image/x-icon",
	".xml": "text/xml"
};

let mimeToExt = mime =>
	Object.keys(extToMIME)
	   .find(ext => extToMIME[ext] === mime);

const statusMsgs = {
	200: "OK",
	400: "Bad Request", //Expecting certain extension
	404: "Not Found",
	406: "Not Acceptable",
	415: "Unsupported Media Type",
	416: "Range not satisfiable", //No matching record found
	500: "Internal Server Error",
	520: "Writing Error",
};

let server = http.createServer((req, res) =>
{
	let statusCode = 200;
	let content = "";
	let contentType = extToMIME[".txt"];

	let urlObj = url.parse(req.url, true);
	let filePath = path.parse(urlObj.pathname);
	let fullDir = path.join(ROOTDIR, filePath.dir);

	let finishResponse = (sCode = statusCode, cType = contentType, cont = content, _res = res) =>
	{
		//Make variables consistent
		statusCode = sCode;
		contentType = cType;
		content = cont;
		sendResponse(_res, sCode, cont, cType);
	};

	let newUrlPath = (...newUrl) =>
	{
		urlObj = url.parse(path.join(...newUrl), true);
		filePath = path.parse(urlObj.pathname);
		fullDir = path.join(filePath.dir);
	};

	let readFile = () =>
	{
		fs.readFile(path.join(fullDir, filePath.base), (err, data) =>
		{
			if (statusCode !== 200)
				finishResponse();
			else if (err)
			{
				if (err.code === "ENOENT")
					if (filePath.base === "favicon.ico")
						res.end(); //End response if favicon.ico does not exist
					else
						statusCode = 404;
				else
				{
					console.log(err.code);
					statusCode = 500;
				}
				finishResponse();
			} //if (err)
			else //if 200 and no err
			{
				contentType = extToMIME[filePath.ext];
				content = data;
				finishResponse();
			} //No err in readFile
		}); //fs.readFile
	};

	if (filePath.ext === '')
		if (filePath.base === "chess")
			newUrlPath(ROOTDIR, `chess.html`);
		else if (urlObj.pathname.substr(1, 7) === "skins")
		{
			let ext = ".json";
			let jsonFileName = `/${filePath.name}`; //Each skin has a corresponding json file of the same name within its directory
			if (filePath.dir.slice(-6) === "pieces") //If dir is pieces
			{
				ext = ".png"; //Only png images are accepted as piece images
				jsonFileName = "";
			}
			newUrlPath("./private", urlObj.pathname + jsonFileName + ext);
		}
		else
			newUrlPath(ROOTDIR, filePath.dir, filePath.base, DEFAULT_FILE);

	if (extToMIME[filePath.ext] !== undefined)
	{
		if (req.method === "POST")
		{
			if (filePath.name === "creatingSkin")
			{
				let form = new formidable.IncomingForm();
				form.parse(req, (err, skinData, files) =>
				{
					fs.readFile(`./private/skins/${skinData.base}/${skinData.base}.json`,
					(err, data) =>
					{
						if (err)
							throw err;

						let baseSkin = JSON.parse(data);
						let newSkin =
						{
							"title": skinData.title,
							"ranks": {},
							"teams": {},
						};

						skinData.title = skinData.title.toLowerCase();

						skinsInProcess.processing.push(skinData.title);
						readFile();

						let teams = baseSkin.teams;
						let ranks = baseSkin.ranks;

						for (let rank in ranks)
							if (skinData[rank] !== "")
								newSkin.ranks[rank] = skinData[rank];

						for (let team in teams)
						{
							newSkin.teams[team] =
							{
								"name": skinData[`${team}_name`],
								"colour": skinData[`${team}_colour`],
								"bgcolour": skinData[`${team}_bgcolour`],
								"ranks": {}
							};

							for (let rank in ranks)
								if (skinData[`${team}_${rank}`] !== "")
									if (newSkin.ranks[rank] === undefined) //If general rank name has not been filled, fill it
										newSkin.ranks[rank] = skinData[`${team}_${rank}`];
									else
										newSkin.teams[team].ranks[rank] = skinData[`${team}_${rank}`];
						}


						EVEM.emit("progress", "Processed meta-data");

						fs.readFile(SKIN_FILE, (err, data) =>
						{
							if (err)
								throw err;

							let skins = JSON.parse(data);
							skins.push(skinData.title);

							let skinPath = `./private/skins/${skinData.title}`;

							fs.mkdir(skinPath, err =>
							{
								if (err)
									throw err;

                                fs.writeFile(`${skinPath}/${skinData.title}.json`, JSON.stringify(newSkin, null, 4),
                                    err =>
                                    {
                                        EVEM.emit("progress", "Saved skin meta-data to database");
                                        fs.writeFile(SKIN_FILE, JSON.stringify(skins, null, 4),
                                            err =>
                                            {
                                                if (err)
                                                    throw err;

                                                EVEM.emit("progress", "Added skin title to database");
                                                let formNameToFileName = formName =>
                                                {
                                                    /*
                                                     * formName format should be team_rank_img
                                                     */
                                                    let formNameArr = formName.split("_");
                                                    let team = formNameArr[0];
                                                    let fileName = newSkin.teams[team].name;

                                                    //remove team letter and trailing "Img" to get rank
                                                    let chessRank = formNameArr[1];

                                                    //Change rank to the name in skin
                                                    let rank = newSkin.teams[team].ranks[chessRank];
                                                    if (rank === undefined)
                                                        rank = newSkin.ranks[chessRank];
                                                    fileName += rank;

                                                    //Add extension
                                                    fileName += mimeToExt(files[formName].type);

                                                    return fileName;
                                                };

                                                let uploadFiles = (flds, newDir, onDone, onEach = (err, fld, next) => {}) =>
                                                {
                                                    if (flds.length > 0)
                                                    {
                                                        let fld = flds.shift();
                                                        let fileName = formNameToFileName(fld);

                                                        let newPath = path.join(newDir, fileName);
                                                        let oldPath = files[fld].path;
                                                        fs.copyFile(oldPath, newPath, err =>
                                                        {
                                                            if (err)
                                                            {
                                                                if (err.code === "ENOENT")
                                                                    fs.mkdir(newDir, {recursive: true}, err =>
                                                                    {
                                                                        if (err)
                                                                            onDone(err);
                                                                        else
                                                                            fs.copyFile(oldPath, newPath, err =>
                                                                            {
                                                                                if (err)
                                                                                    onDone(err);
                                                                                else
                                                                                    fs.unlink(oldPath, err =>
                                                                                    {
                                                                                        if (err)
                                                                                            onDone(err);
                                                                                        else
                                                                                        {
                                                                                            onEach(err, fld, flds[0]);
                                                                                            uploadFiles(flds, newDir, onDone);
                                                                                        }
                                                                                    });
                                                                            });
                                                                    });
                                                                else
                                                                    onDone(err);
                                                            }
                                                            else
                                                                fs.unlink(oldPath, err =>
                                                                {
                                                                    if (err)
                                                                        onDone(err);
                                                                    onEach(err, fld, flds[0]);
                                                                    uploadFiles(flds, newDir, onDone);
                                                                });
                                                        });
                                                    }
                                                    else
                                                        onDone();
                                                };

                                                uploadFiles(Object.keys(files), `${skinPath}/pieces`,
                                                    err =>
                                                    {
                                                        skinsInProcess.processing.splice(skinsInProcess.processing.indexOf(skinData.title), 1);
                                                        if (err)
                                                            console.log(err);
                                                        else
                                                        {
                                                            skinsInProcess.done.push(skinData.title);
                                                            EVEM.emit("progress", "Uploaded all files");
                                                            EVEM.emit("done", skinData.title);
                                                        }
                                                    },
                                                    (err, fld, next) =>
                                                    {
                                                        if (err)
                                                            console.log(err);
                                                        else
                                                            EVEM.emit("progress", `uploaded ${fld}`);
                                                    });
                                            });
                                    });
							});
						});
					});
				});
			} //creatingSkin
			else
				readFile();
		} //POST
		else
			readFile();
	}
	else
		finishResponse(404);
}).listen(PORT);

let sendResponse = (res, sCode, cont, cType) =>
{
	if (sCode !== 200)
	{
		let errorCont = cont;
		fs.readFile(path.join(ERRDIR, `${sCode}.html`), (err, data) =>
		{
			if (err) {
				cType = extToMIME[".txt"];
				cont = `${sCode}: ${statusMsgs[sCode]}`;
			}
			else {
				cType = extToMIME[".html"];
				cont = data;
			}

			res.writeHead(sCode, {
				"Content-Type": cType,
				"Failed-Content": errorCont,
				"Accept-Ranges": "none"
			});
			res.end(cont);
		});
	}
	else
	{
		res.writeHead(sCode, {
			"Content-Type": cType
		});
		res.end(cont);
	}
}; //sendResponse

const io = require("socket.io")(server);
let Chess = require("./public/js/modules/Chess.js");
let game = Chess.newGame();

let players =
{
	"white": [],
	"black": [],
	"Spectator": []
};
let assignTeam = id =>
{
	let team;
    if (players["white"].length === 0)
        team = "white";
    else if (players["black"].length === 0)
        team = "black";
    else
        team = "Spectator";
    players[team].push(id);
    return team;
};

let leaveTeam = id =>
{
	let team = getTeam(id);
	if (team !== undefined)
		players[getTeam(id)].splice(players[getTeam(id)].indexOf(id), 1);
	return team;
};

let getTeam = id =>
{
	for (let team in players)
		for (let player in players[team])
			if (players[team][player] === id)
				return team;
	return undefined;
};

let skinsInProcess =
{
	"processing": [],
	"done": []
};

/*TODO
TODO: Games don't automatically refresh when other player leaves. Fix this
TODO: Make everything in server not global?
 */
io.on("connection", socket => {

	let socketPage = url.parse(socket.conn.request.headers.referer).pathname.substring(1);
	console.log(`New connection from ${socketPage}`);

	if (socketPage === "chess.html")
	{
		socket.on("ready", () =>
		{
			let assignedTeam = assignTeam(socket.id);
			socket.emit("assignTeam", assignedTeam);

			if (assignedTeam !== "Spectator") //If they don't join Spectator, it means they are on black or white
			{
				if (players["white"].length === 0 || players["black"].length === 0)
					socket.emit("waitForPlayers", "Not enough players to start");
				else
				{
					game = Chess.newGame();
					io.emit("newGame", {"players": players, "cause": "Enough players joined"});
					game.startMatch();
					io.emit("loadGame", {
						"pieces": game.getPieces(),
						"whoseTurn": game.getTurn()
					});
				}
			}
			else //Load current game
			{
				socket.emit("loadGame", {
					"pieces": game.getPieces(),
					"whoseTurn": game.getTurn()
				});
			}
		});


		socket.on("checkSquare", sqr =>
		{
			let returnObj = {
				"sqr": sqr,
				"msg": "",
				"flash": false,
				"select": false
			};
			if (game.isActive())
			{
				let piece = game.getPieceByLocation(sqr);
				if (piece === undefined) //throws an error in case the previous failed to be thrown
				{
					returnObj.msg = "No piece here";
				}
				else if (piece.getTeam() !== getTeam(socket.id))
				{
					returnObj.msg = "Those are not your pieces";
				}
				else if (piece.getTeam() !== game.getTurn())
				{
					returnObj.msg = "It is not your turn yet!";
					returnObj.flash = true;
				}
				else
				{
					returnObj.select = true;
				}
			}
			socket.emit("selectSquare", returnObj);
		});

		socket.on("getSelects", () =>
		{
			let team = getTeam(socket.id);
			socket.emit("setSelects", (() =>
			{
				if (game.getTurn() === team)
					return game.getPieces().filter(piece => piece.getTeam() === team && !piece.isTaken()).map(piece => piece.getLocation());
				else
					return [];
			})());
		});

		socket.on("promote", info =>
		{
			let piece = game.getPieceById(info.id);
			game.promotePiece(piece, info.newRank);
			io.emit("promote", piece);
			io.emit("updateTurn", game.getTurn());
		});

		socket.on("attemptMove", info =>
		{
			let piece = game.getPieceByLocation(info.from);
			let result = game.movePiece(piece, info.to);
			try
			{
				io.emit("attemptMove", result);
				if (result.canMove)
					if (result.checkmate)
						io.emit("gameOver", game.getWinner());
					else if (result.promotion)
						socket.emit("promotePrompt", piece);
					else
						io.emit("updateTurn", game.getTurn());
			}
			catch (e)
			{
				console.log(game, piece, result);
				server.close(e);
			}
		});

		socket.on("disconnect", () =>
		{
			if (leaveTeam(socket.id) !== "Spectator")
			{
				game = Chess.newGame();
				if (players["Spectator"].length !== 0)
				{
					assignTeam(players["Spectator"].shift());

					io.emit("newGame", {"players": players, "cause": "Player disconnected"});
					io.emit("assignTeam", players);
					game.startMatch();
				}
				else
				{
					io.emit("waitForPlayers", "Player disconnected with no one to replace them");
				}
			}
			console.log("User disconnected");
		});
	}
	else if (socketPage === "creatingSkin.html")
	{
		//TODO: handle multi-user (Make sure 2 users writing for the same skin title don't overwrite each other)
		socket.on("loaded", createdSkin =>
		{
			if (skinsInProcess.processing.includes(createdSkin))
				EVEM.emit("progress", "Skin creation is in mid process");
			else if (skinsInProcess.done.includes(createdSkin))
				EVEM.emit("done", createdSkin);
			else
				socket.emit("err", "An unexpected error occurred. Your skin was not in the process list.");
		});
		socket.on("done", skin =>
		{
			skinsInProcess.done.splice(skinsInProcess.done.indexOf(skin), 1);
		});
		EVEM.on("progress", msg =>
		{
			socket.emit("progress", msg);
		});
		EVEM.on("done", skin =>
		{
			socket.emit("done", skin);
		});
	}
});