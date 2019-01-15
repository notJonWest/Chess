let $$ = query => document.querySelector(query);
let $$All = query => document.querySelectorAll(query);

let decodeQuerystring = () =>
{
	let qsArr = location.search.substring(1).split("&");
	let qsObj = {};
	for (let pair of qsArr)
	{
		let pairArr = pair.split("=");
		qsObj[decodeURIComponent(pairArr[0])] = decodeURIComponent(pairArr[1]);
	}
	return qsObj;
};