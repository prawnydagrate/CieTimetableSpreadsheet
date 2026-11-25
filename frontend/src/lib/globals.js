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

export const ZONES = [0, 1, 2, 3, 4, 5, 6];

export const SEARCH_REPLACEMENTS = {
	mat: ' mat', // takes care of both math and fmath due to the space
	maths: ' math',
	fm: 'f mat',
	arb: 'arab', // arbic becomes arabic
	evm: 'env man',
	em: 'env man',
	ict: 'info com tech',
	fle: 'first lang eng',
	cs: 'comp sci',
	it: 'info tech',
	addm: 'add m', // add math (0606/4037)
	intm: 'int m', // int math (0607)
	extm: 'ext m', // ext math (0580/0607)
	coord: 'co-ord ', // coord sci (0654)
	dbl: 'double', // double award
	combsci: 'comb sci', // combined sci (0653)
	mcq: 'multiple choice',
	atp: 'alt to prac',
	gp: 'glob persp',
	esl: 'eng sec lang',
	'as lvl': '',
	'as level': '',
	aslvl: '',
	aslevel: '',
	asl: '',
	as: '',
	'a lvl': '',
	'a level': '',
	alvl: '',
	alevel: '',
	al: '',
	a: '',
	'o lvl': '',
	'o level': '',
	olvl: '',
	olevel: '',
	ol: '',
	o: '',
	igcse: '',
	ig: ''
};

export const ORDER_OF_SESSIONS = {
	AM: 0,
	PM: 1,
	EV: 2
};

export default {
	LETTER_TO_SERIES,
	SERIES_TO_LETTER,
	ZONES,
	SEARCH_REPLACEMENTS,
	ORDER_OF_SESSIONS
};
