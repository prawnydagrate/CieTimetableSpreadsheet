import { ZONES } from '#lib/assets/globals.js';
import { seriesToFloat } from '#lib/assets/helpers.js';
import Papa from 'papaparse';

export async function load({ fetch }) {
	const timetableFiles = [
		// TODO: work smarter
		'/J_2027_0.csv',
		'/J_2027_1.csv',
		'/J_2027_2.csv',
		'/J_2027_3.csv',
		'/J_2027_4.csv',
		'/M_2027_4.csv',
		'/J_2027_5.csv',
		'/J_2027_6.csv'
	];
	const allSeries = {}; // maps each zone to its series
	const recordsByZone = {}; // maps each series to its exam date records
	const seriesExtremesByZone = {}; // maps each series to its earliest and latest date
	for (const zone of ZONES) {
		allSeries[zone] = [];
		recordsByZone[zone] = {};
		seriesExtremesByZone[zone] = {};
	}
	// parse all available CSVs
	for (const timetableFile of timetableFiles) {
		try {
			const response = await fetch(timetableFile);
			if (!response.ok) continue; // TODO: handle
			const csvText = await response.text();
			const { data, errors } = Papa.parse(csvText, {
				header: true,
				skipEmptyLines: true
				// commenting this (below) out for default false,
				// because otherwise e.g. 0417/02 becomes 417/2
				// dynamicTyping: true
			});
			if (errors.length > 0) {
				// TODO: handle
			}
			let [seriesLetter, year, zone] = timetableFile.slice(1, 9).split('_');
			const seriesFloat = seriesToFloat([seriesLetter, year]);
			// form a list of the available zones and series
			allSeries[zone].push(seriesFloat);
			// save the exam date data
			recordsByZone[zone][seriesFloat] = data;
			// find and save the earliest and latest dates
			let earliest = new Date('9999-09-09'); // assuming this code will be irrelevant in the year 9999
			let latest = new Date('0000-01-01'); // assuming this code will not be used by time traveler who travels to before the common era
			for (const { date: datefrom, dateto } of data) {
				let datestr = null; // to find the exam's representative date
				// skip windowed exams that span multiple days
				// we only want single-day exams
				if (dateto.length > 0 && datefrom !== dateto) continue;
				datestr = datefrom;
				const date = new Date(datestr);
				if (date < earliest) earliest = date;
				if (date > latest) latest = date;
			}
			seriesExtremesByZone[zone][seriesFloat] = [earliest, latest];
		} catch (err) {
			// TODO: handle
		}
	}
	for (const zone of ZONES) {
		// sort the series list in descending order
		allSeries[zone].sort((a, b) => b - a);
		// sort exam date records in alphabetical order
		for (const seriesLetter of Object.keys(recordsByZone[zone]))
			recordsByZone[zone][seriesLetter].sort(({ name: name1 }, { name: name2 }) =>
				name1.localeCompare(name2)
			);
	}
	return { allSeries, recordsByZone, seriesExtremesByZone };
}
