"use strict";
$(()=>
{
	let socket = io();
	let using = "default";
	let skin = null;

	let fetchSkin = (skinName, cb) =>
	{
		skinName = skinName.toLowerCase();

		fetch(`./skins/${skinName}`)
		.then(res =>
		{
			if (!res.ok)
				throw `Cannot find ${skinName} skin`;

			res.json().then(data =>
			{
				cb({
					"name": skinName,
					"skin": data
				});
			}).catch(e =>
			{
				if (skinName === "default")
				{
					//fatal error
					console.error("Could not find a skin to fall back on");
				}
				else
				{
					localStorage.removeItem("skin");
					fetchSkin("default", cb);
				}
			});
		})
		 .catch(e =>
		{
			if (skinName === "default")
			{
				//fatal error
				console.error("Could not find a skin to fall back on");
			}
			else
			{
				localStorage.removeItem("skin");
				fetchSkin("default", cb);
			}
		});
	};

	let qs = decodeQuerystring();
	if (qs.skin !== undefined)
		localStorage.setItem("skin", qs.skin);
	else if (localStorage.getItem("skin") === null)
		localStorage.setItem("skin", "default");

	fetchSkin(localStorage.getItem("skin"), data =>
	{
		using = data.name;
		skin = data.skin;
		loadPage();
	});


    socket.on("assignTeam", team =>
    {
        $$("#myTeam").innerHTML = `You are on the ${skin.teams[team].name} side.`;
        $$("#gameInfo").classList.add(team.toLowerCase());
        $$("#logTitle").classList.add(team.toLowerCase());
        console.log(team);
    });

    socket.on("promote", piece =>
    {
    	piece = toSkin(piece);
        $$(`#${piece.location}`).style.backgroundImage = `url(./skins/${using}/pieces/${piece.team}${piece.rank})`;
        log.add(`@0*team* promoted *id* to *rank*&`, piece);
    });

    socket.on("promotePrompt", piece =>
	{
		piece = toSkin(piece);
		$$("#promotingId").value = piece.id;
		$$("#promotionPanel").classList.remove("hide");
		$$("#promotionPanel").classList.add(piece.keys.team.toLowerCase());

		for (let btn of [...$$All("#promotionChoices > button")])
		{
			btn.style.backgroundImage = `url(./skins/${using}/pieces/${piece.team}${skinRank(piece.keys.team, btn.name)}`;
			btn.innerHTML = skinRank(piece.keys.team, btn.name);
		}
	});

    socket.on("attemptMove", result =>
    {
        if (result.canMove)
        {
			result.piece = toSkin(result.piece);
			let logPieces = [result.piece];
			if (result.captured !== undefined)
			{
				result.captured = toSkin(result.captured);
				logPieces.push(result.captured);
			}
            log.add(result.logMsg, ...logPieces);

			$$(`#${result.from}`).style.backgroundImage = "none";
            $$(`#${result.to}`).style.backgroundImage = `url(./skins/${using}/pieces/${result.piece.team}${result.piece.rank})`;

            if (result.promotion)
				log.add(`@0*team* is choosing a promotion for *name*&`, result.piece);

            clearSelected();
        }
    });

    socket.on("newGame", info =>
    {
        console.log(`Starting a new game because ${info.cause}`);
		$$("#wait").classList.add("hide");
    });

    socket.on("loadGame", ({pieces, whoseTurn}) =>
    {
        loadBoard(pieces);
        updateTurn(whoseTurn);

    });

    socket.on("waitForPlayers", cause =>
    {
        console.log("Waiting because " + cause);
        clearBoard();
        clearLog();
        $$("#wait").classList.remove("hide");
    });

    socket.on("selectSquare", res =>
	{
		if (res.select)
			clearSelected($$(`#${res.sqr}`)); //Gives selected square an outline
		if (res.flash)
			flash();
		if (res.msg !== "")
			console.log(res.msg);
	});

    socket.on("setSelects", locations =>
	{
		for (let loc of locations)
			$$(`#${loc}`).classList.add("selectable");
	});

    socket.on("updateTurn", turn =>
	{
		updateTurn(turn);
	});

    socket.on("gameOver", winner =>
	{
		$$("#winnerTeam").innerHTML = skin.teams[winner].name;
		$$("#gameOver").classList.add(winner.toLowerCase());
		$$("#gameOver").classList.remove("hide");
	});

	let skinRank = (team, rank) =>
	{
		let sRank = skin.teams[team].ranks[rank];
		if (sRank === undefined)
			sRank = skin.ranks[rank];
		console.log(skin, team, rank);
		return sRank;
	};
    let toSkin = piece =>
	{
		piece.keys =
		{
			"team": piece.team,
			"rank": piece.rank
		};
		piece.rank = skinRank(piece.team, piece.rank);
		piece.team = skin.teams[piece.team].name;
		piece.name = `${piece.team}'s ${(piece.promoted?"promoted ":"")}${piece.rank}`;

		return piece;
	};

	let loadPage = () =>
	{
		$$("style").innerHTML = `		
		#gameInfo.white p
		{
			color: ${skin.teams.white.colour};
			background-color: ${skin.teams.white.bgcolour};
		}
		#gameInfo.black p
		{
			color: ${skin.teams.black.colour};
			background-color: ${skin.teams.black.bgcolour};
		}
		
		#whoseTurn.white
		{
			color: ${skin.teams.white.colour} !important;
			background-color: ${skin.teams.white.bgcolour} !important;
		}
		#whoseTurn.black
		{
			color: ${skin.teams.black.colour} !important;
			background-color: ${skin.teams.black.bgcolour} !important;
		}
		
		main
		{
			border-color: ${skin.teams.white.bgcolour};
		}
		#chessDiv div.white
		{
			color: ${skin.teams.black.bgcolour};
			text-shadow:
				1px 1px 0 ${skin.teams.black.colour},
				1px -1px 0 ${skin.teams.black.colour},
				-1px 1px 0 ${skin.teams.black.colour},
				-1px -1px 0 ${skin.teams.black.colour};
			background-color: ${skin.teams.white.bgcolour};
		}
		#chessDiv div.black
		{
			color: ${skin.teams.white.bgcolour};
			text-shadow:
				1px 1px 0 ${skin.teams.white.colour},
				1px -1px 0 ${skin.teams.white.colour},
				-1px 1px 0 ${skin.teams.white.colour},
				-1px -1px 0 ${skin.teams.white.colour};
			background-color: ${skin.teams.black.bgcolour};
		}
		
		#promotionPanel.white
		{
			color: ${skin.teams.white.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.white.bgcolour},
				1px -1px 0 ${skin.teams.white.bgcolour},
				-1px 1px 0 ${skin.teams.white.bgcolour},
				-1px -1px 0 ${skin.teams.white.bgcolour};
		}
		#promotionPanel.black
		{
			color: ${skin.teams.black.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.black.bgcolour},
				1px -1px 0 ${skin.teams.black.bgcolour},
				-1px 1px 0 ${skin.teams.black.bgcolour},
				-1px -1px 0 ${skin.teams.black.bgcolour};
		}

		#promotionPanel.white button
		{
			color: ${skin.teams.white.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.white.bgcolour},
				1px -1px 0 ${skin.teams.white.bgcolour},
				-1px 1px 0 ${skin.teams.white.bgcolour},
				-1px -1px 0 ${skin.teams.white.bgcolour};
			background-color: ${skin.teams.black.bgcolour};
		}
		#promotionPanel.black button
		{
			color: ${skin.teams.black.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.black.bgcolour},
				1px -1px 0 ${skin.teams.black.bgcolour},
				-1px 1px 0 ${skin.teams.black.bgcolour},
				-1px -1px 0 ${skin.teams.black.bgcolour};
			background-color: ${skin.teams.white.bgcolour};
		}
		#log span.white
		{
			color: ${skin.teams.white.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.white.bgcolour},
				1px -1px 0 ${skin.teams.white.bgcolour},
				-1px 1px 0 ${skin.teams.white.bgcolour},
				-1px -1px 0 ${skin.teams.white.bgcolour};
		}
		#log span.black
		{
			color: ${skin.teams.black.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.black.bgcolour},
				1px -1px 0 ${skin.teams.black.bgcolour},
				-1px 1px 0 ${skin.teams.black.bgcolour},
				-1px -1px 0 ${skin.teams.black.bgcolour};
		}
		
		#gameOver.white
		{
			color: ${skin.teams.white.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.white.bgcolour},
				1px -1px 0 ${skin.teams.white.bgcolour},
				-1px 1px 0 ${skin.teams.white.bgcolour},
				-1px -1px 0 ${skin.teams.white.bgcolour};
		}
		#gameOver.black
		{
			color: ${skin.teams.black.colour};
			text-shadow:
				1px 1px 0 ${skin.teams.black.bgcolour},
				1px -1px 0 ${skin.teams.black.bgcolour},
				-1px 1px 0 ${skin.teams.black.bgcolour},
				-1px -1px 0 ${skin.teams.black.bgcolour};
		}`;

		for (let y = 1; y <= 8; y++)
		{
			for (let x = 1; x <= 8; x++)
			{
				let navigation_div = document.createElement("div");
				navigation_div.id = `c${x}r${y}`;

				navigation_div.classList.add(((x+y)%2===0)?"black":"white");
				//navigation_div.style.backgroundColor = `rgb(${x*20}, ${y*20}, ${(x+y)*10})`;

				$$("#chessDiv").appendChild(navigation_div); //Creates navigation divs
			}
		}

		$$("#using").innerHTML = `Using ${skin.title}`;
		if (using !== "default")
			$$("#using").classList.remove("hide");

		$$("#chessDiv").addEventListener("click", navigate_func, true);
		$$("#promotionChoices").addEventListener("click", e =>
		{
			if (e.target.tagName === "BUTTON")
			{
				socket.emit("promote",
					{
						"id": $$("#promotingId").value,
						"newRank": e.target.name
					});
				$$("#promotingId").value = "";
				$$("#promotionChoices").className = "";
				$$("#promotionPanel").classList.add("hide");
			}
		});
		$$("body").addEventListener("keydown", switchPiece);

		socket.emit("ready");
	};

	let loadBoard = (pieces, clear = true) =>
	{
		if (clear)
			clearBoard();
		refreshSelectable();
		for (let piece of pieces)
		{
			piece = toSkin(piece);
			if (!piece.taken)
				$$(`#${piece.location}`).style.backgroundImage =
					`url(./skins/${using}/pieces/${piece.team}${piece.rank})`;
		}
	};

	//TODO change name to reflect ability to also select a new sqr
	let clearSelected = selectNew => //Clears and updates the board and pieces
	{
		for (let place of $$All(".selected")) //Removes outlines on divs
			place.classList.remove("selected");
		if (selectNew !== undefined)
			selectNew.classList.add("selected");
	};

	let clearSelectable = () =>
	{
		for (let sqr of $$All(".selectable"))
			sqr.classList.remove("selectable");
	};

	let clearBoard = () =>
	{
		for (let square of $$All("#chessDiv > div"))
			square.style.backgroundImage = "none";
		clearSelected();
		clearSelectable();
	};

	let clearLog = () =>
	{
		$$("#logEvents").innerHTML = "";
	};

	let refreshSelectable = () =>
	{
		clearSelectable();
		socket.emit("getSelects");
	};

	//TODO change log... Don't use const, it's just weird.
	const log =
	{
		decode: (msg, ...pieces) =>
		{
			let startChar = '@';
			let endChar = '&';
			let attrChar = '*';
			let escChar = '^';

			let fullStr = "";
			let pieceNum = undefined;
			for (let i = 0; i < msg.length; i++)
			{
				if (msg.charAt(i) === escChar)
				{
					i++;
					fullStr += msg.charAt(i);
				}
				else
				{
					if (msg.charAt(i) === startChar)
					{
						pieceNum = parseInt(msg.substr(i + 1, 1));
						i++; //skip the number
						fullStr += `<span class="${pieces[pieceNum].keys.team.toLowerCase()}">`;
					}
					else if (msg.charAt(i) === endChar)
					{
						fullStr += `</span>`;
						pieceNum = undefined;
					}
					else if (msg.charAt(i) === attrChar)
					{
						let attr = msg.substring(i, msg.indexOf(attrChar, i + 1))
									   .split(attrChar).join("");
						fullStr += pieces[pieceNum][attr];
						i += attr.length + 1; //add 1 to make up for the 2 removed attrChars
					}
					else
					{
						fullStr += msg.charAt(i);
					}
				}
			}
			return fullStr;

		},
		add: (output, ...pieces) =>
		{
			$$("#logEvents").innerHTML += `<span>${log.decode(output, ...pieces)}</span><hr/>`;
		}
	};

	/*Gameplay*/
	let updateTurn = turn =>
	{
		switch (turn)
		{
			case "black":
				$$("#whoseTurn").classList.remove("white");
				$$("#whoseTurn").classList.add("black");
				break;
			case "white":
				$$("#whoseTurn").classList.remove("black");
				$$("#whoseTurn").classList.add("white");
				break;
			default:
				throw `Expected "black" or "white", but got "${turn}"`;
		}
		$$("#whoseTurn").innerHTML = `${skin.teams[turn].name}'s Turn`;
		clearSelected();
		refreshSelectable();
	};

	let navigate_func = e =>
	{
		if (e.target.id !== "chessDiv")
		{
			if ($$(".selected") === null) //If there is no piece selected already, it'll search for one in the clicked spot
			{
				socket.emit("checkSquare", e.target.id);
			}
			else
			{
				if (e.target.classList.contains("selected")) //Unselect square if clicked
					clearSelected();
				else if (e.target.classList.contains("selectable")) //Select square with other piece
					socket.emit("checkSquare", e.target.id);
				else //Otherwise attempt to move
					socket.emit("attemptMove", {
						"from": $$(".selected").id,
						"to": e.target.id
					});
			}
		}
		//TODO: implement win
		/*
		if (chess.winner())
		{
			log.add("<span style=\"font-size:50px; color:"+chess.pieces[king].getTeam()+";\"> "+
			(chess.pieces[king].getTeam() === "White") ? "Black" : "White" +
				" Wins! </span>");
		}*/
	};
});