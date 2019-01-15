let g;
$(() =>
{
	const FORM = $$("#create");

	let schema =
	{
		"schemas":
		[

		],
		"base": "default",
		"baseData": {},
	};

	let qs = decodeQuerystring();

	let fetchSchemaList = (cb = (err, list) => {}) =>
	{
		fetch(`./schemas`)
		.then(res =>
		{
			if (!res.ok)
				throw `Could not find file: ${res.url}`;

			res.json().then(data =>
			{
				cb(undefined, data);
			}).catch(err =>
			{
				cb(err);
			});
		}).catch(err =>
		{
			cb(err);
		});
	};

	let fetchSchema = (schemaName, cb = (err, data) => {}) =>
	{
		fetch(`./schemas/${schemaName}`)
		.then(res =>
		{
			if (!res.ok)
				throw `Cannot find ${schemaName} schema`;

			res.json().then(data =>
			{
				cb(undefined, data);
			}).catch(err =>
			{
				cb(err);
			});
		})
		 .catch(err =>
		{
			cb(err);
		});
	};

	fetchSchemaList((err, list) =>
	{
		if (err)
			console.log(err);
		else
		{
			schema.schemas = list;
			if (qs.schema !== undefined)
				if (schema.schemas.includes(qs.schema))
					schema.base = qs.schema;

			fetchSchema(schema.base, (err, data) =>
			{
				if (err)
					console.log(err);
				else
				{
					schema.baseData = data;
					loadForm();
				}
			});
		}
	});

	let loadForm = () =>
	{
		let schemaRank = (_schema, _rank, _team) =>
		{
			let sRank = "";

			if (_schema.teams[_team] === undefined)
				sRank = _schema.ranks[_rank];
			else
				sRank = _schema.teams[_team].ranks[_rank];

			if (sRank === undefined)
				sRank = _schema.ranks[_rank];
			return sRank;
		};

		$$("#schemaBase").value = schema.base;
		let teams = schema.baseData.teams;
		let ranks = schema.baseData.ranks;

		for (let rank in ranks)
		{
			$$("#general").insertAdjacentHTML("beforeend", `
			<p>
				<label for="${rank}_name">${schemaRank(schema.baseData, rank)} Name:</label>
				<input class="pieceName ${rank}" type="text" name="${rank}" id="${rank}_name" placeholder="${schemaRank(schema.baseData, rank)}"/>
				<span class="errorMsg"></span>
			</p>`);
		}

		for (let team in teams)
		{
			$$(`#submitParagraph`).insertAdjacentHTML("beforebegin", `
			<div id="${team}" class="team">
				<h4>${teams[team].name}</h4>
                <p>
                    <label for="${team}_name">Team Name:</label>
                    <input type="text" id="${team}_name" name="${team}_name" placeholder="${teams[team].name}"/>
                    <span class="errorMsg"></span>
                </p>
                <p class="colour">
                    <label for="${team}_colour">Primary Colour:</label>
                    <input type="color" id="${team}_colour" name="${team}_colour" value="${teams[team].colour}"/>
                    <span class="errorMsg"></span>
                </p>
                <p class="bgcolour">
                    <label for="${team}_bgcolour">Secondary Colour:</label>
                    <input type="color" id="${team}_bgcolour" name="${team}_bgcolour" value="${teams[team].bgcolour}"/>
                    <span class="errorMsg"></span>
                </p>
                <div id="${team}_ranks" class="rank"></div>
                <span id="${team}_name_msg" class="errorMsg"></span>
                <span id="${team}_uniqueName_msg" class="errorMsg"></span>
                <span id="${team}_img_msg" class="errorMsg"></span>
			</div>`);

			for (let rank in ranks)
			{
				$$(`#${team}_ranks`).insertAdjacentHTML("beforeend", `
				<p>
					<input class="pieceName ${rank}" type="text" name="${team}_${rank}" id="${team}_${rank}" placeholder="${schemaRank(schema.baseData, rank, team)}"/>
					<label for="${team}_${rank}_image" class="image"></label>
					<input type="file" accept="image/png" id="${team}_${rank}_image" name="${team}_${rank}_image" class="hide"/>
					<span class="errorMsg"></span>
				</p>`);
			}
		}
		FORM.addEventListener("change", ev =>
		{
			let input = ev.target;
			if (input.type === "file")
			{
				if (input.parentNode.parentNode.classList.contains("rank"))
				{
					if (input.files && input.files[0])
					{
						let img = ev.target.previousElementSibling;
						let fileReader = new FileReader();
						fileReader.onloadend = e =>
						{
							img.style.backgroundImage = `url(${e.target.result})`;
						};

						fileReader.readAsDataURL(input.files[0]);
					}
				}
				else if (input.id === "bgImage")
				{
					//TODO: Add ability to add a background image (Instead of wood)
				}
			}
			else if (input.type === "color")
			{
				if ([...$$All(".colour input")].includes(input))
				{
					input.parentNode.parentNode.style.color = input.value;
					input.parentNode.parentNode.style.borderColor = input.value;
				}
				else if ([...$$All(".bgcolour input")].includes(input))
				{
					input.parentNode.parentNode.style.backgroundColor = input.value;
				}
			}

		});
		$$(`#general`).addEventListener("keyup", e =>
		{
			if (e.target.classList.contains("pieceName"))
			{
				let input = e.target;
				let equivPieces = [...$$All(`#white .${input.name}, #black .${input.name}`)];

				let placeholderValue =
					(input.value.trim().length > 0)?input.value.trim():input.placeholder;

				for (let piece of equivPieces)
					piece.placeholder = placeholderValue;
			}
		});
		FORM.addEventListener("submit", e =>
		{
			e.preventDefault();
			if (validate())
			{
				FORM.action += `?schema=${$$("#title").value.trim()}`;
				FORM.submit();
			}
		});
	};


	let validateTitle = () =>
	{
		let valid = true;

		let title = $$("#title").value.trim().toLowerCase();

		if (title.length > 0)
			if (!schema.schemas.includes(title))
				if ((/^[a-z0-9_\-]+$/).test(title))
					valid = true;
				else
					$$("#title~span.errorMsg").innerHTML = "Invalid characters. Accepted: alphanumeric, _, and -";
			else
				$$("#title~span.errorMsg").innerHTML = "That title is already taken. Choose another.";
		else
			$$("#title~span.errorMsg").innerHTML = "Please provide a title for your schema.";

		return valid;
	};

	let validateImages = () =>
	{
		let valid = true;
		for (let team in schema.baseData.teams)
		{
			for (let input of [...$$All(`#${team} .rank input[type='file']`)])
				if (input.files.length === 0)
				{
					$$(`#${team}_img_msg`).innerHTML = "Please upload a file for each piece";
					valid = false;
				}
		}
		return valid;
	};

	let validateColourFormat = () =>
	{
		let valid = true;

		for (let input of [...$$All("input[type='color']")])
		{
			if (!(/^#[0-9A-F]{6}$/i).test(input.value.trim()))
			{
				valid = false;
				input.classList.add("invalid", "error");
				input.nextElementSibling.innerHTML = "Please provide a colour in hexidecimal format.";
			}
		}

		return valid;
	};

	let validateColourContrast = () =>
	{
		let valid = true;

		let colours = [...$$All(".colour input[type='color']")];
		let bgcolours = [...$$All(".bgcolour input[type='color']")];

		let bgContrast = contrast(hexToRGB(bgcolours[0].value.trim()), hexToRGB(bgcolours[1].value.trim()));

		if (bgContrast < 1.02)
		{
			valid = false;
			for (let input of bgcolours)
			{
				input.classList.add("invalid", "error");
				input.nextElementSibling.innerHTML = "Provided secondary colours do not contrast enough.";
			}
		}

		for (let i = 0; i < colours.length; i++)
		{
			let colourContrast = contrast(hexToRGB(colours[i].value.trim()), hexToRGB(bgcolours[i].value.trim()));
			if (colourContrast < 1.5)
			{
				valid = false;
				input.classList.add("invalid", "error");
				colours[i].nextElementSibling.innerHTML = "Primary colour is too similar to the secondary colour.";
				bgcolours[i].nextElementSibling.innerHTML = "Secondary colour is too similar to the primary colour.";
			}
		}

		return valid;
	};

	let validateTeams = () =>
	{
		let valid = true;

		let nameArr = [];

		for (let team in schema.baseData.teams)
			nameArr.push($$(`#${team}_name`));

		if (nameArr[0].value.trim().length === 0 || nameArr[1].value.trim().length === 0)
		{
			valid = false;
			for (let name of nameArr)
			{
				if (name.value.trim().length === 0)
				{
					name.classList.add("invalid", "error");
					name.nextElementSibling.innerHTML = "Please provide a team name";
				}
			}

		}
		else if (nameArr[0].value.trim() === nameArr[1].value.trim())
		{
			valid = false;
			for (let name of nameArr)
			{
				name.classList.add("invalid", "error");
				name.nextElementSibling.innerHTML = "Names must be unique";
			}
		}

		return valid;
	};

	let validatePieceNames = () =>
	{
		let valid = true;
		let teamRankNames = [];
		for (let team in schema.baseData.teams)
		{
			teamRankNames[team] = {};
			let rankNames = [...$$All(`#${team} .pieceName`)];
			let names = rankNames.map(rank =>
				(rank.value.length > 0)? rank.value.trim(): rank.placeholder);
			for (let rank of rankNames)
			{
				let name = (rank.value.trim().length > 0)? rank.value: rank.placeholder;
				teamRankNames[team][rank.classList.item(1)] = name; //Second class is expected to be the rank
				if (names.indexOf(name) !== names.lastIndexOf(name))
				{
					valid = false;
					rank.classList.add("invalid", "error");
					$$(`#${team}_name_msg`).innerHTML = "Piece names must be unique within their team.";
				}
			}
		}

		let teams = Object.keys(schema.baseData.teams);
		let ranks = [null, null];
		for (ranks[0] in teamRankNames[teams[0]])
		{
			for (ranks[1] in teamRankNames[teams[1]])
			{
				if (ranks[0] !== ranks[1])
				{
					if (teamRankNames[teams[0]][ranks[0]] === teamRankNames[teams[1]][ranks[1]])
					{
						valid = false;
						for (let i = 0; i < 2; i++)
						{
							$$(`#${teams[i]} .${ranks[i]}.pieceName`).classList.add("invalid", "error");
							$$(`#${teams[i]}_uniqueName_msg`).innerHTML = "Rank names must be different than the rank names of different ranks of the other team";
						}
					}
				}
			}
		}
		return valid;
	};

	let checkNames = () =>
	{
		let valid = false;

		for (let piece in schema.baseData.ranks)
		{
			let name = $$(`#${piece}_name`);
			let wName = $$(`#white_${piece}`);
			let bName = $$(`#black_${piece}`);

			if (name.value.trim().length === 0)
			{
				//Make sure both black and white are filled
				if (wName.value.trim().length === 0 || bName.value.trim().length === 0)
				{
					valid = false;
					name.nextElementSibling.innerHTML = "Must provide a general rank name or provide all team specific ones.";
					if (wName.value.trim().length === 0)
					{
						wName.classList.add("invalid", "error");
						$$("#white_name_msg").innerHTML = "Must provide a team specific rank or a general one.";
					}
					if (bName.value.trim().length === 0)
					{
						bName.classList.add("invalid", "error");
						$$("#black_name_msg").innerHTML = "Must provide a team specific rank or a general one.";
					}
				}
			}
		}

		return valid;
	};

	let clearErrors = () =>
	{
		for (let input of [...$$All(".invalid")])
			input.classList.remove("invalid");
		for (let input of [...$$All(".error")])
			input.classList.remove("error");
		for (let errMsg of [...$$All(".errorMsg")])
			errMsg.innerHTML = "";
	};
	let validate = () =>
	{
		clearErrors();

		let validTitle = validateTitle();
		let validNames = checkNames();
		let validImages = validateImages();
		let validColours = validateColourFormat();

		let valid = validTitle && validImages && validColours && validNames;

		if ($$("#enforceClarity").checked)
		{
			let validTeamNames = validateTeams();
			let validPieceNames = validatePieceNames();
			let validContrast = false;
			if (validColours)
				validContrast = validateColourContrast();

			valid = valid && validContrast && validTeamNames && validPieceNames;
		}

		return valid;
	};

});