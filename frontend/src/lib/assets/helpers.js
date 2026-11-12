import { ORDER_OF_SESSIONS, SEARCH_REPLACEMENTS } from './globals';
import ExcelJS from 'exceljs';

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

export const matchRecord = (record, query, retrying = false) => {
	let { name, syllabus, component } = record;
	// make cases consistent; remove all irrelevant characters
	name = name.toLowerCase().replace(/[^a-z\d]/g, '');
	query = query.toLowerCase().replace(/[^a-z\d\s]/g, ''); // keep spaces for testing words
	// test if every word in the query is in the name
	if (query.includes(' ') && query.split(' ').filter((word) => !name.includes(word)).length === 0)
		return true;
	// remove whitespace now
	query = query.replace(/\s/g, '');
	// consider a match in the name
	if (name.includes(query)) return true;
	// consider a match in syllabus/component
	if (query.includes('/')) {
		const parts = query.split('/');
		const syllabusQuery = parts[0];
		parts.shift(); // to remove the first part (syllabus query)
		if (
			syllabus.includes(syllabusQuery) &&
			// no need to strip each part here, since whitespace has been removed
			parts.filter(
				(part) => part.length === 0 || component.replace('0', '').includes(part.replace('0', ''))
			).length > 0
		)
			return true;
	} else if (/^\d+$/.test(query))
		if (`${syllabus}${component}`.replace('0', '').includes(query.replace('0', ''))) return true;
	// last ditch effort to expand abbreviations
	if (!retrying)
		for (const [replacementKey, replacementVal] of Object.entries(SEARCH_REPLACEMENTS))
			if (matchRecord(record, query.replace(replacementKey, replacementVal), true)) return true;
	return false;
};

export const isSameDate = (date1, date2) =>
	date1.getFullYear() === date2.getFullYear() &&
	date1.getMonth() === date2.getMonth() &&
	date1.getDate() === date2.getDate();

const alignRow = (sheet, rowNum) => {
	sheet.getCell(`A${rowNum}`).alignment = { horizontal: 'center' }; // date
	sheet.getCell(`B${rowNum}`).alignment = { horizontal: 'left' }; // name
	sheet.getCell(`C${rowNum}`).alignment = { horizontal: 'center' }; // syllabus
	sheet.getCell(`D${rowNum}`).alignment = { horizontal: 'center' }; // component
	sheet.getCell(`E${rowNum}`).alignment = { horizontal: 'center' }; // duration
	sheet.getCell(`F${rowNum}`).alignment = { horizontal: 'center' }; // session
};

export const createSpreadsheet = async (selectedExams, [earliest, latest]) => {
	// sort all exams
	selectedExams.sort((a, b) => {
		let cmp = 0;
		// first, compare dates (or start dates, for windowed exams)
		cmp = new Date(a.date) - new Date(b.date);
		if (cmp !== 0) return cmp;
		// same date, so compare sessions (AM, PM, EV)
		if (a.session.length > 0 && b.session.length > 0)
			cmp = ORDER_OF_SESSIONS[a.session] - ORDER_OF_SESSIONS[b.session];
		if (cmp !== 0) return cmp;
		// same session, so compare syllabus codes
		// (Cambridge seems to arrange same-session exams in ascending order of syllabus code)
		cmp = a.syllabus.localeCompare(b.syllabus);
		if (cmp !== 0) return cmp;
		// same syllabus code, so compare component codes
		// (Cambridge does this as well, e.g. 9701/22 before 9701/52)
		cmp = a.component.localeCompare(b.component);
		return cmp;
	});
	const singleDayExams = [];
	const multiDayExams = [];
	for (const selectedExam of selectedExams)
		if (selectedExam.dateto.length > 0 && selectedExam.date !== selectedExam.dateto)
			multiDayExams.push(selectedExam);
		else singleDayExams.push(selectedExam);
	// pair each date with its single-day exams
	const allDates = [];
	const singleDayExamsByDate = {};
	let intermediateDate = earliest;
	while (intermediateDate <= latest) {
		allDates.push(intermediateDate);
		singleDayExamsByDate[intermediateDate] = singleDayExams.filter(({ date }) =>
			isSameDate(new Date(date), intermediateDate)
		);
		const nextDate = new Date(intermediateDate);
		nextDate.setDate(nextDate.getDate() + 1);
		intermediateDate = nextDate;
	}
	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Pranav Balaji Pooruli';
	const sheet = workbook.addWorksheet('Timetable');
	sheet.columns = [
		{ header: 'Date', key: 'date', width: 16, style: { numFmt: 'yyyy-mm-dd' } },
		{ header: 'Name', key: 'name', width: 56 },
		{ header: 'Syllabus', key: 'syllabus', width: 10, style: { numFmt: '@' } },
		{ header: 'Component', key: 'component', width: 12, style: { numFmt: '@' } },
		{ header: 'Duration', key: 'todo', width: 10 },
		{ header: 'Session', key: 'session', width: 10 }
	];
	let rowNum = 1; // always points to the last populated row, hence we increment then insert
	alignRow(sheet, rowNum); // align the first row cells
	for (const thisDate of allDates) {
		const currentDateSingles = singleDayExamsByDate[thisDate];
		if (currentDateSingles.length === 0) {
			rowNum++;
			sheet.addRow({
				date: thisDate,
				name: '',
				syllabus: '',
				component: '',
				duration: '',
				session: ''
			});
			alignRow(sheet, rowNum);
		} else if (currentDateSingles.length > 1) {
			// keep track of the first cell to merge
			const startRow = rowNum + 1;
			// insert all exams for this date
			for (const currentDateSingle of currentDateSingles) {
				rowNum++;
				sheet.addRow(currentDateSingle);
				alignRow(sheet, rowNum); // align this row's cells
			}
			// merge cells for the date
			sheet.mergeCells(`A${startRow}:A${rowNum}`);
		} else {
			rowNum++;
			sheet.addRow(currentDateSingles[0]);
			alignRow(sheet, rowNum);
		}
	}
	// vertically middle-align all cells
	sheet.eachRow((row) =>
		row.eachCell((cell) => (cell.alignment = { ...(cell.alignment || {}), vertical: 'middle' }))
	);
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = 'timetable.xlsx';
	anchor.click();
	URL.revokeObjectURL(url);
};

export default { seriesToFloat, floatToSeries, matchRecord };
