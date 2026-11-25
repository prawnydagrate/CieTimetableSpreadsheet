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

const alignColumns = (sheet, columns, alignment) => {
	for (const colKey of columns) {
		const column = sheet.getColumn(colKey);
		column.alignment = { ...(column.alignment || {}), alignment };
	}
};

const addDaysToCell = (sheet, dateColumn, daysRemColumn, rowNum) => {
	const timeToCell = sheet.getCell(`${daysRemColumn}${rowNum}`);
	timeToCell.value = { formula: `$${dateColumn}${rowNum}-NOW()` };
	timeToCell.numFmt = '0'; // round to nearest int
};

const actionMultipleCells = (sheet, rangeStart, rangeEnd, callback) => {
	const getColNo = (col) => col.charCodeAt(0) - 64;
	const startCol = getColNo(rangeStart.match(/[a-z]+/i)[0]);
	const startRow = parseInt(rangeStart.match(/\d+/)[0]);
	const endCol = getColNo(rangeEnd.match(/[a-z]+/i)[0]);
	const endRow = parseInt(rangeEnd.match(/\d+/)[0]);
	for (let col = startCol; col <= endCol; col++)
		for (let row = startRow; row <= endRow; row++) callback(sheet.getRow(row).getCell(col));
};

export const generateSpreadsheet = async (
	selectedExams,
	[earliest, latest],
	filename,
	includeTimeColumn = false
) => {
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
	const dateColumn = 'A';
	const nameColumn = 'B';
	const sylColumn = 'C';
	const compColumn = 'D';
	const durColumn = 'E';
	const sessionColumn = 'F';
	const timeColumn = includeTimeColumn ? 'G' : null;
	const daysRemColumn = includeTimeColumn ? 'H' : 'G';
	sheet.columns = [
		{ header: 'Date', key: 'date', width: 16, style: { numFmt: 'ddd, mmm dd' } },
		// Co-ordinated Sciences (Double Award) (Multiple Choice - Extended) is 65 chars
		// TODO: dynamically set widths
		{ header: 'Name', key: 'name', width: 69 },
		{ header: 'Syllabus', key: 'syllabus', width: 12, style: { numFmt: '@' } },
		{ header: 'Component', key: 'component', width: 14, style: { numFmt: '@' } },
		{ header: 'Duration', key: 'duration', width: 12 },
		{ header: 'Session', key: 'session', width: 12 },
		...(includeTimeColumn ? [{ header: 'Time', width: 8 }] : []),
		{ header: 'Days remaining', width: 18 }
	];
	let rowNum = 1; // always points to the last populated row, hence we increment then insert
	sheet.getRow(1).font = { bold: true };
	for (const thisDate of allDates) {
		const currentDateSingles = singleDayExamsByDate[thisDate];
		if (currentDateSingles.length === 0) {
			rowNum++;
			// no exams, so empty row
			sheet.addRow({ date: thisDate });
			addDaysToCell(sheet, dateColumn, daysRemColumn, rowNum);
		} else if (currentDateSingles.length > 1) {
			// multiple exams this day
			// keep track of the first cell to merge
			const startRow = rowNum + 1;
			// insert all exams for this date
			for (const currentDateSingle of currentDateSingles) {
				rowNum++;
				sheet.addRow({ ...currentDateSingle, date: new Date(currentDateSingle.date) });
				addDaysToCell(sheet, dateColumn, daysRemColumn, rowNum);
			}
			// merge cells for the date and for the days remaining
			sheet.mergeCells(`${dateColumn}${startRow}:${dateColumn}${rowNum}`);
			sheet.mergeCells(`${daysRemColumn}${startRow}:${daysRemColumn}${rowNum}`);
		} else {
			rowNum++;
			// single exam this day
			const currentDateSingle = currentDateSingles[0];
			sheet.addRow({ ...currentDateSingle, date: new Date(currentDateSingle.date) });
			addDaysToCell(sheet, dateColumn, daysRemColumn, rowNum);
		}
	}
	// conditional formatting to gray out holidays and yellow-highlight exam days
	sheet.addConditionalFormatting({
		ref: `B2:${timeColumn || sessionColumn}${rowNum}`,
		rules: [
			{
				type: 'expression',
				formulae: ['ISBLANK($B2)'],
				style: {
					fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'EFEFEF' } }
				}
			},
			{
				type: 'expression',
				// absolute reference to B so that exams with some empty fields will be yellow
				formulae: ['NOT(ISBLANK($B2))'],
				style: {
					fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFF00' } }
				}
			}
		]
	});
	// conditional formatting for days remaining
	sheet.addConditionalFormatting({
		ref: `${daysRemColumn}2:${daysRemColumn}${rowNum}`,
		rules: [
			{
				type: 'cellIs',
				operator: 'lessThan',
				formulae: ['0'],
				style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: '00FF00' } } }
			},
			{
				type: 'cellIs',
				operator: 'between',
				formulae: ['0', '1'],
				style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF0000' } } }
			},
			{
				type: 'cellIs',
				operator: 'greaterThan',
				formulae: ['1'],
				style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF7B7B' } } }
			}
		]
	});
	// add table borders
	const eachBorder = { style: 'thin', color: { argb: '000000' } };
	actionMultipleCells(
		sheet,
		'A1',
		`${daysRemColumn}${rowNum}`,
		(cell) =>
			(cell.border = {
				top: eachBorder,
				right: eachBorder,
				bottom: eachBorder,
				left: eachBorder
			})
	);
	const nameColumns = [nameColumn];
	if (multiDayExams.length > 0) {
		const [
			multiDayNameColumn,
			multiDaySylColumn,
			multiDayCompColumn,
			multiDayDateFromColumn,
			multiDayDateToColumn
		] = includeTimeColumn ? ['J', 'K', 'L', 'M', 'N'] : ['I', 'J', 'K', 'L', 'M'];
		nameColumns.push(multiDayNameColumn);
		// handle multi-day exams
		sheet.getColumn(multiDayNameColumn).width = 69; // TODO dynamically assign
		sheet.getCell(`${multiDayNameColumn}1`).value = 'Name';
		sheet.getColumn(multiDaySylColumn).width = 12;
		sheet.getCell(`${multiDaySylColumn}1`).value = 'Syllabus';
		sheet.getColumn(multiDayCompColumn).width = 14;
		sheet.getCell(`${multiDayCompColumn}1`).value = 'Component';
		sheet.getColumn(multiDayDateFromColumn).width = 16;
		sheet.getColumn(multiDayDateFromColumn).numFmt = 'ddd, mmm dd';
		sheet.getColumn(multiDayDateToColumn).width = 16;
		sheet.getColumn(multiDayDateToColumn).numFmt = 'ddd, mmm dd';
		sheet.getCell(`${multiDayDateFromColumn}1`).value = 'Start date';
		sheet.getCell(`${multiDayDateToColumn}1`).value = 'End date';
		let windowRowNum = 1;
		for (const multiDayExam of multiDayExams) {
			windowRowNum++;
			const { name, syllabus, component, date, dateto } = multiDayExam;
			const row = sheet.getRow(windowRowNum);
			row.getCell(multiDayNameColumn).value = name;
			row.getCell(multiDaySylColumn).value = syllabus;
			row.getCell(multiDayCompColumn).value = component;
			row.getCell(multiDayDateFromColumn).value = new Date(date);
			row.getCell(multiDayDateToColumn).value = new Date(dateto);
		}
		// add background colors and borders
		actionMultipleCells(
			sheet,
			`${multiDayNameColumn}1`,
			`${multiDayDateToColumn}${windowRowNum}`,
			(cell) => {
				if (cell.row > 1)
					cell.fill = {
						...(cell.fill || {}),
						type: 'pattern',
						pattern: 'solid',
						fgColor: { argb: 'FFFF00' }
					};
				cell.border = {
					top: eachBorder,
					right: eachBorder,
					bottom: eachBorder,
					left: eachBorder
				};
			}
		);
	}
	// center-align all cells and add Arial font
	sheet.eachRow((row) =>
		row.eachCell((cell) => {
			cell.alignment = { ...(cell.alignment || {}), horizontal: 'center', vertical: 'middle' };
			cell.font = { ...(cell.font || {}), name: 'Arial' };
		})
	);
	// left-align names
	alignColumns(sheet, nameColumns, { horizontal: 'left' });
	// download the spreadsheet
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
};

export default { seriesToFloat, floatToSeries, matchRecord, isSameDate, generateSpreadsheet };
