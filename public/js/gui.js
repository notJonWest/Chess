/*Menu*/ //DONT BOTHER WITH THESE UNTIL EVERYTHING ELSE IS DONE. OMG OLD JON, LEARN MVC
function openMenu(ev) //TODO: WTF even is this function
{
	function breakLine() //Adds a line to separate elements
	{
		const breaker = document.createElement("p");
		breaker.innerHTML = "<br><h1><u>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</u></h1>";
		return menu.appendChild(breaker);
	}
	if (ev.key === "m" || ev === "closeBtn")
	{
		try
		{
			document.body.removeChild($$("#mainMenu"));
		}
		catch(err)
		{
			const menu = document.createElement("div");
			menu.id = "mainMenu";
			menu.innerHTML = "<h1><u>&emsp;&emsp;&emsp;&emsp;Menu&emsp;&emsp;&emsp;&emsp;</u></h1>";

			const cancelBtn = document.createElement("input");
			cancelBtn.type = "button";
			cancelBtn.id = "cancelBtn";
			cancelBtn.value = "Cancel Move";
			cancelBtn.onclick = switchPiece; //Contains CancelMove() in it
			cancelBtn.onmousemove = function()
			{
				showTip(event, "Press the spacebar to cancel your move at anytime.");
			};
			cancelBtn.onmouseleave = showTip;
			menu.appendChild(cancelBtn);

			breakLine();

			const restartBtn = document.createElement("input");
			restartBtn.type = "button";
			restartBtn.id = "restartBtn";
			restartBtn.value = "Restart Game";
			restartBtn.onclick = restart;
			restartBtn.onmousemove = function()
			{
				showTip(event, "Press the [R] key to restart the game at anytime.");
			};
			restartBtn.onmouseleave = showTip;
			menu.appendChild(restartBtn);

			breakLine();

			const logBtn = document.createElement("input");
			logBtn.type = "button";
			logBtn.id = "logBtn";
			logBtn.value = "Toggle Game Log";
			logBtn.onclick = log.toggle;
			logBtn.onmousemove = function()
			{
				showTip(event, "Press the [L] key to toggle the game log's visibility.");
			};
			logBtn.onmouseleave = showTip;
			menu.appendChild(logBtn);

			breakLine();

			const coordsBtn = document.createElement("input");
			coordsBtn.type = "button";
			coordsBtn.id = "coordsBtn";
			coordsBtn.value = "Toggle Coordinates";
			coordsBtn.onclick = showCoords;
			coordsBtn.onmousemove = function()
			{
				showTip(event, "Press the [C] key to toggle the coordinates' visibility.");
			};
			coordsBtn.onmouseleave = showTip;
			menu.appendChild(coordsBtn);

			breakLine();

			const closeBtn = document.createElement("input");
			closeBtn.type = "button";
			closeBtn.id = "closeBtn";
			closeBtn.value = "Close Menu";
			closeBtn.onclick = function()
			{
				openMenu("closeBtn");
				showTip("closeBtn");
			};
			closeBtn.onmousemove = function()
			{
				showTip(event, "Press the [M] key to toggle the menu.");
			};
			closeBtn.onmouseleave = showTip;
			menu.appendChild(closeBtn);

			breakLine();

			const exitBtn = document.createElement("input");
			exitBtn.type = "button";
			exitBtn.id = "exitBtn";
			exitBtn.value = "Exit";
			exitBtn.onclick = function()
			{
				if (window.confirm("Are you sure you want to exit?"))
				{
					window.close();
				}
			};
			exitBtn.onmousemove = function()
			{
				showTip(event, "This will close the current tab");
			};
			exitBtn.onmouseleave = showTip;
			menu.appendChild(exitBtn);

			document.body.appendChild(menu);
		}
	}
}
function showTip(event, text) //Make tooltip divs appear on mouseover. Doesn't work on firefox
{
	if (event.type === "mouseleave" || event === "closeBtn")
	{
		document.body.removeChild($$("#tips"));
	}
	else
	{
		try
		{
			$$("#tips").style.top = (event.y+10)+"px";
			$$("#tips").style.left = (event.x+10)+"px";
		}
		catch(e)
		{
			const tipDiv = document.createElement("div");
			tipDiv.innerHTML = text;
			tipDiv.style.top = (event.y+10)+"px";
			tipDiv.style.left = (event.x+10)+"px";
			tipDiv.id = "tips";
			document.body.appendChild(tipDiv);
		}
	}
}

//TODO: Make coordinates nice and visible
function showCoords() //Shows respective coordinates on each square
{
	for (let i = 0, j = $$("#chessDiv").childElementCount; i < j; i += 1)
	{
		if ($$("#chessDiv").children[i].innerHTML === "")
		{
			$$("#chessDiv").children[i].innerHTML = $$("#chessDiv").children[i].id;
		}
		else
		{
			$$("#chessDiv").children[i].innerHTML = "";
		}
	}
}

/*Miscellaneous functions*/
function flash()
{
	let flashing = setInterval( () => $$("#whoseTurn").classList.toggle("hide"), 180);
	setTimeout( () => clearInterval(flashing), 1200);
}
function switchPiece(event) //Cycles through pieces using arrow keys
{
	if (event.keyCode === 32 || event.type === "click") //Spacebar cancels move
	{
		clearSelected();
	}
	else if (event.key === "ArrowRight" || event.key === "ArrowLeft")
	{
		let selectable = [...$$All(".selectable")];
		if ($$(".selected") === null)
		{
			selectable[0].classList.add("selected");
		}
		else
		{
			let selected = $$(".selected");
			let index = selectable.indexOf(selected);

			if (event.key === "ArrowRight") //Moves right
			{
				if (index === selectable.length - 1)
					index = -1;
				selectable[index + 1].classList.add("selected");
			}
			else if (event.key === "ArrowLeft") //Moves left
			{
				if (index === 0)
					index = selectable.length;
				selectable[index - 1].classList.add("selected");
			}
			selected.classList.remove("selected");
		}
	}
}
/*Sources:
 *Images: https://geeksretreat.wordpress.com/2012/06/01/html-5-canvas-chess-board/
 *Diagonal Movement equation: http://math.stackexchange.com/questions/1566115/formula-that-describes-the-movement-of-a-bishop-in-chess/1566144#1566144
*/