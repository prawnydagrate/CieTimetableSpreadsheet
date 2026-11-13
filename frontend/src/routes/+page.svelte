<script>
	import { LETTER_TO_SERIES, ZONES } from '#lib/assets/globals.js';
	import { floatToSeries } from '#lib/assets/helpers.js';
	import ExamsSelector from '#lib/assets/ExamsSelector.svelte';
	import { generateSpreadsheet } from '../lib/assets/helpers.js';

	const { data } = $props();
	const { allSeries, recordsByZone, seriesExtremesByZone } = data;
	let selectedZone = $state(null);
	let selectedSeriesFloat = $derived(
		// selected series resets to null every time the zone is nulled
		selectedZone == null || allSeries[selectedZone].length === 0 ? null : null
	);
	let recordsToQuery = $derived(
		selectedSeriesFloat == null ? [] : recordsByZone[selectedZone][selectedSeriesFloat]
	);
	// selected exams resets to empty every time the series is nulled
	// ideally it should reset to empty every time the series changes, but
	// I lowkey don't know how to do that so instead I'm using a #key block
	// in the markup
	let selectedExams_ = $derived(selectedSeriesFloat == null ? [] : []);
	// using a wrapper like this because apparently child components (exam selector)
	// can't update a $derived value on their parent component
	let selectedExams = $state([]);
	$effect(() => (selectedExams = selectedExams_));
	let includeTimeColumn = $state(false);
</script>

<h1>Generate a spreadsheet for your CIE exam timetable</h1>
<h5>(I couldn't be bothered with CSS)</h5>
<label for="adm-zone-select">Select your administrative zone</label>&nbsp;
<select id="adm-zone-select" bind:value={selectedZone}>
	{#each ZONES as zone}
		<option value={zone}>Zone {zone}</option>
	{/each}
</select>
<div style="margin: 4px 0 0 0">
	If you're in the UK, select <strong>Zone 0</strong>. If you're in Romania looking for the March
	series, select <strong>Zone 4</strong>. Otherwise, see
	<a
		href="https://www.instagram.com/p/DYgotXCAR49/?img_index=2"
		target="_blank"
		rel="noopener noreferrer">this Instagram post slide</a
	>
	or
	<a
		href="https://www.cambridgeinternational.org/exam-administration/cambridge-exams-officers-guide/phase-1-preparation/timetabling-exams/administrative-zone/"
		target="_blank"
		rel="noopener noreferrer">this page of Cambridge's website</a
	>
	to find your administrative zone.
</div>
<br />
{#if selectedZone != null && allSeries[selectedZone].length === 0}
	No timetables for this zone 😂😂
{:else if selectedZone != null}
	<label for="exam-series-select">Select your examination series</label>&nbsp;
	<select id="exam-series-select" bind:value={selectedSeriesFloat}>
		{#each allSeries[selectedZone] as seriesFloat}
			{@const [seriesLetter, year] = floatToSeries(seriesFloat)}
			{@const seriesName = LETTER_TO_SERIES[seriesLetter].long}
			<option value={seriesFloat}>{seriesName} {year}</option>
		{/each}
	</select>
{/if}
<br /><br />
{#if selectedSeriesFloat != null}
	{#key selectedSeriesFloat}
		<ExamsSelector bind:selectedExams {recordsToQuery} />
	{/key}
{/if}
<br />
{#if selectedExams.length > 0}
	Include a column for exam times <input
		id="time-col-checkbox"
		type="checkbox"
		bind:checked={includeTimeColumn}
	/>
	&emsp;You will have to enter the times <strong>by yourself</strong>, following your center's
	timetabling.
	<br /><br />
	After you download the spreadsheet, <strong>be sure</strong> to verify the dates and sessions with
	the official timetable on Cambridge's website.<br />
	<button
		id="generate-button"
		onclick={() => {
			const [seriesLetter, year] = floatToSeries(selectedSeriesFloat);
			generateSpreadsheet(
				[...selectedExams],
				seriesExtremesByZone[selectedZone][selectedSeriesFloat],
				`${LETTER_TO_SERIES[seriesLetter].short}_${year}_Timetable.xlsx`,
				includeTimeColumn
			);
		}}>Generate spreadsheet!</button
	>
{/if}

<style>
	#generate-button {
		border: 1px solid #ddd;
		border-radius: 8px;

		margin: 8px 0 0 0;
		padding: 8px;

		background-color: white;
		transition-duration: 100ms;
	}

	#generate-button:hover {
		background-color: whitesmoke;
	}
</style>
