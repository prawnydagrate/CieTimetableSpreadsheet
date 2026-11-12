<script>
	import { LETTER_TO_SERIES, ZONES } from '#lib/assets/globals.js';
	import { floatToSeries, seriesToFloat } from '#lib/assets/helpers.js';
	import ExamsSelector from '#lib/assets/ExamsSelector.svelte';
	import { createSpreadsheet } from '../lib/assets/helpers.js';

	const { data } = $props();
	const { allSeries, recordsByZone, seriesExtremesByZone } = data;
	let selectedZone = $state(4); // TODO: null
	let selectedSeriesFloat = $derived(
		// selected series resets to null every time the zone is nulled
		selectedZone == null || allSeries[selectedZone].length === 0 ? null : null
	);
	let recordsToQuery = $derived(
		selectedSeriesFloat == null ? [] : recordsByZone[selectedZone][selectedSeriesFloat]
	);
	// selected exams resets to empty every time the series is nulled
	let selectedExams_ = $derived(selectedSeriesFloat == null ? [] : []);
	// using a wrapper like this because apparently child components (exam selector)
	// can't update a $derived value on their parent component
	let selectedExams = $state([]);
	$effect(() => (selectedExams = selectedExams_));
</script>

<h1>Hi, I couldn't be bothered with styling (yet?)</h1>
<label for="adm-zone-select">Select your administrative zone</label>&nbsp;
<select id="adm-zone-select" bind:value={selectedZone}>
	{#each ZONES as zone}
		<option value={zone}>Zone {zone}</option>
	{/each}
</select>
&emsp;If you're in Romania looking for the March series, select <strong>Zone 4</strong>.
<br /><br />
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
	<ExamsSelector bind:selectedExams {recordsToQuery} />
{/if}
<br />
{#if selectedExams.length > 0}
	<button
		onclick={() =>
			createSpreadsheet(
				[...selectedExams],
				seriesExtremesByZone[selectedZone][selectedSeriesFloat]
			)}>Generate spreadsheet!</button
	>
{/if}
