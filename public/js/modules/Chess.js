"use strict";
//TODO: Switch to algebraic notation (Coordinates are like e6 instead of c5r6)
//TODO: Perhaps make the coordinates as part of skins. Remain with cXrY natively.
//TODO: pawnMath is weird... find an alternative
let Chess =
{
	"locationAndCoordinate":
	{
		"l2C": loc =>
		{
			return {
				"x": parseInt(loc.slice(1, 2)),
				"y": parseInt(loc.slice(3, 4))
			};
		},
		"c2L": (coordOrX, _y) =>
		{
			let x = coordOrX;
			let y = _y;
			if (coordOrX.x !== undefined && coordOrX.y !== undefined)
			{
				x = coordOrX.x;
				y = coordOrX.y;
			}
			return `c${x}r${y}`;
		},
		"argsToCoords": (locOrX, _y) =>
		{
			let x = locOrX;
			let y = _y;
			if (_y === undefined)
			{
				let coords = Chess.locationAndCoordinate.l2C(locOrX);
				x = coords.x;
				y = coords.y;
			}
			return {x, y};
		},
		"argsToLoc": (locOrX, _y) =>
		{
			let loc = locOrX;
			if (_y !== undefined)
				loc = Chess.locationAndCoordinate.c2L(locOrX, _y);
			return loc;
		}
	},
    "Piece": function (x, y, rank, team, taken = false)
    {
        this.data =
		{
			"id": `${team}${rank}P${(x + y) * 31}`, //No piece in the same game should begin on the same row and column
			"team": team,
			"rank": rank,
			"location": Chess.locationAndCoordinate.c2L(x, y),
			"taken": taken,
			"promoted": false,
			"moves": 0,
			"captures": []
		};

		this.getId = () => this.data.id;
		this.getTeam = () => this.data.team;
		this.getRank = () => this.data.rank;
		this.getLocation = () => this.data.location;
        this.getX = () => Chess.locationAndCoordinate.l2C(this.data.location).x;
		this.getY = () => Chess.locationAndCoordinate.l2C(this.data.location).y;
        this.isTaken = () => this.data.taken;
		this.isPromoted = () => this.data.promoted;
        this.getMoves = () => this.data.moves;
        this.getCaptures = () => this.data.captures;
        this.getNumberOfCaptures = () => this.data.captures.length;

        this.isTeammateOf = piece => this.getTeam() === piece.getTeam();

        this.moveTo = (locOrX, _y, incrementMoves = true) =>
        {
			this.data.location = Chess.locationAndCoordinate.argsToLoc(locOrX, _y);
			if (incrementMoves)
				this.data.moves++;
        };
		this.promote = newRank =>
		{
			this.data.rank = newRank;
			this.data.promoted = true;
		};
        this.getCaptured = () =>
        {
            this.data.taken = true;
            this.moveTo(-1, -1, false);
        };
		this.capture = piece =>
		{
			piece.getCaptured();
			this.data.captures.push(piece.getId());
		};

		this.toJSON = () => this.data;

        //Allows pawn movements to be contained in a single statement instead of one per team color
        if (rank === "pawn")
            if (team === "white")
                this.pawnMath = {
                    promoteY: 8, //Determines which Y coordinate the pawn must be at to be promoted
                    forward: 1 //Determines whether the pawn's forward movement lowers or heightens the y value
                };
            else if (team === "black")
                this.pawnMath = {
                    promoteY: 1,
                    forward: -1
                };
    },
    "newGame": () => ( new function()
    {
    	this.data =
		{
			"whoseTurn": "white",
			"inTurn": false,
			"active": false,
			"pieces": []
		};

    	this.getTurn = () => this.data.whoseTurn;
    	this.isActive = () => this.data.active;
    	this.getPieces = () => this.data.pieces;

        this.toJSON = () => this.data;

        this.changeTurn = () =>
        {
        	if (this.isActive() && !this.data.inTurn)
				this.data.whoseTurn =
					(this.data.whoseTurn === "white")
						?"black"
						:"white";
        };
        this.addPiece = (x, y, rank, team, taken = false) =>
        {
            this.data.pieces.push(new Chess.Piece(x, y, rank, team, taken));
        };
        this.startMatch = (set_up_option = Chess.SET_UP) =>
        {
            this.data.whoseTurn = "white";
            this.data.active = true;
            this.data.pieces = [];
            for (let team in set_up_option)
            {
                for (let item of set_up_option[team])
                {
                    for (let loc of item.locations)
                    {
                        if ((/^c\[\d-\d]r\d$/).test(loc))
                        {
                            let row = parseInt(loc.slice(7, 8));
                            let colStart = parseInt(loc.slice(2, 3));
                            let colEnd = parseInt(loc.slice(4, 5));
                            if (colStart > colEnd)
                            {
                                let temp = colStart;
                                colStart = colEnd;
                                colEnd = temp;
                            }

                            for (let i = colStart; i <= colEnd; i++)
                                this.addPiece(i, row, item.rank, team);
                        }
                        else if ((/^c\dr\[\d-\d]$/).test(loc))
                        {
                            let col = parseInt(loc.slice(7, 8));
                            let rowStart = parseInt(loc.slice(2, 3));
                            let rowEnd = parseInt(loc.slice(4, 5));
                            if (rowStart > rowEnd)
                            {
                                let temp = rowStart;
                                rowStart = rowEnd;
                                rowEnd = temp;
                            }

                            for (let i = rowStart; i <= rowEnd; i++)
                                this.addPiece(i, col, item.rank, team);
                        }
                        else if ((/^c\((\d,)*\d\)r\d$/).test(loc))
                        {
                            let row = parseInt(loc.slice(-1));
                            let cols = loc.slice(2, loc.indexOf(")")).split(",").map(el => parseInt(el.trim()));

                            for (let i = 0; i < cols.length; i++)
                                this.addPiece(cols[i], row, item.rank, team);
                        }
                        else if ((/^c\dr\((\d,)*\d\)$/).test(loc))
                        {
                            let col = parseInt(loc.slice(1, 2));
                            let rows = loc.slice(4, loc.indexOf(")")).split(",").map(el => parseInt(el.trim()));

                            for (let i = 0; i < rows.length; i++)
                                this.addPiece(rows[i], col, item.rank, team);
                        }
                        else if ((/^c\((\d,)*\d\)r\((\d,)*\d\)$/).test(loc))
                        {
                            let colLoc = loc.slice(0, loc.indexOf("r"));
                            let rowLoc = loc.slice(loc.indexOf("r"));
                            let cols = colLoc.slice(colLoc.indexOf("("), colLoc.indexOf(")")).split(",").map(el => parseInt(el.trim()));
                            let rows = rowLoc.slice(rowLoc.indexOf("("), rowLoc.indexOf(")")).split(",").map(el => parseInt(el.trim()));

                            if (cols.length !== rows.length)
                            {
                                //TODO: Throw an error or something
                            }
                            else
                            {
                                for (let i = 0; i < cols.length; i++)
                                    this.addPiece(cols[i], rows[i], item.rank, team);
                            }
                        }
                        else if ((/^c\dr\d$/).test(loc))
                        {
                            let col = parseInt(loc.slice(1, 2));
                            let row = parseInt(loc.slice(3, 4));
                            this.addPiece(col, row, item.rank, team);
                        }
                    }
                }
            }
        };

        this.getPieceById = id =>
			this.data.pieces.find( piece => piece.getId() === id);
        this.getPieceByLocation = loc =>
			this.data.pieces.find( piece => piece.getLocation() === loc);
		this.getPiecesByRank = rank =>
			this.data.pieces.filter( piece => piece.getRank() === rank);
		this.getPiecesByTeam = team =>
			this.data.pieces.filter( piece => piece.getTeam() === team);

		this.promotePiece = (piece, newRank) =>
		{
			piece.promote(newRank);
			this.data.inTurn = false;
			this.changeTurn();
		};

		this.checkGameOver = () => //Checks if a king is taken
		{
			if (this.getPiecesByRank("king").find( king => king.isTaken())
				!== undefined)
			{
				this.data.active = false;
				return true;
			}
			return false;

		};
        this.getWinner = () => //Returns the king that is not taken
        {
        	if (this.checkGameOver())
				return this.getPiecesByRank("king")
							.find( king => !king.isTaken()).getTeam();
        };

		this.checkMove = (piece, location) =>
		{
			let {x, y} = Chess.locationAndCoordinate.l2C(location);
			let returnObj =
			{
				"piece": piece,
				"canMove": true,
				"from": piece.getLocation(),
				"to": location,
				"resultMsg": "",
				"logMsg": "",
				"captured": undefined,
				"promotion": false,
				"checkmate": false
			};

			if (Chess.restrictions(piece, location)) //Checks if any of the values of moveConditions evaluate to true
			{
				let blockablePieces =
				[
					"pawn",
					"rook",
					"bishop",
					"queen"
				];

				//Check that the path is not blocked
				if (!blockablePieces.includes(piece.getRank()) ||
					!this.pathIsBlocked(piece, location))
				{
					//If the player attempted to move to an already occupied square, this returns the piece occupying it
					const pieceLandedOn = this.getPieceByLocation(location);
					let pX = piece.getX();
					let pY = piece.getY();
					//Checks that the selected square in not already occupied
					if (pieceLandedOn === undefined)
					{
						//Disallows pawns from moving diagonally if there is no enemy present
						if (piece.getRank() === "pawn")
							if (y === pY + piece.pawnMath.forward && x !== pX)
							{
								returnObj.resultMsg = "Invalid move because no enemy was present";
								returnObj.canMove = false;
							}
					}
					else //Possibilities if selected spot is occupied
					{
						if (piece.isTeammateOf(pieceLandedOn))
						{
							returnObj.resultMsg = "Invalid move because teammate is present";
							returnObj.canMove = false;
						}
						else
						{
							if (piece.getRank() === "pawn")
								if (y === pY + piece.pawnMath.forward * 2) //Pawn can't take piece 2 squares ahead on first move
								{
									returnObj.resultMsg = "Invalid move because an enemy was present";
									returnObj.canMove = false;
								}

							if (returnObj.canMove)
							{
								piece.capture(pieceLandedOn);
								returnObj.captured = pieceLandedOn.toJSON();
							}
						}
					}

					//If the pawn reaches the other end of the board, promote it
					if (piece.getRank() === "pawn")
						if (y === piece.pawnMath.promoteY)
							returnObj.promotion = true;
				}
				else
				{
					returnObj.resultMsg = `Invalid move because there is another piece in its path`;
					returnObj.canMove = false;
				}
			}
			else
			{
				returnObj.resultMsg = `Invalid move`;
				returnObj.canMove = false;
			}
			return returnObj;
		};
		this.movePiece = (piece, location) =>
		{
			//TODO: Is resultMsg really necessary? Consider scrapping it.
			if (this.data.active && !this.data.inTurn)
			{
				let returnObj = this.checkMove(piece, location);
				if (returnObj.canMove)
				{
					this.data.inTurn = true;
					if (returnObj.captured !== undefined)
					{
						returnObj.resultMsg = `You have moved ${returnObj.piece.id} and took ${returnObj.captured.id}`;
						returnObj.logMsg = `@0*name* moved to ${location} and took& @1*name*&`;
					}
					else
					{
						returnObj.resultMsg = "You have moved " + returnObj.piece.id;
						returnObj.logMsg = `@0*name* moved to ${location}&`;
					}
					piece.moveTo(location);
					if (!returnObj.promotion) //Don't allow game to progress until promotion has been made
						this.data.inTurn = false;

					if (this.checkGameOver())
					{
						returnObj.checkmate = true;
						returnObj.logMsg += `. @0*team* wins!&`;
					}
					this.changeTurn();
				}
				return returnObj;
			}
			return null;
		};

        this.pathIsBlocked = (piece, destination) =>
		{
			let {x, y} = Chess.locationAndCoordinate.l2C(destination);
			let pX = piece.getX();
			let pY = piece.getY();

			const pathCoords = []; //Array of locations passed through when moving a piece
			const coords = []; //Provides list of possible coordinates to slice from (Path making)
			for (let i = 1; i <= 8; i++)
				coords.push(i);

			//Returns the coordinates travelled over (Smallest coord travelled on to the largest)
			//- 1 removes is needed to include the origin because the array is 0 indexed but
			// p? and ? will only ever be 1-8

			let path_x = coords.slice(Math.min(pX, x) - 1, Math.max(pX, x)); //Reminder that slice excludes last argument
			let path_y = coords.slice(Math.min(pY, y) - 1, Math.max(pY, y));

			if (pX > x !== pY > y &&
				(["bishop", "queen"].includes(piece.getRank())))
			{
				//Reverses y values to properly match up with the x values when the path direction isn't the same sign (+, -)
				//Needed because of the use of absolute function for when the movement is diagonal
				path_y.reverse();
			}

			//0 to include, 1 to exclude
			const EXCLUDE_ORIGIN = 1;
			const EXCLUDE_DESTINATION = 1;

			/*
			 * I choose to exclude the origin because if I do not
			 * the function considers the piece to be blocking itself.
			 * I choose to exclude the destination because if there is a piece there,
			 * the checkMove function should handle whether or not that piece will
			 * be captured, depending on whether it is a teammate or an enemy.
			 */

			const LAST_INDEX = Math.max(path_x.length, path_y.length) - EXCLUDE_DESTINATION;
			for (let i = EXCLUDE_ORIGIN; i < LAST_INDEX; i++)
			{
				//Adds path to pathCoords array
				/*
				 * path_?.length-1 is added because in the case that one path is larger
				 * than the other path (e.g. c1r1 to c3r7), the piece will travel in
				 * a diagonal until the last ? coordinate then travel in a straight line
				 * on the other axis.
				 * Example:
				 * Path is c1r1 to c3r7. The piece travels along the following path:
				 * c1r1 (Piece will travel diagonally until said otherwise)
				 * c2r2
				 * c3r3 (Diagonal movement stops)
				 * c3r4
				 * c3r5
				 * c3r6
				 * c3r7
				 */
				pathCoords.push(
					Chess.locationAndCoordinate.c2L(
						path_x[Math.min(i, path_x.length-1)],
						path_y[Math.min(i, path_y.length-1)])
				);
			}
			//Returns true if there is a piece in the path
			return pathCoords.some(
				loc => this.getPieceByLocation(loc) !== undefined);
		};
    }), //newGame
	"restrictions": (piece, destination) => //TODO rename to reflect that it is for movement
	{
		let {x, y} = Chess.locationAndCoordinate.l2C(destination);
		let pX = piece.getX();
		let pY = piece.getY();
		switch (piece.getRank())
		{
			case "pawn": return (
				(y === pY + piece.pawnMath.forward && Math.abs(pX - x) < 2) || //1 diagonal or straight
				(piece.getMoves() === 0 && y === pY + (piece.pawnMath.forward * 2) && x === pX)); //First move can move 2 squares straight
			case "rook": return (y === pY || x === pX);
			case "knight": return (
				Math.abs(y - pY) === 2 && (Math.abs(x - pX) === 1) ||
				Math.abs(y - pY) === 1 && (Math.abs(x - pX) === 2));
			case "bishop": return (Math.abs(x - pX) === Math.abs(y - pY));
			case "queen": return (
				(Math.abs(x - pX) === Math.abs(y - pY) || //Diagonal
					x === pX || y === pY)); //Straight
			case "king": return ( //Just make sure the x and y differences are 1 or 0
				Math.abs(y - pY) <= 1 && Math.abs(x - pX) <= 1 &&
				Math.abs(y - pY) + Math.abs(x - pX) !== 0); //Make sure king actually makes a move
		}
	}, //restrictions
	"SET_UP":
	{
		"white":
		[
			{
				"rank": "pawn",
				"quantity": 8,
				"locations": ["c[1-8]r2"],
			},
			{
				"rank": "rook",
				"quantity": 2,
				"locations": ["c(1,8)r1"]
			},
			{
				"rank": "knight",
				"quantity": 2,
				"locations": ["c(2,7)r1"]
			},
			{
				"rank": "bishop",
				"quantity": 2,
				"locations": ["c(3,6)r1"]
			},
			{
				"rank": "queen",
				"quantity": 1,
				"locations": ["c5r1"]
			},
			{
				"rank": "king",
				"quantity": 1,
				"locations": ["c4r1"]
			}
		],
		"black":
		[
			{
				"rank": "pawn",
				"quantity": 8,
				"locations": ["c[1-8]r7"],
			},
			{
				"rank": "rook",
				"quantity": 2,
				"locations": ["c(1,8)r8"]
			},
			{
				"rank": "knight",
				"quantity": 2,
				"locations": ["c(2,7)r8"]
			},
			{
				"rank": "bishop",
				"quantity": 2,
				"locations": ["c(3,6)r8"]
			},
			{
				"rank": "queen",
				"quantity": 1,
				"locations": ["c4r8"]
			},
			{
				"rank": "king",
				"quantity": 1,
				"locations": ["c5r8"]
			}
		]
	}
};

module.exports = Chess;