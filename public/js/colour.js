let luminance = (rgb) =>
{
	let a = [rgb.r, rgb.g, rgb.b].map(v =>
	{
		v /= 255;
		return v <= 0.03928
		? v / 12.92
		: Math.pow((v + 0.055) / 1.055, 2.4);
	});
	return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

let contrast = (rgb1, rgb2) =>
{
	let l1 = luminance(rgb1) + 0.05;
	let l2 = luminance(rgb2) + 0.05;
	return Math.max(l1, l2) / Math.min(l1, l2);
};

let strToRGB = rgbStr =>
{
	let rgbArr = rgbStr.slice(4, -1).split(",").map(v => parseInt(v.trim()));
	return {
		"r": rgbArr[0],
		"g": rgbArr[1],
		"b": rgbArr[2]
	};
};

let hexToRGB = hex =>
{
	hex = hex.slice(1);
	return {
		"r": parseInt(hex.slice(0, 2), 16),
		"g": parseInt(hex.slice(2, 4), 16),
		"b": parseInt(hex.slice(4, 6), 16)
	};
};