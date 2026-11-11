export const seriesToFloat = ([seriesLetter, year]) => {
	if (typeof year === 'string') year = parseInt(year);
	if (year < 100) year += 2000; // assuming this code will not be relevant in the 22nd century
	const frac = seriesLetter === 'M' ? 0.25 : seriesLetter === 'J' ? 0.5 : 0.75;
	return year + frac;
};

export const floatToSeries = (seriesFloat) => {
	const frac = seriesFloat % 1;
	const letter = frac === 0.25 ? 'M' : frac === 0.5 ? 'J' : 'N';
	return [letter, Math.floor(seriesFloat)];
};

export default { seriesToFloat, floatToSeries };
