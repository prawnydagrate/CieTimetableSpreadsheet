<script>
	import { matchRecord } from './helpers';

	let { selectedExams = $bindable(), recordsToQuery } = $props();
	let searchValue = $state('');
	let queriedRecords = $derived(
		recordsToQuery.filter((record) => matchRecord(record, searchValue))
	);

	selectedExams.length = 0; // clear selected exams
	let examSelections = $state({});
	// initialize exam selection object
	for (const { syllabus, component } of recordsToQuery)
		examSelections[`${syllabus}/${component}`] = false;

	let selectedCodes = $derived(Object.keys(examSelections).filter((key) => examSelections[key]));
	$effect(
		() =>
			(selectedExams = selectedCodes.map((code) => {
				const [syl, comp] = code.split('/');
				return recordsToQuery.find(
					({ syllabus, component }) => syllabus === syl && component === comp
				);
			}))
	);
</script>

<label for="exam-search-input">Search and select all of your exams</label>&nbsp;
<input id="exam-search-input" bind:value={searchValue} placeholder="search" />
<br />
{#if queriedRecords.length === 0}
	<div style="margin: 4px 0 0 0">No exams matched your query 🥀</div>
	<br />
{:else}
	<div id="exam-search-results-div">
		{#each queriedRecords as { name, syllabus, component }}
			{@const checkboxId = `${syllabus}-${component}-checkbox`}
			<div class="exam-row">
				<input
					id={checkboxId}
					type="checkbox"
					bind:checked={examSelections[`${syllabus}/${component}`]}
				/>
				<label for={checkboxId}>{name}</label>
				<label for={checkboxId}>{syllabus}/{component}</label>
			</div>
		{/each}
	</div>
{/if}
<br />
{#if selectedExams.length === 0}
	You haven't selected any exams yet 🤨
{:else}
	{#if selectedExams.length === 1}
		You've selected 1 exam:
	{:else}
		{@const nUnique = new Set(selectedExams.map(({ syllabus }) => syllabus)).size}
		{#if nUnique === 1}
			You've selected {selectedExams.length} exams in {selectedExams[0].syllabus}:
		{:else}
			You've selected {selectedExams.length} exams across {nUnique} courses:
		{/if}
	{/if}
	<div id="selected-exams-display-div">
		{#each selectedExams as { name, syllabus, component }}
			<div class="exam-row">
				<!-- multiplication X for remove symbol -->
				<button
					class="remove-exam-button"
					onclick={() => (examSelections[`${syllabus}/${component}`] = false)}>&#x02715;</button
				>
				<div>{name}</div>
				<div>{syllabus}/{component}</div>
			</div>
		{/each}
	</div>
{/if}

<style>
	#exam-search-results-div,
	#selected-exams-display-div {
		max-width: 621px; /* golden ratio */
		max-height: 384px;

		display: grid; /* forgive me */
		grid-template-columns: 1fr 12fr 2fr;
		row-gap: 4px;

		overflow: auto;

		border: 1px solid #ddd;
		margin: 4px;
		padding: 2px;
	}

	.exam-row {
		display: contents;

		background-color: white;
		transition-duration: 100ms;
	}

	.exam-row:hover {
		background-color: whitesmoke;
	}

	.exam-row * {
		background-color: inherit;
	}

	.remove-exam-button {
		width: fit-content;
		border: 1px solid #eee;
		border-radius: 16px;
	}
</style>
