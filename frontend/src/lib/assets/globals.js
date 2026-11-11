export const LETTER_TO_SERIES = {
	M: { short: 'March', long: 'February/March', shortest: 'F/M' },
	J: { short: 'June', long: 'May/June', shortest: 'M/J' },
	N: { short: 'November', long: 'October/November', shortest: 'O/N' }
};

export const SERIES_TO_LETTER = {
	March: 'M',
	June: 'J',
	November: 'N',
	'February/March': 'M',
	'May/June': 'J',
	'October/November': 'N',
	'F/M': 'M',
	'M/J': 'J',
	'O/N': 'N'
};

export const ZONES = [1, 2, 3, 4, 5, 6];

export default { LETTER_TO_SERIES, SERIES_TO_LETTER, ZONES };
