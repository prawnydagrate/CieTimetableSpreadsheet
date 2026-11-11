<script>
	import { LETTER_TO_SERIES, ZONES } from '#lib/assets/globals.js';
	import { floatToSeries, seriesToFloat } from '#lib/assets/helpers.js';

	const { data } = $props();
	const { allSeries, recordsByZone } = data;
	// sort in descending order
	for (const zone of ZONES) allSeries[zone].sort((a, b) => b - a);
	let selectedZone = $state(null);
	let selectedSeries = $derived(
		selectedZone == null || allSeries[selectedZone].length === 0 ? null : allSeries[selectedZone][0]
	); // this is a series float
	// resets to [] every time the series is nulled
	let selectedExams = $derived(selectedSeries == null ? [] : []);
</script>

<h1>Hi, I couldn't be bothered with styling (yet?)</h1>
<label for="adm-zone-select">Select your administrative zone</label>
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
	<label for="exam-series-select">Select your examination series</label>
	<select id="exam-series-select" bind:value={selectedSeries}>
		{#each allSeries[selectedZone] as seriesFloat}
			{@const [seriesLetter, year] = floatToSeries(seriesFloat)}
			{@const seriesName = LETTER_TO_SERIES[seriesLetter].long}
			<option value={seriesFloat}>{seriesName} {year}</option>
		{/each}
	</select>
{/if}
<br /><br />
<!-- TODO: fuzzy search -->
{#if selectedSeries != null}
	<label for="exams-select">Select your exams</label>
	<select id="exams-select" multiple bind:value={selectedExams}>
		{#each recordsByZone[selectedZone][selectedSeries] as record}
			<option value={[record.syllabus, record.component]}>
				{record.name}
				{record.syllabus}/{record.component}
			</option>
		{/each}
	</select>
{/if}

<style>
	#exams-select {
		resize: vertical;
		overflow-y: auto;
	}
</style>
