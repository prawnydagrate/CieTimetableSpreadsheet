import { ZONES } from '#lib/assets/globals.js';
import { seriesToFloat } from '#lib/assets/helpers.js';
import Papa from 'papaparse';

export async function load({ fetch }) {
	// find all files inside /static
	const modules = import.meta.glob('/static/*');
	// remove "/static"" prefix and filter only CSVs
	const timetableFiles = Object.keys(modules)
		.map((path) => path.replace(/^\/static/, ''))
		.filter((path) => path.endsWith('.csv'));
	const allSeries = {};
	const recordsByZone = {};
	for (const zone of ZONES) {
		allSeries[zone] = [];
		recordsByZone[zone] = {};
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
			// form a list of the available zones and series
			allSeries[zone].push(seriesToFloat([seriesLetter, year]));
			// save the exam date data
			recordsByZone[zone][seriesToFloat([seriesLetter, year])] = data;
		} catch (err) {
			// TODO: handle
		}
	}
	return { allSeries, recordsByZone };
}
